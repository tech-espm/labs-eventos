import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");
import Formato = require("../../models/formato");

const router = express.Router();

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	res.json(await Formato.listar());
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let id = parseInt(req.query["id"] as string);
	res.json(isNaN(id) ? null : await Formato.obter(id));
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let f = req.body as Formato;
	jsonRes(res, 400, f ? await Formato.criar(f) : "Dados inválidos!");
}));

router.post("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let f = req.body as Formato;
	if (f)
		f.id = parseInt(req.body.id);
	jsonRes(res, 400, (f && !isNaN(f.id)) ? await Formato.alterar(f) : "Dados inválidos!");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let id = parseInt(req.query["id"] as string);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos!" : await Formato.excluir(id));
}));

export = router;
