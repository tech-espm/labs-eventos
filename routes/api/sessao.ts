import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");
import Sessao = require("../../models/sessao");

const router = express.Router();

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	res.json(await Sessao.listar(u.idevento_logado));
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	res.json(isNaN(id) ? null : await Sessao.obter(id, u.idevento_logado));
}));

router.get("/listarAceites", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	res.json(isNaN(id) ? null : await Sessao.listarAceites(id, u.idevento_logado));
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let s = req.body as Sessao;
	if (s) {
		s.idcurso = parseInt(req.body.idcurso);
		s.idevento = u.idevento_logado;
		s.ideventodata = parseInt(req.body.ideventodata);
		s.ideventohorario = parseInt(req.body.ideventohorario);
		s.ideventolocal = parseInt(req.body.ideventolocal);
		s.idformato = parseInt(req.body.idformato);
		s.idtiposessao = parseInt(req.body.idtiposessao);
		s.idvertical = parseInt(req.body.idvertical);
		s.oculta = parseInt(req.body.oculta);
		s.sugestao = parseInt(req.body.sugestao);
		let p = req.body.idpalestrantes;
		if (p && p.length) {
			for (let i = p.length - 1; i >= 0; i--)
				s.idspalestrante[i] = parseInt(p[i]);
		}
	}
	jsonRes(res, 400, s ? await Sessao.criar(s) : "Dados inválidos!");
}));

router.post("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let s = req.body as Sessao;
	if (s) {
		s.id = parseInt(req.body.id);
		s.idcurso = parseInt(req.body.idcurso);
		s.idevento = u.idevento_logado;
		s.ideventodata = parseInt(req.body.ideventodata);
		s.ideventohorario = parseInt(req.body.ideventohorario);
		s.ideventolocal = parseInt(req.body.ideventolocal);
		s.idformato = parseInt(req.body.idformato);
		s.idtiposessao = parseInt(req.body.idtiposessao);
		s.idvertical = parseInt(req.body.idvertical);
		s.oculta = parseInt(req.body.oculta);
		s.sugestao = parseInt(req.body.sugestao);
		let p = req.body.idpalestrantes;
		if (p && p.length) {
			for (let i = p.length - 1; i >= 0; i--)
				s.idspalestrante[i] = parseInt(p[i]);
		}
	}
	jsonRes(res, 400, (s && !isNaN(s.id)) ? await Sessao.alterar(s) : "Dados inválidos!");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos!" : await Sessao.excluir(id, u.idevento_logado));
}));

export = router;
