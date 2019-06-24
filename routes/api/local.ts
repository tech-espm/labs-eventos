import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");
import Local = require("../../models/local");

const router = express.Router();

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	res.json(await Local.listar());
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let id = parseInt(req.query["id"]);
	res.json(isNaN(id) ? null : await Local.obter(id));
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let l = req.body as Local;
	if (l) {
		l.idunidade = parseInt(req.body.idunidade);
		l.capacidade_real = parseInt(req.body.capacidade_real);
	}
	jsonRes(res, 400, l ? await Local.criar(l) : "Dados inválidos!");
}));

router.post("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let l = req.body as Local;
	if (l) {
		l.id = parseInt(req.body.id);
		l.idunidade = parseInt(req.body.idunidade);
		l.capacidade_real = parseInt(req.body.capacidade_real);
	}
	jsonRes(res, 400, (l && !isNaN(l.id)) ? await Local.alterar(l) : "Dados inválidos!");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos!" : await Local.excluir(id));
}));

// Eventos

router.get("/eventoListar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	res.json(await Local.eventoListar(u.idevento_logado));
}));

router.post("/eventoAssociar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let idlocal = parseInt(req.body.idlocal);
	let capacidade = parseInt(req.body.capacidade);
	jsonRes(res, 400, (isNaN(idlocal) || isNaN(capacidade)) ? "Dados inválidos!" : await Local.eventoAssociar(u.idevento_logado, idlocal, capacidade));
	//let u = await Usuario.cookie(req, res);
	//if (!u)
	//	return;
	//let idslocal: number[] = [];
	//let ids = req.body.idslocal as [];
	//if (ids && ids.length) {
	//	for (let i = 0; i < ids.length; i++) {
	//		let idlocal = parseInt(ids[i]);
	//		if (isNaN(idlocal)) {
	//			jsonRes(res, 400, "Dados inválidos!");
	//			return;
	//		}
	//		idslocal.push(idlocal);
	//	}
	//}
	//let lcaps: number[] = [];
	//let bcaps = req.body.lcaps as [];
	//if (bcaps && bcaps.length) {
	//	for (let i = 0; i < bcaps.length; i++) {
	//		let capacidade = parseInt(bcaps[i]);
	//		if (isNaN(capacidade) || capacidade < 0) {
	//			jsonRes(res, 400, "Dados inválidos!");
	//			return;
	//		}
	//		lcaps.push(capacidade);
	//	}
	//}
	//jsonRes(res, 400, (!idslocal.length || !lcaps.length || idslocal.length !== lcaps.length) ? "Dados inválidos!" : await Local.eventoAssociarMulti(u.idevento_logado, idslocal, lcaps));
}));

router.post("/eventoDesassociar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let idslocal: number[] = [];
	let ids = req.body.idslocal as [];
	if (ids && ids.length) {
		for (let i = 0; i < ids.length; i++) {
			let idlocal = parseInt(ids[i]);
			if (isNaN(idlocal)) {
				jsonRes(res, 400, "Dados inválidos!");
				return;
			}
			idslocal.push(idlocal);
		}
	}
	jsonRes(res, 400, !idslocal.length ? "Dados inválidos!" : await Local.eventoDesassociar(u.idevento_logado, idslocal));
}));

router.post("/eventoAlterarCapacidade", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let idlocal = parseInt(req.body.idlocal);
	let capacidade = parseInt(req.body.capacidade);
	jsonRes(res, 400, (isNaN(idlocal) || isNaN(capacidade)) ? "Dados inválidos!" : await Local.eventoAlterarCapacidade(u.idevento_logado, idlocal, capacidade));
}));

export = router;
