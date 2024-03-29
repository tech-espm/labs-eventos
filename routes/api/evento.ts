﻿import express = require("express");
import multer = require("multer");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");
import Evento = require("../../models/evento");

const router = express.Router();

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	res.json(await Evento.listarDeUsuarioPorTipo(u.id, u.admin));
}));

router.get("/listarDeUsuario", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let idusuario = parseInt(req.query["idusuario"] as string);
	if (u.tipo !== Usuario.TipoAdmin || isNaN(idusuario))
		idusuario = u.id;
	res.json(await Evento.listarDeUsuario(idusuario));
	//let tudo = (u.tipo === Usuario.TipoAdmin && idusuario === u.id);
	//res.json(tudo ? await Evento.listar() : await Evento.listarDeUsuario(idusuario));
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"] as string);
	res.json(isNaN(id) ? null : await Evento.obter(id, true, u.id, u.tipo !== Usuario.TipoAdmin));
}));

router.post("/criar", multer().single("fundocertificado"), wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let ev = req.body as Evento;
	if (ev) {
		ev.habilitado = (parseInt(req.body.habilitado) ? 1 : 0);
		ev.certificadoliberado = (parseInt(req.body.certificadoliberado) ? 1 : 0);
		ev.permiteinscricao = (parseInt(req.body.permiteinscricao) ? 1 : 0);
		ev.permitealuno = (parseInt(req.body.permitealuno) ? 1 : 0);
		ev.permitefuncionario = (parseInt(req.body.permitefuncionario) ? 1 : 0);
		ev.permiteexterno = (parseInt(req.body.permiteexterno) ? 1 : 0);
		ev.secoesocultas = parseInt(req.body.secoesocultas);
	}
	jsonRes(res, 400, (ev && (!req["file"] || !req["file"].buffer || !req["file"].size || req["file"].size <= Evento.tamanhoMaximoFundoCertificadoEmBytes)) ? await Evento.criar(ev, req["file"]) : "Dados inválidos!");
}));

router.post("/alterar", multer().single("fundocertificado"), wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let ev = req.body as Evento;
	if (ev) {
		ev.id = parseInt(req.body.id);
		if (u.tipo !== Usuario.TipoAdmin || isNaN(ev.id))
			ev.id = u.idevento_logado;
		if (isNaN(ev.id) || ev.id <= 0) {
			jsonRes(res, 400, "Nenhum evento selecionado!");
			return;
		}
		ev.habilitado = (parseInt(req.body.habilitado) ? 1 : 0);
		ev.certificadoliberado = (parseInt(req.body.certificadoliberado) ? 1 : 0);
		ev.permiteinscricao = (parseInt(req.body.permiteinscricao) ? 1 : 0);
		ev.permitealuno = (parseInt(req.body.permitealuno) ? 1 : 0);
		ev.permitefuncionario = (parseInt(req.body.permitefuncionario) ? 1 : 0);
		ev.permiteexterno = (parseInt(req.body.permiteexterno) ? 1 : 0);
		ev.secoesocultas = parseInt(req.body.secoesocultas);
	}
	jsonRes(res, 400, (ev && (!req["file"] || !req["file"].buffer || !req["file"].size || req["file"].size <= Evento.tamanhoMaximoFundoCertificadoEmBytes)) ? await Evento.alterar(ev, req["file"]) : "Dados inválidos!");
}));

router.get("/listarArquivos", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	if (isNaN(u.idevento_logado) || u.idevento_logado <= 0) {
		jsonRes(res, 400, "Nenhum evento selecionado!");
		return;
	}
	res.json(await Evento.listarArquivos(u.idevento_logado));
}));

router.post("/criarArquivo", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	if (isNaN(u.idevento_logado) || u.idevento_logado <= 0) {
		jsonRes(res, 400, "Nenhum evento selecionado!");
		return;
	}

	let nome = req.query["nome"] as string;
	let partes: string[];

	if (!nome || !(partes = Evento.gerarCaminhoArquivo(u.idevento_logado, nome))) {
		jsonRes(res, 400, "Nome de arquivo inválido");
		return;
	}

	let storage = multer.diskStorage({
		destination: function (req, file, callback) {
			callback(null, partes[0])
		},
		filename: function (req, file, callback) {
			callback(null, partes[1])
		}
	});

	let upload = multer({
		storage: storage,
		limits: {
			fieldNameSize: 100,
			fieldSize: 5 * 1024 * 1024
		}
	}).single("arquivo");

	upload(req, res, async (err) => {
		if (err) {
			jsonRes(res, 400, "Ocorreu um erro ao gravar o arquivo " + nome);
			return;
		}

		Evento.atualizarVersaoArquivo(u.idevento_logado, nome);

		res.json(0);
	});
}));

router.get("/renomearArquivo", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	if (isNaN(u.idevento_logado) || u.idevento_logado <= 0) {
		jsonRes(res, 400, "Nenhum evento selecionado!");
		return;
	}
	let nomeAtual = req.query["nomeAtual"] as string;
	let nomeNovo = req.query["nomeNovo"] as string;
	jsonRes(res, 400, (nomeAtual && nomeNovo) ? await Evento.renomearArquivo(u.idevento_logado, nomeAtual, nomeNovo) : "Dados inválidos!");
}));

router.get("/excluirArquivo", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	if (isNaN(u.idevento_logado) || u.idevento_logado <= 0) {
		jsonRes(res, 400, "Nenhum evento selecionado!");
		return;
	}
	let nome = req.query["nome"] as string;
	jsonRes(res, 400, nome ? await Evento.excluirArquivo(u.idevento_logado, nome) : "Dados inválidos!");
}));

router.post("/atualizarLandingPage", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	if (isNaN(u.idevento_logado) || u.idevento_logado <= 0) {
		jsonRes(res, 400, "Nenhum evento selecionado!");
		return;
	}

	let partes = Evento.gerarCaminhoLandingPage(u.idevento_logado);

	let storage = multer.diskStorage({
		destination: function (req, file, callback) {
			callback(null, partes[0])
		},
		filename: function (req, file, callback) {
			callback(null, partes[1])
		}
	});

	let upload = multer({
		storage: storage,
		limits: {
			fieldNameSize: 100,
			fieldSize: 1 * 1024 * 1024
		}
	}).single("arquivo");

	upload(req, res, async (err) => {
		if (err) {
			jsonRes(res, 400, "Ocorreu um erro ao gravar o arquivo da landing page");
			return;
		}

		res.json(0);
	});
}));

router.get("/landingPageDownload", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	if (isNaN(u.idevento_logado) || u.idevento_logado <= 0) {
		jsonRes(res, 400, "Nenhum evento selecionado!");
		return;
	}

	if (!(await Evento.landingPageExiste(u.idevento_logado))) {
		jsonRes(res, 400, "Landing page inexistente");
		return;
	}

	let e = await Evento.obter(u.idevento_logado, false);
	if (!e) {
		jsonRes(res, 400, "Evento inexistente");
		return;
	}

	res.setHeader("Content-type", "application/octet-stream");

	res.download(Evento.caminhoLandingPage(u.idevento_logado), "landing-page-" + e.url + ".ejs");
}));

router.get("/contarInscricoesEPresencas", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	if (isNaN(u.idevento_logado) || u.idevento_logado <= 0) {
		jsonRes(res, 400, "Nenhum evento selecionado!");
		return;
	}
	res.json(await Evento.contarInscricoesEPresencas(u.idevento_logado));
}));

router.get("/listarAvaliacoes", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	if (isNaN(u.idevento_logado) || u.idevento_logado <= 0) {
		jsonRes(res, 400, "Nenhum evento selecionado!");
		return;
	}
	res.json(await Evento.listarAvaliacoes(u.idevento_logado));
}));

router.get("/listarAvaliacoesEComentarios", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	if (isNaN(u.idevento_logado) || u.idevento_logado <= 0) {
		jsonRes(res, 400, "Nenhum evento selecionado!");
		return;
	}
	res.json(await Evento.listarAvaliacoesEComentarios(u.idevento_logado));
}));

router.get("/listarInscritosRecepcaoCheckIn/:e/:s/:t/:i?/:d?", wrap(async (req: express.Request, res: express.Response) => {
	let e = req.params["e"] as string;
	let senha = req.params["s"] as string;
	let tipo = parseInt(req.params["t"]);
	let i = req.params["i"] as string;
	let dataMarcacao = req.params["d"] as string;
	res.json(await Evento.listarInscritosRecepcaoCheckIn(parseInt(e), senha, tipo, i ? parseInt(i) : 0, dataMarcacao));
}));

router.get("/listarInscritosPresencasEACOM", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	if (isNaN(u.idevento_logado) || u.idevento_logado <= 0) {
		jsonRes(res, 400, "Nenhum evento selecionado!");
		return;
	}
	res.json(await Evento.listarInscritosPresencasEACOM(u.idevento_logado));
}));

router.post("/listarInscritosPresencasEACOMFiltro", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	if (!req.body) {
		jsonRes(res, 400, "Dados inválidos");
		return;
	}

	res.json(await Evento.listarInscritosPresencasEACOMFiltro(u.admin ? 0 : u.id, req.body.data_minima, req.body.data_maxima, req.body.nome, req.body.nome_curto, parseInt(req.body.apenas_acom), parseInt(req.body.apenas_nao_verificados)));
}));

router.post("/salvarVerificacaoInscritos", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;

	jsonRes(res, 400, await Evento.salvarVerificacaoInscritos(req.body));
}));

router.get("/listarPalestrantesGeral", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	if (isNaN(u.idevento_logado) || u.idevento_logado <= 0) {
		jsonRes(res, 400, "Nenhum evento selecionado!");
		return;
	}
	res.json(await Evento.listarPalestrantesGeral(u.idevento_logado));
}));

router.post("/listarPalestrantesGeral", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	if (isNaN(u.idevento_logado) || u.idevento_logado <= 0) {
		jsonRes(res, 400, "Nenhum evento selecionado!");
		return;
	}
	let info = req.body;
	if (!info || !info.emails || !info.emails.length || !info.assunto || !info.texto) {
		jsonRes(res, 400, "Dados inválidos!");
		return;
	}
	res.json(await Evento.enviarEmail(u.idevento_logado, info.emails as string[], info.assunto as string, info.texto as string));
}));

export = router;
