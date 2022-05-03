import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");
import Evento = require("../../models/evento");
import Participante = require("../../models/participante");
import Sessao = require("../../models/sessao");

const router = express.Router();

router.post("/login", wrap(async (req: express.Request, res: express.Response) => {
	const p = await Participante.cookie(req);
	jsonRes(res, 403, p ? null : await Participante.efetuarLogin(req.body.email as string, req.body.senha as string, null, res)[0]);
}));

router.get("/logout", wrap(async (req: express.Request, res: express.Response) => {
	const p = await Participante.cookie(req);
	if (p)
		await Participante.efetuarLogout(p, res);
	res.sendStatus(204);
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	const p = req.body as Participante;
	if (p) {
		p.idinstrucao = parseInt(req.body.idinstrucao);
		p.idprofissao = parseInt(req.body.idprofissao);
	}
	jsonRes(res, 400, p ? await Participante.criar(p, null, res) : "Dados inválidos");
}));

router.get("/listarMinhasInscricoes", wrap(async (req: express.Request, res: express.Response) => {
	const p = await Participante.cookie(req),
		idevento = parseInt(req.query["idevento"] as string);
	if (p && idevento > 0)
		res.json(await Participante.listarMinhasInscricoes(p.id, idevento));
	else
		jsonRes(res, 400, "Dados inválidos");
}));

router.get("/avaliarSessao", wrap(async (req: express.Request, res: express.Response) => {
	const p = await Participante.cookie(req),
		ideventosessaoparticipante = parseInt(req.query["id"] as string),
		conhecimento = parseInt(req.query["conhecimento"] as string),
		conteudo = parseInt(req.query["conteudo"] as string),
		pontualidade = parseInt(req.query["pontualidade"] as string),
		aplicabilidade = parseInt(req.query["aplicabilidade"] as string),
		expectativas = parseInt(req.query["expectativas"] as string),
		comentarioExpectativas = req.query["comentarioExpectativas"] as string,
		avaliacao = parseInt(req.query["avaliacao"] as string),
		comentario = req.query["comentario"] as string;
	if (p && ideventosessaoparticipante > 0 &&
		conhecimento >= 0 && conhecimento <= 5 &&
		conteudo >= 0 && conteudo <= 5 &&
		pontualidade >= 0 && pontualidade <= 5 &&
		aplicabilidade >= 0 && aplicabilidade <= 5 &&
		expectativas >= 0 && expectativas <= 5 &&
		avaliacao >= 0 && avaliacao <= 5)
		res.json(await Participante.avaliarSessao(p.id, ideventosessaoparticipante, conhecimento, conteudo, pontualidade, aplicabilidade, expectativas, comentarioExpectativas, avaliacao, comentario));
	else
		jsonRes(res, 400, "Dados inválidos");
}));

router.get("/marcarPresenca", wrap(async (req: express.Request, res: express.Response) => {
	let senha = req.query["senha"] as string,
		idevento = parseInt(req.query["idevento"] as string),
		ideventosessao = parseInt(req.query["ideventosessao"] as string),
		idparticipante = parseInt(req.query["idparticipante"] as string),
		dataMarcacao = req.query["dataMarcacao"] as string,
		evt = Evento.eventosPorId[idevento];

	if (!evt || !evt.habilitado || !evt.permiteinscricao)
		jsonRes(res, 400, "Dados inválidos");
	else if (senha && idevento > 0 && ideventosessao > 0 && idparticipante > 0 && dataMarcacao)
		res.json(await Participante.marcarPresenca(senha, idevento, ideventosessao, idparticipante, dataMarcacao, false));
	else
		jsonRes(res, 400, "Dados inválidos");
}));

router.get("/excluirInscricao", wrap(async (req: express.Request, res: express.Response) => {
	const p = await Participante.cookie(req),
		id = parseInt(req.query["id"] as string),
		idevento = parseInt(req.query["idevento"] as string);
	if (p && id > 0 && idevento > 0) {
		await Sessao.excluirInscricao(id, idevento, p.id);
		res.sendStatus(204);
	} else {
		jsonRes(res, 400, "Dados inválidos");
	}
}));

router.get("/excluirInscricaoInterno", wrap(async (req: express.Request, res: express.Response) => {
	const u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	jsonRes(res, 400, await Sessao.excluirInscricaoInterno(parseInt(req.query["id"] as string), u.idevento_logado));
}));

router.get("/redefinirSenha", wrap(async (req: express.Request, res: express.Response) => {
	const email = req.query["email"] as string;
	jsonRes(res, 400, email ? await Participante.redefinirSenha(email) : "Dados inválidos");
}));

router.post("/definirSenha", wrap(async (req: express.Request, res: express.Response) => {
	const email = req.body["email"],
		token = req.body["token"],
		senha = req.body["senha"];
	jsonRes(res, 400, (email && token && senha) ? await Participante.definirSenha(email, token, senha) : "Dados inválidos");
}));

router.post("/conferirTelefone", wrap(async (req: express.Request, res: express.Response) => {
	let r: string = null;
	if (req.body) {
		const email = req.body["email"],
			senha = req.body["senha"];

		r = await Participante.conferirTelefone(email, senha);
	} else {
		r = "Dados inválidos!";
	}
	res.json(r);
}));

router.post("/atualizarTelefone", wrap(async (req: express.Request, res: express.Response) => {
	let r: string;
	if (req.body) {
		const email = req.body["email"],
			senha = req.body["senha"],
			telefone = req.body["telefone"];

		r = await Participante.atualizarTelefone(email, senha, telefone);
	} else {
		r = "Dados inválidos!";
	}
	res.json(r);
}));

router.get("/idQRParaIdParticipante/:i", wrap(async (req: express.Request, res: express.Response) => {
	res.json(Participante.idQRParaIdParticipante(req.params["i"]));
}));

router.get("/gerarLinkCertificado/:i", wrap(async (req: express.Request, res: express.Response) => {
	const u = await Usuario.cookie(req, res);
	if (!u)
		return;

	const id = parseInt(req.params["i"]);
	if (isNaN(id) || id <= 0) {
		jsonRes(res, 400, "Dados inválidos!");
		return;
	}

	res.json(await Participante.gerarLinkCertificado(id, u.idevento_logado));
}));

export = router;
