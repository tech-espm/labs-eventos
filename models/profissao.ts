﻿import Sql = require("../infra/sql");

export = class Profissao {
	public id: number;
	public nome: string;
	public ordem: number;

	private static validar(p: Profissao): string {
		p.nome = (p.nome || "").normalize().trim().toUpperCase();
		if (p.nome.length < 3 || p.nome.length > 100)
			return "Nome inválido";
		if (isNaN(p.ordem))
			p.ordem = 0;
		return null;
	}

	public static async listar(): Promise<Profissao[]> {
		let lista: Profissao[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, ordem from profissao order by ordem asc, nome asc") as Profissao[];
		});

		return (lista || []);
	}

	public static async obter(id: number): Promise<Profissao> {
		let lista: Profissao[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, ordem from profissao where id = " + id) as Profissao[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(p: Profissao): Promise<string> {
		let res: string;
		if ((res = Profissao.validar(p)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into profissao (nome, ordem) values (?, ?)", [p.nome, p.ordem]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "A profissão \"" + p.nome + "\" já existe";
				else
					throw e;
			}
		});

		return res;
	}

	public static async alterar(p: Profissao): Promise<string> {
		let res: string;
		if ((res = Profissao.validar(p)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update profissao set nome = ?, ordem = ? where id = " + p.id, [p.nome, p.ordem]);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "A profissão \"" + p.nome + "\" já existe";
				else
					throw e;
			}
		});

		return res;
	}

	public static async excluir(id: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			//await sql.beginTransaction();
			//await sql.query("update xxx set idprofissao = null... where idprofissao = " + id);
			try {
				await sql.query("delete from profissao where id = " + id);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "A profissão é referenciada por um ou mais palestrantes/participantes";
				else
					throw e;
			}
			//await sql.commit();
		});

		return res;
	}
}
