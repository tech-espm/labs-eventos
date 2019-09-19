import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../../utils/jsonRes");
import Participante = require("../../models/participante");

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
		p.idindustria = parseInt(req.body.idindustria);
		p.idinstrucao = parseInt(req.body.idinstrucao);
		p.idprofissao = parseInt(req.body.idprofissao);
	}
	jsonRes(res, 400, p ? await Participante.criar(p, null, res) : "Dados inválidos");
}));

router.get("/redefinirSenha", wrap(async (req: express.Request, res: express.Response) => {
	let email = req.query["email"];
	jsonRes(res, 400, email ? await Participante.redefinirSenha(email) : "Dados inválidos");
}));

router.post("/definirSenha", wrap(async (req: express.Request, res: express.Response) => {
	let email = req.body["email"];
	let token = req.body["token"];
	let senha = req.body["senha"];
	jsonRes(res, 400, (email && token && senha) ? await Participante.definirSenha(email, token, senha) : "Dados inválidos");
}));

export = router;
