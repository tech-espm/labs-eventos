import fs = require("fs");
import nodemailer = require("nodemailer");
import unzipper = require("unzipper");
import Arquivo = require("../infra/arquivo");
import ClusterEventos = require("../infra/clusterEventos");
import DataUtil = require("../utils/dataUtil");
import FS = require("../infra/fs");
import Sql = require("../infra/sql");
import Upload = require("../infra/upload");
import ajustarACOMMinutos = require("../utils/ajustarACOMMinutos");
import emailValido = require("../utils/emailValido");
import appsettings = require("../appsettings");
import Empresa = require("./empresa");
import Participante = require("./participante");
import Usuario = require("./usuario");
import TipoEmpresa = require("./tipoEmpresa");

interface EventoSimples {
	id: number;
	nome: string;
	cidade: string;
	titulo: string;
	descricao: string;
	versaobanner: number;
	versaologo: number;
	url: string;
	idempresapadrao: number;
	emailpadrao: string;
	habilitado: number;
	permiteinscricao: number;
	descricao_visivel: boolean;
	agenda_visivel: boolean;
	palestrantes_visivel: boolean;
	contato_visivel: boolean;
	mapa_visivel: boolean;
	apoio_visivel: boolean;
	secoesocultas: number;
	contatocorfundo: string;
	contatocortexto: string;
  	contatocoluna1: string;
  	contatocoluna2: string;
	urlmapa: string;
	mensagemrodape: string;
	senhasugestao: string;
}

interface EventosPorUrl {
	[url: string]: EventoSimples;
}

interface EventosPorId {
	[id: number]: EventoSimples;
}

export = class Evento {
	// Sincronizar esses valores com views\evento\alterar.ejs
	public static readonly secaoDescricao = 1;
	public static readonly secaoAgenda = 2;
	public static readonly secaoPalestrantes = 4;
	public static readonly secaoContato = 8;
	public static readonly secaoMapa = 16;
	public static readonly secaoApoio = 32;

	public static readonly tamanhoMaximoFundoCertificadoEmKiB = 2048;
	public static readonly tamanhoMaximoFundoCertificadoEmBytes = Evento.tamanhoMaximoFundoCertificadoEmKiB << 10;

	public static readonly nomesReservados: string[] = [];
	public static idsPorUrl: EventosPorUrl = {};
	public static eventosPorId: EventosPorId = {};

	public id: number;
	public nome: string;
	public cidade: string;
	public url: string;
	public titulo: string;
	public descricao: string;
	public inicio: string;
	public termino: string;
	public versao: number;
	public versaobanner: number;
	public versaologo: number;
	public habilitado: number;
	public certificadoliberado: number;
	public permiteinscricao: number;
	public aspectratioempresa: string;
	public aspectratiopalestrante: string;
	public permitealuno: number;
	public permitefuncionario: number;
	public permiteexterno: number;
	public secoesocultas: number;
	public contatocorfundo: string;
	public contatocortexto: string;
  	public contatocoluna1: string;
  	public contatocoluna2: string;
	public urlmapa: string;
	public mensagemrodape: string;
	public idempresapadrao: number;
	public emailpadrao: string;
	public senharecepcao: string;
	public senhacheckin: string;
	public senhasugestao: string;
	public termoaceite: string;
	public certificado1: string;
	public certificado2: string;
	public certificado1palestrante: string;
	public certificado2palestrante: string;
	public assuntoemailinscricao: string;
	public emailinscricao: string;

	private static urlRegExp = /[^a-z0-9_\-]/gi;
	private static aspectRatioRegExp = /^\d+:\d+$/;

	public static caminhoRelativo(id: number): string {
		return "public/evt/" + id;
	}

	public static caminhoAbsolutoExterno(id: number): string {
		return "/public/evt/" + id;
	}

	private static validar(ev: Evento): string {
		ev.nome = (ev.nome || "").normalize().trim();
		if (ev.nome.length < 3 || ev.nome.length > 100)
			return "Nome inválido";
		ev.cidade = (ev.cidade || "").normalize().trim();
		if (ev.cidade.length < 3 || ev.cidade.length > 40)
			return "Cidade inválida";
		ev.url = (ev.url || "").normalize().trim().toLowerCase();
		if (ev.url.length < 2 || ev.url.length > 50 || Evento.urlRegExp.test(ev.url))
			return "URL inválida";
		for (let i = Evento.nomesReservados.length - 1; i >= 0; i--) {
			if (ev.url == Evento.nomesReservados[i])
				return "A URL \"" + ev.url + "\" é reservada para o sistema";
		}
		ev.titulo = (ev.titulo || "").normalize().trim();
		if (!ev.titulo || ev.titulo.length > 250)
			return "Título da landing page inválido";
		ev.descricao = (ev.descricao || "").normalize().trim();
		if (ev.descricao.length > 250)
			return "Descrição da landing page inválida";
		if (!(ev.inicio = DataUtil.converterDataISO(ev.inicio)))
			return "Data inicial inválida";
		// Por uma incrível coincidência, uma data ISO pode ser comparada com outra direto como string! :)
		if (!(ev.termino = DataUtil.converterDataISO(ev.termino)) || ev.termino < ev.inicio)
			return "Data final inválida";
		ev.aspectratioempresa = (ev.aspectratioempresa || "").normalize().trim().toUpperCase();
		if (ev.aspectratioempresa && (ev.aspectratioempresa.length > 11 || !Evento.aspectRatioRegExp.test(ev.aspectratioempresa)))
			return "O aspect ratio das imagens das empresas é inválido";
		ev.aspectratiopalestrante = (ev.aspectratiopalestrante || "").normalize().trim().toUpperCase();
		if (ev.aspectratiopalestrante && (ev.aspectratiopalestrante.length > 11 || !Evento.aspectRatioRegExp.test(ev.aspectratiopalestrante)))
			return "O aspect ratio das imagens dos palestrantes é inválido";
		if (!ev.permitealuno && !ev.permitefuncionario && !ev.permiteexterno)
			return "Nenhuma permissão especificada";
		if (isNaN(ev.secoesocultas))
			ev.secoesocultas = 0;
		ev.contatocorfundo = (ev.contatocorfundo || "").normalize().trim();
		if (!ev.contatocorfundo || ev.contatocorfundo.length > 7 || ev.contatocorfundo.charAt(0) !== "#")
			return "Cor do fundo do contato inválida";
		ev.contatocortexto = (ev.contatocortexto || "").normalize().trim();
		if (!ev.contatocortexto || ev.contatocortexto.length > 7 || ev.contatocortexto.charAt(0) !== "#")
			return "Cor do texto do contato inválida";
		ev.contatocoluna1 = (ev.contatocoluna1 || "").normalize().trim();
		if (ev.contatocoluna1.length > 4000)
			return "HTML da coluna 1 do contato inválido";
		ev.contatocoluna2 = (ev.contatocoluna2 || "").normalize().trim();
		if (ev.contatocoluna2.length > 4000)
			return "HTML da coluna 2 do contato inválido";
		ev.urlmapa = (ev.urlmapa || "").normalize().trim();
		if (ev.urlmapa.length > 400)
			return "URL do mapa inválido";
		ev.mensagemrodape = (ev.mensagemrodape || "").normalize().trim();
		if (ev.mensagemrodape.length > 100)
			return "HTML do rodapé inválido";
		ev.emailpadrao = (ev.emailpadrao || "").normalize().trim().toUpperCase();
		if (!ev.emailpadrao || ev.emailpadrao.length > 100 || !emailValido(ev.emailpadrao))
			return "E-mail padrão para envios inválido";
		ev.senharecepcao = (ev.senharecepcao || "").normalize();
		if (ev.senharecepcao.length > 45)
			return "Senha da recepção muito longa";
		ev.senhacheckin = (ev.senhacheckin || "").normalize();
		if (ev.senhacheckin.length > 45)
			return "Senha do check-in muito longa";
		ev.senhasugestao = (ev.senhasugestao || "").normalize();
		if (ev.senhasugestao.length > 45)
			return "Senha das sugestões muito longa";
		ev.termoaceite = (ev.termoaceite || "").normalize().trim();
		if (ev.termoaceite.length > 4000)
			return "Termo de aceite de uso de imagem muito longo";
		ev.certificado1 = (ev.certificado1 || "").normalize().trim();
		if (ev.certificado1.length > 100)
			return "Linha 1 do certificado do participante muito longa";
		ev.certificado2 = (ev.certificado2 || "").normalize().trim();
		if (ev.certificado2.length > 400)
			return "Linha 2 do certificado do participante muito longa";
		ev.certificado1palestrante = (ev.certificado1palestrante || "").normalize().trim();
		if (ev.certificado1palestrante.length > 100)
			return "Linha 1 do certificado do palestrante muito longa";
		ev.certificado2palestrante = (ev.certificado2palestrante || "").normalize().trim();
		if (ev.certificado2palestrante.length > 400)
			return "Linha 2 do certificado do palestrante muito longa";
		ev.assuntoemailinscricao = (ev.assuntoemailinscricao || "").normalize().trim();
		if (ev.assuntoemailinscricao.length > 250)
			return "Assunto do e-mail de confirmação de inscrição muito longo";
		ev.emailinscricao = (ev.emailinscricao || "").normalize().trim();
		if (ev.emailinscricao.length > 4000)
			return "E-mail de confirmação de inscrição muito longo";
		return null;
	}

	public static async atualizarIdsPorUrlSemPropagacao(): Promise<void> {
		await Sql.conectar(async (sql: Sql) => {
			Evento.atualizarIdsPorUrl(sql, false);
		});
	}

	private static async atualizarIdsPorUrl(sql: Sql, propagarParaCluster: boolean): Promise<void> {
		let idsPorUrl: EventosPorUrl = {};
		let eventosPorId: EventosPorId = {};
		let lista = await sql.query("select id, nome, cidade, titulo, descricao, versaobanner, versaologo, url, idempresapadrao, emailpadrao, habilitado, permiteinscricao, secoesocultas, contatocorfundo, contatocortexto, contatocoluna1, contatocoluna2, urlmapa, mensagemrodape, senhasugestao from evento") as EventoSimples[];
		if (lista && lista.length) {
			for (let i = lista.length - 1; i >= 0; i--) {
				let e = lista[i];
				let evt: EventoSimples = {
					id: e.id,
					nome: e.nome,
					cidade: e.cidade,
					titulo: e.titulo,
					descricao: e.descricao,
					versaobanner: e.versaobanner,
					versaologo: e.versaologo,
					url: "/" + e.url,
					idempresapadrao: e.idempresapadrao,
					emailpadrao: e.emailpadrao.toLowerCase(),
					habilitado: e.habilitado,
					permiteinscricao: e.permiteinscricao,
					descricao_visivel: !(e.secoesocultas & Evento.secaoDescricao),
					agenda_visivel: !(e.secoesocultas & Evento.secaoAgenda),
					palestrantes_visivel: !(e.secoesocultas & Evento.secaoPalestrantes),
					contato_visivel: !(e.secoesocultas & Evento.secaoContato),
					mapa_visivel: !(e.secoesocultas & Evento.secaoMapa),
					apoio_visivel: !(e.secoesocultas & Evento.secaoApoio),
					secoesocultas: e.secoesocultas,
					contatocorfundo: e.contatocorfundo,
					contatocortexto: e.contatocortexto,
				  	contatocoluna1: e.contatocoluna1,
				  	contatocoluna2: e.contatocoluna2,
					urlmapa: e.urlmapa,
					mensagemrodape: e.mensagemrodape,
					senhasugestao: e.senhasugestao
				};
				idsPorUrl[evt.url] = evt;
				eventosPorId[e.id] = evt;
			}
		}
		Evento.idsPorUrl = idsPorUrl;
		Evento.eventosPorId = eventosPorId;

		if (propagarParaCluster)
			await ClusterEventos.enviarAtualizarIdsPorUrl();
	}

	public static async listar(): Promise<Evento[]> {
		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, cidade, url, titulo, descricao, date_format(inicio, '%d/%m/%Y') inicio, date_format(termino, '%d/%m/%Y') termino, versao, habilitado, certificadoliberado, permiteinscricao, aspectratioempresa, aspectratiopalestrante, permitealuno, permitefuncionario, permiteexterno, idempresapadrao, emailpadrao from evento order by nome asc") as Evento[];
		});

		return (lista || []);
	}

	public static async listarDeUsuario(idusuario: number): Promise<Evento[]> {
		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select ev.id, ev.nome, ev.cidade, ev.url, ev.titulo, ev.descricao, date_format(ev.inicio, '%d/%m/%Y') inicio, date_format(ev.termino, '%d/%m/%Y') termino, ev.versao, ev.habilitado, ev.certificadoliberado, ev.permiteinscricao, ev.aspectratioempresa, ev.aspectratiopalestrante, ev.permitealuno, ev.permitefuncionario, ev.permiteexterno, ev.idempresapadrao, ev.emailpadrao from eventousuario evu inner join evento ev on ev.id = evu.idevento where evu.idusuario = " + idusuario + " order by ev.nome asc") as Evento[];
		});

		return (lista || []);
	}

	public static async listarDeUsuarioPorTipo(idusuario: number, admin: boolean): Promise<Evento[]> {
		return (admin ? Evento.listar() : Evento.listarDeUsuario(idusuario));
	}

	public static permiteParticipante(ev: Evento, tipoParticipante: number): string {
		switch (tipoParticipante) {
			case Participante.TipoAluno:
				if (ev.permitealuno)
					return null;
				break;
			case Participante.TipoFuncionario:
				if (ev.permitefuncionario)
					return null;
				break;
			case Participante.TipoExterno:
				if (ev.permiteexterno)
					return null;
				break;
		}

		let t: string[] = [];
		if (ev.permitealuno)
			t.push("alunos");

		if (ev.permitefuncionario)
			t.push("funcionários");

		if (ev.permiteexterno)
			t.push("participantes externos");

		let res = "O evento permite apenas ";

		if (t.length === 1)
			res += t[0];
		else if (t.length === 2)
			res += t[0] + " e " + t[1];
		else
			res += t[0] + ", " + t[1] + " e " + t[2];

		return res;
	}

	public static async obter(id: number, incluirAceiteCertificadoEEmail: boolean, idusuario: number = 0, apenasDoUsuario: boolean = false): Promise<Evento> {
		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query(
				"select id, nome, cidade, url, titulo, descricao, date_format(inicio, '%d/%m/%Y') inicio, date_format(termino, '%d/%m/%Y') termino, versao, habilitado, certificadoliberado, permiteinscricao, aspectratioempresa, aspectratiopalestrante, permitealuno, permitefuncionario, permiteexterno, secoesocultas, contatocorfundo, contatocortexto, contatocoluna1, contatocoluna2, urlmapa, mensagemrodape, idempresapadrao, emailpadrao " +
				(incluirAceiteCertificadoEEmail ? " , termoaceite, certificado1, certificado2, certificado1palestrante, certificado2palestrante, assuntoemailinscricao, emailinscricao " : "") +
				" from evento where id = " + id +
				(apenasDoUsuario ? (" and exists (select 1 from eventousuario where idevento = " + id + " and idusuario = " + idusuario + ")") : "")
			) as Evento[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async obterEmailPadrao(id: number): Promise<string> {
		let emailpadrao: string = null;

		await Sql.conectar(async (sql: Sql) => {
			emailpadrao = await sql.scalar("select emailpadrao from evento where id = " + id) as string;
		});

		return emailpadrao;
	}

	public static async obterDadosDeEdicao(ev: Evento): Promise<void> {
		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select senharecepcao, senhacheckin, senhasugestao from evento where id = " + ev.id) as Evento[];
		});

		if (lista && lista[0]) {
			ev.senharecepcao = lista[0].senharecepcao;
			ev.senhacheckin = lista[0].senhacheckin;
			ev.senhasugestao = lista[0].senhasugestao;
		}
	}

	public static async criar(ev: Evento, arquivoFundoCertificado: any): Promise<string> {
		let res: string;
		if ((res = Evento.validar(ev)))
			return res;

		let idTipoEmpresaPadrao = await TipoEmpresa.obterIdPadrao();

		await Sql.conectar(async (sql: Sql) => {
			ev.id = 0;

			await sql.beginTransaction();

			try {
				await sql.query("insert into evento (nome, cidade, url, titulo, descricao, inicio, termino, versao, versaobanner, versaologo, habilitado, certificadoliberado, permiteinscricao, aspectratioempresa, aspectratiopalestrante, permitealuno, permitefuncionario, permiteexterno, secoesocultas, contatocorfundo, contatocortexto, contatocoluna1, contatocoluna2, urlmapa, mensagemrodape, idempresapadrao, emailpadrao, senharecepcao, senhacheckin, senhasugestao, termoaceite, certificado1, certificado2, certificado1palestrante, certificado2palestrante, assuntoemailinscricao, emailinscricao) values (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [ev.nome, ev.cidade, ev.url, ev.titulo, ev.descricao, ev.inicio, ev.termino, ev.habilitado, ev.certificadoliberado, ev.permiteinscricao, ev.aspectratioempresa, ev.aspectratiopalestrante, ev.permitealuno, ev.permitefuncionario, ev.permiteexterno, ev.secoesocultas, ev.contatocorfundo, ev.contatocortexto, ev.contatocoluna1, ev.contatocoluna2, ev.urlmapa, ev.mensagemrodape, ev.emailpadrao, ev.senharecepcao, ev.senhacheckin, ev.senhasugestao, ev.termoaceite, ev.certificado1, ev.certificado2, ev.certificado1palestrante, ev.certificado2palestrante, ev.assuntoemailinscricao, ev.emailinscricao]);
				ev.id = await sql.scalar("select last_insert_id()") as number;
				await sql.query("insert into eventoempresa (idevento, idtipo, nome, nome_curto, url_site, imagem_ok, versao) values (?, ?, 'A DEFINIR', 'A DEFINIR', '', 0, 0)", [ev.id, idTipoEmpresaPadrao]);
				ev.idempresapadrao = await sql.scalar("select last_insert_id()") as number;
				await sql.query("update evento set idempresapadrao = ? where id = " + ev.id, [ev.idempresapadrao]);
				let diretorio = Evento.caminhoRelativo(ev.id);
				await FS.criarDiretorio(diretorio);
				await FS.criarDiretorio(diretorio + "/empresas");
				await FS.criarDiretorio(diretorio + "/palestrantes");
				await Upload.criarArquivo(Empresa.caminhoRelativoPasta(ev.id), ev.idempresapadrao + "." + Empresa.extensaoImagem, Evento.gerarPNGVazio());

				if (arquivoFundoCertificado && arquivoFundoCertificado.buffer && arquivoFundoCertificado.size) {
					// Chegando aqui, significa que a inclusão foi bem sucedida.
					// Logo, podemos tentar criar o arquivo físico. Se a criação do
					// arquivo não funcionar, uma exceção ocorrerá, e a transação será
					// desfeita, já que o método commit() não executará, e nossa classe
					// Sql já executa um rollback() por nós nesses casos.
					await Upload.gravarArquivo(arquivoFundoCertificado, Evento.caminhoRelativo(ev.id), "fundo-certificado.png");
				}

				await sql.commit();
				await Evento.atualizarIdsPorUrl(sql, true);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O evento \"" + ev.nome + "\" ou a URL \"" + ev.url + "\" já existem";
				else
					throw e;
			}
		});

		if (!res) {
			await Evento.criarArquivosPadrao(ev.id);
			res = ev.id.toString();
		}

		return res;
	}

	public static async alterar(ev: Evento, arquivoFundoCertificado: any): Promise<string> {
		let res: string;
		if ((res = Evento.validar(ev)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update evento set nome = ?, cidade = ?, url = ?, titulo = ?, descricao = ?, inicio = ?, termino = ?, versao = versao + 1, habilitado = ?, certificadoliberado = ?, permiteinscricao = ?, aspectratioempresa = ?, aspectratiopalestrante = ?, permitealuno = ?, permitefuncionario = ?, permiteexterno = ?, secoesocultas = ?, contatocorfundo = ?, contatocortexto = ?, contatocoluna1 = ?, contatocoluna2 = ?, urlmapa = ?, mensagemrodape = ?, emailpadrao = ?, senharecepcao = ?, senhacheckin = ?, senhasugestao = ?, termoaceite = ?, certificado1 = ?, certificado2 = ?, certificado1palestrante = ?, certificado2palestrante = ?, assuntoemailinscricao = ?, emailinscricao = ? where id = " + ev.id, [ev.nome, ev.cidade, ev.url, ev.titulo, ev.descricao, ev.inicio, ev.termino, ev.habilitado, ev.certificadoliberado, ev.permiteinscricao, ev.aspectratioempresa, ev.aspectratiopalestrante, ev.permitealuno, ev.permitefuncionario, ev.permiteexterno, ev.secoesocultas, ev.contatocorfundo, ev.contatocortexto, ev.contatocoluna1, ev.contatocoluna2, ev.urlmapa, ev.mensagemrodape, ev.emailpadrao, ev.senharecepcao, ev.senhacheckin, ev.senhasugestao, ev.termoaceite, ev.certificado1, ev.certificado2, ev.certificado1palestrante, ev.certificado2palestrante, ev.assuntoemailinscricao, ev.emailinscricao]);
				res = sql.linhasAfetadas.toString();
				if (sql.linhasAfetadas) {
					Usuario.alterarNomeDoEventoEmCache(ev.id, ev.nome);

					if (arquivoFundoCertificado && arquivoFundoCertificado.buffer && arquivoFundoCertificado.size) {
						// Chegando aqui, significa que a inclusão foi bem sucedida.
						// Logo, podemos tentar criar o arquivo físico. Se a criação do
						// arquivo não funcionar, uma exceção ocorrerá, e a transação será
						// desfeita, já que o método commit() não executará, e nossa classe
						// Sql já executa um rollback() por nós nesses casos.
						await Upload.gravarArquivo(arquivoFundoCertificado, Evento.caminhoRelativo(ev.id), "fundo-certificado.png");
					}
				}
				await Evento.atualizarIdsPorUrl(sql, true);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O evento \"" + ev.nome + "\" ou a URL \"" + ev.url + "\" já existem";
				else
					throw e;
			}
		});

		return res;
	}

	public static async listarArquivos(id: number): Promise<Arquivo[]> {
		return FS.listarDiretorio(Evento.caminhoRelativo(id));
	}

	public static gerarCaminhoArquivo(id: number, nome: string): string[] {
		if (!(nome = FS.validarNomeDeArquivo(nome)))
			return null;

		return [FS.gerarCaminhoAbsoluto(Evento.caminhoRelativo(id)), nome];
	}

	public static criarArquivosPadrao(id: number): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				fs.createReadStream(FS.gerarCaminhoAbsoluto("public/arquivos-landing-page.zip")).pipe(unzipper.Parse()).on("entry", function (entry) {
					const path: string = entry.path;
					let nomeZip: string = null;
					if (path !== "explica.txt" &&
						path !== "arquivos" &&
						path !== "arquivos/")
						nomeZip = (path.startsWith("arquivos/") ? path.substr(9) : path);
					if (!nomeZip)
						entry.autodrain();
					else
						entry.pipe(fs.createWriteStream((nomeZip === "landing-page.ejs") ? Evento.caminhoLandingPage(id) : Evento.caminhoAnexo(id, nomeZip)));
				}).on("finish", resolve).on("error", resolve);
			} catch (ex) {
				// Não há muito o que fazer...
				resolve();
			}
		});
	}

	public static async atualizarVersaoArquivo(id: number, nome: string): Promise<void> {
		let campo: string = null;

		switch (nome) {
			case "banner.jpg":
			case "banner.png":
				campo = "versaobanner";
				break;
			case "banner-logo.png":
			case "banner_logo.png":
			case "banner-logo.jpg":
			case "banner_logo.jpg":
				campo = "versaologo";
				break;
			default:
				return;
		}

		await Sql.conectar(async (sql: Sql) => {
			await sql.query("update evento set " + campo + " = " + campo + " + 1 where id = " + id);
			await Evento.atualizarIdsPorUrl(sql, true);
		});
	}

	public static async renomearArquivo(id: number, nomeAtual: string, nomeNovo: string): Promise<string> {
		if (!(nomeAtual = FS.validarNomeDeArquivo(nomeAtual)))
			return "Nome de arquivo inválido";
		if (!(nomeNovo = FS.validarNomeDeArquivo(nomeNovo)))
			return "Novo nome de arquivo inválido";

		await FS.renomearArquivo(Evento.caminhoRelativo(id) + "/" + nomeAtual, Evento.caminhoRelativo(id) + "/" + nomeNovo);

		return null;
	}

	public static async excluirArquivo(id: number, nome: string): Promise<string> {
		if (!(nome = FS.validarNomeDeArquivo(nome)))
			return "Nome de arquivo inválido";

		await FS.excluirArquivo(Evento.caminhoRelativo(id) + "/" + nome.toLowerCase());

		return null;
	}

	public static caminhoAnexo(id: number, nome: string): string {
		return FS.gerarCaminhoAbsoluto(Evento.caminhoRelativo(id) + "/" + nome);
	}

	public static caminhoAnexoPorTipo(id: number, tipoAnexo: string, idanexo: number, extensao: string): string {
		return FS.gerarCaminhoAbsoluto(Evento.caminhoRelativo(id) + "/" + tipoAnexo + "/" + idanexo + "." + extensao);
	}

	public static caminhoExternoAnexo(id: number, tipoAnexo: string, idanexo: number, extensao: string): string {
		return Evento.caminhoAbsolutoExterno(id) + "/" + tipoAnexo + "/" + idanexo + "." + extensao;
	}

	public static gerarCaminhoLandingPage(id: number): string[] {
		return [FS.gerarCaminhoAbsoluto("views/evt"), id + ".ejs"];
	}

	public static caminhoLandingPage(id: number): string {
		return FS.gerarCaminhoAbsoluto("views/evt/" + id + ".ejs");
	}

	public static async landingPageExiste(id: number): Promise<boolean> {
		return await FS.existeArquivo("views/evt/" + id + ".ejs");
	}

	public static async contarInscricoes(id: number): Promise<any[]> {
		let lista: any[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select ideventosessao, count(*) inscritos from eventosessaoparticipante where idevento = " + id + " group by ideventosessao");
		});

		return (lista || []);
	}

	public static async contarInscricoesEPresencas(id: number): Promise<any> {
		let res = null;

		await Sql.conectar(async (sql: Sql) => {
			let presencas = await sql.query("select ideventosessao, count(*) inscritos, sum(encontrospresentes) presentes from eventosessaoparticipante where idevento = " + id + " group by ideventosessao");

			let tipos = await sql.query("select count(*) inscritos, p.tipo from (select distinct esp.idparticipante from eventosessaoparticipante esp where esp.idevento = " + id + ") tmp inner join participante p on p.id = tmp.idparticipante group by p.tipo");

			res = {
				presencas: presencas,
				tipos: tipos
			};
		});

		return res;
	}

	public static async listarAvaliacoes(id: number): Promise<any[]> {
		let res: any[] = null;

		await Sql.conectar(async (sql: Sql) => {
			res = await sql.query("select esp.ideventosessao, esa.avaliacao from eventosessaoparticipante esp inner join eventosessaoavaliacao esa on esa.ideventosessaoparticipante = esp.id where esp.idevento = " + id);
		});

		return res;
	}

	public static async listarAvaliacoesEComentarios(id: number): Promise<any[]> {
		let res: any[] = null;

		await Sql.conectar(async (sql: Sql) => {
			res = await sql.query("select esp.ideventosessao, esa.conhecimento, esa.conteudo, esa.pontualidade, esa.aplicabilidade, esa.expectativas, esa.avaliacao, date_format(esa.data_avaliacao, '%d/%m/%Y') data_avaliacao, esa.comentario_expectativas, esa.comentario from eventosessaoparticipante esp inner join eventosessaoavaliacao esa on esa.ideventosessaoparticipante = esp.id where esp.idevento = " + id);
		});

		return res;
	}

	public static async listarInscritosRecepcaoCheckIn(id: number, senha: string, tipo: number, ideventosessao: number = 0, dataMarcacao: string = null): Promise<Participante[]> {
		let lista: Participante[] = null;

		if (isNaN(id) || !senha || isNaN(tipo) || (tipo !== 1 && tipo !== 2) || isNaN(ideventosessao))
			return [];

		if (tipo === 1) {
			ideventosessao = 0;
			dataMarcacao = null;
		} else if (!(dataMarcacao = DataUtil.converterDataISO(dataMarcacao))) {
			return [];
		}

		senha = senha.normalize();

		await Sql.conectar(async (sql: Sql) => {
			let senhaDb = await sql.scalar("select " + (tipo === 1 ? "senharecepcao" : "senhacheckin") + " from evento where id = " + id);

			if (!senhaDb || senhaDb !== senha)
				return;

			if (ideventosessao > 0) {
				// Check-in
				const sessao = await sql.query("select idevento, tipomultidata from eventosessao where id = " + ideventosessao) as [{ idevento: number, tipomultidata: number }];
				if (!sessao || !sessao.length || sessao[0].idevento !== id)
					return;
				lista = (!sessao[0].tipomultidata ?
					await sql.query("select p.id, p.nome, p.login, p.email, p.tipo, esp.encontrospresentes presente from eventosessaoparticipante esp inner join participante p on p.id = esp.idparticipante where esp.ideventosessao = " + ideventosessao) :

					// Simula um valor fake (== ou != 0) para presente com base
					// em eventosessaoparticipantemultidata, para sessões multidata
					await sql.query("select p.id, p.nome, p.login, p.email, p.tipo, espm.ideventosessaoparticipante presente from eventosessaoparticipante esp inner join participante p on p.id = esp.idparticipante left join eventosessaoparticipantemultidata espm on espm.ideventosessaoparticipante = esp.id and espm.data_presenca = ? where esp.ideventosessao = ?", [dataMarcacao, ideventosessao])
				);
			} else {
				// Recepção
				lista = await sql.query("select p.id, p.nome, p.login, p.email, p.tipo from (select distinct esp.idparticipante from eventosessaoparticipante esp where esp.idevento = " + id + ") tmp inner join participante p on p.id = tmp.idparticipante");
			}
		});

		return (lista || []);
	}

	private static async listarInscritosPresencasEACOMInterno(incluirEvento: boolean, sql: Sql, where: string, params?: any[]): Promise<any[]> {
		return ajustarACOMMinutos(await sql.query("select" + (incluirEvento ? " s.idevento, ev.nome nome_evento, date_format(esp.verificado, '%d/%m/%Y') verificado," : "") + " esp.id idesp, s.nome nome_sessao, u.sigla sigla_unidade, l.nome nome_local, date_format(s.data, '%d/%m/%Y') data, c.nome nome_curso, s.inicio, s.termino, p.id, p.nome, p.login, p.email, p.telefone, p.ra, p.campus, p.plano, p.tipo, esp.creditaracom, s.acomminutos, s.tipomultidata, s.presencaminima, s.encontrostotais, esp.encontrospresentes from eventosessaoparticipante esp inner join participante p on p.id = esp.idparticipante inner join eventosessao s on s.id = esp.ideventosessao" + (incluirEvento ? " inner join evento ev on ev.id = s.idevento" : "") + " inner join eventolocal evl on evl.id = s.ideventolocal inner join local l on l.id = evl.idlocal inner join unidade u on u.id = l.idunidade inner join curso c on c.id = s.idcurso where " + where, params));
	}

	public static async listarInscritosPresencasEACOM(id: number): Promise<any[]> {
		let lista: any[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await Evento.listarInscritosPresencasEACOMInterno(false, sql, "esp.idevento = " + id);
		});

		return (lista || []);
	}

	public static async listarInscritosPresencasEACOMFiltro(idusuario: number, data_minima: string, data_maxima: string, nome: string, nome_curto: string, apenas_acom: number, apenas_nao_verificados: number): Promise<any[]> {
		if (data_minima)
			data_minima = DataUtil.converterDataISO(data_minima);
		if (data_maxima)
			data_maxima = DataUtil.converterDataISO(data_maxima);
		if (nome)
			nome = nome.normalize().trim().toUpperCase();
		if (nome_curto)
			nome_curto = nome_curto.normalize().trim().toUpperCase();

		if ((!data_minima || !data_maxima) &&
			(!nome || nome.length < 3) &&
			(!nome_curto || nome_curto.length < 3))
			return [];

		let lista: any[] = null;

		await Sql.conectar(async (sql: Sql) => {
			let where = "";
			let params: any[] = [];

			// Quando idusuario for diferente de 0, não é admin e precisará descobrir os eventos associados
			if (idusuario) {
				let eventos: any[] = await sql.query("select idevento from eventousuario where idusuario = ?", [idusuario]);

				if (!eventos || !eventos.length)
					return;

				if (eventos.length === 1) {
					where = "s.idevento = " + eventos[0].idevento;
				} else {
					where = "s.idevento in (";
					where += eventos[0].idevento;
					for (let i = 1; i < eventos.length; i++)
						where += "," + eventos[i].idevento;
					where += ")";
				}
			}

			if (data_minima && data_maxima) {
				if (where)
					where += " and ";
				where += "(s.data between ? and ?)";
				params.push(data_minima, data_maxima);
			}

			if (nome && nome.length >= 3) {
				if (where)
					where += " and ";
				where += "s.nome like ?";
				params.push("%" + nome + "%");
			}

			if (nome_curto && nome_curto.length >= 3) {
				if (where)
					where += " and ";
				where += "s.nome_curto like ?";
				params.push("%" + nome_curto + "%");
			}

			if (apenas_acom) {
				if (where)
					where += " and ";
				where += "esp.creditaracom = 1";
			}

			if (apenas_nao_verificados) {
				if (where)
					where += " and ";
				where += "esp.verificado is null";
			}

			lista = await Evento.listarInscritosPresencasEACOMInterno(true, sql, where, params);
		});

		return (lista || []);
	}

	public static async salvarVerificacaoInscritos(presencas: any[]): Promise<string> {
		if (!presencas || !presencas.length)
			return "Dados inválidos";

		for (let i = presencas.length - 1; i >= 0; i--) {
			const presenca = presencas[i];

			if (!(presenca.idesp = parseInt(presenca.idesp)))
				return "Id inválido";

			if (isNaN(presenca.verificado = parseInt(presenca.verificado)))
				return "Status de verificação inválido";
		}

		await Sql.conectar(async (sql: Sql) => {
			await sql.beginTransaction();

			for (let i = presencas.length - 1; i >= 0; i--) {
				const presenca = presencas[i];

				await sql.query(presenca.verificado ?
					"update eventosessaoparticipante set verificado = now() where id = ? and verificado is null and creditaracom = 1" :
					"update eventosessaoparticipante set verificado = null where id = ?", [presenca.idesp]);
			}

			await sql.commit();
		});

		return null;
	}

	public static async listarPalestrantesGeral(id: number): Promise<any[]> {
		let lista: any[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select s.nome nome_sessao, l.nome nome_local, date_format(s.data, '%d/%m/%Y') data, c.nome nome_curso, s.inicio, s.termino, p.nome, p.email, p.oculto, p.confirmado, esp.mediador from eventosessaopalestrante esp inner join eventopalestrante p on p.id = esp.ideventopalestrante inner join eventosessao s on s.id = esp.ideventosessao inner join eventolocal evl on evl.id = s.ideventolocal inner join local l on l.id = evl.idlocal inner join curso c on c.id = s.idcurso where esp.idevento = " + id);
		});

		return (lista || []);
	}

	public static async enviarEmail(id: number, emails: string[], assunto: string, texto: string, html?: string): Promise<void> {
		let emailpadrao = await Evento.obterEmailPadrao(id);

		let transporter = nodemailer.createTransport(appsettings.mailConfig);

		for (let i = 0; i < emails.length; i++) {
			const e = {
				from: emailpadrao.toLowerCase(),
				to: emails[i].toLowerCase(),
				subject: assunto,
				text: texto
			};

			if (html)
				e["html"] = html;

			await transporter.sendMail(e);
		}
	}

	public static gerarPNGVazio(): Uint8Array {
		return new Uint8Array([
			0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
			0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
			0x89, 0x00, 0x00, 0x00, 0x0B, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0x60, 0x00, 0x02, 0x00,
			0x00, 0x05, 0x00, 0x01, 0xE2, 0x26, 0x05, 0x9B, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
			0xAE, 0x42, 0x60, 0x82
		]);
	}
}
