import Sql = require("../infra/sql");

export = class Industria {
	public id: number;
	public nome: string;

	private static validar(i: Industria): string {
		i.nome = (i.nome || "").normalize().trim().toUpperCase();
		if (i.nome.length < 3 || i.nome.length > 100)
			return "Nome inválido";
		return null;
	}

	public static async listar(): Promise<Industria[]> {
		let lista: Industria[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome from industria order by nome asc") as Industria[];
		});

		return (lista || []);
	}

	public static async obter(id: number): Promise<Industria> {
		let lista: Industria[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome from industria where id = " + id) as Industria[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(i: Industria): Promise<string> {
		let res: string;
		if ((res = Industria.validar(i)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into industria (nome) values (?)", [i.nome]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "A indústria \"" + i.nome + "\" já existe";
				else
					throw e;
			}
		});

		return res;
	}

	public static async alterar(i: Industria): Promise<string> {
		let res: string;
		if ((res = Industria.validar(i)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update industria set nome = ? where id = " + i.id, [i.nome]);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "A indústria \"" + i.nome + "\" já existe";
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
			//await sql.query("update xxx set idindustria = null... where idindustria = " + id);
			try {
				await sql.query("delete from industria where id = " + id);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "A indústria é referenciada por um ou mais palestrantes/participantes";
				else
					throw e;
			}
			//await sql.commit();
		});

		return res;
	}
}
