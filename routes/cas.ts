import express = require("express");
import wrap = require("express-async-error-wrapper");
import Cas = require("../models/cas");
import Participante = require("../models/participante");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");

const router = express.Router();

async function casLogin(req: express.Request, res: express.Response) {
	let ticket = req.query["ticket"] as string;
	let cas: Cas = null;
	let mensagem: string = null;
	let e: string = req.cookies["participanteEvt"] as string;
	let s: string = null;
	if (e) {
		let partes = e.split("|");
		e = partes[0];
		s = (partes.length > 1 ? partes[1] : "");
	}
	try {
		cas = await Cas.download(ticket);
	} catch (ex) {
		mensagem = (ex.message || ex.toString());
	}
	if (e) {
		if (cas) {
			let p: Participante;
			[mensagem, p] = await Participante.efetuarLogin(null, null, cas, res);
			if (mensagem) {
				res.render("participante/login", { layout: "layout-externo", imagemFundo: true, mensagem: `Ocorreu um erro ao tentar cadastrar o usuário ${cas.emailAcademico.toUpperCase()} como participante no sistema de credenciamento. Por favor, entre em contato com um administrador do sistema para obter acesso.`, evento: e, loginUrl: appsettings.loginUrl });
			} else {
				res.cookie("participanteEvt", "", { expires: new Date(0), httpOnly: true, path: "/", secure: false });
				res.redirect("/participante/login/" + e + (s ? ("/" + s) : ""));
			}
		} else {
			res.render("participante/login", { layout: "layout-externo", imagemFundo: true, mensagem: ((mensagem || "Não foi possível efetuar login no servidor remoto.") + " Por favor, tente novamente mais tarde."), evento: e, loginUrl: appsettings.loginUrl });
		}
	} else {
		if (cas) {
			let u: Usuario;
			[mensagem, u] = await Usuario.efetuarLogin(null, null, cas, res);
			if (mensagem)
				res.render("home/login", { layout: "layout-externo", imagemFundo: true, mensagem: `O usuário ${cas.emailAcademico.toUpperCase()} ainda não tem permissão para acessar a área administrativa do sistema de credenciamento. Por favor, entre em contato com um administrador do sistema para obter acesso.`, loginUrl: appsettings.loginUrl });
			else
				res.redirect("/");
		} else {
			res.render("home/login", { layout: "layout-externo", imagemFundo: true, mensagem: ((mensagem || "Não foi possível efetuar login no servidor remoto.") + " Por favor, tente novamente mais tarde."), loginUrl: appsettings.loginUrl });
		}
	}
}

// Alguns iPhones redirecionam apenas para /cas, e não para /cas/login...
router.all("/", wrap(casLogin));

router.all("/login", wrap(casLogin));

export = router;
