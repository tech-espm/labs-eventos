import express = require("express");
import multer = require("multer");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");
import Empresa = require("../../models/empresa");

const router = express.Router();

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	res.json(await Empresa.listar(u.idevento_logado));
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	res.json(isNaN(id) ? null : await Empresa.obter(id, u.idevento_logado));
}));

router.post("/criar", multer().single("imagem"), wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let e = req.body as Empresa;
	if (e) {
		e.idevento = u.idevento_logado;
		e.idtipo = parseInt(req.body.idtipo);
		e.versao = parseInt(req.body.versao);
	}
	jsonRes(res, 400, e && req["file"] && req["file"].buffer && req["file"].size && req["file"].size <= Empresa.tamanhoMaximoImagemEmBytes ? await Empresa.criar(e, req["file"]) : "Dados inválidos!");
}));

router.post("/alterar", multer().single("imagem"), wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let e = req.body as Empresa;
	if (e) {
		e.id = parseInt(req.body.id);
		e.idevento = u.idevento_logado;
		e.idtipo = parseInt(req.body.idtipo);
		e.versao = parseInt(req.body.versao);
	}
	jsonRes(res, 400, (e && !isNaN(e.id) && (!req["file"] || !req["file"].buffer || !req["file"].size || req["file"].size <= Empresa.tamanhoMaximoImagemEmBytes)) ? await Empresa.alterar(e, req["file"]) : "Dados inválidos!");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos!" : await Empresa.excluir(id, u.idevento_logado));
}));

export = router;
