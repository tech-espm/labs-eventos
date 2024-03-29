﻿import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Evento = require("../../models/evento");
import Usuario = require("../../models/usuario");
import PalestranteResumido = require("../../models/palestranteResumido");
import Sessao = require("../../models/sessao");
import appsettings = require("../../appsettings");
import SessaoConstantes = require("../../models/sessaoConstantes");

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
	let id = parseInt(req.query["id"] as string);
	res.json(isNaN(id) ? null : await Sessao.obter(id, u.idevento_logado));
}));

router.get("/listarAceites", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"] as string);
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
		s.url_privada = parseInt(req.body.url_privada);
		s.oculta = parseInt(req.body.oculta);
		s.sugestao = parseInt(req.body.sugestao);
		s.permiteinscricao = parseInt(req.body.permiteinscricao);
		s.acomminutos = parseInt(req.body.acomminutos);
		s.tipomultidata = parseInt(req.body.tipomultidata);
		s.presencaminima = parseInt(req.body.presencaminima);
		let p = req.body.idpalestrantes;
		if (p && p.length) {
			for (let i = p.length - 1; i >= 0; i--)
				s.idspalestrante[i] = parseInt(p[i]);
		}
	}

	let r: string | number[] = "Dados inválidos!";

	if (s) {
		r = await Sessao.criar(s, u);
		if ((typeof r !== "string") && r.length) {
			res.json(r);
			return;
		}
	}

	jsonRes(res, 400, r as string);
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
		s.url_privada = parseInt(req.body.url_privada);
		s.permiteinscricao = parseInt(req.body.permiteinscricao);
		s.acomminutos = parseInt(req.body.acomminutos);
		s.tipomultidata = parseInt(req.body.tipomultidata);
		s.presencaminima = parseInt(req.body.presencaminima);
		s.senhacontrole = null;
		s.oculta = 0;
		s.sugestao = 1;
	}

	let r: string | number[] = "Dados inválidos!";

	if (s) {
		r = await Sessao.criarExterno(s, (req.body.palestrantes && req.body.palestrantes.length) ? req.body.palestrantes as PalestranteResumido[] : []);
		if ((typeof r !== "string") && r.length) {
			res.json(r);
			return;
		}
	}

	jsonRes(res, 400, r as string);
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
		s.url_privada = parseInt(req.body.url_privada);
		s.oculta = parseInt(req.body.oculta);
		s.sugestao = parseInt(req.body.sugestao);
		s.permiteinscricao = parseInt(req.body.permiteinscricao);
		s.acomminutos = parseInt(req.body.acomminutos);
		s.tipomultidata = parseInt(req.body.tipomultidata);
		s.presencaminima = parseInt(req.body.presencaminima);
		let p = req.body.idpalestrantes;
		if (p && p.length) {
			for (let i = p.length - 1; i >= 0; i--)
				s.idspalestrante[i] = parseInt(p[i]);
		}
	}

	let r: string | number[] = "Dados inválidos!";

	if (s && !isNaN(s.id)) {
		r = await Sessao.alterar(s, u);
		if ((typeof r !== "string") && r.length) {
			res.json(r);
			return;
		}
	}

	jsonRes(res, 400, r as string);
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"] as string);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos!" : await Sessao.excluir(id, u.idevento_logado));
}));

router.get("/alterarSenhaPresenca", wrap(async (req: express.Request, res: express.Response) => {
	let id = parseInt(req.query["id"] as string);
	let idevento = parseInt(req.query["idevento"] as string);
	jsonRes(res, 400, (isNaN(id) || isNaN(idevento)) ? "Dados inválidos!" : await Sessao.alterarSenhaPresenca(id, idevento, req.query["senhacontrole"] as string, req.query["senhapresenca"] as string));
}));

router.get("/alterarStatusIntegra", wrap(async (req: express.Request, res: express.Response) => {
	const id_integra_sessao = parseInt(req.query["id"] as string);
	const status_integra = parseInt(req.query["status"] as string);
	if (!id_integra_sessao || isNaN(id_integra_sessao) || id_integra_sessao <= 0)
		res.status(400).json("Id inválido");
	else if (status_integra !== SessaoConstantes.STATUS_PENDENTE && status_integra !== SessaoConstantes.STATUS_APROVADO && status_integra !== SessaoConstantes.STATUS_REPROVADO)
		res.status(400).json("Status inválido");
	else if (req.query["key"] !== appsettings.integracaoAgendamentoChaveExterna)
		res.status(400).json("Chave inválida");
	else
		jsonRes(res, 400, await Sessao.alterarStatusIntegra(id_integra_sessao, status_integra));
}));

router.get("/listarInscritosParaEmail", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"] as string);
	res.json(isNaN(id) ? null : await Sessao.listarInscritosParaEmail(id, u.idevento_logado));
}));

router.post("/enviarEmailParaInscrito", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	let id = parseInt(req.query["id"] as string);
	let espid = parseInt(req.query["espid"] as string);

	let assunto: string = null, mensagem: string = null;
	if (req.body) {
		assunto = req.body.assunto;
		mensagem = req.body.mensagem;
	}

	res.json((isNaN(id) || isNaN(espid)) ? "Dados inválidos" : await Sessao.enviarEmailParaInscrito(id, u.idevento_logado, espid, assunto, mensagem));
}));

export = router;
