import express = require("express");
import wrap = require("express-async-error-wrapper");
import Usuario = require("../models/usuario");
import Local = require("../models/local");
import Unidade = require("../models/unidade");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("local/alterar", { titulo: "Criar Local", usuario: u, item: null, unidades: await Unidade.listar() });
	}
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		let id = parseInt(req.query["id"]);
		let item: Local = null;
		if (isNaN(id) || !(item = await Local.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("local/alterar", { titulo: "Editar Local", usuario: u, item: item, unidades: await Unidade.listar() });
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("local/listar", { titulo: "Gerenciar Locais", usuario: u, lista: JSON.stringify(await Local.listar()) });
	}
}));

export = router;
