import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Usuario = require("../../models/usuario");

const router = express.Router();

// Se utilizar router.xxx() mas não utilizar o wrap(), as exceções ocorridas
// dentro da função async não serão tratadas!!!
router.post("/login", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	jsonRes(res, 403, u ? null : await Usuario.efetuarLogin(req.body.login as string, req.body.senha as string, null, res)[0]);
}));

router.get("/logout", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (u)
		await u.efetuarLogout(res);
	res.sendStatus(204);
}));

router.post("/alterarPerfil", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res);
	if (!u)
		return;
	jsonRes(res, 400, await u.alterarPerfil(res, req.body.senhaAtual as string, req.body.novaSenha as string));
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	res.json(await Usuario.listar());
}));

router.get("/obter", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	res.json(isNaN(id) ? null : await Usuario.obter(id));
}));

router.post("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	u = req.body as Usuario;
	if (u)
		u.tipo = parseInt(req.body.tipo);
	jsonRes(res, 400, u ? await Usuario.criar(u) : "Dados inválidos");
}));

router.post("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let id = u.id;
	u = req.body as Usuario;
	if (u) {
		u.id = parseInt(req.body.id);
		u.tipo = parseInt(req.body.tipo);
	}
	jsonRes(res, 400, (u && !isNaN(u.id)) ? (id === u.id ? "Um usuário não pode alterar a si próprio" : await Usuario.alterar(u)) : "Dados inválidos");
}));

router.get("/excluir", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos" : (id === u.id ? "Um usuário não pode excluir a si próprio" : await Usuario.excluir(id)));
}));

router.get("/redefinirSenha", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let id = parseInt(req.query["id"]);
	jsonRes(res, 400, isNaN(id) ? "Dados inválidos" : (id === u.id ? "Um usuário não pode redefinir sua própria senha" : await Usuario.redefinirSenha(id)));
}));

// Eventos

router.get("/eventoSelecionar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u) {
		res.sendStatus(403);
		return;
	}
	let idevento = parseInt(req.query["idevento"]);
	jsonRes(res, 400, isNaN(idevento) ? "Dados inválidos" : await u.eventoSelecionar(idevento, res));
}));

router.get("/eventoListar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	res.json(await Usuario.eventoListar(u.idevento_logado));
}));

router.post("/eventoAssociar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let login = req.body.login as string;
	jsonRes(res, 400, !login ? "Dados inválidos!" : await Usuario.eventoAssociar(u.idevento_logado, login));
}));

router.post("/eventoDesassociar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req, res, true);
	if (!u)
		return;
	let idsusuario: number[] = [];
	let ids = req.body.idsusuario as [];
	if (ids && ids.length) {
		for (let i = 0; i < ids.length; i++) {
			let idusuario = parseInt(ids[i]);
			if (isNaN(idusuario)) {
				jsonRes(res, 400, "Dados inválidos!");
				return;
			}
			idsusuario.push(idusuario);
		}
	}
	jsonRes(res, 400, !idsusuario.length ? "Dados inválidos!" : await Usuario.eventoDesassociar(u.idevento_logado, idsusuario));
}));

export = router;
