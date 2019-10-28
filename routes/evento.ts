import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../utils/jsonRes");
import Usuario = require("../models/usuario");
import Evento = require("../models/evento");
import Data = require("../models/data");
import TipoEmpresa = require("../models/tipoEmpresa");
import Empresa = require("../models/empresa");
import Horario = require("../models/horario");
import Local = require("../models/local");
import Palestrante = require("../models/palestrante");
import Curso = require("../models/curso");
import Formato = require("../models/formato");
import TipoSessao = require("../models/tipoSessao");
import Vertical = require("../models/vertical");
import Sessao = require("../models/sessao");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("evento/alterar", { titulo: "Criar Evento", usuario: u, item: null });
	}
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		let id = parseInt(req.query["id"]);
		let item: Evento = null;
		if (isNaN(id) || !(item = await Evento.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("evento/alterar", { titulo: "Editar Evento", usuario: u, item: item });
	}
}));

router.all("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("evento/listar", { titulo: "Gerenciar Eventos", usuario: u, lista: JSON.stringify(await Evento.listar()) });
	}
}));

router.all("/", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u) {
		res.redirect("/acesso");
	} else if (!u.idevento_logado || !u.nomeevento_logado) {
		res.redirect("/");
	} else {
		let item: Evento = null;
		if (!(item = await Evento.obter(u.idevento_logado))) {
			res.render("home/nao-encontrado", { usuario: u });
		} else {
			res.render("evento/controlar", {
				titulo: "Controlar Evento",
				usuario: u,
				item: item
			});
		}
	}
}));

router.get("/controlar-arquivos", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		res.render("evento/controlar-arquivos", {
			layout: "layout-vazio",
			usuario: u,
			caminhoAbsolutoExterno: Evento.caminhoAbsolutoExterno(u.idevento_logado),
			arquivos: JSON.stringify(await Evento.listarArquivos(u.idevento_logado))
		});
	}
}));

router.get("/controlar-datas", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		res.render("evento/controlar-datas", {
			layout: "layout-vazio",
			usuario: u,
			idevento: u.idevento_logado,
			datas: JSON.stringify(await Data.listar(u.idevento_logado))
		});
	}
}));

router.get("/controlar-empresas", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		res.render("evento/controlar-empresas", {
			layout: "layout-vazio",
			usuario: u,
			idevento: u.idevento_logado,
			extensaoImagem: Empresa.extensaoImagem,
			caminhoAbsolutoPastaExterno: Empresa.caminhoAbsolutoPastaExterno(u.idevento_logado),
			tipoEmpresas: await TipoEmpresa.listar(),
			empresas: JSON.stringify(await Empresa.listar(u.idevento_logado))
		});
	}
}));

router.get("/controlar-horarios", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		res.render("evento/controlar-horarios", {
			layout: "layout-vazio",
			usuario: u,
			idevento: u.idevento_logado,
			horarios: JSON.stringify(await Horario.listar(u.idevento_logado))
		});
	}
}));

router.get("/controlar-landing-page", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		res.render("evento/controlar-landing-page", {
			layout: "layout-vazio",
			usuario: u,
			evento: await Evento.obter(u.idevento_logado),
			caminhoAbsolutoExterno: Evento.caminhoAbsolutoExterno(u.idevento_logado),
			landingPageExiste: await Evento.landingPageExiste(u.idevento_logado)
		});
	}
}));

router.get("/controlar-locais", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		res.render("evento/controlar-locais", {
			layout: "layout-vazio",
			usuario: u,
			locais: JSON.stringify(await Local.listar()),
			eventoLocais: JSON.stringify(await Local.eventoListar(u.idevento_logado))
		});
	}
}));

router.get("/controlar-palestrantes", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		let evt = Evento.eventosPorId[u.idevento_logado];
		res.render("evento/controlar-palestrantes", {
			layout: "layout-vazio",
			usuario: u,
			idevento: u.idevento_logado,
			urlEvento: (evt ? evt.url : ""),
			extensaoImagem: Palestrante.extensaoImagem,
			caminhoAbsolutoPastaExterno: Palestrante.caminhoAbsolutoPastaExterno(u.idevento_logado),
			empresas: JSON.stringify(await Empresa.listar(u.idevento_logado)),
			palestrantes: JSON.stringify(await Palestrante.listar(u.idevento_logado))
		});
	}
}));

router.get("/controlar-sessoes", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		let evt = Evento.eventosPorId[u.idevento_logado];
		res.render("evento/controlar-sessoes", {
			layout: "layout-vazio",
			usuario: u,
			idevento: u.idevento_logado,
			urlEvento: (evt ? evt.url : ""),
			extensaoImagem: Palestrante.extensaoImagem,
			datas: JSON.stringify(await Data.listar(u.idevento_logado)),
			empresas: JSON.stringify(await Empresa.listar(u.idevento_logado)),
			horarios: JSON.stringify(await Horario.listar(u.idevento_logado)),
			locais: JSON.stringify(await Local.listar()),
			eventoLocais: JSON.stringify(await Local.eventoListar(u.idevento_logado)),
			palestrantes: JSON.stringify(await Palestrante.listar(u.idevento_logado)),
			cursos: JSON.stringify(await Curso.listar()),
			formatos: JSON.stringify(await Formato.listar()),
			tipoSessoes: JSON.stringify(await TipoSessao.listar()),
			verticais: JSON.stringify(await Vertical.listar()),
			sessoes: JSON.stringify(await Sessao.listar(u.idevento_logado)),
			presencas: JSON.stringify(await Evento.listarInscricoesEPresencas(u.idevento_logado))
		});
	}
}));

router.get("/controlar-usuarios", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		let usuarios: Usuario[] = (u.admin ? await Usuario.listar() : null);
		let eventoUsuarios: Usuario[] = (u.admin ? await Usuario.eventoListar(u.idevento_logado) : null);

		res.render("evento/controlar-usuarios", {
			layout: "layout-vazio",
			usuario: u,
			usuarios: JSON.stringify(usuarios),
			eventoUsuarios: JSON.stringify(eventoUsuarios),
		});
	}
}));

router.all("/palestrante/:h", wrap(async (req: express.Request, res: express.Response) => {
	let hash = req.params["h"] as string;
	let id: number, idevento: number;
	[id, idevento] = await Palestrante.validarHashExterno(hash);
	if (id <= 0 || idevento <= 0) {
		res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro de Chave", mensagem: "Chave de acesso inválida" });
		return;
	}

	let evt = Evento.eventosPorId[idevento];
	if (!evt || !evt.habilitado) {
		res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro", mensagem: "Não foi possível encontrar um evento com essa chave de acesso" });
		return;
	}

	let p = await Palestrante.obter(id, idevento);
	if (!p) {
		res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro", mensagem: "Não foi possível encontrar um palestrante com essa chave de acesso" });
		return;
	}

	res.render("evento/palestrante-externo", { layout: "layout-externo", imagemFundo: true, titulo: "Minhas Informações", palestrante: p, idcertificado: Palestrante.idPalestranteParaIdCertificado(id, idevento), empresa: await Empresa.obter(p.idempresa, idevento), evento: await Evento.obter(idevento), sessoes: await Palestrante.listarSessoesEAceites(id, idevento), hash: hash });
}));

router.all("/certificado/:i", wrap(async (req: express.Request, res: express.Response) => {
	let idcertificado = req.params["i"] as string;
	let ids = Palestrante.idCertificadoParaIdPalestrante(idcertificado);
	if (!ids) {
		res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro de Certificado", mensagem: "Código de certificado inválido" });
	} else {
		let palestrante = await Palestrante.obter(ids[0], ids[1]);
		if (!palestrante) {
			res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro de Certificado", mensagem: "Participante não encontrado" });
		} else {
			let evento = await Evento.obter(ids[1]);
			if (!evento) {
				res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro de Certificado", mensagem: "Evento não encontrado" });
			} else if (!evento.certificadoliberado) {
				res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro de Certificado", mensagem: "Os certificados só estarão disponíveis depois da conclusão do evento" });
			} else {
				let sessoes = await Palestrante.listarSessoesEAceites(ids[0], ids[1]);
				if (!sessoes || !sessoes.length)
					res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro de Certificado", mensagem: "O palestrante não possui sessões no evento " + evento.nome });
				else
					res.render("participante/certificado", { layout: "layout-externo", imagemFundo: true, titulo: "Certificado de Participação", palestrante: true, participante: palestrante, evento: evento, idcertificado: idcertificado, presencas: JSON.stringify(sessoes) });
			}
		}
	}
}));

export = router;
