import express = require("express");
import multer = require("multer");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");
import Palestrante = require("../../models/palestrante");

const router = express.Router();

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	res.json(await Palestrante.listar(u.idevento_logado));
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	res.json(isNaN(id) ? null : await Palestrante.obter(id, u.idevento_logado));
}));

router.post("/criar", multer().single("imagem"), wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let p = req.body as Palestrante;
	if (p) {
		p.idevento = u.idevento_logado;
		p.ocultar = parseInt(req.body.ocultar);
		p.prioridade = parseInt(req.body.prioridade);
		p.idempresa = parseInt(req.body.idempresa);
		p.versao = parseInt(req.body.versao);
	}
	jsonRes(res, 400, p && req["file"] && req["file"].buffer && req["file"].size && req["file"].size <= Palestrante.tamanhoMaximoImagemEmBytes ? await Palestrante.criar(p, req["file"]) : "Dados inválidos!");
}));

router.post("/alterar", multer().single("imagem"), wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let p = req.body as Palestrante;
	if (p) {
		p.id = parseInt(req.body.id);
		p.ocultar = parseInt(req.body.ocultar);
		p.prioridade = parseInt(req.body.prioridade);
		p.idevento = u.idevento_logado;
		p.idempresa = parseInt(req.body.idempresa);
		p.versao = parseInt(req.body.versao);
	}
	jsonRes(res, 400, (p && !isNaN(p.id) && (!req["file"] || !req["file"].buffer || !req["file"].size || req["file"].size <= Palestrante.tamanhoMaximoImagemEmBytes)) ? await Palestrante.alterar(p, req["file"]) : "Dados inválidos!");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos!" : await Palestrante.excluir(id, u.idevento_logado));
}));

export = router;
