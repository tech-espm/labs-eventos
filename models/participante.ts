import { randomBytes } from "crypto";
import express = require("express");
// https://www.npmjs.com/package/lru-cache
import lru = require("lru-cache");
import nodemailer = require("nodemailer");
import Sql = require("../infra/sql");
import Cas = require("./cas");
import GeradorHash = require("../utils/geradorHash");
import appsettings = require("../appsettings");
import intToHex = require("../utils/intToHex");
import ajustarACOMMinutos = require("../utils/ajustarACOMMinutos");
import converterDataISOParaPtBr = require("../utils/converterDataISOParaPtBr");
import preencherMultidatas = require("../utils/preencherMultidatas");
import formatar2 = require("../utils/formatar2");
import IntegracaoMicroservices = require("./integracao/microservices");
import SessaoConstantes = require("./sessaoConstantes");
import converterDataISO = require("../utils/converterDataISO");

export = class Participante {
	private static readonly HashId = appsettings.participanteHashId;
	private static readonly HashIdParticipante = appsettings.participanteHashIdParticipante;
	private static readonly HashIdEvento = appsettings.participanteHashIdEvento;

	public static readonly TipoAluno = 1;
	public static readonly TipoFuncionario = 2;
	public static readonly TipoExterno = 3;

	public id: number;
	public nome: string;
	public login: string;
	public email: string;
	public campus: string;
	public plano: string;
	public ra: string;
	public tipo: number;
	public idinstrucao: number;
	public idprofissao: number;
	public empresa: string;
	public telefone: string;

	// Utilizado apenas durante a criação
	public senha: string;

	// Utilizado apenas na extração do cookie, para geração do QR
	public idqr: string;

	public static idParticipanteParaIdCertificado(idparticipante: number, idevento: number): string {
		return intToHex(idparticipante ^ Participante.HashIdParticipante) +
			intToHex(idevento ^ Participante.HashIdEvento);
	}

	public static idCertificadoParaIdParticipante(idcertificado: string): [number, number] {
		if (!idcertificado || idcertificado.length !== 16)
			return null;
		let idparticipante = parseInt(idcertificado.substring(0, 8), 16);
		let idevento = parseInt(idcertificado.substring(8), 16);
		if (isNaN(idparticipante) || idparticipante < 0 ||
			isNaN(idevento) || idevento < 0)
			return null;
		return [idparticipante ^ Participante.HashIdParticipante, idevento ^ Participante.HashIdEvento];
	}

	public static idParticipanteParaIdQR(idparticipante: number): string {
		idparticipante ^= appsettings.participanteHashIdQR;
		let b = [idparticipante & 0xFF, (idparticipante >>> 8) & 0xFF, (idparticipante >>> 16) & 0xFF, (idparticipante >>> 24) & 0xFF];
		// NÃO UTILIZAR |, <<, & etc para juntar as partes, pois eles fazem o JS entender
		// o número como int, e valores maiores do que 0x7fffffff viram negativos
		return intToHex(
			b[appsettings.participanteIdQR0] +
			(b[appsettings.participanteIdQR1] * 256) +
			(b[appsettings.participanteIdQR2] * 65536) +
			(b[appsettings.participanteIdQR3] * 16777216)
		);
	}

	public static idQRParaIdParticipante(idqr: string): number {
		if (!idqr || idqr.length > 8)
			return 0;
		let idparticipante = parseInt(idqr, 16);
		// NÃO UTILIZAR |, <<, & etc para juntar as partes, pois eles fazem o JS entender
		// o número como int, e valores maiores do que 0x7fffffff viram negativos
		return appsettings.participanteHashIdQR ^ (
			((idparticipante & 0xFF) * (1 << (appsettings.participanteIdQR0 << 3))) +
			(((idparticipante >>> 8) & 0xFF) * (1 << (appsettings.participanteIdQR1 << 3))) +
			(((idparticipante >>> 16) & 0xFF) * (1 << (appsettings.participanteIdQR2 << 3))) +
			(((idparticipante >>> 24) & 0xFF) * (1 << (appsettings.participanteIdQR3 << 3)))
		);
	}

	public static async cookie(req: express.Request, res: express.Response = null): Promise<Participante> {
		let cookieStr = req.cookies["participante"] as string;
		if (!cookieStr || cookieStr.length !== 40) {
			if (res) {
				res.statusCode = 403;
				res.json("Não permitido");
			}
			return null;
		} else {
			let id = parseInt(cookieStr.substr(0, 8), 16) ^ Participante.HashId;
			let p: Participante = null;
			await Sql.conectar(async (sql: Sql) => {
				let rows = await sql.query("select id, nome, login, email, tipo, token from participante where id = " + id);
				let row;

				if (!rows || !rows.length || !(row = rows[0]))
					return;

				let token = cookieStr.substring(8);

				if (!row.token ||
					token !== (row.token as string))
					return;

				delete row.token;

				p = row as Participante;
				p.idqr = Participante.idParticipanteParaIdQR(p.id);
			});
			if (!p && res) {
				res.statusCode = 403;
				res.json("Não permitido");
			}
			return p;
		}
	}

	private static gerarTokenCookie(id: number): [string, string] {
		let idStr = intToHex(id ^ Participante.HashId);
		let token = randomBytes(16).toString("hex");
		let cookieStr = idStr + token;
		return [token, cookieStr];
	}

	public static async efetuarLogin(email: string, senha: string, cas: Cas, res: express.Response, ignorarCriacaoCas: boolean = false): Promise<[string, Participante]> {
		if (cas) {
			email = cas.emailAcademico;
			senha = appsettings.senhaPadraoUsuariosIntegracaoCAS;
		}

		if (!email || !senha)
			return ["Usuário ou senha inválidos", null];

		let r: string = null;
		let p: Participante = null;
		let inexistente = false;
		let erroEmailInvalido = false;

		await Sql.conectar(async (sql: Sql) => {
			email = email.normalize().trim().toUpperCase();

			let rows = await sql.query("select id, nome, login, email, campus, plano, ra, tipo, senha from participante where email = ?", [email]);
			let row: Participante;

			if (!rows || !rows.length || !(row = rows[0])) {
				inexistente = true;
				r = "E-mail ou senha inválidos";
				return;
			}

			if (!await GeradorHash.validarSenha(senha.normalize(), row.senha)) {
				r = "E-mail ou senha inválidos";
				return;
			}

			if (row.tipo !== Participante.TipoExterno && appsettings.integracaoMicroservices) {
				if (!row.ra) {
					row.ra = await IntegracaoMicroservices.obterRA(cas ? cas.emailAcademico : row.email);
					if (row.ra === "?@#$") {
						if (cas && cas.email)
							row.ra = await IntegracaoMicroservices.obterRA(cas.email);

						if (row.ra === "?@#$") {
							// E-mail não foi encontrado no AD...
							erroEmailInvalido = true;
							r = "E-mail ou senha inválidos";
							return;
						}
					} else if (row.ra) {
						await sql.query("update participante set ra = ? where id = " + row.id, [row.ra]);
					}
				}
				if (row.tipo === Participante.TipoAluno && !row.campus && row.ra) {
					const campusPlano = await IntegracaoMicroservices.obterCampusPlano(row.ra);
					if (campusPlano) {
						row.campus = campusPlano[0];
						row.plano = campusPlano[1];
						await sql.query("update participante set campus = ?, plano = ? where id = " + row.id, [row.campus, row.plano]);
					}
				}
			}

			let [token, cookieStr] = Participante.gerarTokenCookie(row.id);

			// Atualiza o nome com as informações vindas do AD
			if (cas)
				await sql.query("update participante set nome = ?, token = ? where id = " + row.id, [cas.nome, token]);
			else
				await sql.query("update participante set token = ? where id = " + row.id, [token]);

			delete row.senha;
			p = row;

			// @@@ secure!!!
			res.cookie("participante", cookieStr, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: true, path: "/", secure: false });
		});

		if (erroEmailInvalido)
			return [r, p];

		if (cas && inexistente && !ignorarCriacaoCas) {
			// Primeira vez efetuando login
			r = await Participante.criar(new Participante(), cas);
			if (!r)
				return await Participante.efetuarLogin(email, senha, cas, res, true);
		}

		return [r, p];
	}

	public static async efetuarLogout(p: Participante, res: express.Response): Promise<void> {
		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update participante set token = null where id = " + p.id);

			// @@@ secure!!!
			res.cookie("participante", "", { expires: new Date(0), httpOnly: true, path: "/", secure: false });
		});
	}

	private static validar(p: Participante, externo: boolean): string {
		p.nome = (p.nome || "").normalize().trim().toUpperCase();
		if (p.nome.length < 3 || p.nome.length > 100)
			return "Nome inválido";
		p.senha = (p.senha || "").normalize();
		if (p.senha.length < 4 || p.senha.length > 40)
			return "Senha inválida";

		p.email = (p.email || "").normalize().trim().toUpperCase();

		let arroba = p.email.indexOf("@");
		let arroba2 = p.email.lastIndexOf("@");
		let ponto = p.email.lastIndexOf(".");

		if (arroba <= 0 || ponto <= (arroba + 1) || ponto === (p.email.length - 1) || arroba2 !== arroba)
			return "E-mail inválido";

		if (externo) {
			p.login = null;
			p.tipo = Participante.TipoExterno;

			if (p.email.endsWith("@ESPM.BR") || p.email.endsWith("@ACAD.ESPM.BR"))
				return "Alunos e funcionários da ESPM devem utilizar o portal integrado para efetuar login";
			if (isNaN(p.idinstrucao) || p.idinstrucao <= 0)
				return "Nível de instrução inválido";
			if (isNaN(p.idprofissao) || p.idprofissao <= 0)
				return "Ocupação inválida";
			p.empresa = (p.empresa || "").normalize().trim().toUpperCase();
			if (!p.empresa || p.empresa.length > 100)
				return "Empresa inválida";
			p.telefone = (p.telefone || "").normalize().trim().toUpperCase();
			if (p.telefone.length < 14 || p.telefone.length > 25)
				return "Telefone inválido";
		} else {
			p.idinstrucao = null;
			p.idprofissao = null;
			p.empresa = null;
			p.telefone = null;
			p.login = (p.login || "").normalize().trim().toUpperCase();
			if (p.login.length < 3 || p.login.length > 50)
				return "Login inválido";
			if (p.tipo !== Participante.TipoAluno && p.tipo !== Participante.TipoFuncionario)
				return "Tipo inválido";
		}

		return null;
	}

	public static async obter(id: number): Promise<Participante> {
		let lista: Participante[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, login, email, tipo, idinstrucao, idprofissao, empresa, telefone from participante where id = " + id) as Participante[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(p: Participante, cas: Cas, res: express.Response = null): Promise<string> {
		let r: string;
		if (cas) {
			p.nome = cas.nome;
			p.login = cas.user;
			p.email = cas.emailAcademico;
			p.senha = appsettings.senhaPadraoUsuariosIntegracaoCAS;
			p.tipo = (cas.aluno ? Participante.TipoAluno : Participante.TipoFuncionario);
		}
		if ((r = Participante.validar(p, !cas)))
			return r;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("insert into participante (nome, login, email, tipo, idinstrucao, idprofissao, empresa, telefone, senha, data_criacao) values (?, ?, ?, ?, ?, ?, ?, ?, ?, now())", [p.nome, p.login, p.email, p.tipo, p.idinstrucao, p.idprofissao, p.empresa, p.telefone, await GeradorHash.criarHash(p.senha)]);
				p.id = await sql.scalar("select last_insert_id()") as number;
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							r = "Já existe um cadastro com o e-mail \"" + p.email + "\" \uD83D\uDE22. Se tiver esquecido sua senha, basta clicar em \"Esqueci minha senha\".";
							break;
						case "ER_NO_REFERENCED_ROW":
						case "ER_NO_REFERENCED_ROW_2":
							r = "Nível de instrução/Ocupação não encontrada";
							break;
						default:
							throw e;
					}
				} else {
					throw e;
				}
			}
		});

		if (r)
			return r;

		let senha = p.senha;
		delete p.senha;

		if (res)
			[r, p] = await Participante.efetuarLogin(p.email, senha, cas, res);

		return r;
	}

	public static async gerarLinkCertificado(id: number, idevento: number): Promise<string> {
		return appsettings.urlBase + "/participante/certificado/" + await Participante.idParticipanteParaIdCertificado(id, idevento);
	}

	public static async listarEventos(p: Participante): Promise<any[]> {
		let lista: any[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select e.id, e.nome, e.url, e.descricao, ((year(e.inicio) * 100) + month(e.inicio)) data from (select distinct p.idevento from eventosessaoparticipante p where p.idparticipante = " + p.id + ") tmp inner join evento e on e.id = tmp.idevento");

			for (let i = lista.length - 1; i >= 0; i--)
				lista[i].idcertificado = Participante.idParticipanteParaIdCertificado(p.id, lista[i].id);
		});

		return (lista || []);
	}

	private static async preencherMultipresencas(sql: Sql, idparticipante: number, lista: any[]): Promise<any[]> {
		if (lista && lista.length) {
			for (let i = lista.length - 1; i >= 0; i--) {
				const s = lista[i];
				if (s.tipomultidata)
					s.multipresencas = await sql.query("select date_format(data_presenca, '%d/%m/%Y') data from eventosessaoparticipantemultidata where ideventosessao = " + s.ideventosessao + " and idparticipante = " + idparticipante);
			}
		}

		return lista;
	}

	public static async listarMinhasInscricoes(idparticipante: number, idevento: number): Promise<any[]> {
		let lista: any[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await Participante.preencherMultipresencas(sql, idparticipante, await preencherMultidatas(sql, await sql.query("select p.id, s.id ideventosessao, s.nome, s.tags, date_format(s.data, '%d/%m/%Y') data, s.inicio, s.termino, s.url_remota, l.id idlocal, l.nome nome_local, el.cor, u.id idunidade, u.nome nome_unidade, p.creditaracom, a.avaliacao, s.tipomultidata, s.presencaminima, s.encontrostotais, p.encontrospresentes from eventosessao s inner join eventosessaoparticipante p on p.ideventosessao = s.id inner join eventolocal el on el.id = s.ideventolocal inner join local l on l.id = el.idlocal inner join unidade u on u.id = l.idunidade left join eventosessaoavaliacao a on a.ideventosessaoparticipante = p.id where s.idevento = " + idevento + " and p.idparticipante = " + idparticipante), false));
		});

		return (lista || []);
	}

	public static removerPresencasSemCreditoACOM(lista: any[]): any[] {
		if (lista && lista.length) {
			for (let i = lista.length - 1; i >= 0; i--) {
				if (!lista[i].creditaracom)
					lista.splice(i, 1);
			}
		}

		return lista;
	}

	public static async listarPresencasParaCertificado(idparticipante: number, idevento: number): Promise<any[]> {
		let lista: any[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = ajustarACOMMinutos(await Participante.preencherMultipresencas(sql, idparticipante, await preencherMultidatas(sql, Participante.removerPresencasSemCreditoACOM(await sql.query("select s.id ideventosessao, s.nome, date_format(s.data, '%d/%m/%Y') data, s.inicio, s.termino, s.acomminutos, s.tipomultidata, s.presencaminima, s.encontrostotais, p.creditaracom, p.encontrospresentes from eventosessao s inner join eventosessaoparticipante p on p.ideventosessao = s.id where s.idevento = " + idevento + " and p.idparticipante = " + idparticipante + " and p.encontrospresentes > 0")), false)));
		});

		return (lista || []);
	}

	public static async marcarPresenca(senha: string, idevento: number, ideventosessao: number, idparticipante: number, dataMarcacao: string, autoMarcacao: boolean): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			if (!autoMarcacao) {
				let senhas = await sql.query("select senhacheckin from evento where id = " + idevento);

				if (!senhas || !senhas[0] || senhas[0].senhacheckin !== senha) {
					res = "Senha inválida";
					return;
				}

				if (!(dataMarcacao = converterDataISO(dataMarcacao))) {
					res = "Data inválida";
					return;
				}
			} else {
				// Desconta 3 horas do horário atual em UTC, para fazer que os métodos hojeUTC.getUTCxxx()
				// retornem valores referentes ao horário de Brasília, independente do fuso horário do servidor.
				// Mesmo se tiver horário de verão, descontar 3 horas fará com que a pessoa "ganhe" uma hora a
				// mais para marcar a presença. Isso pode dar problema se uma sessão terminar à meia-noite, e
				// o horário de verão estiver vigente.
				const hojeUTC = new Date(new Date().getTime() - (3 * 60 * 60 * 1000));
				dataMarcacao = `${hojeUTC.getUTCFullYear()}-${formatar2(hojeUTC.getUTCMonth() + 1)}-${formatar2(hojeUTC.getUTCDate())}`;
			}

			const lista = await sql.query("select date_format(data, '%Y-%m-%d') data, tipomultidata, presencaminima, encontrostotais from eventosessao where id = " + ideventosessao) as [{ data: string, tipomultidata: number, presencaminima: number, encontrostotais: number }];
			if (lista && lista.length) {
				const sessao = lista[0];
				if (sessao.tipomultidata) {
					if (dataMarcacao !== sessao.data &&
						!(await sql.scalar("select 1 from eventosessaomultidata where ideventosessao = ? and data = ?", [ideventosessao, dataMarcacao]))) {
						res = "Não foi possível encontrar uma ocorrência da sessão na data " + (converterDataISOParaPtBr(dataMarcacao) || dataMarcacao);
						return;
					}

					const ideventosessaoparticipante = await sql.scalar("select id from eventosessaoparticipante where ideventosessao = " + ideventosessao + " and idparticipante = " + idparticipante) as number;
					if (!ideventosessaoparticipante) {
						res = (autoMarcacao ? "Não foi possível encontrar sua inscrição na sessão" : "Não foi possível encontrar a inscrição do participante na sessão");
						return;
					}

					if ((await sql.scalar("select 1 from eventosessaoparticipantemultidata where ideventosessaoparticipante = ? and data_presenca = ?", [ideventosessaoparticipante, dataMarcacao]))) {
						// A presença já havia sido marcada
						return;
					}

					await sql.beginTransaction();

					await sql.query("insert into eventosessaoparticipantemultidata (ideventosessaoparticipante, data_presenca, ideventosessao, idparticipante) values (?, ?, ?, ?)", [ideventosessaoparticipante, dataMarcacao, ideventosessao, idparticipante]);

					const encontrospresentes = await sql.scalar("select count(*) from eventosessaoparticipantemultidata where ideventosessao = " + ideventosessao + " and idparticipante = " + idparticipante) as number;

					switch (sessao.tipomultidata) {
						case SessaoConstantes.TIPOMULTIDATA_MINIMO_EXIGIDO:
							await sql.query("update eventosessaoparticipante set creditaracom = " + (encontrospresentes >= sessao.presencaminima) + ", encontrospresentes = " + encontrospresentes + " where id = " + ideventosessaoparticipante);
							break;
						case SessaoConstantes.TIPOMULTIDATA_PROPORCIONAL:
							await sql.query("update eventosessaoparticipante set creditaracom = 1, encontrospresentes = " + encontrospresentes + " where id = " + ideventosessaoparticipante);
							break;
						default:
							sql.rollback();
							res = "Tipo desconhecido de datas adicionais da sessão";
							return;
					}

					await sql.commit();
				} else {
					if (dataMarcacao !== sessao.data) {
						res = "Não foi possível encontrar uma ocorrência da sessão na data " + (converterDataISOParaPtBr(dataMarcacao) || dataMarcacao);
						return;
					}

					await sql.query("update eventosessaoparticipante set creditaracom = 1, encontrospresentes = 1 where idevento = " + idevento + " and ideventosessao = " + ideventosessao + " and idparticipante = " + idparticipante);

					if (!sql.linhasAfetadas)
						res = (autoMarcacao ? "Não foi possível encontrar sua inscrição na sessão" : "Não foi possível encontrar a inscrição do participante na sessão");
				}
			}
		});

		return res;
	}

	private static async validarPeriodoAvaliacao(sql: Sql, idparticipante: number, ideventosessaoparticipante: number): Promise<string> {
		const sessoes: { id: number, data: string, termino: number, tipomultidata: number }[] = await sql.query("select s.id, date_format(s.data, '%Y-%m-%d') data, s.termino, s.tipomultidata from eventosessaoparticipante esp inner join eventosessao s on s.id = esp.ideventosessao where esp.id = " + ideventosessaoparticipante + " and esp.idparticipante = " + idparticipante + " and esp.creditaracom = 1");
		
		if (!sessoes || !sessoes[0])
			return "Sessão não encontrada";

		const sessao = sessoes[0];
		if (sessao.tipomultidata) {
			const multi: { data: string, termino: number }[] = await sql.query("select date_format(data, '%Y-%m-%d') data, termino from eventosessaomultidata where ideventosessao = " + sessao.id + " order by data desc limit 1");
			if (!multi || !multi[0])
				return "Sessão não encontrada";
			sessao.data = multi[0].data;
			sessao.termino = multi[0].termino;
		}

		const dateAgora = new Date(),
			// Faz a conta como se nosso horário local (que vem do banco) estivesse
			// em coordenadas UTC, para não dar problema com fuso horário!
			agora = dateAgora.getTime() - (dateAgora.getTimezoneOffset() * 60 * 1000),
			// A avaliação deve ser liberada 10 minutos antes do término da sessão
			dataSessao = (new Date(sessao.data + "Z" + formatar2((sessao.termino / 100) | 0) + ":" + formatar2(sessao.termino % 100))).getTime() - (10 * 60 * 1000);
		if (agora < dataSessao)
			return "Avaliação ainda não está liberada";
		else if (agora > (dataSessao + (10 * 24 * 60 * 60 * 1000)))
			return "Período de avaliação encerrado";

		return null;
	}

	public static async obterIdeventosessaoparticipanteParaAvaliacao(idparticipante: number, ideventosessao: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			const ideventosessaoparticipante = await sql.scalar("select id from eventosessaoparticipante where ideventosessao = " + ideventosessao + " and idparticipante = " + idparticipante) as number;
			if (!ideventosessaoparticipante) {
				res = "Inscrição não encontrada para essa sessão";
				return;
			}

			if ((await sql.scalar("select 1 from eventosessaoavaliacao where ideventosessaoparticipante = " + ideventosessaoparticipante + " limit 1"))) {
				res = "Você já realizou a avaliação dessa sessão antes";
				return;
			}

			res = (await Participante.validarPeriodoAvaliacao(sql, idparticipante, ideventosessaoparticipante) || ideventosessaoparticipante.toString());
		});

		return res;
	}

	public static async avaliarSessao(idparticipante: number, ideventosessaoparticipante: number, conhecimento: number, conteudo: number, pontualidade: number, aplicabilidade: number, expectativas: number, comentarioExpectativas: string, avaliacao: number, comentario: string): Promise<string> {
		let res: string = null;

		comentarioExpectativas = (comentarioExpectativas || "").normalize().trim();
		if (!comentarioExpectativas)
			comentarioExpectativas = null;

		comentario = (comentario || "").normalize().trim();
		if (!comentario)
			comentario = null;

		await Sql.conectar(async (sql: Sql) => {
			try {
				if ((res = await Participante.validarPeriodoAvaliacao(sql, idparticipante, ideventosessaoparticipante)))
					return;

				await sql.query("insert into eventosessaoavaliacao (ideventosessaoparticipante, conhecimento, conteudo, pontualidade, aplicabilidade, expectativas, avaliacao, data_avaliacao, comentario_expectativas, comentario) values (?, ?, ?, ?, ?, ?, ?, now(), ?, ?)", [ideventosessaoparticipante, conhecimento, conteudo, pontualidade, aplicabilidade, expectativas, avaliacao, comentarioExpectativas, comentario]);

			} catch (e) {
				// Ignora o erro se o participante já havia avaliado a sessão
				if (!e.code || e.code !== "ER_DUP_ENTRY")
					throw e;
			}
		});

		return res;
	}

	public static async redefinirSenha(email: string): Promise<string> {
		if (!(email = (email || "").normalize().trim().toUpperCase()))
			return "E-mail inválido";

		if (email.endsWith("@ESPM.BR") || email.endsWith("@ACAD.ESPM.BR"))
			return "Alunos e funcionários da ESPM devem utilizar o portal integrado para efetuar login";

		let r: string = null;
		let token = randomBytes(32).toString("hex").toUpperCase();

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update participante set data_reset_senha = now(), token_reset_senha = ? where email = ?", [token, email]);
			if (!sql.linhasAfetadas)
				r = "Não foi possível localizar um cadastro com o e-mail fornecido \uD83D\uDE22";
		});

		if (!r) {
			try {
				let transporter = nodemailer.createTransport(appsettings.mailConfig);

				let link = `${appsettings.urlBase}/participante/redefinirSenha?e=${encodeURIComponent(email)}&t=${token}`;

				await transporter.sendMail({
					from: appsettings.mailFromRedefinicao,
					to: email.toLowerCase(),
					subject: "Redefinição de Senha - Credenciamento ESPM",
					text: `Olá!\n\nVocê está recebendo essa mensagem porque pediu para redefinir sua senha.\n\nPara isso, por favor, basta acessar o endereço abaixo a partir de seu browser:\n\n${link}\n\nCaso não tenha pedido para redefinir sua senha, por favor, desconsidere essa mensagem.\n\nAté breve!\n\nTenha um excelente evento :)`,
					html: `<p>Olá!</p><p>Você está recebendo essa mensagem porque pediu para redefinir sua senha.</p><p>Para isso, por favor, basta acessar o endereço abaixo a partir de seu browser:</p><p><a target="_blank" href="${link}">${link}</a></p><p>Caso não tenha pedido para redefinir sua senha, por favor, desconsidere essa mensagem.</p><p>Até breve!</p><p>Tenha um excelente evento :)</p>`
				});
			} catch (ex) {
				r = "Falha ao enviar o e-mail com as instruções de redefinição de senha. Por favor, tente novamente mais tarde \uD83D\uDE22";
			}
		}

		return r;
	}

	public static async definirSenha(email: string, token: string, senha: string): Promise<string> {
		if (!(email = (email || "").normalize().trim().toUpperCase()))
			return "E-mail inválido";
		if (!(token = (token || "").normalize().trim().toUpperCase()) ||
			token.length !== 64)
			return "Chave de segurança inválida";
		senha = (senha || "").normalize();
		if (senha.length < 4 || senha.length > 40)
			return "Senha inválida";

		if (email.endsWith("@ESPM.BR") || email.endsWith("@ACAD.ESPM.BR"))
			return "Alunos e funcionários da ESPM devem utilizar o portal integrado para efetuar login";

		let r: string = null;

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update participante set data_reset_senha = null, token_reset_senha = null, token = null, senha = ? where email = ? and token_reset_senha = ?", [await GeradorHash.criarHash(senha), email, token]);
			if (!sql.linhasAfetadas)
				r = "E-mail ou chave de segurança inválidos \uD83D\uDE22";
		});

		return r;
	}

	public static async conferirTelefone(email: string, senha: string): Promise<string> {
		if (!(email = (email || "").normalize().trim().toUpperCase()))
			return "E-mail inválido";
		if (!senha)
			return "Senha inválida";

		if (email.endsWith("@ESPM.BR") || email.endsWith("@ACAD.ESPM.BR"))
			return "Alunos e funcionários da ESPM devem utilizar o portal integrado para efetuar login";

		let r: string = null;

		await Sql.conectar(async (sql: Sql) => {
			let rows = await sql.query("select telefone, senha from participante where email = ?", [email]);
			let row: Participante;

			if (!rows || !rows.length || !(row = rows[0])) {
				r = "E-mail ou senha inválidos";
				return;
			}

			if (!await GeradorHash.validarSenha(senha.normalize(), row.senha)) {
				r = "E-mail ou senha inválidos";
				return;
			}

			if (!row.telefone || !row.telefone.trim())
				r = "1";
		});

		return r;
	}

	public static async atualizarTelefone(email: string, senha: string, telefone: string): Promise<string> {
		if (!(email = (email || "").normalize().trim().toUpperCase()))
			return "E-mail inválido";
		if (!senha)
			return "Senha inválida";
		telefone = (telefone || "").normalize().trim().toUpperCase();
		if (telefone.length < 14 || telefone.length > 25)
			return "Telefone inválido";

		if (email.endsWith("@ESPM.BR") || email.endsWith("@ACAD.ESPM.BR"))
			return "Alunos e funcionários da ESPM devem utilizar o portal integrado para efetuar login";

		let r: string = null;

		await Sql.conectar(async (sql: Sql) => {
			let rows = await sql.query("select id, senha from participante where email = ?", [email]);
			let row: Participante;

			if (!rows || !rows.length || !(row = rows[0])) {
				r = "E-mail ou senha inválidos";
				return;
			}

			if (!await GeradorHash.validarSenha(senha.normalize(), row.senha)) {
				r = "E-mail ou senha inválidos";
				return;
			}

			await sql.query("update participante set telefone = ? where id = ?", [telefone, row.id]);
		});

		return r;
	}
}
