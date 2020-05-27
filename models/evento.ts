import fs = require("fs");
import nodemailer = require("nodemailer");
import unzipper = require("unzipper");
import Arquivo = require("../infra/arquivo");
import ClusterEventos = require("../infra/clusterEventos");
import FS = require("../infra/fs");
import Sql = require("../infra/sql");
import Upload = require("../infra/upload");
import emailValido = require("../utils/emailValido");
import appsettings = require("../appsettings");
import Empresa = require("./empresa");
import Participante = require("./participante");
import Usuario = require("./usuario");
import TipoEmpresa = require("./tipoEmpresa");

export = class Evento {
	public static readonly tamanhoMaximoFundoCertificadoEmKiB = 2048;
	public static readonly tamanhoMaximoFundoCertificadoEmBytes = Evento.tamanhoMaximoFundoCertificadoEmKiB << 10;

	public static readonly nomesReservados: string[] = [];
	public static idsPorUrl = {};
	public static eventosPorId = {};

	public id: number;
	public nome: string;
	public url: string;
	public titulo: string;
	public descricao: string;
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
	public idempresapadrao: number;
	public emailpadrao: string;
	public senharecepcao: string;
	public senhacheckin: string;
	public senhasugestao: string;
	public termoaceite: string;

	private static urlRegExp = /[^a-z0-9_\-]/gi;
	private static aspectRatioRegExp = /^\d+:\d+$/;

	public static caminhoRelativo(id: number): string {
		return "public/evt/" + id;
	}

	public static caminhoAbsolutoExterno(id: number): string {
		return "/evt/" + id;
	}

	private static validar(ev: Evento): string {
		ev.nome = (ev.nome || "").normalize().trim();
		if (ev.nome.length < 3 || ev.nome.length > 100)
			return "Nome inválido";
		ev.url = (ev.url || "").normalize().trim().toLowerCase();
		if (ev.url.length < 2 || ev.url.length > 50 || Evento.urlRegExp.test(ev.url))
			return "URL inválida";
		for (let i = Evento.nomesReservados.length - 1; i >= 0; i--) {
			if (ev.url == Evento.nomesReservados[i])
				return "A URL \"" + ev.url + "\" é reservada para o sistema";
		}
		ev.titulo = (ev.titulo || "").normalize().trim();
		if (!ev.titulo || ev.titulo.length > 250)
			return "Título inválido";
		ev.descricao = (ev.descricao || "").normalize().trim();
		if (ev.descricao.length > 250)
			return "Descrição inválida";
		ev.aspectratioempresa = (ev.aspectratioempresa || "").normalize().trim().toUpperCase();
		if (ev.aspectratioempresa && (ev.aspectratioempresa.length > 11 || !Evento.aspectRatioRegExp.test(ev.aspectratioempresa)))
			return "O aspect ratio das imagens das empresas é inválido";
		ev.aspectratiopalestrante = (ev.aspectratiopalestrante || "").normalize().trim().toUpperCase();
		if (ev.aspectratiopalestrante && (ev.aspectratiopalestrante.length > 11 || !Evento.aspectRatioRegExp.test(ev.aspectratiopalestrante)))
			return "O aspect ratio das imagens dos palestrantes é inválido";
		if (!ev.permitealuno && !ev.permitefuncionario && !ev.permiteexterno)
			return "Nenhuma permissão especificada";
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
		return null;
	}

	public static async atualizarIdsPorUrlSemPropagacao(): Promise<void> {
		await Sql.conectar(async (sql: Sql) => {
			Evento.atualizarIdsPorUrl(sql, false);
		});
	}

	private static async atualizarIdsPorUrl(sql: Sql, propagarParaCluster: boolean): Promise<void> {
		let idsPorUrl = {};
		let eventosPorId = {};
		let lista = await sql.query("select id, nome, titulo, descricao, versaobanner, versaologo, url, idempresapadrao, emailpadrao, habilitado, permiteinscricao, senhasugestao from evento") as Evento[];
		if (lista && lista.length) {
			for (let i = lista.length - 1; i >= 0; i--) {
				let e = lista[i];
				let evt = { id: e.id, nome: e.nome, titulo: e.titulo, descricao: e.descricao, versaobanner: e.versaobanner, versaologo: e.versaologo, url: "/" + e.url, idempresapadrao: e.idempresapadrao, emailpadrao: e.emailpadrao.toLowerCase(), habilitado: e.habilitado, permiteinscricao: e.permiteinscricao, senhasugestao: e.senhasugestao };
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
			lista = await sql.query("select id, nome, url, titulo, descricao, versao, habilitado, certificadoliberado, permiteinscricao, aspectratioempresa, aspectratiopalestrante, permitealuno, permitefuncionario, permiteexterno, idempresapadrao, emailpadrao from evento order by nome asc") as Evento[];
		});

		return (lista || []);
	}

	public static async listarDeUsuario(idusuario: number): Promise<Evento[]> {
		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select ev.id, ev.nome, ev.url, ev.titulo, ev.descricao, ev.versao, ev.habilitado, ev.certificadoliberado, ev.permiteinscricao, ev.aspectratioempresa, ev.aspectratiopalestrante, ev.permitealuno, ev.permitefuncionario, ev.permiteexterno, ev.idempresapadrao, ev.emailpadrao from eventousuario evu inner join evento ev on ev.id = evu.idevento where evu.idusuario = " + idusuario + " order by ev.nome asc") as Evento[];
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

	public static async obter(id: number, idusuario: number = 0, apenasDoUsuario: boolean = false): Promise<Evento> {
		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query(
				"select id, nome, url, titulo, descricao, versao, habilitado, certificadoliberado, permiteinscricao, aspectratioempresa, aspectratiopalestrante, permitealuno, permitefuncionario, permiteexterno, idempresapadrao, emailpadrao, termoaceite from evento where id = " + id +
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
				await sql.query("insert into evento (nome, url, titulo, descricao, versao, versaobanner, versaologo, habilitado, certificadoliberado, permiteinscricao, aspectratioempresa, aspectratiopalestrante, permitealuno, permitefuncionario, permiteexterno, idempresapadrao, emailpadrao, senharecepcao, senhacheckin, senhasugestao, termoaceite) values (?, ?, ?, ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)", [ev.nome, ev.url, ev.titulo, ev.descricao, ev.habilitado, ev.certificadoliberado, ev.permiteinscricao, ev.aspectratioempresa, ev.aspectratiopalestrante, ev.permitealuno, ev.permitefuncionario, ev.permiteexterno, ev.emailpadrao, ev.senharecepcao, ev.senhacheckin, ev.senhasugestao, ev.termoaceite]);
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
				await sql.query("update evento set nome = ?, url = ?, titulo = ?, descricao = ?, versao = versao + 1, habilitado = ?, certificadoliberado = ?, permiteinscricao = ?, aspectratioempresa = ?, aspectratiopalestrante = ?, permitealuno = ?, permitefuncionario = ?, permiteexterno = ?, emailpadrao = ?, senharecepcao = ?, senhacheckin = ?, senhasugestao = ?, termoaceite = ? where id = " + ev.id, [ev.nome, ev.url, ev.titulo, ev.descricao, ev.habilitado, ev.certificadoliberado, ev.permiteinscricao, ev.aspectratioempresa, ev.aspectratiopalestrante, ev.permitealuno, ev.permitefuncionario, ev.permiteexterno, ev.emailpadrao, ev.senharecepcao, ev.senhacheckin, ev.senhasugestao, ev.termoaceite]);
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

	public static async listarInscricoes(id: number): Promise<any[]> {
		let lista: any[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select ideventosessao, count(*) inscritos from eventosessaoparticipante where idevento = " + id + " group by ideventosessao");
		});

		return (lista || []);
	}

	public static async listarInscricoesEPresencas(id: number): Promise<any> {
		let res = null;

		await Sql.conectar(async (sql: Sql) => {
			let presencas = await sql.query("select ideventosessao, count(*) inscritos, sum(presente) presentes from eventosessaoparticipante where idevento = " + id + " group by ideventosessao");

			let tipos = await sql.query("select count(*) inscritos, p.tipo from (select distinct esp.idparticipante from eventosessaoparticipante esp where esp.idevento = " + id + ") tmp inner join participante p on p.id = tmp.idparticipante group by p.tipo");

			res = {
				presencas: presencas,
				tipos: tipos
			};
		});

		return res;
	}

	public static async listarAvaliacoesEMedias(id: number): Promise<any[]> {
		let res: any[] = null;

		await Sql.conectar(async (sql: Sql) => {
			res = await sql.query("select esp.ideventosessao, esa.avaliacao, esa.comentario, date_format(esa.data_avaliacao, '%d/%m/%Y') data_avaliacao from eventosessaoparticipante esp inner join eventosessaoavaliacao esa on esa.ideventosessaoparticipante = esp.id where esp.idevento = " + id);
		});

		return res;
	}

	public static async listarInscritos(id: number, senha: string, tipo: number, ideventosessao: number = 0): Promise<Participante[]> {
		let lista: Participante[] = null;

		if (isNaN(id) || !senha || isNaN(tipo) || (tipo !== 1 && tipo !== 2) || isNaN(ideventosessao))
			return [];

		senha = senha.normalize();

		await Sql.conectar(async (sql: Sql) => {
			let senhaDb = await sql.scalar("select " + (tipo === 1 ? "senharecepcao" : "senhacheckin") + " from evento where id = " + id);

			if (!senhaDb || senhaDb !== senha)
				return;

			lista = await sql.query(ideventosessao > 0 ?
				("select p.id, p.nome, p.login, p.rg, p.email, p.tipo from eventosessaoparticipante esp inner join participante p on p.id = esp.idparticipante where esp.idevento = " + id + " and esp.ideventosessao = " + ideventosessao) :
				("select p.id, p.nome, p.login, p.rg, p.email, p.tipo from (select distinct esp.idparticipante from eventosessaoparticipante esp where esp.idevento = " + id + ") tmp inner join participante p on p.id = tmp.idparticipante")) as Participante[];
		});

		return (lista || []);
	}

	public static async listarInscritosGeral(id: number): Promise<any[]> {
		let lista: any[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select s.nome nome_sessao, u.sigla sigla_unidade, l.nome nome_local, concat(lpad(d.dia, 2, 0), '/', lpad(d.mes, 2, 0), '/', d.ano) data, c.nome nome_curso, h.inicio, h.termino, p.id, p.nome, p.login, p.rg, p.email, p.tipo, esp.presente, s.permiteacom from eventosessaoparticipante esp inner join participante p on p.id = esp.idparticipante inner join eventosessao s on s.id = esp.ideventosessao inner join eventodata d on d.id = s.ideventodata inner join eventohorario h on h.id = s.ideventohorario inner join eventolocal evl on evl.id = s.ideventolocal inner join local l on l.id = evl.idlocal inner join unidade u on u.id = l.idunidade inner join curso c on c.id = s.idcurso where esp.idevento = " + id);
		});

		return (lista || []);
	}

	public static async listarPalestrantesGeral(id: number): Promise<any[]> {
		let lista: any[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select s.nome nome_sessao, l.nome nome_local, concat(lpad(d.dia, 2, 0), '/', lpad(d.mes, 2, 0), '/', d.ano) data, c.nome nome_curso, h.inicio, h.termino, p.nome, p.email, p.oculto, p.confirmado from eventosessaopalestrante esp inner join eventopalestrante p on p.id = esp.ideventopalestrante inner join eventosessao s on s.id = esp.ideventosessao inner join eventodata d on d.id = s.ideventodata inner join eventohorario h on h.id = s.ideventohorario inner join eventolocal evl on evl.id = s.ideventolocal inner join local l on l.id = evl.idlocal inner join curso c on c.id = s.idcurso where esp.idevento = " + id);
		});

		return (lista || []);
	}

	public static async enviarEmail(id: number, emails: string[], assunto: string, texto: string): Promise<void> {
		let emailpadrao = await Evento.obterEmailPadrao(id);

		let transporter = nodemailer.createTransport(appsettings.mailConfig);

		for (let i = 0; i < emails.length; i++) {
			await transporter.sendMail({
				from: emailpadrao.toLowerCase(),
				to: emails[i].toLowerCase(),
				subject: assunto,
				text: texto
			});
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
