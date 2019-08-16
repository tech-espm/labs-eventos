//****************************************************************
// Logo ao abrir o projeto podem aparecer alguns erros nesse
// código, bem como nas dependências do Solution Explorer!
// É normal que isso ocorra, até que o processo de carregamento
// (exibido no canto inferior esquerdo) tenha avançado!
//****************************************************************

//****************************************************************
// @@@
// Para utilizar o view engine ejs, adicionamos a linha
// "ejs": "^2.6.1", às dependências do arquivo package.json
// Isso significa que queremos a versão 2.6.1 do ejs, ou uma
// superior, mas compatível!
// https://docs.npmjs.com/files/package.json
//
// Depois de alterado o arquivo, é preciso clicar com o botão
// direito sobre a dependência, no Solution Explorer, e clicar
// na opção "Install Missing npm Package(s)"
//****************************************************************

import debug = require("debug");
import express = require("express");
import wrap = require("express-async-error-wrapper");
import cookieParser = require("cookie-parser"); // https://stackoverflow.com/a/16209531/3569421
import path = require("path");

// @@@ Configura o cache, para armazenar as 200 últimas páginas
// já processadas, por ordem de uso
import ejs = require("ejs");
import lru = require("lru-cache");
import { NextFunction } from "express";
ejs.cache = lru(200);

const app = express();

// Não queremos o header X-Powered-By
app.disable("x-powered-by");

app.use(cookieParser());

//import Usuario = require("./models/usuario");
// Parei de usar Usuario.pegarDoCookie como middleware, porque existem muitas requests
// que não precisam validar o usuário logado...
//app.use(Usuario.pegarDoCookie); // Coloca o parser de usuário depois do cookie, pois ele usa os cookies

// Explica para o express qual será o diretório de onde serviremos os
// arquivos estáticos (js, css, imagens etc...)
app.use(express.static(path.join(__dirname, "public"), {
	cacheControl: true,
	etag: false,
	maxAge: "30d"
}));
app.use(express.json()); // http://expressjs.com/en/api.html#express.json
app.use(express.urlencoded({ extended: true })); // http://expressjs.com/en/api.html#express.urlencoded

// Configura o diretório de onde tirar as views
app.set("views", path.join(__dirname, "views"));
// @@@ Define o view engine como o ejs e importa o express-ejs-layouts
// https://www.npmjs.com/package/express-ejs-layouts, pois o ejs não
// suporta layouts nativamente: https://www.npmjs.com/package/ejs#layouts
app.set("view engine", "ejs");
app.use(require("express-ejs-layouts"));

// Nosso middleware para evitar cache das páginas e api
// (deixa depois do static, pois os arquivos static devem usar cache e coisas)
app.use((req: express.Request, res: express.Response, next: NextFunction) => {
	res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
	res.header("Expires", "-1");
	res.header("Pragma", "no-cache");
	next();
});

// Especifica quais módulos serão responsáveis por servir cada rota,
// a partir dos endereços requisitados pelo cliente
//
// A string no primeiro parâmetro representa o começo do caminho
// requisitado. Vamos ver alguns exemplos de caminhos, e como eles
// seriam tratados pelo Express
//
// Caminho completo   Caminho do tratador   Tratador e resultado
// /                  /                     index (OK)
// /usuario           /                     usuario (OK)
// /usuario/novo      /novo                 usuario (OK)
// /usuario/alterar   /alterar              usuario (Erro, não temos /alterar em usuario)
// /outra             /outra                index (OK)
// /usuarioteste      /usuarioteste         index (Erro, não temos /usuarioteste em index)
//
// https://expressjs.com/en/guide/routing.html

import Evento = require("./models/evento");
Evento.nomesReservados.push(
	"api",

	"css",
	"evt",
	"favicons",
	"imagens",
	"js",
	"lib",

	"curso",
	"formato",
	"industria",
	"instrucao",
	"local",
	"profissao",
	"tipoEmpresa",
	"tipoSessao",
	"unidade",
	"usuario",
	"vertical",

	"evento"
);

// *****************************************************************************
// Cadastrar todos os nomes reservados acima!!!
// *****************************************************************************

// Cadastros simples
app.use("/", require("./routes/home"));
app.use("/curso", require("./routes/curso"));
app.use("/formato", require("./routes/formato"));
app.use("/industria", require("./routes/industria"));
app.use("/instrucao", require("./routes/instrucao"));
app.use("/local", require("./routes/local"));
app.use("/profissao", require("./routes/profissao"));
app.use("/tipoSessao", require("./routes/tipoSessao"));
app.use("/tipoEmpresa", require("./routes/tipoEmpresa"));
app.use("/unidade", require("./routes/unidade"));
app.use("/usuario", require("./routes/usuario"));
app.use("/vertical", require("./routes/vertical"));
// API
app.use("/api/curso", require("./routes/api/curso"));
app.use("/api/formato", require("./routes/api/formato"));
app.use("/api/industria", require("./routes/api/industria"));
app.use("/api/instrucao", require("./routes/api/instrucao"));
app.use("/api/local", require("./routes/api/local"));
app.use("/api/profissao", require("./routes/api/profissao"));
app.use("/api/tipoSessao", require("./routes/api/tipoSessao"));
app.use("/api/tipoEmpresa", require("./routes/api/tipoEmpresa"));
app.use("/api/unidade", require("./routes/api/unidade"));
app.use("/api/usuario", require("./routes/api/usuario"));
app.use("/api/vertical", require("./routes/api/vertical"));

// Cadastros relacionados aos eventos
app.use("/evento", require("./routes/evento"));
// API
app.use("/api/evento", require("./routes/api/evento"));
app.use("/api/data", require("./routes/api/data"));
app.use("/api/horario", require("./routes/api/horario"));
app.use("/api/empresa", require("./routes/api/empresa"));
app.use("/api/palestrante", require("./routes/api/palestrante"));

// Depois de registrados todos os caminhos das rotas e seus
// tratadores, registramos os tratadores que serão chamados
// caso nenhum dos tratadores anteriores tenha devolvido alguma
// resposta
//
// O Express diferencia um tratador regular (como esse aqui) de um tratador
// de erros, como os dois abaixo, pela quantidade de parâmetros!!!
//
// Isso é possível, porque em JavaScript, f.length retorna a quantidade
// de parâmetros declarados na função f!!!
app.use((req: express.Request, res: express.Response, next) => {
	let err = null;

	try {
		let evento = Evento.idsPorUrl[req.path];
		if (evento && evento.id && evento.habilitado) {
			// @@@ render...
			return;
		}
	} catch (e) {
		err = e;
	}
	if (!err) {
		err = new Error("Não encontrado");
		err["status"] = 404;
	} else {
		err["status"] = 500;
	}
	// Executa o próximo tratador na sequência (que no nosso caso
	// será um dos dois tratadores abaixo)
	next(err);
});

// Registra os tratadores de erro
//if (app.get("env") === "development") {
	app.use((err: any, req: express.Request, res: express.Response, next) => {
		res.status(err.status || 500);
		res.render("shared/erro", {
			layout: "layout-externo",
			mensagem: err.message,
			// Como é um ambiente de desenvolvimento, deixa o objeto do erro
			// ir para a página, que possivelmente exibirá suas informações
			erro: err
		});

		// Como não estamos chamando next(err) aqui, o tratador
		// abaixo não será executado
	});
//}
//app.use((err: any, req: express.Request, res: express.Response, next) => {
//	res.status(err.status || 500);
//	res.render("shared/erro", {
//		layout: "layout-externo",
//		mensagem: err.message,
//		// Não envia o objeto do erro para a página
//		erro: {}
//	});
//});

app.set("port", process.env.PORT || 3000);

Evento.atualizarIdsPorUrl();

const server = app.listen(app.get("port"), process.env.IP || "127.0.0.1", () => {
	debug("Express server listening on port " + server.address()["port"]);
});
