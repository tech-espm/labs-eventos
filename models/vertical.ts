import Sql = require("../infra/sql");

export = class Vertical {
	public id: number;
	public nome: string;
	public descricao: string;

	private static validar(v: Vertical): string {
		v.nome = (v.nome || "").normalize().trim().toUpperCase();
		if (v.nome.length < 3 || v.nome.length > 50)
			return "Nome inválido";
		v.descricao = (v.descricao || "").normalize().trim().toUpperCase();
		return null;
	}

	public static async listar(): Promise<Vertical[]> {
		let lista: Vertical[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, descricao from vertical order by nome asc") as Vertical[];
		});

		return (lista || []);
	}

	public static async obter(id: number): Promise<Vertical> {
		let lista: Vertical[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, descricao from vertical where id = " + id) as Vertical[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(v: Vertical): Promise<string> {
		let res: string;
		if ((res = Vertical.validar(v)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into vertical (nome, descricao) values (?, ?)", [v.nome, v.descricao]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "A vertical \"" + v.nome + "\" já existe";
				else
					throw e;
			}
		});

		return res;
	}

	public static async alterar(v: Vertical): Promise<string> {
		let res: string;
		if ((res = Vertical.validar(v)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update vertical set nome = ?, descricao = ? where id = " + v.id, [v.nome, v.descricao]);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "A vertical \"" + v.nome + "\" já existe";
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
			//await sql.query("update xxx set idvertical = null... where idvertical = " + id);
			try {
				await sql.query("delete from vertical where id = " + id);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "A vertical é referenciada por uma ou mais sessões";
				else
					throw e;
			}
			//await sql.commit();
		});

		return res;
	}
}
