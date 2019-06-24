import Sql = require("../infra/sql");

export = class Formato {
	public id: number;
	public nome: string;

	private static validar(f: Formato): string {
		f.nome = (f.nome || "").trim().toUpperCase();
		if (f.nome.length < 3 || f.nome.length > 50)
			return "Nome inválido";
		return null;
	}

	public static async listar(): Promise<Formato[]> {
		let lista: Formato[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome from formato order by nome asc") as Formato[];
		});

		return (lista || []);
	}

	public static async obter(id: number): Promise<Formato> {
		let lista: Formato[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome from formato where id = " + id) as Formato[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(f: Formato): Promise<string> {
		let res: string;
		if ((res = Formato.validar(f)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into formato (nome) values (?)", [f.nome]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O formato \"" + f.nome + "\" já existe";
				else
					throw e;
			}
		});

		return res;
	}

	public static async alterar(f: Formato): Promise<string> {
		let res: string;
		if ((res = Formato.validar(f)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update formato set nome = ? where id = " + f.id, [f.nome]);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O formato \"" + f.nome + "\" já existe";
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
			//await sql.query("update xxx set idformato = null... where idformato = " + id);
			try {
				await sql.query("delete from formato where id = " + id);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "O formato é referenciado por uma ou mais sessões";
				else
					throw e;
			}
			//await sql.commit();
		});

		return res;
	}
}
