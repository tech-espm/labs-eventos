import express = require("express");
import wrap = require("express-async-error-wrapper");
import Evento = require("../models/evento");
import Instrucao = require("../models/instrucao");
import Participante = require("../models/participante");
import Profissao = require("../models/profissao");
import Sessao = require("../models/sessao");
import appsettings = require("../appsettings");
import SessaoConstantes = require("../models/sessaoConstantes");

const router = express.Router();

router.all("/login/:e?/:s?", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	let e = req.params["e"] as string;
	const s = parseInt(req.params["s"] as string);
	let senhapresenca = req.cookies["participanteSenhaPresenca"] as string;
	// Quando o evento for "home", deve redirecionar o usuário para
	// a tela de gerenciamento de inscrições e certificados
	if (!e)
		e = "home";
	const queryString = encodeURIComponent(s ? ("?e=" + e + "&s=" + s) : ("?e=" + e));
	if (p) {
		res.cookie("participanteSenhaPresenca", "", { expires: new Date(0), httpOnly: true, path: "/", secure: false });
		res.redirect((e === "home") ? "/participante" : (s ? (senhapresenca ? ("/participante/p/" + e + "/" + s + "/" + senhapresenca) : ("/participante/inscricao/" + e + "/" + s)) : ("/" + e)));
	} else if (req.body.email || req.body.senha) {
		let mensagem: string = null;

		[mensagem, p] = await Participante.efetuarLogin(req.body.email as string, req.body.senha as string, null, res);
		if (mensagem) {
			res.render("participante/login", { layout: "layout-externo", imagemFundo: true, mensagem: mensagem, loginUrl: appsettings.loginParticipanteUrl + queryString });
		} else {
			res.cookie("participanteSenhaPresenca", "", { expires: new Date(0), httpOnly: true, path: "/", secure: false });
			res.redirect((e === "home") ? "/participante" : (s ? (senhapresenca ? ("/participante/p/" + e + "/" + s + "/" + senhapresenca) : ("/participante/inscricao/" + e + "/" + s)) : ("/" + e)));
		}
	} else {
		res.render("participante/login", { layout: "layout-externo", imagemFundo: true, mensagem: null, evento: e, loginUrl: appsettings.loginParticipanteUrl + queryString });
	}
}));

router.all("/inscricao/:e/:s", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	let e = req.params["e"] as string;
	let s = req.params["s"] as string;
	if (p) {
		let evt = Evento.idsPorUrl["/" + e];
		let sid = parseInt(s);
		let evento: Evento;
		if (evt && evt.habilitado && sid && sid > 0 &&
			(evento = await Evento.obter(evt.id, false))) {

			let r = Evento.permiteParticipante(evento, p.tipo);

			if (r) {
				res.render("participante/mensagem", { layout: "layout-participante", titulo: "Erro", mensagem: r, participante: p, analytics: true });
				return;
			}

			r = await Sessao.inscrever(sid, evento.id, p.id);

			if (r)
				res.render("participante/mensagem", { layout: "layout-participante", titulo: "Erro", mensagem: r, participante: p, analytics: true });
			else
				res.render("participante/mensagem", { layout: "layout-participante", titulo: "Sucesso na Inscrição", mensagem: "Inscrição efetuada com sucesso", participante: p, analytics: true, sucesso: true });
		} else {
			res.render("participante/mensagem", { layout: "layout-participante", titulo: "Erro", mensagem: "Não foi possível encontrar o evento selecionado", participante: p, analytics: true });
		}
	} else {
		res.redirect("/participante/login/" + e + "/" + s);
	}
}));

router.all("/redefinirSenha", wrap(async (req: express.Request, res: express.Response) => {
	res.render("participante/redefinirSenha", { layout: "layout-externo", imagemFundo: true, titulo: "Redefinição de Senha", email: (req.query["e"] || ""), token: (req.query["t"] || "") });
}));

router.all("/modal", wrap(async (req: express.Request, res: express.Response) => {
	res.render("participante/modal", { layout: "layout-vazio", instrucoes: await Instrucao.listar(), profissoes: await Profissao.listar() });
}));

router.all("/", wrap(async (req: express.Request, res: express.Response) => {
	return home(req, res, 0);
}));

router.all("/avalia/:s", wrap(async (req: express.Request, res: express.Response) => {
	return home(req, res, parseInt(req.params["s"] as string));
}));

async function home(req: express.Request, res: express.Response, ideventosessao: number) {
	let p = await Participante.cookie(req);
	if (!p) {
		if (ideventosessao)
			res.cookie("participanteAvaliaId", ideventosessao.toString(), { maxAge: 1 * 60 * 60 * 1000, httpOnly: true, path: "/", secure: false });
		res.redirect("/participante/login");
	} else {
		if (req.cookies["participanteAvaliaId"]) {
			if (!ideventosessao)
				ideventosessao = parseInt(req.cookies["participanteAvaliaId"] as string);
			res.cookie("participanteAvaliaId", "", { expires: new Date(0), httpOnly: true, path: "/", secure: false });
		}

		let eventos = await Participante.listarEventos(p);
		if (!eventos || !eventos.length)
			res.render("participante/mensagem", { layout: "layout-participante", titulo: "Meus Eventos", ocultarBotao: true, mensagem: "Você ainda não participou de nenhum evento conosco", participante: p });
		else
			res.render("participante/home", {
				layout: "layout-participante",
				panelHeadingPersonalizado: true,
				titulo: "Meus Eventos",
				TIPOMULTIDATA_NENHUM: SessaoConstantes.TIPOMULTIDATA_NENHUM,
				TIPOMULTIDATA_MINIMO_EXIGIDO: SessaoConstantes.TIPOMULTIDATA_MINIMO_EXIGIDO,
				TIPOMULTIDATA_PROPORCIONAL: SessaoConstantes.TIPOMULTIDATA_PROPORCIONAL,
				ideventosessaoparticipante: (ideventosessao > 0 ? await Participante.obterIdeventosessaoparticipanteParaAvaliacao(p.id, ideventosessao) : null),
				participante: p,
				eventos: JSON.stringify(eventos)
			});
	}
}

router.all("/qr", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	if (!p)
		res.redirect("/participante/login");
	else
		res.render("participante/qr", { layout: "layout-externo", titulo: "Código QR", participante: p });
}));

router.all("/certificado/:i", wrap(async (req: express.Request, res: express.Response) => {
	let idcertificado = req.params["i"] as string;
	let ids = Participante.idCertificadoParaIdParticipante(idcertificado);
	if (!ids) {
		res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro de Certificado", mensagem: "Código de certificado inválido" });
	} else {
		let participante = await Participante.obter(ids[0]);
		if (!participante) {
			res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro de Certificado", mensagem: "Participante não encontrado" });
		} else {
			let evento = await Evento.obter(ids[1], true);
			if (!evento) {
				res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro de Certificado", mensagem: "Evento não encontrado" });
			} else if (!evento.certificadoliberado) {
				res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro de Certificado", mensagem: "Os certificados só estarão disponíveis depois da conclusão do evento" });
			} else {
				let presencas = await Participante.listarPresencasParaCertificado(ids[0], ids[1]);
				if (!presencas || !presencas.length)
					res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro de Certificado", mensagem: "Ainda sem presenças marcadas no evento " + evento.nome });
				else
					res.render("participante/certificado", { layout: "layout-externo", imagemFundo: false, titulo: "Certificado de Participação", palestrante: false, participante: participante, evento: evento, idcertificado: idcertificado, presencas: presencas });
			}
		}
	}
}));

router.all("/p/:e/:s/:senha", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	let e = req.params["e"] as string;
	let s = req.params["s"] as string;
	let senhapresenca = req.params["senha"] as string;
	if (p) {
		let evt = Evento.idsPorUrl["/" + e];
		let sid = parseInt(s);
		if (evt && evt.habilitado && sid && sid > 0) {
			let mensagem: string = null;

			if (!senhapresenca || senhapresenca !== await Sessao.obterSenhaPresenca(sid, evt.id))
				mensagem = "Não foi possível marcar presença na sessão com o código fornecido";
			else
				mensagem = await Participante.marcarPresenca(null, evt.id, sid, p.id, null, true);

			res.cookie("participanteSenhaPresenca", "", { expires: new Date(0), httpOnly: true, path: "/", secure: false });

			if (mensagem)
				res.render("participante/mensagem", { layout: "layout-participante", titulo: "Erro", mensagem: mensagem, participante: p });
			else
				res.render("participante/mensagem", { layout: "layout-participante", titulo: "Sucesso", mensagem: "Presença marcada com sucesso", participante: p, sucesso: true });
		} else {
			res.render("participante/mensagem", { layout: "layout-participante", titulo: "Erro", mensagem: "Não foi possível encontrar o evento selecionado", participante: p });
		}
	} else {
		res.cookie("participanteSenhaPresenca", senhapresenca || "", { maxAge: 1 * 60 * 60 * 1000, httpOnly: true, path: "/", secure: false });
		res.redirect("/participante/login/" + e + "/" + s);
	}
}));

router.all("/logout", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	if (p)
		await Participante.efetuarLogout(p, res);
	res.redirect("/participante");
}));

// Helper para sincronizar e atualizar os dados em lote
/*
import IntegracaoMicroservices = require("../models/integracao/microservices");
import Sql = require("../infra/sql");

router.get("/ms/:ra?", wrap(async (req: express.Request, res: express.Response) => {
	const ra = parseInt(req.params["ra"] as string);
	let participantes: any[] = null;
	if (ra) {
		participantes = [{id: 1, ra, campus: "", plano: ""}];
	} else {
		await Sql.conectar(async (sql) => {
			participantes = await sql.query("select id, ra, campus, plano from participante where tipo = 1 and ra is not null");
		});
	}
	let ok = 0, updt = 0;
	for (let i = 0; i < participantes.length; i++) {
		const p = participantes[i];
		if (p.ra && (!p.campus || !p.plano)) {
			const campusPlano = await IntegracaoMicroservices.obterCampusPlano(p.ra);
			if (campusPlano) {
				p.campus = campusPlano[0];
				p.plano = campusPlano[1];
				updt++;
			}
			ok++;
		}
	}
	await Sql.conectar(async (sql) => {
		for (let i = 0; i < participantes.length; i++) {
			const p = participantes[i];
			if (p.ra && p.campus && p.plano)
				await sql.query("update participante set campus = ?, plano = ? where id = " + p.id, [p.campus, p.plano]);
		}
	});
	res.send(`OK ${ok} / UPDT ${updt} / ${participantes.length}`);
}));
*/

export = router;
