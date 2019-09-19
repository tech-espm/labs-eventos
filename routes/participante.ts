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

router.all("/login/:e/:s?", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	let e = req.params["e"] as string;
	let s = req.params["s"] as string;
	if (p) {
		res.redirect((s && parseInt(s)) ? ("/participante/inscricao/" + e + "/" + s) : ("/" + e));
	} else if (req.body.email || req.body.senha) {
		let mensagem: string = null;

		[mensagem, p] = await Participante.efetuarLogin(req.body.email as string, req.body.senha as string, null, res);
		if (mensagem) {
			res.render("participante/login", { layout: "layout-externo", imagemFundo: true, mensagem: mensagem, loginUrl: appsettings.loginUrl });
		} else {
			res.cookie("participanteEvt", "", { expires: new Date(0), httpOnly: true, path: "/", secure: false });
			// Quando o evento for "home", deve redirecionar o usuário para
			// a tela de gerenciamento de inscrições e certificados
			if (e === "home")
				res.redirect("/participante/home");
			else
				res.redirect((s && parseInt(s)) ? ("/participante/inscricao/" + e + "/" + s) : ("/" + e));
		}
	} else {
		res.cookie("participanteEvt", e, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, path: "/", secure: false });
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
				res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, mensagem: r });
				return;
			}

			r = await Sessao.inscrever(sid, p.id);

			if (r)
				res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, mensagem: r });
			else
				res.render("shared/sucesso-fundo", { layout: "layout-externo", imagemFundo: true, mensagem: "Inscrição efetuada com sucesso" });
		} else {
			res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, mensagem: "Não foi possível encontrar o evento selecionado" });
		}
	} else {
		res.redirect("/participante/login/" + e + "/" + s);
	}
}));

router.all("/redefinirSenha", wrap(async (req: express.Request, res: express.Response) => {
	res.render("participante/redefinirSenha", { layout: "layout-externo", imagemFundo: true, email: (req.query["e"] || ""), token: (req.query["t"] || "") });
}));

router.all("/modal", wrap(async (req: express.Request, res: express.Response) => {
	res.render("participante/modal", { layout: "layout-vazio", industrias: await Industria.listar(), instrucoes: await Instrucao.listar(), profissoes: await Profissao.listar() });
}));

router.all("/home", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	if (!p) {
		res.redirect("/participante/login/home");
	} else {
		res.render("participante/home", { layout: "layout-externo", imagemFundo: true, participante: p });
	}
}));

export = router;
