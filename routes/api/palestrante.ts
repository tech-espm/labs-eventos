import express = require("express");
import multer = require("multer");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Empresa = require("../../models/empresa");
import Evento = require("../../models/evento");
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
		p.oculto = parseInt(req.body.oculto);
		p.confirmado = parseInt(req.body.confirmado);
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
		p.oculto = parseInt(req.body.oculto);
		p.confirmado = parseInt(req.body.confirmado);
		p.prioridade = parseInt(req.body.prioridade);
		p.idevento = u.idevento_logado;
		p.idempresa = parseInt(req.body.idempresa);
		p.versao = parseInt(req.body.versao);
	}
	jsonRes(res, 400, (p && !isNaN(p.id) && (!req["file"] || !req["file"].buffer || !req["file"].size || req["file"].size <= Palestrante.tamanhoMaximoImagemEmBytes)) ? await Palestrante.alterar(p, req["file"]) : "Dados inválidos!");
}));

router.post("/alterarExterno/:h", multer().single("imagem"), wrap(async (req: express.Request, res: express.Response) => {
	let id: number, idevento: number;
	[id, idevento] = await Palestrante.validarHashExterno(req.params["h"] as string);
	if (id <= 0 || idevento <= 0) {
		jsonRes(res, 400, "Dados inválidos!");
		return;
	}
	let p = req.body as Palestrante;
	let palestrante = await Palestrante.obter(id, idevento);
	if (p) {
		p.id = id;
		p.idevento = idevento;
		p.idempresa = palestrante.idempresa;
		p.versao = parseInt(req.body.versao);
	}
	jsonRes(res, 400, (p && !isNaN(p.id) && (!req["file"] || !req["file"].buffer || !req["file"].size || req["file"].size <= Palestrante.tamanhoMaximoImagemEmBytes)) ? await Palestrante.alterar(p, req["file"], true) : "Dados inválidos!");
}));

router.post("/alterarEmpresaExterno/:h", multer().single("imagem"), wrap(async (req: express.Request, res: express.Response) => {
	let id: number, idevento: number;
	[id, idevento] = await Palestrante.validarHashExterno(req.params["h"] as string);
	if (id <= 0 || idevento <= 0) {
		jsonRes(res, 400, "Dados inválidos!");
		return;
	}
	let versao = parseInt(req.body.versao);
	let p = await Palestrante.obter(id, idevento);
	let e = await Evento.obter(idevento, false);
	jsonRes(res, 400, (p && e && p.idempresa !== e.idempresapadrao && !isNaN(versao) && versao > 0 && (!req["file"] || !req["file"].buffer || !req["file"].size || req["file"].size <= Empresa.tamanhoMaximoImagemEmBytes)) ? await Empresa.alterarImagem(p.idempresa, idevento, versao, req["file"]) : "Dados inválidos!");
}));

router.get("/alterarUrlEmpresaExterno/:h", multer().single("imagem"), wrap(async (req: express.Request, res: express.Response) => {
	let id: number, idevento: number;
	[id, idevento] = await Palestrante.validarHashExterno(req.params["h"] as string);
	if (id <= 0 || idevento <= 0) {
		jsonRes(res, 400, "Dados inválidos!");
		return;
	}
	let url_site = req.query["url_site"] as string;
	let p = await Palestrante.obter(id, idevento);
	let e = await Evento.obter(idevento, false);
	jsonRes(res, 400, (p && e && p.idempresa !== e.idempresapadrao) ? await Empresa.alterarUrl(p.idempresa, idevento, url_site) : "Dados inválidos!");
}));

router.get("/concederAceite/:h/:s", wrap(async (req: express.Request, res: express.Response) => {
	let id: number, idevento: number, idsessao: number;
	[id, idevento] = await Palestrante.validarHashExterno(req.params["h"] as string);
	if (id <= 0 || idevento <= 0 || isNaN(idsessao = parseInt(req.params["s"])) || idsessao <= 0) {
		jsonRes(res, 400, "Dados inválidos!");
		return;
	}
	res.json(await Palestrante.concederAceiteExterno(id, idevento, idsessao));
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos!" : await Palestrante.excluir(id, u.idevento_logado));
}));

router.get("/obterImagemTwitter", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	let url = (req.query["url"] as string || "").trim().toLowerCase();
	if (!u.idevento_logado || !url) {
		jsonRes(res, 400, "Dados inválidos!");
		return;
	}
	if (url.startsWith("http://")) {
		url = "https://" + url.substr(7);
	} else if (!url.startsWith("https://")) {
		jsonRes(res, 400, "Dados inválidos!");
		return;
	}

	Palestrante.obterImagemTwitter(url, res);
}));

router.get("/gerarLinkExterno/:i", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	let id = parseInt(req.params["i"]);
	if (isNaN(id) || id <= 0) {
		jsonRes(res, 400, "Dados inválidos!");
		return;
	}

	res.json(await Palestrante.gerarLinkExterno(id, u.idevento_logado));
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

	res.json(await Palestrante.gerarLinkCertificado(id, u.idevento_logado));
}));

router.get("/enviarEmailLinkExterno/:i", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	let id = parseInt(req.params["i"]);
	let p: Palestrante;
	let e: Evento;
	if (isNaN(id) || id <= 0 ||
		!(e = await Evento.obter(u.idevento_logado, false)) ||
		!(p = await Palestrante.obter(id, u.idevento_logado))) {
		jsonRes(res, 400, "Dados inválidos!");
		return;
	}

	res.json(await Palestrante.enviarEmailLinkExterno(id, u.idevento_logado, p.email, e.emailpadrao));
}));

router.get("/listarSessoesEAceitesGeral", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;

	res.json(await Palestrante.listarSessoesEAceitesGeral(u.idevento_logado));
}));

export = router;
