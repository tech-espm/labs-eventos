import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");
import TipoEmpresa = require("../../models/tipoEmpresa");

const router = express.Router();

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	res.json(await TipoEmpresa.listar());
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let id = parseInt(req.query["id"]);
	res.json(isNaN(id) ? null : await TipoEmpresa.obter(id));
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let t = req.body as TipoEmpresa;
	jsonRes(res, 400, t ? await TipoEmpresa.criar(t) : "Dados inválidos!");
}));

router.post("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let t = req.body as TipoEmpresa;
	if (t)
		t.id = parseInt(req.body.id);
	jsonRes(res, 400, (t && !isNaN(t.id)) ? await TipoEmpresa.alterar(t) : "Dados inválidos!");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos!" : await TipoEmpresa.excluir(id));
}));

export = router;
