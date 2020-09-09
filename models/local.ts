import Sql = require("../infra/sql");
import Unidade = require("./unidade");

export = class Local {
	public static readonly idADefinir = 1;
	public static readonly idInternet = -1;

	public id: number;
	public nome: string;
	public idunidade: number;
	public capacidade_real: number;
	public id_integra: string;

	// Apenas para listar() e obter()
	public nome_unidade: string;
	public sigla_unidade: string;

	private static validar(l: Local): string {
		l.nome = (l.nome || "").normalize().trim();
		if (l.nome.length < 3 || l.nome.length > 100)
			return "Nome inválido";
		if (isNaN(l.idunidade))
			return "Unidade inválida";
		if (isNaN(l.capacidade_real) || l.capacidade_real < 0)
			return "Capacidade real inválida";
		return null;
	}

	public static async listar(): Promise<Local[]> {
		let lista: Local[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select l.id, l.nome, l.idunidade, l.capacidade_real, l.id_integra, u.nome nome_unidade, u.sigla sigla_unidade from local l inner join unidade u on u.id = l.idunidade order by l.nome asc, u.sigla asc") as Local[];
		});

		return (lista || []);
	}

	public static async obter(id: number): Promise<Local> {
		let lista: Local[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select l.id, l.nome, l.idunidade, l.capacidade_real, l.id_integra, u.nome nome_unidade, u.sigla sigla_unidade from local l inner join unidade u on u.id = l.idunidade where l.id = " + id) as Local[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(l: Local): Promise<string> {
		let res: string;
		if ((res = Local.validar(l)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into local (nome, idunidade, capacidade_real, id_integra) values (?, ?, ?, '')", [l.nome, l.idunidade, l.capacidade_real]);
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
		if (l.id === Local.idADefinir || l.id === Local.idInternet)
			return "Não é possível editar este local";

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
		if (id === Local.idADefinir || id === Local.idInternet)
			return "Não é possível excluir este local";

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
			lista = await sql.query("select l.id, evl.id ideventolocal, l.nome, l.idunidade, l.capacidade_real, u.nome nome_unidade, u.sigla sigla_unidade, evl.capacidade, evl.cor from eventolocal evl inner join local l on l.id = evl.idlocal inner join unidade u on u.id = l.idunidade where evl.idevento = " + idevento + " order by l.nome asc, u.sigla asc") as Local[];
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

	public static async eventoAssociar(idevento: number, idlocal: number, capacidade: number, cor: number): Promise<string> {
		if (capacidade < 0)
			return "Capacidade inválida";

		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into eventolocal (idevento, idlocal, capacidade, cor) values (?, ?, ?, ?)", [idevento, idlocal, capacidade, cor < 0 ? -1 : (cor > 0xffffff ? 0xffffff : cor)]);

				res = (await sql.scalar("select last_insert_id()") as number).toString();
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

	public static async eventoDesassociar(idevento: number, ideventolocal: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("delete from eventolocal where idevento = " + idevento + " and id = " + ideventolocal);
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

	public static async eventoAlterarCapacidade(idevento: number, ideventolocal: number, capacidade: number): Promise<string> {
		if (capacidade < 0)
			return "Capacidade inválida";

		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update eventolocal set capacidade = ? where idevento = ? and id = ?", [capacidade, idevento, ideventolocal]);
			res = sql.linhasAfetadas.toString();
		});

		return res;
	}

	public static async eventoAlterarCor(idevento: number, ideventolocal: number, cor: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update eventolocal set cor = ? where idevento = ? and id = ?", [cor < 0 ? -1 : (cor > 0xffffff ? 0xffffff : cor), idevento, ideventolocal]);
			res = sql.linhasAfetadas.toString();
		});

		return res;
	}
}
