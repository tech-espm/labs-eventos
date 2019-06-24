import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");
import Horario = require("../../models/horario");

const router = express.Router();

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	res.json(await Horario.listar(u.idevento_logado));
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	res.json(isNaN(id) ? null : await Horario.obter(id, u.idevento_logado));
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let h = req.body as Horario;
	if (h) {
		h.idevento = u.idevento_logado;
		h.ordem = parseInt(req.body.ordem);
	}
	jsonRes(res, 400, h ? await Horario.criar(h) : "Dados inválidos!");
}));

router.post("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let h = req.body as Horario;
	if (h) {
		h.id = parseInt(req.body.id);
		h.idevento = u.idevento_logado;
		h.ordem = parseInt(req.body.ordem);
	}
	jsonRes(res, 400, (h && !isNaN(h.id)) ? await Horario.alterar(h) : "Dados inválidos!");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos!" : await Horario.excluir(id, u.idevento_logado));
}));

export = router;
