import Sql = require("../infra/sql");
import emailValido = require("../utils/emailValido");

export = class Curso {
	public id: number;
	public nome: string;
	public emailresponsavel: string;

	private static validar(c: Curso): string {
		c.nome = (c.nome || "").normalize().trim().toUpperCase();
		if (c.nome.length < 3 || c.nome.length > 50)
			return "Nome inválido";
		c.emailresponsavel = (c.emailresponsavel || "").normalize().trim().toUpperCase();
		if (c.emailresponsavel.length > 100 || (c.emailresponsavel && !emailValido(c.emailresponsavel)))
			return "E-mail inválido";
		return null;
	}

	public static async listar(): Promise<Curso[]> {
		let lista: Curso[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, emailresponsavel from curso order by nome asc") as Curso[];
		});

		return (lista || []);
	}

	public static async listarExterno(): Promise<Curso[]> {
		let lista: Curso[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome from curso order by nome asc") as Curso[];
		});

		return (lista || []);
	}

	public static async obter(id: number): Promise<Curso> {
		let lista: Curso[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, emailresponsavel from curso where id = " + id) as Curso[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(c: Curso): Promise<string> {
		let res: string;
		if ((res = Curso.validar(c)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into curso (nome, emailresponsavel) values (?, ?)", [c.nome, c.emailresponsavel]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "A âncora \"" + c.nome + "\" já existe";
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
				await sql.query("update curso set nome = ?, emailresponsavel = ? where id = " + c.id, [c.nome, c.emailresponsavel]);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "A âncora \"" + c.nome + "\" já existe";
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
					res = "A âncora é referenciada por uma ou mais sessões";
				else
					throw e;
			}
			//await sql.commit();
		});

		return res;
	}
}
