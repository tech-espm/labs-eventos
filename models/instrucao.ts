import Sql = require("../infra/sql");

export = class Instrucao {
	public id: number;
	public nome: string;
	public ordem: number;

	private static validar(i: Instrucao): string {
		i.nome = (i.nome || "").normalize().trim().toUpperCase();
		if (i.nome.length < 3 || i.nome.length > 100)
			return "Nome inválido";
		if (isNaN(i.ordem))
			return "Ordem inválida";
		return null;
	}

	public static async listar(): Promise<Instrucao[]> {
		let lista: Instrucao[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, ordem from instrucao order by ordem asc, nome asc") as Instrucao[];
		});

		return (lista || []);
	}

	public static async obter(id: number): Promise<Instrucao> {
		let lista: Instrucao[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, ordem from instrucao where id = " + id) as Instrucao[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(i: Instrucao): Promise<string> {
		let res: string;
		if ((res = Instrucao.validar(i)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into instrucao (nome, ordem) values (?, ?)", [i.nome, i.ordem]);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O nível de instrução \"" + i.nome + "\" já existe";
				else
					throw e;
			}
		});

		return res;
	}

	public static async alterar(i: Instrucao): Promise<string> {
		let res: string;
		if ((res = Instrucao.validar(i)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update instrucao set nome = ?, ordem = ? where id = " + i.id, [i.nome, i.ordem]);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O nível de instrução \"" + i.nome + "\" já existe";
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
			//await sql.query("update xxx set idinstrucao = null... where idinstrucao = " + id);
			try {
				await sql.query("delete from instrucao where id = " + id);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "O nível de instrução é referenciado por um ou mais palestrantes/participantes";
				else
					throw e;
			}
			//await sql.commit();
		});

		return res;
	}
}
