﻿import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");
import Evento = require("../../models/evento");
import Participante = require("../../models/participante");
import Sessao = require("../../models/sessao");

const router = express.Router();

router.post("/login", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	jsonRes(res, 403, p ? null : await Participante.efetuarLogin(req.body.email as string, req.body.senha as string, null, res)[0]);
}));

router.get("/logout", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	if (p)
		await Participante.efetuarLogout(p, res);
	res.sendStatus(204);
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let p = req.body as Participante;
	if (p) {
		p.idinstrucao = parseInt(req.body.idinstrucao);
		p.idprofissao = parseInt(req.body.idprofissao);
	}
	jsonRes(res, 400, p ? await Participante.criar(p, null, res) : "Dados inválidos");
}));

router.get("/listarMinhasInscricoes", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	let idevento = parseInt(req.query["idevento"] as string);
	if (p && idevento > 0)
		res.json(await Participante.listarMinhasInscricoes(p.id, idevento));
	else
		jsonRes(res, 400, "Dados inválidos");
}));

router.get("/avaliarSessao", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	let ideventosessaoparticipante = parseInt(req.query["id"] as string);
	let avaliacao = parseInt(req.query["avaliacao"] as string);
	let comentario = req.query["comentario"] as string;
	if (p && ideventosessaoparticipante > 0 && avaliacao >= 1 && avaliacao <= 5)
		res.json(await Participante.avaliarSessao(p.id, ideventosessaoparticipante, avaliacao, comentario));
	else
		jsonRes(res, 400, "Dados inválidos");
}));

router.get("/marcarPresenca", wrap(async (req: express.Request, res: express.Response) => {
	let senha = req.query["senha"] as string;
	let idevento = parseInt(req.query["idevento"] as string);
	let ideventosessao = parseInt(req.query["ideventosessao"] as string);
	let idparticipante = parseInt(req.query["idparticipante"] as string);
	let dataMarcacao = req.query["dataMarcacao"] as string;
	let evt = Evento.eventosPorId[idevento];

	if (!evt || !evt.habilitado || !evt.permiteinscricao)
		jsonRes(res, 400, "Dados inválidos");
	else if (senha && idevento > 0 && ideventosessao > 0 && idparticipante > 0 && dataMarcacao)
		res.json(await Participante.marcarPresenca(senha, idevento, ideventosessao, idparticipante, dataMarcacao, false));
	else
		jsonRes(res, 400, "Dados inválidos");
}));

router.get("/excluirInscricao", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	let id = parseInt(req.query["id"] as string);
	let idevento = parseInt(req.query["idevento"] as string);
	if (p && id > 0 && idevento > 0) {
		await Sessao.excluirInscricao(id, idevento, p.id);
		res.sendStatus(204);
	} else {
		jsonRes(res, 400, "Dados inválidos");
	}
}));

router.get("/redefinirSenha", wrap(async (req: express.Request, res: express.Response) => {
	let email = req.query["email"] as string;
	jsonRes(res, 400, email ? await Participante.redefinirSenha(email) : "Dados inválidos");
}));

router.post("/definirSenha", wrap(async (req: express.Request, res: express.Response) => {
	let email = req.body["email"];
	let token = req.body["token"];
	let senha = req.body["senha"];
	jsonRes(res, 400, (email && token && senha) ? await Participante.definirSenha(email, token, senha) : "Dados inválidos");
}));

router.get("/idQRParaIdParticipante/:i", wrap(async (req: express.Request, res: express.Response) => {
	res.json(Participante.idQRParaIdParticipante(req.params["i"]));
}));

router.get("/gerarLinkCertificado/:i", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	let id = parseInt(req.params["i"]);
	if (isNaN(id) || id <= 0) {
		jsonRes(res, 400, "Dados inválidos!");
		return;
	}

	res.json(await Participante.gerarLinkCertificado(id, u.idevento_logado));
}));

export = router;
