import Arquivo = require("../infra/arquivo");
import FS = require("../infra/fs");
import Sql = require("../infra/sql");
import Upload = require("../infra/upload");
import emailValido = require("../utils/emailValido");
import Empresa = require("./empresa");
import Participante = require("./participante");
import Usuario = require("./usuario");

export = class Evento {
	public static readonly nomesReservados: string[] = [];
	public static idsPorUrl = {};
	public static eventosPorId = {};

	public id: number;
	public nome: string;
	public url: string;
	public descricao: string;
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
	public termoaceite: string;

	private static urlRegExp = /[^a-z0-9_\-]/gi;
	private static aspectRatioRegExp = /^\d+:\d+$/;
	private static ultimaAtualizacaoCache = 0;

	public static caminhoRelativo(id: number): string {
		return "public/evt/" + id;
	}

	public static caminhoAbsolutoExterno(id: number): string {
		return "/evt/" + id;
	}

	private static validar(ev: Evento): string {
		ev.nome = (ev.nome || "").normalize().trim().toUpperCase();
		if (ev.nome.length < 3 || ev.nome.length > 100)
			return "Nome inválido";
		ev.url = (ev.url || "").normalize().trim().toLowerCase();
		if (ev.url.length < 2 || ev.url.length > 50 || Evento.urlRegExp.test(ev.url))
			return "URL inválida";
		for (let i = Evento.nomesReservados.length - 1; i >= 0; i--) {
			if (ev.url == Evento.nomesReservados[i])
				return "A URL \"" + ev.url + "\" é reservada para o sistema";
		}
		ev.descricao = (ev.descricao || "").normalize().trim().toUpperCase();
		if (ev.descricao.length > 250)
			return "Descrição inválida";
		ev.aspectratioempresa = (ev.aspectratioempresa || "").normalize().trim().toUpperCase();
		if (ev.aspectratioempresa && (ev.aspectratioempresa.length > 11 || !Evento.aspectRatioRegExp.test(ev.aspectratioempresa)))
			return "O aspect ratio das imagens das empresas é inválido";
		ev.aspectratiopalestrante = (ev.aspectratiopalestrante || "").normalize().trim().toUpperCase();
		if (ev.aspectratiopalestrante && (ev.aspectratiopalestrante.length > 11 || !Evento.aspectRatioRegExp.test(ev.aspectratiopalestrante)))
			return "O aspect ratio das imagens dos palestrantes é inválido";
		ev.permitealuno = ((ev.permitealuno && !isNaN(ev.permitealuno)) ? 1 : 0);
		ev.permitefuncionario = ((ev.permitefuncionario && !isNaN(ev.permitefuncionario)) ? 1 : 0);
		ev.permiteexterno = ((ev.permiteexterno && !isNaN(ev.permiteexterno)) ? 1 : 0);
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
		ev.termoaceite = (ev.termoaceite || "").normalize().trim();
		if (ev.termoaceite.length > 4000)
			return "Termo de aceite de uso de imagem muito longo";
		return null;
	}

	public static async atualizarIdsPorUrlSeNecessario(): Promise<boolean> {
		let agora = Date.now();
		if ((agora - Evento.ultimaAtualizacaoCache) < 60000)
			return false;
		Evento.ultimaAtualizacaoCache = agora;

		await Evento.atualizarIdsPorUrl();

		return true;
	}

	public static async atualizarIdsPorUrl(): Promise<void> {
		await Sql.conectar(async (sql: Sql) => {
			Evento.atualizarIdsPorUrlInterno(sql);
		});
	}

	private static async atualizarIdsPorUrlInterno(sql: Sql): Promise<void> {
		let idsPorUrl = {};
		let eventosPorId = {};
		let lista = await sql.query("select id, url, idempresapadrao, habilitado, permiteinscricao from evento") as Evento[];
		if (lista && lista.length) {
			for (let i = lista.length - 1; i >= 0; i--) {
				let e = lista[i];
				let evt = { id: e.id, url: "/" + e.url, idempresapadrao: e.idempresapadrao, habilitado: e.habilitado, permiteinscricao: e.permiteinscricao };
				idsPorUrl[evt.url] = evt;
				eventosPorId[e.id] = evt;
			}
		}
		Evento.idsPorUrl = idsPorUrl;
		Evento.eventosPorId = eventosPorId;
	}

	public static async listar(): Promise<Evento[]> {
		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, url, descricao, habilitado, certificadoliberado, permiteinscricao, aspectratioempresa, aspectratiopalestrante, permitealuno, permitefuncionario, permiteexterno, idempresapadrao, emailpadrao from evento order by nome asc") as Evento[];
		});

		return (lista || []);
	}

	public static async listarDeUsuario(idusuario: number): Promise<Evento[]> {
		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select ev.id, ev.nome, ev.url, ev.descricao, ev.habilitado, ev.certificadoliberado, ev.permiteinscricao, ev.aspectratioempresa, ev.aspectratiopalestrante, ev.permitealuno, ev.permitefuncionario, ev.permiteexterno, ev.idempresapadrao, ev.emailpadrao from eventousuario evu inner join evento ev on ev.id = evu.idevento where evu.idusuario = " + idusuario + " order by ev.nome asc") as Evento[];
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
				"select id, nome, url, descricao, habilitado, certificadoliberado, permiteinscricao, aspectratioempresa, aspectratiopalestrante, permitealuno, permitefuncionario, permiteexterno, idempresapadrao, emailpadrao, termoaceite from evento where id = " + id +
				(apenasDoUsuario ? (" and exists (select 1 from eventousuario where idevento = " + id + " and idusuario = " + idusuario + ")") : "")
			) as Evento[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async obterDadosDeEdicao(ev: Evento): Promise<void> {
		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select senharecepcao, senhacheckin from evento where id = " + ev.id) as Evento[];
		});

		if (lista && lista[0]) {
			ev.senharecepcao = lista[0].senharecepcao;
			ev.senhacheckin = lista[0].senhacheckin;
		}
	}

	public static async criar(ev: Evento): Promise<string> {
		let res: string;
		if ((res = Evento.validar(ev)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			ev.id = 0;

			await sql.beginTransaction();

			try {
				await sql.query("insert into evento (nome, url, descricao, habilitado, certificadoliberado, permiteinscricao, aspectratioempresa, aspectratiopalestrante, permitealuno, permitefuncionario, permiteexterno, idempresapadrao, emailpadrao, senharecepcao, senhacheckin, termoaceite) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)", [ev.nome, ev.url, ev.descricao, ev.habilitado, ev.certificadoliberado, ev.permiteinscricao, ev.aspectratioempresa, ev.aspectratiopalestrante, ev.permitealuno, ev.permitefuncionario, ev.permiteexterno, ev.emailpadrao, ev.senharecepcao, ev.senhacheckin, ev.termoaceite]);
				ev.id = await sql.scalar("select last_insert_id()") as number;
				await sql.query("insert into eventoempresa (idevento, idtipo, nome, nome_curto, url_site, versao) values (?, (select id from tipoempresa limit 1), 'A DEFINIR', 'A DEFINIR', '', 0)", [ev.id]);
				ev.idempresapadrao = await sql.scalar("select last_insert_id()") as number;
				await sql.query("update evento set idempresapadrao = ? where id = " + ev.id, [ev.idempresapadrao]);
				let diretorio = Evento.caminhoRelativo(ev.id);
				await FS.criarDiretorio(diretorio);
				await FS.criarDiretorio(diretorio + "/empresas");
				await FS.criarDiretorio(diretorio + "/palestrantes");
				await Upload.criarArquivo(Empresa.caminhoRelativoPasta(ev.id), ev.idempresapadrao + "." + Empresa.extensaoImagem, Evento.gerarPNGVazio());
				await sql.commit();
				await Evento.atualizarIdsPorUrlInterno(sql);
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "O evento \"" + ev.nome + "\" ou a URL \"" + ev.url + "\" já existem";
				else
					throw e;
			}
		});

		return res;
	}

	public static async alterar(ev: Evento): Promise<string> {
		let res: string;
		if ((res = Evento.validar(ev)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.query("update evento set nome = ?, url = ?, descricao = ?, habilitado = ?, certificadoliberado = ?, permiteinscricao = ?, aspectratioempresa = ?, aspectratiopalestrante = ?, permitealuno = ?, permitefuncionario = ?, permiteexterno = ?, emailpadrao = ?, senharecepcao = ?, senhacheckin = ?, termoaceite = ? where id = " + ev.id, [ev.nome, ev.url, ev.descricao, ev.habilitado, ev.certificadoliberado, ev.permiteinscricao, ev.aspectratioempresa, ev.aspectratiopalestrante, ev.permitealuno, ev.permitefuncionario, ev.permiteexterno, ev.emailpadrao, ev.senharecepcao, ev.senhacheckin, ev.termoaceite]);
				res = sql.linhasAfetadas.toString();
				if (sql.linhasAfetadas)
					Usuario.alterarNomeDoEventoEmCache(ev.id, ev.nome);
				await Evento.atualizarIdsPorUrlInterno(sql);
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

	public static caminhoAnexo(id: number, tipoAnexo: string, idanexo: number, extensao: string): string {
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
