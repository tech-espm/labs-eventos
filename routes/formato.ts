import express = require("express");
import wrap = require("express-async-error-wrapper");
import Usuario = require("../models/usuario");
import Formato = require("../models/formato");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("formato/alterar", { titulo: "Criar Formato", usuario: u, item: null });
	}
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		let id = parseInt(req.query["id"]);
		let item: Formato = null;
		if (isNaN(id) || !(item = await Formato.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("formato/alterar", { titulo: "Editar Formato", usuario: u, item: item });
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("formato/listar", { titulo: "Gerenciar Formatos", usuario: u, lista: JSON.stringify(await Formato.listar()) });
	}
}));

export = router;
