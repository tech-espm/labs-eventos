import Sql = require("../infra/sql");

export = class Unidade {
	public id: number;
	public nome: string;
	public sigla: string;

	private static validar(u: Unidade): string {
		u.nome = (u.nome || "").trim().toUpperCase();
		if (u.nome.length < 3 || u.nome.length > 100)
			return "Nome inválido";
		u.sigla = (u.sigla || "").trim().toUpperCase();
		if (u.sigla.length < 1 || u.sigla.length > 50)
			return "Sigla inválida";
		return null;
	}

	public static async listar(): Promise<Unidade[]> {
		let lista: Unidade[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, sigla from unidade order by nome asc") as Unidade[];
		});

		return (lista || []);
	}

	public static async obter(id: number): Promise<Unidade> {
		let lista: Unidade[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, sigla from unidade where id = " + id) as Unidade[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(u: Unidade): Promise<string> {
		let res: string;
		if ((res = Unidade.validar(u)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into unidade (nome, sigla) values (?, ?)", [u.nome, u.sigla]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O nome \"" + u.nome + "\" ou a sigla \"" + u.sigla + "\" já existem";
				else
					throw e;
			}
		});

		return res;
	}

	public static async alterar(u: Unidade): Promise<string> {
		let res: string;
		if ((res = Unidade.validar(u)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update unidade set nome = ?, sigla = ? where id = " + u.id, [u.nome, u.sigla]);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O nome \"" + u.nome + "\" ou a sigla \"" + u.sigla + "\" já existem";
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
			//await sql.query("update xxx set idunidade = null... where idunidade = " + id);
			try {
				await sql.query("delete from unidade where id = " + id);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "A unidade é referenciada por um ou mais locais";
				else
					throw e;
			}
			//await sql.commit();
		});

		return res;
	}
}
