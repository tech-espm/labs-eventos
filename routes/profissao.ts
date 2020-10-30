import express = require("express");
import wrap = require("express-async-error-wrapper");
import Usuario = require("../models/usuario");
import Profissao = require("../models/profissao");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("profissao/alterar", { titulo: "Criar Profissão", usuario: u, item: null });
	}
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		let id = parseInt(req.query["id"] as string);
		let item: Profissao = null;
		if (isNaN(id) || !(item = await Profissao.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("profissao/alterar", { titulo: "Editar Profissão", usuario: u, item: item });
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("profissao/listar", { titulo: "Gerenciar Profissões", usuario: u, lista: JSON.stringify(await Profissao.listar()) });
	}
}));

export = router;
