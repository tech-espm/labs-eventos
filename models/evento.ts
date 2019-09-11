import Arquivo = require("../infra/arquivo");
import FS = require("../infra/fs");
import Sql = require("../infra/sql");
import Usuario = require("./usuario");

export = class Evento {
	public static readonly nomesReservados: string[] = [];
	public static idsPorUrl = {};

	public id: number;
	public nome: string;
	public url: string;
	public descricao: string;
	public habilitado: number;
	public aspectratioempresa: string;
	public aspectratiopalestrante: string;
	public permitealuno: number;
	public permitefuncionario: number;
	public permiteexterno: number;

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
		return null;
	}

	public static async atualizarIdsPorUrl(): Promise<void> {
		await Sql.conectar(async (sql: Sql) => {
			Evento.atualizarIdsPorUrlInterno(sql);
		});
	}

	private static async atualizarIdsPorUrlInterno(sql: Sql): Promise<void> {
		let idsPorUrl = {};
		let lista = await sql.query("select id, url, habilitado from evento") as Evento[];
		if (lista && lista.length) {
			for (let i = lista.length - 1; i >= 0; i--) {
				let e = lista[i];
				idsPorUrl["/" + e.url] = { id: e.id, habilitado: e.habilitado };
			}
		}
		Evento.idsPorUrl = idsPorUrl;
	}

	public static async listar(): Promise<Evento[]> {
		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select id, nome, url, descricao, habilitado, aspectratioempresa, aspectratiopalestrante, permitealuno, permitefuncionario, permiteexterno from evento order by nome asc") as Evento[];
		});

		return (lista || []);
	}

	public static async listarDeUsuario(idusuario: number): Promise<Evento[]> {
		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select ev.id, ev.nome, ev.url, ev.descricao, ev.habilitado, ev.aspectratioempresa, ev.aspectratiopalestrante, ev.permitealuno, ev.permitefuncionario, ev.permiteexterno from eventousuario evu inner join evento ev on ev.id = evu.idevento where evu.idusuario = " + idusuario + " order by ev.nome asc") as Evento[];
		});

		return (lista || []);
	}

	public static async listarDeUsuarioPorTipo(idusuario: number, admin: boolean): Promise<Evento[]> {
		return (admin ? Evento.listar() : Evento.listarDeUsuario(idusuario));
	}

	public static async obter(id: number, idusuario: number = 0, apenasDoUsuario: boolean = false): Promise<Evento> {
		let lista: Evento[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query(
				"select id, nome, url, descricao, habilitado, aspectratioempresa, aspectratiopalestrante, permitealuno, permitefuncionario, permiteexterno from evento where id = " + id +
				(apenasDoUsuario ? (" and exists (select 1 from eventousuario where idevento = " + id + " and idusuario = " + idusuario + ")") : "")
			) as Evento[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(ev: Evento): Promise<string> {
		let res: string;
		if ((res = Evento.validar(ev)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			ev.id = 0;

			await sql.beginTransaction();

			try {
				await sql.query("insert into evento (nome, url, descricao, habilitado, aspectratioempresa, aspectratiopalestrante, permitealuno, permitefuncionario, permiteexterno) values (?, ?, ?, ?, ?, ?, ?, ?, ?)", [ev.nome, ev.url, ev.descricao, ev.habilitado, ev.aspectratioempresa, ev.aspectratiopalestrante, ev.permitealuno, ev.permitefuncionario, ev.permiteexterno]);
				ev.id = await sql.scalar("select last_insert_id()") as number;
				let diretorio = Evento.caminhoRelativo(ev.id);
				await FS.criarDiretorio(diretorio);
				await FS.criarDiretorio(diretorio + "/empresas");
				await FS.criarDiretorio(diretorio + "/palestrantes");
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
				await sql.query("update evento set nome = ?, url = ?, descricao = ?, habilitado = ?, aspectratioempresa = ?, aspectratiopalestrante = ?, permitealuno = ?, permitefuncionario = ?, permiteexterno = ? where id = " + ev.id, [ev.nome, ev.url, ev.descricao, ev.habilitado, ev.aspectratioempresa, ev.aspectratiopalestrante, ev.permitealuno, ev.permitefuncionario, ev.permiteexterno]);
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
}
