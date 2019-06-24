import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");
import Instrucao = require("../../models/instrucao");

const router = express.Router();

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	res.json(await Instrucao.listar());
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let id = parseInt(req.query["id"]);
	res.json(isNaN(id) ? null : await Instrucao.obter(id));
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let i = req.body as Instrucao;
	if (i)
		i.ordem = parseInt(req.body.ordem);
	jsonRes(res, 400, i ? await Instrucao.criar(i) : "Dados inválidos!");
}));

router.post("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let i = req.body as Instrucao;
	if (i) {
		i.id = parseInt(req.body.id);
		i.ordem = parseInt(req.body.ordem);
	}
	jsonRes(res, 400, (i && !isNaN(i.id)) ? await Instrucao.alterar(i) : "Dados inválidos!");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos!" : await Instrucao.excluir(id));
}));

export = router;
