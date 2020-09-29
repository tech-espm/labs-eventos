﻿import Sql = require("../infra/sql");
import appsettings = require("../appsettings");
import ajustarInicioTermino = require("../utils/ajustarInicioTermino");
import converterDataISO = require("../utils/converterDataISO");
import Evento = require("./evento");
import IntegracaoAgendamento = require("./integracaoAgendamento");
import PalestranteResumido = require("./palestranteResumido");
import Unidade = require("./unidade");
import Usuario = require("./usuario");

export = class Sessao {
	public static readonly STATUS_PENDENTE: number = 0;
	public static readonly STATUS_APROVADO: number = 1;
	public static readonly STATUS_REPROVADO: number = 2;

	public id: number;
	public idcurso: number;
	public idevento: number;
	public ideventolocal: number;
	public idformato: number;
	public idtiposessao: number;
	public idvertical: number;
	public nome: string;
	public nome_curto: string;
	public data: string;
	public inicio: number;
	public termino: number;
	public url_remota: string;
	public descricao: string;
	public oculta: number;
	public sugestao: number;
	public publico_alvo: string;
	public tags: string;
	public permiteinscricao: number;
	public permiteacom: number;
	public senhacontrole: string;
	public senhapresenca: string;
	public mensagemesgotada: string;
	public idspalestrante: number[];

	private static validar(s: Sessao): string {
		if (isNaN(s.idcurso) || s.idcurso <= 0)
			return "Âncora inválida";
		if (isNaN(s.idevento) || s.idevento <= 0)
			return "Evento inválido";
		if (isNaN(s.ideventolocal) || s.ideventolocal <= 0)
			return "Local inválido";
		if (isNaN(s.idformato) || s.idformato <= 0)
			return "Formato inválido";
		if (isNaN(s.idtiposessao) || s.idtiposessao <= 0)
			return "Tipo de sessão inválido";
		if (isNaN(s.idvertical) || s.idvertical <= 0)
			return "Vertical inválida";
		s.nome = (s.nome || "").normalize().trim();
		if (s.nome.length < 3 || s.nome.length > 100)
			return "Nome inválido";
		s.nome_curto = (s.nome_curto || "").normalize().trim();
		if (s.nome_curto.length < 3 || s.nome_curto.length > 100)
			return "Nome curto inválido";
		if (!(s.data = converterDataISO(s.data)))
			return "Data inválida";
		if (isNaN(s.inicio) || s.inicio < 0 || s.inicio > 2359 || (s.inicio % 100) > 59)
			return "Horário de início inválido";
		if (isNaN(s.termino) || s.termino < 0 || s.termino > 2359 || (s.termino % 100) > 59 || s.termino < s.inicio)
			return "Horário de término inválido";
		s.url_remota = (s.url_remota || "").normalize().trim();
		if (s.url_remota.length > 100)
			return "URL da sessão remota inválida";
		s.descricao = (s.descricao || "").normalize().trim();
		if (s.descricao.length > 200)
			return "Descrição inválida";
		if (isNaN(s.oculta) || s.oculta < 0 || s.oculta > 1)
			s.oculta = 0;
		if (isNaN(s.sugestao) || s.sugestao < 0 || s.sugestao > 1)
			s.sugestao = 0;
		s.publico_alvo = (s.publico_alvo || "").normalize().trim();
		if (s.publico_alvo.length > 100)
			return "Público-alvo inválido";
		s.tags = (s.tags || "").normalize().trim().toUpperCase();
		let stags = s.tags.split(",");
		if (stags.length === 1) {
			stags = s.tags.split(";");
			if (stags.length === 1)
				stags = s.tags.split("/");
		}
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
		if (isNaN(s.permiteinscricao) || s.permiteinscricao < 0 || s.permiteinscricao > 1)
			s.permiteinscricao = 0;
		if (isNaN(s.permiteacom) || s.permiteacom < 0 || s.permiteacom > 1)
			s.permiteacom = 1;
		s.senhacontrole = (s.senhacontrole || "").normalize();
		if (s.senhacontrole.length > 45)
			return "Senha de controle inválida";
		s.mensagemesgotada = (s.mensagemesgotada || "").trim();
		if (s.mensagemesgotada.length > 250)
			return "Mensagem de sessão esgotada inválida";
		if (!s.idspalestrante)
			s.idspalestrante = [];
		for (let i = s.idspalestrante.length - 1; i >= 0; i--) {
			if (isNaN(s.idspalestrante[i]) || s.idspalestrante[i] <= 0)
				return "Palestrante inválido";
		}
		return null;
	}

	public static async listar(idevento: number, externo: boolean = false): Promise<Sessao[]> {
		let lista: Sessao[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = ajustarInicioTermino(await sql.query("select s.id, s.idcurso, c.nome nome_curso, s.idevento, date_format(s.data, '%d/%m/%Y') data, s.inicio, s.termino, s.ideventolocal, el.idlocal, l.nome nome_local, u.sigla sigla_unidade, s.idformato, f.nome nome_formato, s.idtiposessao, t.nome nome_tipo, s.idvertical, v.nome nome_vertical, s.nome, s.nome_curto, s.url_remota, s.descricao, " + (externo ? "" : "s.oculta, s.sugestao, s.status_integra, ") + "s.publico_alvo, s.tags, s.permiteinscricao, s.permiteacom, s.senhacontrole, s.mensagemesgotada, (select group_concat(esp.ideventopalestrante order by esp.ordem) from eventosessaopalestrante esp where esp.idevento = " + idevento + " and esp.ideventosessao = s.id) idspalestrante from eventosessao s inner join curso c on c.id = s.idcurso inner join eventolocal el on el.id = s.ideventolocal inner join local l on l.id = el.idlocal inner join unidade u on u.id = l.idunidade inner join formato f on f.id = s.idformato inner join tiposessao t on t.id = s.idtiposessao inner join vertical v on v.id = s.idvertical where s.idevento = " + idevento + (externo ? " and s.oculta = 0 and s.sugestao = 0 and s.status_integra = 1" : "") + " order by s.data asc, s.inicio asc, s.termino asc, l.nome asc")) as Sessao[];
		});

		return (lista || []);
	}

	public static async obter(id: number, idevento: number): Promise<Sessao> {
		let lista: Sessao[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = ajustarInicioTermino(await sql.query("select s.id, s.idcurso, c.nome nome_curso, s.idevento, date_format(s.data, '%d/%m/%Y') data, s.inicio, s.termino, s.ideventolocal, el.idlocal, l.nome nome_local, u.sigla sigla_unidade, s.idformato, f.nome nome_formato, s.idtiposessao, t.nome nome_tipo, s.idvertical, v.nome nome_vertical, s.nome, s.nome_curto, s.url_remota, s.descricao, s.oculta, s.sugestao, s.publico_alvo, s.tags, s.permiteinscricao, s.permiteacom, s.senhacontrole, s.senhapresenca, s.mensagemesgotada, (select group_concat(esp.ideventopalestrante order by esp.ordem) from eventosessaopalestrante esp where esp.idevento = " + idevento + " and esp.ideventosessao = s.id) idspalestrante from eventosessao s inner join curso c on c.id = s.idcurso inner join eventolocal el on el.id = s.ideventolocal inner join local l on l.id = el.idlocal inner join unidade u on u.id = l.idunidade inner join formato f on f.id = s.idformato inner join tiposessao t on t.id = s.idtiposessao inner join vertical v on v.id = s.idvertical where s.id = " + id + " and s.idevento = " + idevento)) as Sessao[];
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

	private static async sincronizarPalestrantes(sql: Sql, s: Sessao): Promise<void> {
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

	private static async validarEncavalamento(s: Sessao, sql: Sql): Promise<{ erro?: string, idunidade?: number, id_integra_local?: string }> {
		const inicioTermino = await sql.query("select date_format(inicio, '%d/%m/%Y') inicio, date_format(termino, '%d/%m/%Y') termino from evento where id = " + s.idevento + " and not ('" + s.data + "' between inicio and termino)");
		if (inicioTermino && inicioTermino.length)
			return { erro: "As datas permitidas para o evento vão de " + inicioTermino[0].inicio + " até " + inicioTermino[0].termino };

		// Infelizmente não podemos mais utilizar uma constraint unique, porque
		// é possível cadastrar mais de uma sessão virtual no mesmo evento/data/horário/local,
		// assim como também é possível cadastrar mais de uma sugestão de sessão qualquer no
		// mesmo evento/data/horário/local.
		if (s.sugestao)
			return null;

		const infosLocal = await sql.query("select l.idunidade, l.id_integra from eventolocal el inner join local l on l.id = el.idlocal where el.id = " + s.ideventolocal);
		if (!infosLocal || !infosLocal.length)
			return { erro: "Unidade ou local não encontrados" };

		const infoLocal = infosLocal[0];

		if (infoLocal.idunidade === Unidade.idADefinir || infoLocal.idunidade === Unidade.idInternet)
			return null;

		let r = {
			erro: null,
			idunidade: infoLocal.idunidade as number,
			id_integra_local: infoLocal.id_integra as string
		};

		if (appsettings.integracaoAgendamento) {
			const id_integra_sessao = (s.id ? await sql.scalar("select id_integra from eventosessao where id = " + s.id) as number : 0);

			r.erro = (!r.id_integra_local ?
				"O local selecionado não possui as informações necessárias para integração com o sistema de agendamento" :
				(await IntegracaoAgendamento.localHorarioLivre(s.data, s.inicio, s.termino, infoLocal.id_integra, id_integra_sessao || 0) ? null : "Já existe outro agendamento neste dia, horário e local")
			);
		} else {
			r.erro = (await sql.scalar("select 1 from eventosessao s inner join eventolocal el on el.id = s.ideventolocal inner join local l on l.id = el.idlocal where s.idevento = " + s.idevento + " and s.data = '" + s.data + "' and s.inicio < " + s.termino + " and " + s.inicio + " < s.termino and s.ideventolocal = " + s.ideventolocal + " and s.sugestao = 0 and l.idunidade > " + Unidade.idADefinir + " " + (s.id ? ("and s.id <> " + s.id) : "") + " limit 1") ?
				"Já existe uma sessão no evento neste dia, horário e local" :
				null
			);
		}

		return r;
	}

	private static async criarAgendamento(sql: Sql, s: Sessao, u: Usuario, id_integra_local: string): Promise<number> {
		const id_integra_sessao = await IntegracaoAgendamento.criarAgendamento(u.login, s.data, s.inicio, s.termino, id_integra_local, s.nome_curto);

		const status_integra = await IntegracaoAgendamento.verificarStatusAprovacao(id_integra_sessao);

		await sql.query("update eventosessao set id_integra = " + id_integra_sessao + ", status_integra = " + status_integra + " where id = " + s.id + " and idevento = " + s.idevento);

		return status_integra;
	}

	public static async alterarStatusIntegra(id_integra_sessao: number, status_integra: number): Promise<string> {
		let res: string;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update eventosessao set status_integra = " + status_integra + " where id_integra = " + id_integra_sessao);

			res = (sql.linhasAfetadas ? "1" : "Sessão não encontrada");
		});

		return res;
	}

	public static async criar(s: Sessao, u: Usuario): Promise<string | number[]> {
		let res: string | number[];
		if ((res = Sessao.validar(s)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				s.id = 0;

				const infoLocal = await Sessao.validarEncavalamento(s, sql);
				if (infoLocal && (res = infoLocal.erro))
					return;

				await sql.query("insert into eventosessao (idcurso, idevento, ideventolocal, idformato, idtiposessao, idvertical, nome, nome_curto, data, inicio, termino, url_remota, descricao, oculta, sugestao, publico_alvo, tags, permiteinscricao, permiteacom, senhacontrole, senhapresenca, mensagemesgotada, id_integra, status_integra) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, 0, 1)", [s.idcurso, s.idevento, s.ideventolocal, s.idformato, s.idtiposessao, s.idvertical, s.nome, s.nome_curto, s.data, s.inicio, s.termino, s.url_remota, s.descricao, s.oculta, s.sugestao, s.publico_alvo, s.tags, s.permiteinscricao, s.permiteacom, s.senhacontrole, s.mensagemesgotada]);
				s.id = await sql.scalar("select last_insert_id()") as number;

				await Sessao.sincronizarPalestrantes(sql, s);

				let status_integra: number;
				if (appsettings.integracaoAgendamento && infoLocal && u)
					status_integra = await Sessao.criarAgendamento(sql, s, u, infoLocal.id_integra_local);
				else
					status_integra = Sessao.STATUS_APROVADO;

				res = [s.id, status_integra];

				await sql.commit();
			} catch (e) {
				if (e.agendamento) {
					res = "Erro reportado pelo sistema de agendamento: " + e.agendamento;
				} else if (e.code) {
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

	public static async criarExterno(s: Sessao, pr: PalestranteResumido[]): Promise<string | number[]> {
		let res: string | number[];
		if ((res = Sessao.validar(s)))
			return res;

		s.idspalestrante = [];

		if (pr && pr.length) {
			for (let i = 0; i < pr.length; i++) {
				if (!pr[i])
					continue;
				pr[i].id = 0;
				res = await PalestranteResumido.criar(s.idevento, pr[i]);
				if (res && res !== parseInt(res).toString())
					return res;
				if (pr[i].id)
					s.idspalestrante.push(pr[i].id);
			}
		}

		res = await Sessao.criar(s, null);

		return res;
	}

	public static async alterar(s: Sessao, u: Usuario): Promise<string | number[]> {
		let res: string | number[];
		if ((res = Sessao.validar(s)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				const infoLocal = await Sessao.validarEncavalamento(s, sql);
				if (infoLocal && (res = infoLocal.erro))
					return;

				// Quando info é null, ou é uma sessão com local a definir, online, ou sugestão
				let ideventolocalOriginal = 0, inicioOriginal = 0, terminoOriginal = 0, dataOriginal: string = null, nome_curtoOriginal: string = null;
				if (infoLocal && appsettings.integracaoAgendamento) {
					const infosOriginais = await sql.query("select ideventolocal, inicio, termino, date_format(data, '%Y-%m-%d') data, nome_curto from eventosessao where id = " + s.id + " and idevento = " + s.idevento);
					if (infosOriginais && infosOriginais.length) {
						const infoOriginal = infosOriginais[0];
						ideventolocalOriginal = infoOriginal.ideventolocal as number;
						inicioOriginal = infoOriginal.inicio as number;
						terminoOriginal = infoOriginal.termino as number;
						dataOriginal = infoOriginal.data as string;
						nome_curtoOriginal = infoOriginal.nome_curto as string;
					}
				}

				await sql.query("update eventosessao set idcurso = ?, ideventolocal = ?, idformato = ?, idtiposessao = ?, idvertical = ?, nome = ?, nome_curto = ?, data = ?, inicio = ?, termino = ?, url_remota = ?, descricao = ?, oculta = ?, sugestao = ?, publico_alvo = ?, tags = ?, permiteinscricao = ?, permiteacom = ?, senhacontrole = ?, mensagemesgotada = ? where id = " + s.id + " and idevento = " + s.idevento, [s.idcurso, s.ideventolocal, s.idformato, s.idtiposessao, s.idvertical, s.nome, s.nome_curto, s.data, s.inicio, s.termino, s.url_remota, s.descricao, s.oculta, s.sugestao, s.publico_alvo, s.tags, s.permiteinscricao, s.permiteacom, s.senhacontrole, s.mensagemesgotada]);

				const linhasAfetadas = sql.linhasAfetadas;

				await Sessao.sincronizarPalestrantes(sql, s);

				// Vamos deixar como -1, para o front saber que seja lá qual é o valor
				// em status_integra lá no front, basta deixar o mesmo valor.
				let status_integra = -1;

				if (appsettings.integracaoAgendamento) {
					const id_integra_sessao = await sql.scalar("select id_integra from eventosessao s where id = " + s.id + " and idevento = " + s.idevento) as number;

					if (id_integra_sessao) {
						if (!infoLocal) {
							// Como passou a ser uma sessão com local a definir, online, ou sugestão,
							// mas antes não era, então exclui o agendamento existente.
							await sql.query("update eventosessao set id_integra = 0, status_integra = 1 where id = " + s.id + " and idevento = " + s.idevento);
							await IntegracaoAgendamento.excluirAgendamento(id_integra_sessao);
							status_integra = 1;
						} else if (ideventolocalOriginal !== s.ideventolocal ||
							dataOriginal !== s.data ||
							inicioOriginal !== s.inicio ||
							terminoOriginal !== s.termino ||
							nome_curtoOriginal !== s.nome_curto) {
							status_integra = await IntegracaoAgendamento.alterarAgendamento(u.login, s.data, s.inicio, s.termino, s.nome_curto, infoLocal.id_integra_local, id_integra_sessao);
							await sql.query("update eventosessao set status_integra = " + status_integra + " where id = " + s.id + " and idevento = " + s.idevento);
						}
					} else {
						// Se era uma sessão com local a definir, online, ou sugestão, ou se era uma
						// sessão legada que ainda não tinha o id_integra, cria o agendamento agora
						if (infoLocal && u)
							status_integra = await Sessao.criarAgendamento(sql, s, u, infoLocal.id_integra_local);
					}
				}

				res = [linhasAfetadas, status_integra];

				await sql.commit();
			} catch (e) {
				if (e.agendamento)
					res = "Erro reportado pelo sistema de agendamento: " + e.agendamento;
				else if (e.code && e.code === "ER_DUP_ENTRY")
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
			try {
				await sql.beginTransaction();

				const id_integra_sessao = await sql.scalar("select id_integra from eventosessao where id = " + id + " and idevento = " + idevento) as number;

				await sql.query("delete from eventosessao where id = " + id + " and idevento = " + idevento);

				const linhasAfetadas = sql.linhasAfetadas;

				if (id_integra_sessao && appsettings.integracaoAgendamento)
					await IntegracaoAgendamento.excluirAgendamento(id_integra_sessao);

				res = linhasAfetadas.toString();

				await sql.commit();
			} catch (e) {
				if (e.agendamento)
					res = "Erro reportado pelo sistema de agendamento: " + e.agendamento;
				else
					throw e;
			}
		});

		return res;
	}

	public static async inscrever(id: number, idevento: number, idparticipante: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			try {
				const sessao = await sql.query("select s.nome, date_format(s.data, '%Y-%m-%d') data, s.inicio, s.termino, ev.nome evento, ev.assuntoemailinscricao, ev.emailinscricao from eventosessao s inner join evento ev on ev.id = s.idevento where s.id = " + id + " and s.idevento = " + idevento + " and s.permiteinscricao = 1 and ev.permiteinscricao = 1") as [{ nome: string, data: string, inicio: number, termino: number, evento: string, assuntoemailinscricao: string, emailinscricao: string }];

				if (!sessao || !sessao[0]) {
					res = "Sessão não encontrada";
					return;
				}

				if (await sql.scalar("select 1 from eventosessaoparticipante esp inner join eventosessao s on s.id = esp.ideventosessao where esp.idevento = " + idevento + " and esp.idparticipante = " + idparticipante + " and s.data = '" + sessao[0].data + "' and s.inicio < " + sessao[0].termino + " and " + sessao[0].inicio + " < s.termino limit 1")) {
					res = "Você já possui outra inscrição na mesma data e horário";
					return;
				}

				await sql.query("insert into eventosessaoparticipante (idevento, ideventosessao, idparticipante, presente, data_inscricao) select ?, ?, ?, 0, now() from (select l.capacidade, (select count(*) from eventosessaoparticipante where ideventosessao = ?) inscritos from eventosessao s inner join eventolocal l on l.id = s.ideventolocal where s.id = ? and s.oculta = 0 and s.sugestao = 0) tmp where tmp.capacidade > tmp.inscritos", [idevento, id, idparticipante, id, id]);

				if (!sql.linhasAfetadas) {
					res = "A sessão está esgotada";
				} else {
					// Envia o e-mail de confirmação de participação
					try {
						const emailParticipante = await sql.scalar("select email from participante where id = " + idparticipante) as string;

						const regEvento = /\{EVENTO\}/gi,
							regSessao = /\{SESSAO\}/gi;

						let assuntoemailinscricao = sessao[0].assuntoemailinscricao,
							emailinscricao = sessao[0].emailinscricao,
							html: string = undefined;
						
						if (!assuntoemailinscricao) {
							assuntoemailinscricao = 'Inscrição na sessão "' + sessao[0].nome + '"';
						} else {
							assuntoemailinscricao = assuntoemailinscricao.replace(regEvento, sessao[0].evento)
								.replace(regSessao, sessao[0].nome);
						}

						if (!emailinscricao) {
							emailinscricao = `Olá!

Este e-mail é apenas uma confirmação da sua inscrição na sessão "${sessao[0].nome}".

Para acessar mais detalhes, acesse o endereço https://credenciamento.espm.br/participante

Até breve!

Tenha um excelente evento :)`;

							html = `<p>Olá!</p>
<p>Este e-mail é apenas uma confirmação da sua inscrição na sessão "${sessao[0].nome}".</p>
<p>Para acessar mais detalhes, acesse o endereço <a target="_blank" href="https://credenciamento.espm.br/participante">https://credenciamento.espm.br/participante</a></p>
<p>Até breve!</p>
<p>Tenha um excelente evento :)</p>`;
						} else {
							emailinscricao = emailinscricao.replace(regEvento, sessao[0].evento)
								.replace(regSessao, sessao[0].nome);
						}

						if (emailParticipante && emailParticipante.indexOf("@") > 0)
							await Evento.enviarEmail(idevento, [emailParticipante], assuntoemailinscricao, emailinscricao, html);
					} catch (e) {
						// Ignora algum possível erro no envio do e-mail para o participante, porque ele já foi inscrito com sucesso
					}
				}

			} catch (e) {
				// Ignora o erro se o participante já estava inscrito na sessão
				if (!e.code || e.code !== "ER_DUP_ENTRY")
					throw e;
			}
		});

		return res;
	}

	public static async excluirInscricao(ideventosessaoparticipante: number, idevento: number, idparticipante: number): Promise<void> {
		await Sql.conectar(async (sql: Sql) => {
			await sql.query("delete from eventosessaoparticipante where id = " + ideventosessaoparticipante + " and idevento = " + idevento + " and idparticipante = " + idparticipante + " and presente = 0");
		});
	}

	public static async obterSenhaPresenca(id: number, idevento: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			res = await sql.scalar("select senhapresenca from eventosessao where id = " + id + " and idevento = " + idevento);
		});

		return res;
	}

	public static async alterarSenhaPresenca(id: number, idevento: number, senhacontrole: string, senhapresenca: string): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update eventosessao set senhapresenca = ? where id = " + id + " and idevento = " + idevento + " and senhacontrole = ?", [(senhapresenca || "").normalize(), (senhacontrole || "").normalize()]);
			if (!sql.linhasAfetadas)
				res = "Sessão não encontrada ou senha inválida";
		});

		return res;
	}
}
