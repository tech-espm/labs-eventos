import Sql = require("../infra/sql");

export = class Sessao {
	public id: number;
	public idcurso: number;
	public idevento: number;
	public ideventodata: number;
	public ideventohorario: number;
	public ideventolocal: number;
	public idformato: number;
	public idtiposessao: number;
	public idvertical: number;
	public nome: string;
	public nome_curto: string;
	public ocultar: number;
	public publico_alvo: string;
	public idspalestrante: number[];

	private static validar(s: Sessao): string {
		if (isNaN(s.idcurso) || s.idcurso <= 0)
			return "Curso inválido";
		if (isNaN(s.idevento) || s.idevento <= 0)
			return "Evento inválido";
		if (isNaN(s.ideventodata) || s.ideventodata <= 0)
			return "Data inválida";
		if (isNaN(s.ideventohorario) || s.ideventohorario <= 0)
			return "Horário inválido";
		if (isNaN(s.ideventolocal) || s.ideventolocal <= 0)
			return "Local inválido";
		if (isNaN(s.idformato) || s.idformato <= 0)
			return "Formato inválido";
		if (isNaN(s.idtiposessao) || s.idtiposessao <= 0)
			return "Tipo de sessão inválido";
		if (isNaN(s.idvertical) || s.idvertical <= 0)
			return "Vertical inválida";
		s.nome = (s.nome || "").normalize().trim().toUpperCase();
		if (s.nome.length < 3 || s.nome.length > 100)
			return "Nome inválido";
		s.nome_curto = (s.nome_curto || "").normalize().trim().toUpperCase();
		if (s.nome_curto.length < 3 || s.nome_curto.length > 100)
			return "Nome curto inválido";
		if (isNaN(s.ocultar) || s.ocultar < 0 || s.ocultar > 1)
			s.ocultar = 0;
		s.publico_alvo = (s.publico_alvo || "").normalize().trim().toUpperCase();
		if (s.publico_alvo.length > 100)
			return "Público-alvo inválido";
		if (!s.idspalestrante)
			s.idspalestrante = [];
		for (let i = s.idspalestrante.length - 1; i >= 0; i--) {
			if (isNaN(s.idspalestrante[i]) || s.idspalestrante[i] <= 0)
				return "Palestrante inválido";
		}
		return null;
	}

	public static async listar(idevento: number): Promise<Sessao[]> {
		let lista: Sessao[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select s.id, s.idcurso, c.nome nome_curso, s.idevento, s.ideventodata, concat(lpad(d.dia, 2, 0), '/', lpad(d.mes, 2, 0), '/', d.ano) data, s.ideventohorario, h.inicio, h.termino, s.ideventolocal, el.idlocal, l.nome nome_local, u.sigla sigla_unidade, s.idformato, f.nome nome_formato, s.idtiposessao, t.nome nome_tipo, s.idvertical, v.nome nome_vertical, s.nome, s.nome_curto, s.ocultar, s.publico_alvo, (select group_concat(esp.ideventopalestrante order by esp.id) from eventosessaopalestrante esp where esp.idevento = " + idevento + " and esp.ideventosessao = s.id) idspalestrante from eventosessao s inner join curso c on c.id = s.idcurso inner join eventodata d on d.id = s.ideventodata inner join eventolocal el on el.id = s.ideventolocal inner join local l on l.id = el.idlocal inner join unidade u on u.id = l.idunidade inner join formato f on f.id = s.idformato inner join eventohorario h on h.id = s.ideventohorario inner join tiposessao t on t.id = s.idtiposessao inner join vertical v on v.id = s.idvertical where s.idevento = " + idevento + " order by d.ano asc, d.mes asc, d.dia asc, h.ordem asc, l.nome asc") as Sessao[];
		});

		return (lista || []);
	}

	public static async obter(id: number, idevento: number): Promise<Sessao> {
		let lista: Sessao[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select s.id, s.idcurso, c.nome nome_curso, s.idevento, s.ideventodata, concat(lpad(d.dia, 2, 0), '/', lpad(d.mes, 2, 0), '/', d.ano) data, s.ideventohorario, h.inicio, h.termino, s.ideventolocal, el.idlocal, l.nome nome_local, u.sigla sigla_unidade, s.idformato, f.nome nome_formato, s.idtiposessao, t.nome nome_tipo, s.idvertical, v.nome nome_vertical, s.nome, s.nome_curto, s.ocultar, s.publico_alvo, (select group_concat(esp.ideventopalestrante order by esp.id) from eventosessaopalestrante esp where esp.idevento = " + idevento + " and esp.ideventosessao = s.id) idspalestrante from eventosessao s inner join curso c on c.id = s.idcurso inner join eventodata d on d.id = s.ideventodata inner join eventolocal el on el.id = s.ideventolocal inner join local l on l.id = el.idlocal inner join unidade u on u.id = l.idunidade inner join formato f on f.id = s.idformato inner join eventohorario h on h.id = s.ideventohorario inner join tiposessao t on t.id = s.idtiposessao inner join vertical v on v.id = s.idvertical where s.id = " + id + " and s.idevento = " + idevento) as Sessao[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async inserirPalestrantes(sql: Sql, s: Sessao): Promise<void> {
		await sql.query("delete from eventosessaopalestrante where idevento = " + s.idevento + " and ideventosessao = " + s.id);

		if (s.idspalestrante) {
			for (let i = 0; i < s.idspalestrante.length; i++)
				await sql.query("insert into eventosessaopalestrante (idevento, ideventosessao, ideventopalestrante) values (?, ?, ?)", [s.idevento, s.id, s.idspalestrante[i]]);
		}
	}

	public static async criar(s: Sessao): Promise<string> {
		let res: string;
		if ((res = Sessao.validar(s)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("insert into eventosessao (idcurso, idevento, ideventodata, ideventohorario, ideventolocal, idformato, idtiposessao, idvertical, nome, nome_curto, ocultar, publico_alvo) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [s.idcurso, s.idevento, s.ideventodata, s.ideventohorario, s.ideventolocal, s.idformato, s.idtiposessao, s.idvertical, s.nome, s.nome_curto, s.ocultar, s.publico_alvo]);
				s.id = await sql.scalar("select last_insert_id()") as number;

				await Sessao.inserirPalestrantes(sql, s);

				res = s.id.toString();

				await sql.commit();
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							res = "Já existe uma sessão no evento neste dia, horário e local";
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

	public static async alterar(s: Sessao): Promise<string> {
		let res: string;
		if ((res = Sessao.validar(s)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("update eventosessao set idcurso = ?, ideventodata = ?, ideventohorario = ?, ideventolocal = ?, idformato = ?, idtiposessao = ?, idvertical = ?, nome = ?, nome_curto = ?, ocultar = ?, publico_alvo = ? where id = " + s.id + " and idevento = " + s.idevento, [s.idcurso, s.ideventodata, s.ideventohorario, s.ideventolocal, s.idformato, s.idtiposessao, s.idvertical, s.nome, s.nome_curto, s.ocultar, s.publico_alvo]);
				res = sql.linhasAfetadas.toString();

				await Sessao.inserirPalestrantes(sql, s);

				await sql.commit();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "Já existe uma sessão no evento neste dia, horário e local";
				else
					throw e;
			}
		});

		return res;
	}

	public static async excluir(id: number, idevento: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("delete from eventosessao where id = " + id + " and idevento = " + idevento);
			res = sql.linhasAfetadas.toString();
		});

		return res;
	}

	public static async inscrever(id: number, idevento: number, idparticipante: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into eventosessaoparticipante (idevento, ideventosessao, idparticipante, presente, data_inscricao) select ?, ?, ?, 0, now() from (select l.capacidade, (select count(*) from eventosessaoparticipante where ideventosessao = ?) inscritos from eventosessao s inner join eventolocal l on l.id = s.ideventolocal where s.id = ? and s.ocultar = 0) tmp where tmp.capacidade > tmp.inscritos", [idevento, id, idparticipante, id, id]);

				if (!sql.linhasAfetadas)
					res = "A sessão está esgotada";

			} catch (e) {
				// Ignora o erro se o participante já estava inscrito na sessão
				if (!e.code || e.code !== "ER_DUP_ENTRY")
					throw e;
			}
		});

		return res;
	}
}
