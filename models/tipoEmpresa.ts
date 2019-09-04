import Sql = require("../infra/sql");

export = class TipoEmpresa {
	public id: number;
	public nome: string;
	public nome_site: string;

	private static validar(t: TipoEmpresa): string {
		t.nome = (t.nome || "").normalize().trim().toUpperCase();
		if (t.nome.length < 3 || t.nome.length > 40)
			return "Nome inválido";
		t.nome_site = (t.nome_site || "").normalize().trim();
		if (t.nome_site.length < 3 || t.nome_site.length > 40)
			return "Nome no site inválido";
		return null;
	}

	public static async listar(): Promise<TipoEmpresa[]> {
		let lista: TipoEmpresa[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, nome_site from tipoempresa order by nome asc") as TipoEmpresa[];
		});

		return (lista || []);
	}

	public static async obter(id: number): Promise<TipoEmpresa> {
		let lista: TipoEmpresa[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, nome_site from tipoempresa where id = ?", [id]) as TipoEmpresa[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(t: TipoEmpresa): Promise<string> {
		let res: string;
		if ((res = TipoEmpresa.validar(t)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into tipoempresa (nome, nome_site) values (?, ?)", [t.nome, t.nome_site]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O tipo de empresa \"" + t.nome + "\" já existe";
				else
					throw e;
			}
		});

		return res;
	}

	public static async alterar(t: TipoEmpresa): Promise<string> {
		let res: string;
		if ((res = TipoEmpresa.validar(t)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update tipoempresa set nome = ?, nome_site = ? where id = ?", [t.nome, t.nome_site, t.id]);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O tipo de empresa \"" + t.nome + "\" já existe";
				else
					throw e;
			}
		});

		return res;
	}

	public static async excluir(id: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("delete from tipoempresa where id = ?", [id]);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "O tipo de empresa é referenciado por uma ou mais empresas";
				else
					throw e;
			}
		});

		return res;
	}
}
