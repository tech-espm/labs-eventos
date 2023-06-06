import { randomBytes } from "crypto";
import express = require("express");
// https://www.npmjs.com/package/lru-cache
import lru = require("lru-cache");
import Sql = require("../infra/sql");
import Cas = require("../models/cas");
import GeradorHash = require("../utils/geradorHash");
import appsettings = require("../appsettings");
import intToHex = require("../utils/intToHex");

export = class Usuario {
	// Removendo o cache para adequar o sistema a ambientes de cluster
	// (No futuro usar Redis ou similar...)
	//private static readonly cacheUsuarioLogados = lru(100);

	private static readonly HashSenhaPadrao = appsettings.usuarioHashSenhaPadrao;
	private static readonly HashId = appsettings.usuarioHashId;
	private static readonly HashIdEvento = appsettings.usuarioHashIdEvento;

	public static readonly TipoAdmin = 0;
	public static readonly TipoComum = 1;

	public id: number;
	public login: string;
	public nome: string;
	public tipo: number;
	public senha: string;

	// Utilizados apenas no cache
	private cookieStr: string;
	public nomeevento_logado: string;
	public idevento_logado: number;
	public admin: boolean;
	public cas: boolean;

	public static removerDoCache(id: number): void {
		//Usuario.cacheUsuarioLogados.del(id);
	}

	// Parei de usar Usuario.pegarDoCookie como middleware, porque existem muitas requests
	// que não precisam validar o usuário logado, e agora, é assíncrono...
	// http://expressjs.com/pt-br/guide/writing-middleware.html
	//public static pegarDoCookie(req: express.Request, res: express.Response, next: Function): void {
	public static async cookie(req: express.Request, res: express.Response = null, admin: boolean = false): Promise<Usuario> {
		let cookieStr = req.cookies["usuario"] as string;
		if (!cookieStr || cookieStr.length !== 48) {
			if (res) {
				res.statusCode = 403;
				res.json("Não permitido");
			}
			return null;
		} else {
			let id = parseInt(cookieStr.substr(0, 8), 16) ^ Usuario.HashId;
			let usuario: Usuario;
			//let usuario = Usuario.cacheUsuarioLogados.get(id) as Usuario;
			//if (usuario) {
			//	if (usuario.cookieStr !== cookieStr)
			//		usuario = null;
			//} else {
				usuario = null;

				await Sql.conectar(async (sql: Sql) => {
					let rows = await sql.query("select id, login, nome, tipo, token, idevento_logado from usuario where id = " + id);
					let row;

					if (!rows || !rows.length || !(row = rows[0]))
						return;

					let idevento_logado = parseInt(cookieStr.substr(8, 8), 16) ^ Usuario.HashIdEvento;
					let token = cookieStr.substring(16);

					if (idevento_logado !== (row.idevento_logado as number) ||
						!row.token ||
						token !== (row.token as string))
						return;

					let nomeevento_logado: string = null;
					if (idevento_logado)
						nomeevento_logado = await sql.scalar("select nome from evento where id = " + idevento_logado) as string;

					let u = new Usuario();
					u.id = id;
					u.login = row.login as string;
					u.nome = row.nome as string;
					u.tipo = row.tipo as number;
					u.cookieStr = cookieStr;
					u.idevento_logado = idevento_logado;
					u.nomeevento_logado = (nomeevento_logado || null);
					u.admin = (u.tipo === Usuario.TipoAdmin);
					u.cas = u.login.endsWith("@ESPM.BR");

					//Usuario.cacheUsuarioLogados.set(id, u);

					usuario = u;
				});
			//}
			if (admin && usuario && usuario.tipo !== Usuario.TipoAdmin)
				usuario = null;
			if (!usuario && res) {
				res.statusCode = 403;
				res.json("Não permitido");
			}
			return usuario;
		}
	}

	private static gerarTokenCookie(id: number, idevento_logado: number): [string, string] {
		let idStr = intToHex(id ^ Usuario.HashId);
		let idEventoLogadoStr = intToHex(idevento_logado ^ Usuario.HashIdEvento);
		let token = randomBytes(16).toString("hex");
		let cookieStr = idStr + idEventoLogadoStr + token;
		return [token, cookieStr];
	}

	public static async efetuarLogin(login: string, senha: string, cas: Cas, res: express.Response): Promise<[string, Usuario]> {
		if (cas) {
			login = cas.emailAcademico;
			senha = appsettings.senhaPadraoUsuariosIntegracaoCAS;
		}

		if (!login || !senha)
			return ["Usuário ou senha inválidos", null];

		let r: string = null;
		let u: Usuario = null;

		await Sql.conectar(async (sql: Sql) => {
			login = login.normalize().trim().toUpperCase();

			let rows = await sql.query("select id, nome, tipo, senha from usuario where login = ?", [login]);
			let row;
			let ok: boolean;

			if (!rows || !rows.length || !(row = rows[0]) || !(ok = await GeradorHash.validarSenha(senha.normalize(), row.senha))) {
				r = "Usuário ou senha inválidos";
				return;
			}

			let [token, cookieStr] = Usuario.gerarTokenCookie(row.id, 0);

			// Atualiza o nome com as informações vindas do AD
			if (cas)
				await sql.query("update usuario set nome = ?, token = ?, idevento_logado = 0 where id = " + row.id, [cas.nome, token]);
			else
				await sql.query("update usuario set token = ?, idevento_logado = 0 where id = " + row.id, [token]);

			u = new Usuario();
			u.id = row.id;
			u.login = login;
			u.nome = row.nome as string;
			u.tipo = row.tipo as number;
			u.cookieStr = cookieStr;
			u.idevento_logado = 0;
			u.nomeevento_logado = null;
			u.admin = (u.tipo === Usuario.TipoAdmin);
			u.cas = !!cas;

			//Usuario.cacheUsuarioLogados.set(row.id, u);

			// @@@ secure!!!
			res.cookie("usuario", cookieStr, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true, path: "/", secure: false });
		});

		return [r, u];
	}

	public async efetuarLogout(res: express.Response): Promise<void> {
		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update usuario set token = null, idevento_logado = 0 where id = " + this.id);

			this.idevento_logado = 0;
			this.nomeevento_logado = null;

			//Usuario.cacheUsuarioLogados.del(this.id);

			// @@@ secure!!!
			res.cookie("usuario", "", { expires: new Date(0), httpOnly: true, path: "/", secure: false });
		});
	}

	public async alterarPerfil(res: express.Response, senhaAtual: string, novaSenha: string): Promise<string> {
		if (!!senhaAtual !== !!novaSenha || (novaSenha && novaSenha.length > 40))
			return "Senha inválida";

		let r: string = null;

		await Sql.conectar(async (sql: Sql) => {
			if (senhaAtual) {
				let hash = await sql.scalar("select senha from usuario where id = " + this.id) as string;
				if (this.cas || !await GeradorHash.validarSenha(senhaAtual.normalize(), hash)) {
					r = "Senha atual não confere";
					return;
				}

				hash = await GeradorHash.criarHash(novaSenha.normalize());

				let [token, cookieStr] = Usuario.gerarTokenCookie(this.id, this.idevento_logado);

				await sql.query("update usuario set senha = ?, token = ? where id = " + this.id, [hash, token]);

				this.cookieStr = cookieStr;

				// @@@ secure!!!
				res.cookie("usuario", cookieStr, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true, path: "/", secure: false });
			}
		});

		return r;
	}

	private static hashSenhaPadraoDeLogin(login: string): string {
		return (login.endsWith("@ESPM.BR") ? appsettings.hashSenhaPadraoUsuariosIntegracaoCAS : Usuario.HashSenhaPadrao);
	}

	private static validar(u: Usuario): string {
		u.nome = (u.nome || "").normalize().trim();
		if (u.nome.length < 3 || u.nome.length > 100)
			return "Nome inválido";

		if (u.tipo !== Usuario.TipoAdmin && u.tipo !== Usuario.TipoComum)
			return "Tipo inválido";

		return null;
	}

	public static async listar(): Promise<Usuario[]> {
		let lista: Usuario[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, login, nome, case tipo when 0 then 'ADMIN' else 'COMUM' end tipo from usuario order by login asc") as Usuario[];
		});

		return (lista || []);
	}

	public static async obter(id: number): Promise<Usuario> {
		let lista: Usuario[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, login, nome, tipo from usuario where id = " + id) as Usuario[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(u: Usuario): Promise<string> {
		let res: string;
		if ((res = Usuario.validar(u)))
			return res;

		u.login = (u.login || "").normalize().trim().toUpperCase();
		if (u.login.length < 3 || u.login.length > 50)
			return "Login inválido";

		if (!u.login.endsWith("@ESPM.BR"))
			return "O login deve ser uma conta do domínio @ESPM.BR";

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into usuario (login, nome, tipo, senha, idevento_logado) values (?, ?, ?, '" + Usuario.hashSenhaPadraoDeLogin(u.login) + "', 0)", [u.login, u.nome, u.tipo]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O login \"" + u.login + "\" já está em uso";
				else
					throw e;
			}
		});

		return res;
	}

	public static async alterar(u: Usuario): Promise<string> {
		let res: string;
		if ((res = Usuario.validar(u)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update usuario set nome = ?, tipo = ? where id = " + u.id, [u.nome, u.tipo]);
			res = sql.linhasAfetadas.toString();
			//if (sql.linhasAfetadas)
			//	Usuario.cacheUsuarioLogados.del(u.id);
		});

		return res;
	}

	public static async excluir(id: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("delete from usuario where id = " + id);
			res = sql.linhasAfetadas.toString();
			//if (sql.linhasAfetadas)
			//	Usuario.cacheUsuarioLogados.del(id);
		});

		return res;
	}

	public static async redefinirSenha(id: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			let login = await sql.scalar("select login from usuario where id = " + id) as string;
			if (!login) {
				res = "0";
			} else {
				await sql.query("update usuario set token = null, idevento_logado = 0, senha = '" + Usuario.hashSenhaPadraoDeLogin(login) + "' where id = " + id);
				res = sql.linhasAfetadas.toString();
				//if (sql.linhasAfetadas)
				//	Usuario.cacheUsuarioLogados.del(id);
			}
		});

		return res;
	}

	public static alterarNomeDoEventoEmCache(idevento: number, nome: string): void {
		//Usuario.cacheUsuarioLogados.forEach((value, key, cache) => {
		//	let u = value as Usuario;
		//	if (u.idevento_logado === idevento)
		//		u.nomeevento_logado = nome;
		//});
	}

	// Eventos

	public async eventoSelecionar(idevento: number, res: express.Response): Promise<string> {
		let r: string = null;

		await Sql.conectar(async (sql: Sql) => {
			let [token, cookieStr] = Usuario.gerarTokenCookie(this.id, idevento);

			await sql.query("update usuario set token = ?, idevento_logado = " + idevento + " where id = " + this.id + " and (tipo = 0 or exists (select 1 from eventousuario where idevento = " + idevento + " and idusuario = " + this.id + "))", [token]);
			if (!sql.linhasAfetadas) {
				r = "Usuário não possui acesso ao evento";
				return;
			}

			let nomeevento_logado: string = null;

			if (idevento)
				nomeevento_logado = await sql.scalar("select nome from evento where id = " + idevento) as string;

			this.cookieStr = cookieStr;
			this.idevento_logado = idevento;
			this.nomeevento_logado = (nomeevento_logado || null);

			// @@@ secure!!!
			res.cookie("usuario", cookieStr, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true, path: "/", secure: false });
		});

		return r;
	}

	public static async eventoListar(idevento: number): Promise<Usuario[]> {
		let lista: Usuario[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select u.id, u.login, u.nome from eventousuario evu inner join usuario u on u.id = evu.idusuario where evu.idevento = " + idevento + " order by u.login asc") as Usuario[];
		});

		return (lista || []);
	}

	public static async eventoAssociar(idevento: number, login: string): Promise<string> {
		let res: string = null;
		if (!login || !(login = login.normalize().trim().toUpperCase()))
			return "Login inválido";

		await Sql.conectar(async (sql: Sql) => {
			let rows = await sql.query("select id from usuario where login = ?", [login]);
			let row;

			if (!rows || !(row = rows[0])) {
				res = "Login não encontrado";
				return;
			}

			try {
				await sql.query("insert into eventousuario (idevento, idusuario) values (?, ?)", [idevento, row.id]);
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							res = "O usuário já estava associado ao evento";
							break;
						case "ER_NO_REFERENCED_ROW":
						case "ER_NO_REFERENCED_ROW_2":
							res = "Evento não encontrado";
							break;
						default:
							throw e;
					}
				} else {
					throw e;
				}
			}
		});

		return res;
	}

	public static async eventoDesassociar(idevento: number, idsusuario: number[]): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			let uidsstr = idsusuario.join(",");
			await sql.beginTransaction();
			await sql.query("update usuario set idevento_logado = 0 where idevento_logado = " + idevento + " and id in (" + uidsstr + ")");
			await sql.query("delete from eventousuario where idevento = " + idevento + " and idusuario in (" + uidsstr + ")");
			res = sql.linhasAfetadas.toString();
			await sql.commit();
		});

		for (let i = 0; i < idsusuario.length; i++)
			Usuario.removerDoCache(idsusuario[i]);

		return res;
	}
}
