import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Evento = require("../../models/evento");
import Usuario = require("../../models/usuario");
import PalestranteResumido = require("../../models/palestranteResumido");
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
		s.ideventolocal = parseInt(req.body.ideventolocal);
		s.idformato = parseInt(req.body.idformato);
		s.idtiposessao = parseInt(req.body.idtiposessao);
		s.idvertical = parseInt(req.body.idvertical);
		s.inicio = parseInt((req.body.inicio || "").replace(":", ""));
		s.termino = parseInt((req.body.termino || "").replace(":", ""));
		s.oculta = parseInt(req.body.oculta);
		s.sugestao = parseInt(req.body.sugestao);
		s.permiteinscricao = parseInt(req.body.permiteinscricao);
		s.permiteacom = parseInt(req.body.permiteacom);
		let p = req.body.idpalestrantes;
		if (p && p.length) {
			for (let i = p.length - 1; i >= 0; i--)
				s.idspalestrante[i] = parseInt(p[i]);
		}
	}
	jsonRes(res, 400, s ? await Sessao.criar(s) : "Dados inválidos!");
}));

router.post("/criarExterno", wrap(async (req: express.Request, res: express.Response) => {
	let s = req.body as Sessao;
	if (s) {
		let url = (req.body.url as string || "");
		let senha = (req.body.senha as string || "");
		let evento = Evento.idsPorUrl[url];
		if (!evento || !evento.id || evento.id !== parseInt(req.body.idevento) || !evento.senhasugestao || evento.senhasugestao !== senha)
			s = null;
	}
	if (s) {
		s.idcurso = parseInt(req.body.idcurso);
		s.idevento = parseInt(req.body.idevento);
		s.ideventolocal = parseInt(req.body.ideventolocal);
		s.idformato = parseInt(req.body.idformato);
		s.idtiposessao = parseInt(req.body.idtiposessao);
		s.idvertical = parseInt(req.body.idvertical);
		s.inicio = parseInt((req.body.inicio || "").replace(":", ""));
		s.termino = parseInt((req.body.termino || "").replace(":", ""));
		s.permiteinscricao = parseInt(req.body.permiteinscricao);
		s.permiteacom = parseInt(req.body.permiteacom);
		s.oculta = 0;
		s.sugestao = 1;
	}
	jsonRes(res, 400, s ? await Sessao.criarExterno(s, (req.body.palestrantes && req.body.palestrantes.length) ? req.body.palestrantes as PalestranteResumido[] : []) : "Dados inválidos!");
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
		s.ideventolocal = parseInt(req.body.ideventolocal);
		s.idformato = parseInt(req.body.idformato);
		s.idtiposessao = parseInt(req.body.idtiposessao);
		s.idvertical = parseInt(req.body.idvertical);
		s.inicio = parseInt((req.body.inicio || "").replace(":", ""));
		s.termino = parseInt((req.body.termino || "").replace(":", ""));
		s.oculta = parseInt(req.body.oculta);
		s.sugestao = parseInt(req.body.sugestao);
		s.permiteinscricao = parseInt(req.body.permiteinscricao);
		s.permiteacom = parseInt(req.body.permiteacom);
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

router.get("/alterarSenhaPresenca", wrap(async (req: express.Request, res: express.Response) => {
	let id = parseInt(req.query["id"]);
	let idevento = parseInt(req.query["idevento"]);
	jsonRes(res, 400, (isNaN(id) || isNaN(idevento)) ? "Dados inválidos!" : await Sessao.alterarSenhaPresenca(id, idevento, req.query["senhacontrole"] as string, req.query["senhapresenca"] as string));
}));

export = router;
