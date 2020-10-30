import express = require("express");
import wrap = require("express-async-error-wrapper");
import Cas = require("../models/cas");
import Usuario = require("../models/usuario");
import JSONRequest = require("../infra/jsonRequest");
import appsettings = require("../appsettings");

const router = express.Router();

router.all("/", wrap(async (req: express.Request, res: express.Response) => {
	let cas: Cas = null;
	let mensagem: string = null;

	const token = req.query["token"] as string;
	if (!token) {
		mensagem = "Token de autenticação faltando.";
	} else {
		const jsonResponse = await JSONRequest.get(appsettings.urlValidacaoToken + token);
		if (!jsonResponse.sucesso || !jsonResponse.resultado || (!jsonResponse.resultado.erro && !jsonResponse.resultado.dados))
			mensagem = jsonResponse.erro || ("Erro de rede durante a comunicação com o servidor de login: " + jsonResponse.statusCode);
		else if (jsonResponse.resultado.erro)
			mensagem = jsonResponse.resultado.erro;
		else if (!jsonResponse.resultado.dados.nome)
			mensagem = "Informação de nome faltante.";
		else if (!jsonResponse.resultado.dados.emailAcademico)
			mensagem = "Informação de e-mail acadêmico faltante.";
		else
			cas = jsonResponse.resultado.dados;
	}

	if (cas) {
		let u: Usuario;
		[mensagem, u] = await Usuario.efetuarLogin(null, null, cas, res);
		if (mensagem)
			res.render("home/login", { layout: "layout-externo", imagemFundo: true, mensagem: `O usuário ${cas.emailAcademico.toUpperCase()} ainda não tem permissão para acessar a área administrativa do sistema de credenciamento. Por favor, entre em contato com um administrador do sistema para obter acesso.`, loginUrl: appsettings.loginAdminUrl });
		else
			res.redirect("/");
	} else {
		res.render("home/login", { layout: "layout-externo", imagemFundo: true, mensagem: ((mensagem || "Não foi possível efetuar login no servidor remoto.") + " Por favor, tente novamente mais tarde."), loginUrl: appsettings.loginAdminUrl });
	}
}));

export = router;
