import express = require("express");
import wrap = require("express-async-error-wrapper");
import Usuario = require("../models/usuario");
import Instrucao = require("../models/instrucao");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("instrucao/alterar", { titulo: "Criar Nível de Instrução", usuario: u, item: null });
	}
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		let id = parseInt(req.query["id"]);
		let item: Instrucao = null;
		if (isNaN(id) || !(item = await Instrucao.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("instrucao/alterar", { titulo: "Editar Nível de Instrução", usuario: u, item: item });
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("instrucao/listar", { titulo: "Gerenciar Níveis de Instrução", usuario: u, lista: JSON.stringify(await Instrucao.listar()) });
	}
}));

export = router;
