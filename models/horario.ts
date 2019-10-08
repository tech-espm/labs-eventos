import Sql = require("../infra/sql");

export = class Horario {
	public id: number;
	public idevento: number;
	public inicio: string;
	public termino: string;
	public ordem: number;

	public static converterEmInteiro(h: string): number {
		return (!h ? 0 : parseInt(h.replace(":", ""), 10));
	}

	private static validar(h: Horario): string {
		let expHorario = /^([01]\d|2[0-3]):[0-5]\d$/;
		if (isNaN(h.idevento) || h.idevento <= 0)
			return "Evento inválido";
		h.inicio = (h.inicio || "").normalize().trim().toUpperCase();
		if (h.inicio.length !== 5 || !expHorario.test(h.inicio))
			return "Início inválido";
		h.termino = (h.termino || "").normalize().trim().toUpperCase();
		if (h.termino.length !== 5 || !expHorario.test(h.termino))
			return "Término inválido";
		if (isNaN(h.ordem))
			return "Ordem inválida";
		return null;
	}

	public static async listar(idevento: number): Promise<Horario[]> {
		let lista: Horario[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, idevento, inicio, termino, ordem from eventohorario where idevento = " + idevento + " order by ordem asc") as Horario[];
		});

		return (lista || []);
	}

	public static async obter(id: number, idevento: number): Promise<Horario> {
		let lista: Horario[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, idevento, inicio, termino, ordem from eventohorario where id = " + id + " and idevento = " + idevento) as Horario[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(h: Horario): Promise<string> {
		let res: string;
		if ((res = Horario.validar(h)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into eventohorario (idevento, inicio, termino, ordem) values (?, ?, ?, ?)", [h.idevento, h.inicio, h.termino, h.ordem]);
				res = (await sql.scalar("select last_insert_id()") as number).toString();
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							res = "O horário já existe no evento";
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

	public static async alterar(h: Horario): Promise<string> {
		let res: string;
		if ((res = Horario.validar(h)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update eventohorario set inicio = ?, termino = ?, ordem = ? where id = " + h.id + " and idevento = " + h.idevento, [h.inicio, h.termino, h.ordem]);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O horário já existe no evento";
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
				await sql.query("delete from eventohorario where id = " + id + " and idevento = " + idevento);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "O horário é referenciado por uma ou mais sessões";
				else
					throw e;
			}
		});

		return res;
	}
}
