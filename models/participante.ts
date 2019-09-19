﻿import { randomBytes } from "crypto";
import express = require("express");
// https://www.npmjs.com/package/lru-cache
import lru = require("lru-cache");
import Sql = require("../infra/sql");
import Cas = require("../models/cas");
import GeradorHash = require("../utils/geradorHash");
import appsettings = require("../appsettings");

export = class Participante {
	// Não utilizar números > 0x7FFFFFFF, pois os XOR resultarão em -1
	private static readonly HashId = 0x1a4ed863;

	public static readonly TipoAluno = 1;
	public static readonly TipoFuncionario = 2;
	public static readonly TipoExterno = 3;

	public id: number;
	public nome: string;
	public login: string;
	public email: string;
	public tipo: number;
	public idindustria: number;
	public idinstrucao: number;
	public idprofissao: number;

	// Utilizado apenas durante a criação
	public senha: string;

	public static async cookie(req: express.Request, res: express.Response = null): Promise<Participante> {
		let cookieStr = req.cookies["participante"] as string;
		if (!cookieStr || cookieStr.length !== 40) {
			if (res) {
				res.statusCode = 403;
				res.json("Não permitido");
			}
			return null;
		} else {
			let id = parseInt(cookieStr.substr(0, 8), 16) ^ Participante.HashId;
			let p: Participante = null;
			await Sql.conectar(async (sql: Sql) => {
				let rows = await sql.query("select id, nome, login, email, tipo, token from participante where id = " + id);
				let row;

				if (!rows || !rows.length || !(row = rows[0]))
					return;

				let token = cookieStr.substring(8);

				if (!row.token ||
					token !== (row.token as string))
					return;

				delete row.token;
				p = row as Participante;
			});
			if (!p && res) {
				res.statusCode = 403;
				res.json("Não permitido");
			}
			return p;
		}
	}

	private static gerarTokenCookie(id: number): [string, string] {
		let idStr = "0000000" + (id ^ Participante.HashId).toString(16);
		let token = randomBytes(16).toString("hex");
		let cookieStr = idStr.substring(idStr.length - 8) + token;
		return [token, cookieStr];
	}

	public static async efetuarLogin(email: string, senha: string, cas: Cas, res: express.Response, ignorarCriacaoCas: boolean = false): Promise<[string, Participante]> {
		if (cas) {
			email = cas.emailAcademico;
			senha = appsettings.senhaPadraoUsuariosIntegracaoCAS;
		}

		if (!email || !senha)
			return ["Usuário ou senha inválidos", null];

		let r: string = null;
		let p: Participante = null;
		let inexistente = false;

		await Sql.conectar(async (sql: Sql) => {
			email = email.normalize().trim().toUpperCase();

			let rows = await sql.query("select id, nome, login, email, tipo, senha from participante where email = ?", [email]);
			let row;

			if (!rows || !rows.length || !(row = rows[0])) {
				inexistente = true;
				r = "E-mail ou senha inválidos";
				return;
			}

			if (!await GeradorHash.validarSenha(senha.normalize(), row.senha)) {
				r = "E-mail ou senha inválidos";
				return;
			}

			let [token, cookieStr] = Participante.gerarTokenCookie(row.id);

			await sql.query("update participante set token = ? where id = " + row.id, [token]);

			delete row.senha;
			p = row as Participante;

			// @@@ secure!!!
			res.cookie("participante", cookieStr, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true, path: "/", secure: false });
		});

		if (cas && inexistente && !ignorarCriacaoCas) {
			// Primeira vez efetuando login
			r = await Participante.criar(new Participante(), cas);
			if (!r)
				return await Participante.efetuarLogin(email, senha, cas, res, true);
		}

		return [r, p];
	}

	public static async efetuarLogout(p: Participante, res: express.Response): Promise<void> {
		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update participante set token = null where id = " + p.id);

			// @@@ secure!!!
			res.cookie("participante", "", { expires: new Date(0), httpOnly: true, path: "/", secure: false });
		});
	}

	private static validar(p: Participante, externo: boolean): string {
		p.nome = (p.nome || "").normalize().trim().toUpperCase();
		if (p.nome.length < 3 || p.nome.length > 100)
			return "Nome inválido";
		p.senha = (p.senha || "").normalize();
		if (p.senha.length < 4 || p.senha.length > 40)
			return "Senha inválida";

		p.email = (p.email || "").normalize().trim().toUpperCase();

		let arroba = p.email.indexOf("@");
		let arroba2 = p.email.lastIndexOf("@");
		let ponto = p.email.lastIndexOf(".");

		if (arroba <= 0 || ponto <= (arroba + 1) || ponto === (p.email.length - 1) || arroba2 !== arroba)
			return "E-mail inválido";

		if (externo) {
			p.login = null;
			p.tipo = Participante.TipoExterno;

			if (p.email.endsWith("@ESPM.BR") || p.email.endsWith("@ACAD.ESPM.BR"))
				return "Alunos e funcionários da ESPM devem utilizar o portal integrado para efetuar login";
			if (isNaN(p.idindustria) || p.idindustria <= 0)
				return "Indústria inválida";
			if (isNaN(p.idinstrucao) || p.idinstrucao <= 0)
				return "Nível de instrução inválido";
			if (isNaN(p.idprofissao) || p.idprofissao <= 0)
				return "Profissão inválida";
		} else {
			p.idindustria = null;
			p.idinstrucao = null;
			p.idprofissao = null;
			p.login = (p.login || "").normalize().trim().toUpperCase();
			if (p.login.length < 3 || p.login.length > 50)
				return "Login inválido";
			if (p.tipo !== Participante.TipoAluno && p.tipo !== Participante.TipoFuncionario)
				return "Tipo inválido";
		}

		return null;
	}

	public static async criar(p: Participante, cas: Cas, res: express.Response = null): Promise<string> {
		let r: string;
		if (cas) {
			p.nome = cas.nome;
			p.login = cas.user;
			p.email = cas.emailAcademico;
			p.senha = appsettings.senhaPadraoUsuariosIntegracaoCAS;
			p.tipo = (cas.aluno ? Participante.TipoAluno : Participante.TipoFuncionario);
		}
		if ((r = Participante.validar(p, !cas)))
			return r;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into participante (nome, login, email, tipo, idindustria, idinstrucao, idprofissao, senha, data_criacao) values (?, ?, ?, ?, ?, ?, ?, ?, now())", [p.nome, p.login, p.email, p.tipo, p.idindustria, p.idinstrucao, p.idprofissao, await GeradorHash.criarHash(p.senha)]);
				p.id = await sql.scalar("select last_insert_id()") as number;
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							r = "Já existe um cadastro com o e-mail \"" + p.email + "\" \uD83D\uDE22. Se tiver esquecido sua senha, basta clicar em \"Esqueci minha senha\".";
							break;
						case "ER_NO_REFERENCED_ROW":
						case "ER_NO_REFERENCED_ROW_2":
							r = "Indústria/Nível de instrução/Profissão não encontrada";
							break;
						default:
							throw e;
					}
				} else {
					throw e;
				}
			}
		});

		if (r)
			return r;

		let senha = p.senha;
		delete p.senha;

		if (res)
			[r, p] = await Participante.efetuarLogin(p.email, senha, cas, res);

		return r;
	}

	public static async redefinirSenha(email: string): Promise<string> {
		if (!(email = (email || "").normalize().trim().toUpperCase()))
			return "E-mail inválido";

		if (email.endsWith("@ESPM.BR") || email.endsWith("@ACAD.ESPM.BR"))
			return "Alunos e funcionários da ESPM devem utilizar o portal integrado para efetuar login";

		let r: string = null;
		let token = randomBytes(32).toString("hex").toUpperCase();

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update participante set data_reset_senha = now(), token_reset_senha = ? where email = ?", [token, email]);
			if (!sql.linhasAfetadas)
				r = "Não foi possível localizar um cadastro com o e-mail fornecido \uD83D\uDE22";
		});

		return r;
	}

	public static async definirSenha(email: string, token: string, senha: string): Promise<string> {
		if (!(email = (email || "").normalize().trim().toUpperCase()))
			return "E-mail inválido";
		if (!(token = (token || "").normalize().trim().toUpperCase()) ||
			token.length !== 64)
			return "Chave de segurança inválida";
		senha = (senha || "").normalize();
		if (senha.length < 4 || senha.length > 40)
			return "Senha inválida";

		if (email.endsWith("@ESPM.BR") || email.endsWith("@ACAD.ESPM.BR"))
			return "Alunos e funcionários da ESPM devem utilizar o portal integrado para efetuar login";

		let r: string = null;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update participante set data_reset_senha = null, token_reset_senha = null, token = null, senha = ? where email = ? and token_reset_senha = ?", [await GeradorHash.criarHash(senha), email, token]);
			if (!sql.linhasAfetadas)
				r = "E-mail ou chave de segurança inválidos \uD83D\uDE22";
		});

		return r;
	}
}
