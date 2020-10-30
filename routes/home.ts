﻿import express = require("express");
import wrap = require("express-async-error-wrapper");
import Evento = require("../models/evento");
import Curso = require("../models/curso");
import Formato = require("../models/formato");
import Local = require("../models/local");
import TipoSessao = require("../models/tipoSessao");
import Vertical = require("../models/vertical");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");

const router = express.Router();

router.all("/", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u) {
		// Não é mais permitido fazer login no sistema utilizando sem ser via integração com o CAS.
		//
		//if (req.body.login || req.body.senha) {
		//	let mensagem: string = null;
		//	[mensagem, u] = await Usuario.efetuarLogin(req.body.login as string, req.body.senha as string, null, res);
		//	if (mensagem)
		//		res.render("home/login", { layout: "layout-externo", imagemFundo: true, mensagem: mensagem, loginUrl: appsettings.loginUrl });
		//	else
		//		res.render("home/index", { usuario: u, listaEventos: JSON.stringify(await Evento.listarDeUsuarioPorTipo(u.id, u.admin)) });
		//} else {
			res.render("home/login", { layout: "layout-externo", imagemFundo: true, mensagem: null, loginUrl: appsettings.loginAdminUrl });
		//}
	} else {
		res.render("home/index", { usuario: u, listaEventos: JSON.stringify(await Evento.listarDeUsuarioPorTipo(u.id, u.admin)) });
	}
}));

router.get("/acesso", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u) {
		res.redirect("/");
	} else {
		res.render("home/acesso", { titulo: "Sem Permissão", usuario: u });
	}
}));

router.get("/perfil", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u) {
		res.redirect("/");
	} else {
		res.render("home/perfil", { titulo: "Meu Perfil", usuario: u });
	}
}));

router.get("/sugestao/:url/:senha", wrap(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
	let url = (req.params["url"] as string || "").normalize().trim().toLowerCase();
	let senha = (req.params["senha"] as string || "").normalize().trim();
	url = "/" + url;
	let evento = Evento.idsPorUrl[url];
	if (!evento || !evento.id || !evento.senhasugestao || evento.senhasugestao !== senha) {
		next();
		return;
	}
	res.render("evento/sessao-externa", {
		layout: "layout-externo",
		usuario: null,
		imagemFundo: true,
		panelHeadingPersonalizado: true,
		titulo: "Sugestão de Sessão",
		idevento: evento.id,
		url: url,
		senha: senha,
		evento: await Evento.obter(evento.id, false),
		cursos: JSON.stringify(await Curso.listarExterno()),
		formatos: JSON.stringify(await Formato.listar()),
		eventoLocais: JSON.stringify(await Local.eventoListar(evento.id)),
		locais: JSON.stringify(await Local.listar()),
		tipoSessoes: JSON.stringify(await TipoSessao.listar()),
		verticais: JSON.stringify(await Vertical.listar())
	});
}));

router.get("/logout", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (u)
		await u.efetuarLogout(res);
	res.redirect("/");
}));

export = router;
