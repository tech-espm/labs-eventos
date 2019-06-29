import express = require("express");
import wrap = require("express-async-error-wrapper");
import Usuario = require("../models/usuario");
import TipoEmpresa = require("../models/tipoEmpresa");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("tipoEmpresa/alterar", { titulo: "Criar Tipo de Empresa", usuario: u, item: null });
	}
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		let id = parseInt(req.query["id"]);
		let item: TipoEmpresa = null;
		if (isNaN(id) || !(item = await TipoEmpresa.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("tipoEmpresa/alterar", { titulo: "Editar Tipo de Empresa", usuario: u, item: item });
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("tipoEmpresa/listar", { titulo: "Gerenciar Tipos de Empresa", usuario: u, lista: JSON.stringify(await TipoEmpresa.listar()) });
	}
}));

export = router;
