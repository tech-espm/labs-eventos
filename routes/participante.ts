import express = require("express");
import wrap = require("express-async-error-wrapper");
import Industria = require("../models/industria");
import Instrucao = require("../models/instrucao");
import Participante = require("../models/participante");
import Profissao = require("../models/profissao");
import appsettings = require("../appsettings");

const router = express.Router();

router.all("/login/:e", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	let evt = (req.params["e"] as string || "");
	if (p) {
		res.redirect("/" + evt);
	} else if (req.body.email || req.body.senha) {
		let mensagem: string = null;

		[mensagem, p] = await Participante.efetuarLogin(req.body.email as string, req.body.senha as string, null, res);
		if (mensagem) {
			res.render("participante/login", { layout: "layout-externo", mensagem: mensagem, loginUrl: appsettings.loginUrl });
		} else {
			res.cookie("participanteEvt", "", { expires: new Date(0), httpOnly: true, path: "/", secure: false });
			// Quando o evento for "home", deve redirecionar o usuário para
			// a tela de gerenciamento de inscrições e certificados
			if (evt === "home")
				res.redirect("/participante/home");
			else
				res.redirect("/" + evt);
		}
	} else {
		res.cookie("participanteEvt", evt, { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, path: "/", secure: false });
		res.render("participante/login", { layout: "layout-externo", mensagem: null, evento: evt, loginUrl: appsettings.loginUrl });
	}
}));

router.all("/modal", wrap(async (req: express.Request, res: express.Response) => {
	res.render("participante/modal", { layout: "layout-vazio", industrias: await Industria.listar(), instrucoes: await Instrucao.listar(), profissoes: await Profissao.listar() });
}));

router.all("/home", wrap(async (req: express.Request, res: express.Response) => {
	let p = await Participante.cookie(req);
	if (!p) {
		res.redirect("/participante/login/home");
	} else {
		res.render("participante/home", { participante: p });
	}
}));

export = router;
