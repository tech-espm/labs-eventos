import express = require("express");
import wrap = require("express-async-error-wrapper");
import Usuario = require("../models/usuario");
import Vertical = require("../models/vertical");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("vertical/alterar", { titulo: "Criar Vertical", usuario: u, item: null });
	}
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		let id = parseInt(req.query["id"]);
		let item: Vertical = null;
		if (isNaN(id) || !(item = await Vertical.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("vertical/alterar", { titulo: "Editar Vertical", usuario: u, item: item });
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("vertical/listar", { titulo: "Gerenciar Verticais", usuario: u, lista: JSON.stringify(await Vertical.listar()) });
	}
}));

export = router;
