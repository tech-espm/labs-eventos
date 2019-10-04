import express = require("express");
import https = require("https");
import nodemailer = require("nodemailer");
import { URL } from "url";
import Sql = require("../infra/sql");
import FS = require("../infra/fs");
import Upload = require("../infra/upload");
import GeradorHash = require("../utils/geradorHash");
import emailValido = require("../utils/emailValido");
import appsettings = require("../appsettings");
import intToHex = require("../utils/intToHex");

export = class Palestrante {
	private static readonly HashId = appsettings.palestranteHashId;

	public static readonly tamanhoMaximoImagemEmKiB = 512;
	public static readonly tamanhoMaximoImagemEmBytes = Palestrante.tamanhoMaximoImagemEmKiB << 10;
	public static readonly extensaoImagem = "png";

	public id: number;
	public idevento: number;
	public idempresa: number;
	public nome: string;
	public nome_curto: string;
	public email: string;
	public oculto: number;
	public prioridade: number;
	public cargo: string;
	public url_site: string;
	public url_twitter: string;
	public url_facebook: string;
	public url_linkedin: string;
	public bio: string;
	public bio_curta: string;
	public versao: number;

	public static caminhoRelativoPasta(idevento: number): string {
		return `public/evt/${idevento}/palestrantes`;
	}

	public static caminhoAbsolutoPastaExterno(idevento: number): string {
		return `/evt/${idevento}/palestrantes`;
	}

	public static caminhoRelativoArquivo(idevento: number, id: number): string {
		return `public/evt/${idevento}/palestrantes/${id}.${Palestrante.extensaoImagem}`;
	}

	public static caminhoAbsolutoArquivoExterno(idevento: number, id: number, versao: number): string {
		return `/evt/${idevento}/palestrantes/${id}.${Palestrante.extensaoImagem}?v=${versao}`;
	}

	private static validar(p: Palestrante): string {
		if (isNaN(p.idevento) || p.idevento <= 0)
			return "Evento inválido";
		if (isNaN(p.idempresa) || p.idempresa <= 0)
			return "Empresa inválida";
		p.nome = (p.nome || "").normalize().trim().toUpperCase();
		if (p.nome.length < 3 || p.nome.length > 100)
			return "Nome inválido";
		p.nome_curto = (p.nome_curto || "").normalize().trim().toUpperCase();
		if (p.nome_curto.length < 1 || p.nome_curto.length > 45)
			return "Nome para divulgação inválido";
		p.email = (p.email || "").normalize().trim().toUpperCase();
		if (p.email.length < 5 || p.email.length > 100 || !emailValido(p.email))
			return "E-mail inválido";
		if (isNaN(p.oculto) || p.oculto < 0 || p.oculto > 1)
			p.oculto = 0;
		if (isNaN(p.prioridade))
			p.prioridade = 0;
		else if (p.prioridade < -100)
			p.prioridade = -100;
		else if (p.prioridade > 100)
			p.prioridade = 100;
		p.cargo = (p.cargo || "").normalize().trim().toUpperCase();
		if (p.cargo.length > 45)
			return "Cargo inválido";
		p.url_site = (p.url_site || "").trim();
		if (p.url_site.length > 100)
			return "URL do site inválida";
		p.url_twitter = (p.url_twitter || "").trim();
		if (p.url_twitter.length > 100)
			return "URL do Twitter inválida";
		p.url_facebook = (p.url_facebook || "").trim();
		if (p.url_facebook.length > 100)
			return "URL do Facebook inválida";
		p.url_linkedin = (p.url_linkedin || "").trim();
		if (p.url_linkedin.length > 100)
			return "URL do LinkedIn inválida";
		p.bio = (p.bio || "").normalize().trim().toUpperCase();
		if (p.bio.length > 1000)
			return "Biografia inválido";
		p.bio_curta = (p.bio_curta || "").normalize().trim().toUpperCase();
		if (p.bio_curta.length > 200)
			return "Biografia curta inválido";
		if (isNaN(p.versao) || p.versao < 0)
			return "Versão inválida";
		return null;
	}

	public static async listar(idevento: number, externo: boolean = false): Promise<Palestrante[]> {
		let lista: Palestrante[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select p.id, p.idevento, p.idempresa, e.nome nome_empresa, p.nome, p.nome_curto, " + (externo ? "" : "p.email, p.oculto, ") + "p.prioridade, p.cargo, p.url_site, p.url_twitter, p.url_facebook, p.url_linkedin, p.bio, p.bio_curta, p.versao from eventopalestrante p inner join eventoempresa e on e.id = p.idempresa where p.idevento = ? " + (externo ? " and p.oculto = 0 " : "") + " order by p.nome asc", [idevento]) as Palestrante[];
		});

		return (lista || []);
	}

	public static async obter(id: number, idevento: number): Promise<Palestrante> {
		let lista: Palestrante[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select p.id, p.idevento, p.idempresa, e.nome nome_empresa, p.nome, p.nome_curto, p.email, p.oculto, p.prioridade, p.cargo, p.url_site, p.url_twitter, p.url_facebook, p.url_linkedin, p.bio, p.bio_curta, p.versao from eventopalestrante p inner join eventoempresa e on e.id = p.idempresa where p.id = ? and p.idevento = ?", [id, idevento]) as Palestrante[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(p: Palestrante, arquivo: any): Promise<string> {
		let res: string;
		if ((res = Palestrante.validar(p)))
			return res;

		let enviarEmail = false;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("insert into eventopalestrante (idevento, idempresa, nome, nome_curto, email, oculto, prioridade, cargo, url_site, url_twitter, url_facebook, url_linkedin, bio, bio_curta, versao) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [p.idevento, p.idempresa, p.nome, p.nome_curto, p.email, p.oculto, p.prioridade, p.cargo, p.url_site, p.url_twitter, p.url_facebook, p.url_linkedin, p.bio, p.bio_curta, p.versao]);
				p.id = await sql.scalar("select last_insert_id()") as number;

				// Chegando aqui, significa que a inclusão foi bem sucedida.
				// Logo, podemos tentar criar o arquivo físico. Se a criação do
				// arquivo não funcionar, uma exceção ocorrerá, e a transação será
				// desfeita, já que o método commit() não executará, e nossa classe
				// Sql já executa um rollback() por nós nesses casos.
				await Upload.gravarArquivo(arquivo, Palestrante.caminhoRelativoPasta(p.idevento), p.id + "." + Palestrante.extensaoImagem);

				res = p.id.toString();

				await sql.commit();

				enviarEmail = true;
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							res = "Já existe um palestrante com esse e-mail no evento";
							break;
						case "ER_NO_REFERENCED_ROW":
						case "ER_NO_REFERENCED_ROW_2":
							res = "Evento ou empresa não encontrada";
							break;
						default:
							throw e;
					}
				} else {
					throw e;
				}
			}
		});

		//if (enviarEmail && p.email)
		//	res = await Palestrante.enviarEmailLiberacao(p);

		return res;
	}

	public static async alterar(p: Palestrante, arquivo: any): Promise<string> {
		let res: string;
		if ((res = Palestrante.validar(p)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("update eventopalestrante set idempresa = ?, nome = ?, nome_curto = ?, email = ?, oculto = ?, prioridade = ?, cargo = ?, url_site = ?, url_twitter = ?, url_facebook = ?, url_linkedin = ?, bio = ?, bio_curta = ?, versao = ? where id = ? and idevento = ?", [p.idempresa, p.nome, p.nome_curto, p.email, p.oculto, p.prioridade, p.cargo, p.url_site, p.url_twitter, p.url_facebook, p.url_linkedin, p.bio, p.bio_curta, p.versao, p.id, p.idevento]);

				if (sql.linhasAfetadas && arquivo && arquivo.buffer && arquivo.size) {
					// Chegando aqui, significa que a inclusão foi bem sucedida.
					// Logo, podemos tentar criar o arquivo físico. Se a criação do
					// arquivo não funcionar, uma exceção ocorrerá, e a transação será
					// desfeita, já que o método commit() não executará, e nossa classe
					// Sql já executa um rollback() por nós nesses casos.
					await Upload.gravarArquivo(arquivo, Palestrante.caminhoRelativoPasta(p.idevento), p.id + "." + Palestrante.extensaoImagem);
				}

				res = sql.linhasAfetadas.toString();

				await sql.commit();
			} catch (e) {
				switch (e.code) {
					case "ER_DUP_ENTRY":
						res = "Já existe um palestrante com esse e-mail no evento";
						break;
					case "ER_NO_REFERENCED_ROW":
					case "ER_NO_REFERENCED_ROW_2":
						res = "Empresa não encontrada";
						break;
					default:
						throw e;
				}
			}
		});

		return res;
	}

	public static async excluir(id: number, idevento: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("delete from eventopalestrante where id = ? and idevento = ?", [id, idevento]);

				if (sql.linhasAfetadas) {
					// Chegando aqui, significa que a exclusão foi bem sucedida.
					// Logo, podemos tentar excluir o arquivo físico. Se a exclusão do
					// arquivo não funcionar, uma exceção ocorrerá, e a transação será
					// desfeita, já que o método commit() não executará, e nossa classe
					// Sql já executa um rollback() por nós nesses casos.
					let caminho = Palestrante.caminhoRelativoArquivo(idevento, id);
					if (await FS.existeArquivo(caminho))
						await FS.excluirArquivo(caminho);
				}

				res = sql.linhasAfetadas.toString();

				await sql.commit();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "O palestrante é referenciado por uma ou mais sessões";
				else
					throw e;
			}
		});

		return res;
	}

	public static async obterImagemTwitter(twitterUrl: string, res: express.Response) {
		let url = new URL(twitterUrl);

		let options: https.RequestOptions = {
			host: url.host,
			port: 443,
			path: url.pathname + url.search,
			protocol: url.protocol,
			method: "GET"
		};

		let httpreq = https.request(options, function (response) {
			let html = "";
			response.setEncoding("utf8");
			response.on("error", function () {
				res.sendStatus(500);
			});
			response.on("data", function (chunk) {
				html += chunk;
			});
			response.on("end", function () {
				let i = html.indexOf("ProfileAvatar-image");
				if (i < 0) {
					res.sendStatus(400);
					return;
				}

				let f = html.indexOf(">", i);
				if (f <= i) {
					res.sendStatus(400);
					return;
				}

				let c = html.indexOf("src=\"", i);
				if (c <= i || c >= f) {
					res.sendStatus(400);
					return;
				}

				c += 5;
				let cf = html.indexOf("\"", c);
				if (cf <= c || cf >= f) {
					res.sendStatus(400);
					return;
				}

				let urlImagem = html.substring(c, cf);

				let url = new URL(urlImagem);

				let options: https.RequestOptions = {
					host: url.host,
					port: 443,
					path: url.pathname + url.search,
					protocol: url.protocol,
					method: "GET"
				};

				let httpreqImagem = https.request(options, function (response) {
					let contentType = response.headers["content-type"];
					res.setHeader("Content-Type", contentType);
					response.pipe(res);
				});
				httpreqImagem.end();
			});
		});
		httpreq.end();
	}

	public static async gerarLinkLiberacao(id: number): Promise<string> {
		let sid = intToHex(id ^ Palestrante.HashId).toLowerCase();
		return "https://credenciamento.espm.br/evento/termo/" + sid + (await GeradorHash.criarHash(sid)).replace(/\:/g, "_").replace(/\//g, "-").replace(/\+/g, "@").replace(/\=/g, "[");
	}

	public static async liberar(hash: string): Promise<boolean> {
		if (!hash || hash.length <= 8)
			return false;

		let sid = hash.substr(0, 8).toLowerCase();
		let id = parseInt(sid, 16);
		if (isNaN(id) || id <= 0)
			return false;

		id ^= Palestrante.HashId;

		if (!(await GeradorHash.validarSenha(sid, hash.substr(8).replace(/\_/g, ":").replace(/\-/g, "/").replace(/@/g, "+").replace(/\[/g, "="))))
			return false;

		let res = false;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update eventopalestrante set liberado = 1 where id = " + id);

			res = !!sql.linhasAfetadas;
		});

		return res;
	}

	private static async enviarEmailLiberacao(p: Palestrante): Promise<string> {
		let res: string = null;

		let link = await Palestrante.gerarLinkLiberacao(p.id);

		try {
			let transporter = nodemailer.createTransport(appsettings.mailConfig);

			await transporter.sendMail({
				from: appsettings.mailFromRedefinicao,
				to: p.email.toLowerCase(),
				subject: "Termo de Aceite do Uso de Imagem",
				text: `Olá!\n\nVocê está recebendo essa mensagem pois vai participar como palestrante de um evento na ESPM.\n\nComo respeitamos muito sua imagem e sua privacidade, sua imagem e suas informações só serão exibidas no site do evento mediante seu aceite.\n\nPara dar esse aceite, por favor, basta acessar o endereço abaixo a partir de seu browser:\n\n${link}\n\nCaso desconheça sua participação no evento, por favor, desconsidere essa mensagem.\n\nAté breve!\n\nTenha um excelente evento :)`,
				html: `<p>Olá!</p><p>Você está recebendo essa mensagem pois vai participar como palestrante de um evento na ESPM.</p><p>Como respeitamos muito sua imagem e sua privacidade, sua imagem e suas informações só serão exibidas no site do evento mediante seu aceite</p><p>Para dar esse aceite, por favor, basta acessar o endereço abaixo a partir de seu browser:</p><p><a target="_blank" href="${link}">${link}</a></p><p>Caso desconheça sua participação no evento, por favor, desconsidere essa mensagem.</p><p>Até breve!</p><p>Tenha um excelente evento :)</p>`
			});

			res = p.id.toString();
		} catch (ex) {
			res = "O palestrante foi criado com sucesso! Porém houve uma falha ao enviar o e-mail com o link para o termo de aceite do uso de imagem. Por favor, envie o link manualmente \uD83D\uDE22";
		}

		return res;
	}
}
