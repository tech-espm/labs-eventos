import express = require("express");
import wrap = require("express-async-error-wrapper");
import Cas = require("../models/cas");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");

const router = express.Router();

router.all("/login", wrap(async (req: express.Request, res: express.Response) => {
	let ticket = req.query.ticket as string;
	let cas: Cas = null;
	let mensagem: string = null;
	try {
		cas = await Cas.download(ticket);
	} catch (ex) {
		mensagem = (ex.message || ex.toString());
	}
	if (cas) {
		let u: Usuario;
		[mensagem, u] = await Usuario.efetuarLogin(null, null, cas, res);
		if (mensagem)
			res.render("home/login", { layout: "layout-externo", mensagem: `O usuário ${cas.emailAcademico.toLowerCase()} não está cadstrado no sistema de credenciamento. Por favor, entre em contato com um administrador do sistema para obter acesso.`, loginUrl: appsettings.loginUrl });
		else
			res.redirect("/");
	} else {
		res.render("home/login", { layout: "layout-externo", mensagem: ((mensagem || "Não foi possível efetuar login no servidor remoto.") + " Por favor, tente novamente mais tarde."), loginUrl: appsettings.loginUrl });
	}
}));

export = router;
