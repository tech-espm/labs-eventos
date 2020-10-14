import express = require("express");
import graph = require('@microsoft/microsoft-graph-client');
import passport = require("passport");
import wrap = require("express-async-error-wrapper");
import Cas = require("../models/cas");
import Participante = require("../models/participante");
import Usuario = require("../models/usuario");
import appsettings = require("../appsettings");

require("isomorphic-fetch");

const router = express.Router();

async function adLogin(req: express.Request, res: express.Response, next: express.NextFunction) {
	// https://www.npmjs.com/package/passport-azure-ad
	// https://docs.microsoft.com/en-us/graph/tutorials/node
	passport.authenticate("azuread-openidconnect", { session: false }, async (err: any, user: any, info: any) => {
		let cas: Cas = null;
		let mensagem: string = null;
		let e: string = req.cookies["participanteEvt"] as string;
		let s: string = null;

		try {
			if (e) {
				let partes = e.split("|");
				e = partes[0];
				s = (partes.length > 1 ? partes[1] : "");
			}

			if (err) {
				mensagem = (err.message || err.toString());
			} else {
				// https://www.npmjs.com/package/@microsoft/microsoft-graph-client
				// https://github.com/microsoftgraph/msgraph-sdk-javascript
				// https://github.com/microsoftgraph/msgraph-training-nodeexpressapp/blob/main/tutorial/04-add-aad-auth.md

				// info é o accessToken, enviado pelo callback em app.ts
				const client = graph.Client.init({ authProvider: (done) => { done(null, info); } });
				const user = await client.api("/me").get();

				cas = new Cas();
				cas.nome = (user.displayName as string || "").trim() || (user.givenName as string || "").trim();
				if (!cas.nome) {
					mensagem = "Informações sobre o nome do usuário faltantes no AD";
					cas = null;
				} else {
					cas.nome = cas.nome.toUpperCase();
					cas.user = (user.userPrincipalName as string || "").trim().toLowerCase();
					if (!cas.user || (!cas.user.endsWith("@espm.br") && !cas.user.endsWith("@acad.espm.br"))) {
						cas.user = (user.mail || "").trim();
						if (!cas.user || (!cas.user.endsWith("@espm.br") && !cas.user.endsWith("@acad.espm.br"))) {
							mensagem = "Informações sobre o login do usuário faltantes no AD";
							cas = null;
						} else {
							cas.email = (user.userPrincipalName as string || "").trim().toLowerCase();
						}
					} else {
						cas.email = (user.mail as string || "").trim().toLowerCase();
					}
					if (cas) {
						cas.emailAcademico = cas.user;
						if (!cas.email)
							cas.email = cas.user;
						cas.aluno = cas.user.endsWith("@acad.espm.br");
						cas.user = cas.user.substring(0, cas.user.lastIndexOf("@"));
						if (!cas.user) {
							mensagem = "E-mail de login do usuário está inválido no AD";
							cas = null;
						}
					}
				}
			}
		} catch (ex) {
			mensagem = ex.message || ex.toString();
			cas = null;
		}

		try {
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
		} catch (ex) {
			return next(ex);
		}
	})(req, res, next);
}

// Alguns iPhones redirecionam apenas para /ad, e não para /ad/login...
router.all("/", wrap(adLogin));

router.all("/login", wrap(adLogin));

export = router;
