import Sql = require("../infra/sql");

export = class TipoSessao {
	public id: number;
	public nome: string;

	private static validar(t: TipoSessao): string {
		t.nome = (t.nome || "").normalize().trim().toUpperCase();
		if (t.nome.length < 3 || t.nome.length > 100)
			return "Nome inválido";
		return null;
	}

	public static async listar(): Promise<TipoSessao[]> {
		let lista: TipoSessao[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome from tiposessao order by nome asc") as TipoSessao[];
		});

		return (lista || []);
	}

	public static async obter(id: number): Promise<TipoSessao> {
		let lista: TipoSessao[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome from tiposessao where id = " + id) as TipoSessao[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(t: TipoSessao): Promise<string> {
		let res: string;
		if ((res = TipoSessao.validar(t)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into tiposessao (nome) values (?)", [t.nome]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O tipo de sessão \"" + t.nome + "\" já existe";
				else
					throw e;
			}
		});

		return res;
	}

	public static async alterar(t: TipoSessao): Promise<string> {
		let res: string;
		if ((res = TipoSessao.validar(t)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update tiposessao set nome = ? where id = " + t.id, [t.nome]);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O tipo de sessão \"" + t.nome + "\" já existe";
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
			//await sql.query("update xxx set idtiposessao = null... where idtiposessao = " + id);
			try {
				await sql.query("delete from tiposessao where id = " + id);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "O tipo de sessão é referenciado por uma ou mais sessões";
				else
					throw e;
			}
			//await sql.commit();
		});

		return res;
	}
}
