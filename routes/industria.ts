import express = require("express");
import wrap = require("express-async-error-wrapper");
import Usuario = require("../models/usuario");
import Industria = require("../models/industria");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("industria/alterar", { titulo: "Criar Indústria", usuario: u, item: null });
	}
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		let id = parseInt(req.query["id"]);
		let item: Industria = null;
		if (isNaN(id) || !(item = await Industria.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("industria/alterar", { titulo: "Editar Indústria", usuario: u, item: item });
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("industria/listar", { titulo: "Gerenciar Indústrias", usuario: u, lista: JSON.stringify(await Industria.listar()) });
	}
}));

export = router;
