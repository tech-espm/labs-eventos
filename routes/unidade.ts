import express = require("express");
import wrap = require("express-async-error-wrapper");
import Usuario = require("../models/usuario");
import Unidade = require("../models/unidade");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("unidade/alterar", { titulo: "Criar Unidade", usuario: u, item: null });
	}
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		let id = parseInt(req.query["id"]);
		let item: Unidade = null;
		if (isNaN(id) || !(item = await Unidade.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("unidade/alterar", { titulo: "Editar Unidade", usuario: u, item: item });
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("unidade/listar", { titulo: "Gerenciar Unidades", usuario: u, lista: JSON.stringify(await Unidade.listar()) });
	}
}));

export = router;
