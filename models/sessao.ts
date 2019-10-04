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
	public descricao: string;
	public oculta: number;
	public publico_alvo: string;
	public tags: string;
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
		s.descricao = (s.descricao || "").normalize().trim().toUpperCase();
		if (s.descricao.length > 200)
			return "Descrição inválida";
		if (isNaN(s.oculta) || s.oculta < 0 || s.oculta > 1)
			s.oculta = 0;
		s.publico_alvo = (s.publico_alvo || "").normalize().trim().toUpperCase();
		if (s.publico_alvo.length > 100)
			return "Público-alvo inválido";
		s.tags = (s.tags || "").normalize().trim().toUpperCase();
		let stags = s.tags.split(",");
		for (let i = 0; i < stags.length; i++) {
			stags[i] = stags[i].trim();
			if (!stags[i]) {
				stags.splice(i, 1);
				i--;
			}
		}
		s.tags = stags.join(", ");
		if (s.tags.length > 100)
			return "Tags inválidas";
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
			lista = await sql.query("select s.id, s.idcurso, c.nome nome_curso, s.idevento, s.ideventodata, concat(lpad(d.dia, 2, 0), '/', lpad(d.mes, 2, 0), '/', d.ano) data, s.ideventohorario, h.inicio, h.termino, s.ideventolocal, el.idlocal, l.nome nome_local, u.sigla sigla_unidade, s.idformato, f.nome nome_formato, s.idtiposessao, t.nome nome_tipo, s.idvertical, v.nome nome_vertical, s.nome, s.nome_curto, s.descricao, s.oculta, s.publico_alvo, s.tags, (select group_concat(esp.ideventopalestrante order by esp.ordem) from eventosessaopalestrante esp where esp.idevento = " + idevento + " and esp.ideventosessao = s.id) idspalestrante from eventosessao s inner join curso c on c.id = s.idcurso inner join eventodata d on d.id = s.ideventodata inner join eventolocal el on el.id = s.ideventolocal inner join local l on l.id = el.idlocal inner join unidade u on u.id = l.idunidade inner join formato f on f.id = s.idformato inner join eventohorario h on h.id = s.ideventohorario inner join tiposessao t on t.id = s.idtiposessao inner join vertical v on v.id = s.idvertical where s.idevento = " + idevento + " order by d.ano asc, d.mes asc, d.dia asc, h.ordem asc, l.nome asc") as Sessao[];
		});

		return (lista || []);
	}

	public static async obter(id: number, idevento: number): Promise<Sessao> {
		let lista: Sessao[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select s.id, s.idcurso, c.nome nome_curso, s.idevento, s.ideventodata, concat(lpad(d.dia, 2, 0), '/', lpad(d.mes, 2, 0), '/', d.ano) data, s.ideventohorario, h.inicio, h.termino, s.ideventolocal, el.idlocal, l.nome nome_local, u.sigla sigla_unidade, s.idformato, f.nome nome_formato, s.idtiposessao, t.nome nome_tipo, s.idvertical, v.nome nome_vertical, s.nome, s.nome_curto, s.descricao, s.oculta, s.publico_alvo, s.tags, (select group_concat(esp.ideventopalestrante order by esp.ordem) from eventosessaopalestrante esp where esp.idevento = " + idevento + " and esp.ideventosessao = s.id) idspalestrante from eventosessao s inner join curso c on c.id = s.idcurso inner join eventodata d on d.id = s.ideventodata inner join eventolocal el on el.id = s.ideventolocal inner join local l on l.id = el.idlocal inner join unidade u on u.id = l.idunidade inner join formato f on f.id = s.idformato inner join eventohorario h on h.id = s.ideventohorario inner join tiposessao t on t.id = s.idtiposessao inner join vertical v on v.id = s.idvertical where s.id = " + id + " and s.idevento = " + idevento) as Sessao[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async listarAceites(id: number, idevento: number): Promise<any[]> {
		let lista: any[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select ideventopalestrante, date_format(aceite, '%d/%m/%Y') aceite from eventosessaopalestrante where ideventosessao = " + id + " and idevento = " + idevento) as any[];
		});

		return (lista || []);
	}

	public static async inserirPalestrantes(sql: Sql, s: Sessao): Promise<void> {
		let existentes: { id: number, ideventopalestrante: number, ordem: number }[] = await sql.query("select id, ideventopalestrante, ordem from eventosessaopalestrante where ideventosessao = " + s.id + " and idevento = " + s.idevento);

		let excluir: number[] = [];
		let atualizar: { id: number, ordem: number }[] = [];
		let adicionar: { ideventopalestrante: number, ordem: number }[] = [];

		if (s.idspalestrante) {
			for (let i = 0; i < s.idspalestrante.length; i++) {
				let ideventopalestrante = s.idspalestrante[i];
				let idJaExistia = false;

				for (let j = existentes.length - 1; j >= 0; j--) {
					if (existentes[j].ideventopalestrante === ideventopalestrante) {
						idJaExistia = true;
						if (existentes[j].ordem !== i) {
							atualizar.push({
								id: existentes[j].id,
								ordem: i
							});
						}
						existentes.splice(j, 1);
						break;
					}
				}

				if (!idJaExistia)
					adicionar.push({
						ideventopalestrante: ideventopalestrante,
						ordem: i
					});
			}
		}

		if (existentes.length) {
			for (let i = existentes.length - 1; i >= 0; i--)
				excluir.push(existentes[i].id);
			await sql.query("delete from eventosessaopalestrante where id in (" + excluir.join(",") + ")");
		}

		if (atualizar.length) {
			for (let i = 0; i < atualizar.length; i++)
				await sql.query("update eventosessaopalestrante set ordem = ? where id = ?", [atualizar[i].ordem, atualizar[i].id]);
		}

		if (adicionar.length) {
			for (let i = 0; i < adicionar.length; i++)
				await sql.query("insert into eventosessaopalestrante (idevento, ideventosessao, ideventopalestrante, ordem) values (?, ?, ?, ?)", [s.idevento, s.id, adicionar[i].ideventopalestrante, adicionar[i].ordem]);
		}
	}

	public static async criar(s: Sessao): Promise<string> {
		let res: string;
		if ((res = Sessao.validar(s)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("insert into eventosessao (idcurso, idevento, ideventodata, ideventohorario, ideventolocal, idformato, idtiposessao, idvertical, nome, nome_curto, descricao, oculta, publico_alvo, tags) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [s.idcurso, s.idevento, s.ideventodata, s.ideventohorario, s.ideventolocal, s.idformato, s.idtiposessao, s.idvertical, s.nome, s.nome_curto, s.descricao, s.oculta, s.publico_alvo, s.tags]);
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

				await sql.query("update eventosessao set idcurso = ?, ideventodata = ?, ideventohorario = ?, ideventolocal = ?, idformato = ?, idtiposessao = ?, idvertical = ?, nome = ?, nome_curto = ?, descricao = ?, oculta = ?, publico_alvo = ?, tags = ? where id = " + s.id + " and idevento = " + s.idevento, [s.idcurso, s.ideventodata, s.ideventohorario, s.ideventolocal, s.idformato, s.idtiposessao, s.idvertical, s.nome, s.nome_curto, s.descricao, s.oculta, s.publico_alvo, s.tags]);
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
				await sql.query("insert into eventosessaoparticipante (idevento, ideventosessao, idparticipante, presente, data_inscricao) select ?, ?, ?, 0, now() from (select l.capacidade, (select count(*) from eventosessaoparticipante where ideventosessao = ?) inscritos from eventosessao s inner join eventolocal l on l.id = s.ideventolocal where s.id = ? and s.oculta = 0) tmp where tmp.capacidade > tmp.inscritos", [idevento, id, idparticipante, id, id]);

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
