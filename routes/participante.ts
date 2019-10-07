import express = require("express");
import wrap = require("express-async-error-wrapper");
import Evento = require("../models/evento");
import Industria = require("../models/industria");
import Instrucao = require("../models/instrucao");
import Participante = require("../models/participante");
import Profissao = require("../models/profissao");
import Sessao = require("../models/sessao");
import appsettings = require("../appsettings");

const router = express.Router();

router.all("/login/:e?/:s?", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	let e = req.params["e"] as string;
	let s = req.params["s"] as string;
	// Quando o evento for "home", deve redirecionar o usuário para
	// a tela de gerenciamento de inscrições e certificados
	if (!e)
		e = "home";
	if (p) {
		res.redirect((e === "home") ? "/participante" : ((s && parseInt(s)) ? ("/participante/inscricao/" + e + "/" + s) : ("/" + e)));
	} else if (req.body.email || req.body.senha) {
		let mensagem: string = null;

		[mensagem, p] = await Participante.efetuarLogin(req.body.email as string, req.body.senha as string, null, res);
		if (mensagem) {
			res.render("participante/login", { layout: "layout-externo", imagemFundo: true, mensagem: mensagem, loginUrl: appsettings.loginUrl });
		} else {
			res.cookie("participanteEvt", "", { expires: new Date(0), httpOnly: true, path: "/", secure: false });
			res.redirect((e === "home") ? "/participante" : ((s && parseInt(s)) ? ("/participante/inscricao/" + e + "/" + s) : ("/" + e)));
		}
	} else {
		res.cookie("participanteEvt", e + "|" + s, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, path: "/", secure: false });
		res.render("participante/login", { layout: "layout-externo", imagemFundo: true, mensagem: null, evento: e, loginUrl: appsettings.loginUrl });
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
			(evento = await Evento.obter(evt.id))) {

			let r = Evento.permiteParticipante(evento, p.tipo);

			if (r) {
				res.render("participante/mensagem", { layout: "layout-participante", titulo: "Erro", mensagem: r, participante: p });
				return;
			}

			r = await Sessao.inscrever(sid, evento.id, p.id);

			if (r)
				res.render("participante/mensagem", { layout: "layout-participante", titulo: "Erro", mensagem: r, participante: p });
			else
				res.render("participante/mensagem", { layout: "layout-participante", titulo: "Sucesso na Inscrição", mensagem: "Inscrição efetuada com sucesso", participante: p, sucesso: true });
		} else {
			res.render("participante/mensagem", { layout: "layout-participante", titulo: "Erro", mensagem: "Não foi possível encontrar o evento selecionado", participante: p });
		}
	} else {
		res.redirect("/participante/login/" + e + "/" + s);
	}
}));

router.all("/redefinirSenha", wrap(async (req: express.Request, res: express.Response) => {
	res.render("participante/redefinirSenha", { layout: "layout-externo", imagemFundo: true, titulo: "Redefinição de Senha", email: (req.query["e"] || ""), token: (req.query["t"] || "") });
}));

router.all("/modal", wrap(async (req: express.Request, res: express.Response) => {
	res.render("participante/modal", { layout: "layout-vazio", industrias: await Industria.listar(), instrucoes: await Instrucao.listar(), profissoes: await Profissao.listar() });
}));

router.all("/", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	if (!p) {
		res.redirect("/participante/login");
	} else {
		let eventos = await Participante.listarEventos(p);
		if (!eventos || !eventos.length)
			res.render("participante/mensagem", { layout: "layout-participante", titulo: "Meus Eventos", ocultarBotao: true, mensagem: "Você ainda não participou de nenhum evento conosco", participante: p });
		else
			res.render("participante/home", { layout: "layout-participante", titulo: "Meus Eventos", participante: p, eventos: JSON.stringify(eventos) });
	}
}));

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
			let evento = await Evento.obter(ids[1]);
			if (!evento) {
				res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro de Certificado", mensagem: "Evento não encontrado" });
			} else {
				let presencas = await Participante.listarPresencas(ids[0], ids[1]);
				if (!presencas || !presencas.length)
					res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro de Certificado", mensagem: "O participante não possui presenças no evento " + evento.nome });
				else
					res.render("participante/certificado", { layout: "layout-externo", imagemFundo: true, titulo: "Certificado de Participação", palestrante: false, participante: participante, evento: evento, idcertificado: idcertificado, presencas: JSON.stringify(presencas) });
			}
		}
	}
}));

router.all("/logout", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	if (p)
		await Participante.efetuarLogout(p, res);
	res.redirect("/participante");
}));

export = router;
