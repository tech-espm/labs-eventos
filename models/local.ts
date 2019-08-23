import Sql = require("../infra/sql");

export = class Local {
	public id: number;
	public nome: string;
	public idunidade: number;
	public capacidade_real: number;

	// Apenas para listar() e obter()
	public nome_unidade: string;
	public sigla_unidade: string;

	private static validar(l: Local): string {
		l.nome = (l.nome || "").trim().toUpperCase();
		if (l.nome.length < 3 || l.nome.length > 100)
			return "Nome inválido";
		if (isNaN(l.idunidade) || l.idunidade < 0)
			return "Unidade inválida";
		if (isNaN(l.capacidade_real) || l.capacidade_real < 0)
			return "Capacidade real inválida";
		return null;
	}

	public static async listar(): Promise<Local[]> {
		let lista: Local[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select l.id, l.nome, l.idunidade, l.capacidade_real, u.nome nome_unidade, u.sigla sigla_unidade from local l inner join unidade u on u.id = l.idunidade order by l.nome asc, u.sigla asc") as Local[];
		});

		return (lista || []);
	}

	public static async obter(id: number): Promise<Local> {
		let lista: Local[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select l.id, l.nome, l.idunidade, l.capacidade_real, u.nome nome_unidade, u.sigla sigla_unidade from local l inner join unidade u on u.id = l.idunidade where l.id = " + id) as Local[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(l: Local): Promise<string> {
		let res: string;
		if ((res = Local.validar(l)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into local (nome, idunidade, capacidade_real) values (?, ?, ?)", [l.nome, l.idunidade, l.capacidade_real]);
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							res = "O local \"" + l.nome + "\" já existe na unidade";
							break;
						case "ER_NO_REFERENCED_ROW":
						case "ER_NO_REFERENCED_ROW_2":
							res = "Unidade não encontrada";
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

	public static async alterar(l: Local): Promise<string> {
		let res: string;
		if ((res = Local.validar(l)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update local set nome = ?, idunidade = ?, capacidade_real = ? where id = " + l.id, [l.nome, l.idunidade, l.capacidade_real]);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							res = "O local \"" + l.nome + "\" já existe na unidade";
							break;
						case "ER_NO_REFERENCED_ROW":
						case "ER_NO_REFERENCED_ROW_2":
							res = "Unidade não encontrada";
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

	public static async excluir(id: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			//await sql.beginTransaction();
			//await sql.query("update xxx set idlocal = null... where idlocal = " + id);
			try {
				await sql.query("delete from local where id = " + id);
				res = sql.linhasAfetadas.toString();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "O local é referenciado por um ou mais eventos";
				else
					throw e;
			}
			//await sql.commit();
		});

		return res;
	}

	// Eventos

	public static async eventoListar(idevento: number): Promise<Local[]> {
		let lista: Local[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select l.id, l.nome, l.idunidade, l.capacidade_real, u.nome nome_unidade, u.sigla sigla_unidade, evl.capacidade from eventolocal evl inner join local l on l.id = evl.idlocal inner join unidade u on u.id = l.idunidade where evl.idevento = " + idevento + " order by l.nome asc, u.sigla asc") as Local[];
		});

		return (lista || []);
	}

	//public static async eventoAssociarMulti(idevento: number, idslocal: number[], capacidades: number[]): Promise<string> {
	//	let res: string = null;
	//
	//	await Sql.conectar(async (sql: Sql) => {
	//		await sql.beginTransaction();
	//
	//		try {
	//			let s = "";
	//
	//			for (let i = 0; i < idslocal.length; i++) {
	//				if (i)
	//					s += ",";
	//				s += "(" + idevento + "," + idslocal[i] + "," + capacidades[i] + ")";
	//			}
	//
	//			await sql.query("insert into eventolocal (idevento, idlocal, capacidade) values " + s);
	//
	//			await sql.commit();
	//		} catch (e) {
	//			if (e.code) {
	//				switch (e.code) {
	//					case "ER_DUP_ENTRY":
	//						res = "O local já estava associado ao evento";
	//						break;
	//					case "ER_NO_REFERENCED_ROW":
	//					case "ER_NO_REFERENCED_ROW_2":
	//						res = "Evento ou local não encontrado";
	//						break;
	//					default:
	//						throw e;
	//				}
	//			} else {
	//				throw e;
	//			}
	//		}
	//	});
	//
	//	return res;
	//}

	public static async eventoAssociar(idevento: number, idlocal: number, capacidade: number): Promise<string> {
		if (capacidade < 0)
			return "Capacidade inválida";

		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into eventolocal (idevento, idlocal, capacidade) values (?, ?, ?)", [idevento, idlocal, capacidade]);
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							res = "O local já estava associado ao evento";
							break;
						case "ER_NO_REFERENCED_ROW":
						case "ER_NO_REFERENCED_ROW_2":
							res = "Evento ou local não encontrado";
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

	public static async eventoDesassociar(idevento: number, idslocal: number[]): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				let lidsstr = idslocal.join(",");
				await sql.query("delete from eventolocal where idevento = " + idevento + " and idlocal in (" + lidsstr + ")");
				res = sql.linhasAfetadas.toString();

				await sql.commit();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "O local é referenciado por uma ou mais sessões";
				else
					throw e;
			}
		});

		return res;
	}

	public static async eventoAlterarCapacidade(idevento: number, idlocal: number, capacidade: number): Promise<string> {
		if (capacidade < 0)
			return "Capacidade inválida";

		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update eventolocal set capacidade = ? where idevento = ? and idlocal = ?", [capacidade, idevento, idlocal]);
			res = sql.linhasAfetadas.toString();
		});

		return res;
	}
}
