import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");
import Industria = require("../../models/industria");

const router = express.Router();

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	res.json(await Industria.listar());
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let id = parseInt(req.query["id"] as string);
	res.json(isNaN(id) ? null : await Industria.obter(id));
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let i = req.body as Industria;
	jsonRes(res, 400, i ? await Industria.criar(i) : "Dados inválidos!");
}));

router.post("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let i = req.body as Industria;
	if (i)
		i.id = parseInt(req.body.id);
	jsonRes(res, 400, (i && !isNaN(i.id)) ? await Industria.alterar(i) : "Dados inválidos!");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let id = parseInt(req.query["id"] as string);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos!" : await Industria.excluir(id));
}));

export = router;
