import express = require("express");
import wrap = require("express-async-error-wrapper");
import Cas = require("../models/cas");
import Participante = require("../models/participante");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");

const router = express.Router();

router.all("/login", wrap(async (req: express.Request, res: express.Response) => {
	let ticket = req.query["ticket"] as string;
	let cas: Cas = null;
	let mensagem: string = null;
	let evt: string = req.cookies["participanteEvt"] as string;
	try {
		cas = await Cas.download(ticket);
	} catch (ex) {
		mensagem = (ex.message || ex.toString());
	}
	if (evt) {
		if (cas) {
			let p: Participante;
			[mensagem, p] = await Participante.efetuarLogin(null, null, cas, res);
			if (mensagem) {
				res.render("participante/login", { layout: "layout-externo", imagemFundo: true, mensagem: `Ocorreu um erro ao tentar cadastrar o usuário ${cas.emailAcademico.toUpperCase()} como participante no sistema de credenciamento. Por favor, entre em contato com um administrador do sistema para obter acesso.`, evento: evt, loginUrl: appsettings.loginUrl + evt });
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
			res.render("participante/login", { layout: "layout-externo", imagemFundo: true, mensagem: ((mensagem || "Não foi possível efetuar login no servidor remoto.") + " Por favor, tente novamente mais tarde."), evento: evt, loginUrl: appsettings.loginUrl + evt });
		}
	} else {
		if (cas) {
			let u: Usuario;
			[mensagem, u] = await Usuario.efetuarLogin(null, null, cas, res);
			if (mensagem)
				res.render("home/login", { layout: "layout-externo", imagemFundo: true, mensagem: `O usuário ${cas.emailAcademico.toUpperCase()} não está cadstrado no sistema de credenciamento. Por favor, entre em contato com um administrador do sistema para obter acesso.`, loginUrl: appsettings.loginUrl });
			else
				res.redirect("/");
		} else {
			res.render("home/login", { layout: "layout-externo", imagemFundo: true, mensagem: ((mensagem || "Não foi possível efetuar login no servidor remoto.") + " Por favor, tente novamente mais tarde."), loginUrl: appsettings.loginUrl });
		}
	}
}));

export = router;
