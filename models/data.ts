import Sql = require("../infra/sql");

export = class Data {
	public id: number;
	public idevento: number;
	public ano: number;
	public mes: number;
	public dia: number;

	private static validar(d: Data): string {
		if (isNaN(d.idevento) || d.idevento <= 0)
			return "Evento inválido";
		if (isNaN(d.ano) ||
			isNaN(d.mes) ||
			isNaN(d.dia) ||
			d.ano < 1900 ||
			d.ano > 2200 ||
			d.mes < 1 ||
			d.mes > 12 ||
			d.dia < 1 ||
			d.dia > 31)
			return "Data inválida";
		switch (d.mes) {
			case 2:
				if (!(d.ano % 4) && ((d.ano % 100) || !(d.ano % 400))) {
					if (d.dia > 29)
						return "Data inválida";
				} else {
					if (d.dia > 28)
						return "Data inválida";
				}
				break;
			case 4:
			case 6:
			case 9:
			case 11:
				if (d.dia > 30)
					return "Data inválida";
				break;
		}
		return null;
	}

	public static async listar(idevento: number): Promise<Data[]> {
		let lista: Data[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, idevento, ano, mes, dia from eventodata where idevento = " + idevento + " order by ano asc, mes asc, dia asc") as Data[];
		});

		return (lista || []);
	}

	public static async obter(id: number, idevento: number): Promise<Data> {
		let lista: Data[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, idevento, ano, mes, dia from eventodata where id = " + id + " and idevento = " + idevento) as Data[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(d: Data): Promise<string> {
		let res: string;
		if ((res = Data.validar(d)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into eventodata (idevento, ano, mes, dia) values (?, ?, ?, ?)", [d.idevento, d.ano, d.mes, d.dia]);
				res = (await sql.scalar("select last_insert_id()") as number).toString();
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							res = "A data já existe no evento";
							break;
						case "ER_NO_REFERENCED_ROW":
						case "ER_NO_REFERENCED_ROW_2":
							res = "Evento não encontrado";
							break;
						default:
							throw e;
					}
				} else {
					throw e;
				}
			}
		});

		return res;
	}

	public static async alterar(d: Data): Promise<string> {
		let res: string;
		if ((res = Data.validar(d)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update eventodata set ano = ?, mes = ?, dia = ? where id = " + d.id + " and idevento = " + d.idevento, [d.ano, d.mes, d.dia]);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "A data já existe no evento";
				else
					throw e;
			}
		});

		return res;
	}

	public static async excluir(id: number, idevento: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("delete from eventodata where id = " + id + " and idevento = " + idevento);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "A data é referenciada por uma ou mais sessões";
				else
					throw e;
			}
		});

		return res;
	}
}
