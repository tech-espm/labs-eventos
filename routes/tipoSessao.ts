﻿import express = require("express");
import wrap = require("express-async-error-wrapper");
import Usuario = require("../models/usuario");
import TipoSessao = require("../models/tipoSessao");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("tipoSessao/alterar", { titulo: "Criar Tipo de Sessão", usuario: u, item: null });
	}
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		let id = parseInt(req.query["id"] as string);
		let item: TipoSessao = null;
		if (isNaN(id) || !(item = await TipoSessao.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("tipoSessao/alterar", { titulo: "Editar Tipo de Sessão", usuario: u, item: item });
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("tipoSessao/listar", { titulo: "Gerenciar Tipos de Sessão", usuario: u, lista: JSON.stringify(await TipoSessao.listar()) });
	}
}));

export = router;
