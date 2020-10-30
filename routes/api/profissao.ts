import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");
import Profissao = require("../../models/profissao");
import { fail } from "assert";

const router = express.Router();

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	res.json(await Profissao.listar());
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let id = parseInt(req.query["id"] as string);
	res.json(isNaN(id) ? null : await Profissao.obter(id));
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let p = req.body as Profissao;
	if (p)
		p.ordem = parseInt(req.body.ordem);
	jsonRes(res, 400, p ? await Profissao.criar(p) : "Dados inválidos!");
}));

router.post("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let p = req.body as Profissao;
	if (p) {
		p.id = parseInt(req.body.id);
		p.ordem = parseInt(req.body.ordem);
	}
	jsonRes(res, 400, (p && !isNaN(p.id)) ? await Profissao.alterar(p) : "Dados inválidos!");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let id = parseInt(req.query["id"] as string);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos!" : await Profissao.excluir(id));
}));

export = router;
