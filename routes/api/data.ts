import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");
import Data = require("../../models/data");

const router = express.Router();

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	res.json(await Data.listar(u.idevento_logado));
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	res.json(isNaN(id) ? null : await Data.obter(id, u.idevento_logado));
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let d = req.body as Data;
	if (d) {
		d.idevento = u.idevento_logado;
		d.ano = parseInt(req.body.ano);
		d.mes = parseInt(req.body.mes);
		d.dia = parseInt(req.body.dia);
	}
	jsonRes(res, 400, d ? await Data.criar(d) : "Dados inválidos!");
}));

router.post("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let d = req.body as Data;
	if (d) {
		d.id = parseInt(req.body.id);
		d.idevento = u.idevento_logado;
		d.ano = parseInt(req.body.ano);
		d.mes = parseInt(req.body.mes);
		d.dia = parseInt(req.body.dia);
	}
	jsonRes(res, 400, (d && !isNaN(d.id)) ? await Data.alterar(d) : "Dados inválidos!");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos!" : await Data.excluir(id, u.idevento_logado));
}));

export = router;
