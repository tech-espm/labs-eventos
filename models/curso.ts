import Sql = require("../infra/sql");

export = class Curso {
	public id: number;
	public nome: string;

	private static validar(c: Curso): string {
		c.nome = (c.nome || "").trim().toUpperCase();
		if (c.nome.length < 3 || c.nome.length > 50)
			return "Nome inválido";
		return null;
	}

	public static async listar(): Promise<Curso[]> {
		let lista: Curso[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome from curso order by nome asc") as Curso[];
		});

		return (lista || []);
	}

	public static async obter(id: number): Promise<Curso> {
		let lista: Curso[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome from curso where id = " + id) as Curso[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(c: Curso): Promise<string> {
		let res: string;
		if ((res = Curso.validar(c)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into curso (nome) values (?)", [c.nome]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O curso \"" + c.nome + "\" já existe";
				else
					throw e;
			}
		});

		return res;
	}

	public static async alterar(c: Curso): Promise<string> {
		let res: string;
		if ((res = Curso.validar(c)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update curso set nome = ? where id = " + c.id, [c.nome]);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O curso \"" + c.nome + "\" já existe";
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
			//await sql.query("update xxx set idcurso = null... where idcurso = " + id);
			try {
				await sql.query("delete from curso where id = " + id);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "O curso é referenciado por uma ou mais sessões";
				else
					throw e;
			}
			//await sql.commit();
		});

		return res;
	}
}
