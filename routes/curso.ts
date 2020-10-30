import express = require("express");
import wrap = require("express-async-error-wrapper");
import Usuario = require("../models/usuario");
import Curso = require("../models/curso");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("curso/alterar", { titulo: "Criar Âncora", usuario: u, item: null });
	}
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		let id = parseInt(req.query["id"] as string);
		let item: Curso = null;
		if (isNaN(id) || !(item = await Curso.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("curso/alterar", { titulo: "Editar Âncora", usuario: u, item: item });
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("curso/listar", { titulo: "Gerenciar Âncoras", usuario: u, lista: JSON.stringify(await Curso.listar()) });
	}
}));

export = router;
