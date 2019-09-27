import Sql = require("../infra/sql");
import FS = require("../infra/fs");
import Upload = require("../infra/upload");

export = class Empresa {
	public static readonly tamanhoMaximoImagemEmKiB = 512;
	public static readonly tamanhoMaximoImagemEmBytes = Empresa.tamanhoMaximoImagemEmKiB << 10;
	public static readonly extensaoImagem = "png";

	public id: number;
	public idevento: number;
	public idtipo: number;
	public nome: string;
	public nome_curto: string;
	public versao: number;

	public static caminhoRelativoPasta(idevento: number): string {
		return `public/evt/${idevento}/empresas`;
	}

	public static caminhoAbsolutoPastaExterno(idevento: number): string {
		return `/evt/${idevento}/empresas`;
	}

	public static caminhoRelativoArquivo(idevento: number, id: number): string {
		return `public/evt/${idevento}/empresas/${id}.${Empresa.extensaoImagem}`;
	}

	public static caminhoAbsolutoArquivoExterno(idevento: number, id: number, versao: number): string {
		return `/evt/${idevento}/empresas/${id}.${Empresa.extensaoImagem}?v=${versao}`;
	}

	private static validar(e: Empresa): string {
		if (isNaN(e.idevento) || e.idevento <= 0)
			return "Evento inválido";
		if (isNaN(e.idtipo) || e.idtipo <= 0)
			return "Tipo inválido";
		e.nome = (e.nome || "").normalize().trim().toUpperCase();
		if (e.nome.length < 3 || e.nome.length > 100)
			return "Nome inválido";
		e.nome_curto = (e.nome_curto || "").normalize().trim().toUpperCase();
		if (e.nome_curto.length < 1 || e.nome_curto.length > 45)
			return "Nome curto inválido";
		if (isNaN(e.versao) || e.versao < 0)
			return "Versão inválida";
		return null;
	}

	public static async listar(idevento: number): Promise<Empresa[]> {
		let lista: Empresa[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select e.id, e.idevento, e.idtipo, e.nome, e.nome_curto, e.versao, t.nome nome_tipo from eventoempresa e inner join tipoempresa t on t.id = e.idtipo where e.idevento = ? order by e.nome asc", [idevento]) as Empresa[];
		});

		return (lista || []);
	}

	public static async obter(id: number, idevento: number): Promise<Empresa> {
		let lista: Empresa[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select e.id, e.idevento, e.idtipo, e.nome, e.nome_curto, e.versao, t.nome nome_tipo from eventoempresa e inner join tipoempresa t on t.id = e.idtipo where e.id = ? and e.idevento = ?", [id, idevento]) as Empresa[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(e: Empresa, arquivo: any): Promise<string> {
		let res: string;
		if ((res = Empresa.validar(e)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("insert into eventoempresa (idevento, idtipo, nome, nome_curto, versao) values (?, ?, ?, ?, ?)", [e.idevento, e.idtipo, e.nome, e.nome_curto, e.versao]);
				e.id = await sql.scalar("select last_insert_id()") as number;

				// Chegando aqui, significa que a inclusão foi bem sucedida.
				// Logo, podemos tentar criar o arquivo físico. Se a criação do
				// arquivo não funcionar, uma exceção ocorrerá, e a transação será
				// desfeita, já que o método commit() não executará, e nossa classe
				// Sql já executa um rollback() por nós nesses casos.
				await Upload.gravarArquivo(arquivo, Empresa.caminhoRelativoPasta(e.idevento), e.id + "." + Empresa.extensaoImagem);

				res = e.id.toString();

				await sql.commit();
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							res = "A empresa já existe no evento";
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

	public static async alterar(e: Empresa, arquivo: any): Promise<string> {
		let res: string;
		if ((res = Empresa.validar(e)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("update eventoempresa set idtipo = ?, nome = ?, nome_curto = ?, versao = ? where id = ? and idevento = ?", [e.idtipo, e.nome, e.nome_curto, e.versao, e.id, e.idevento]);

				if (sql.linhasAfetadas && arquivo && arquivo.buffer && arquivo.size) {
					// Chegando aqui, significa que a inclusão foi bem sucedida.
					// Logo, podemos tentar criar o arquivo físico. Se a criação do
					// arquivo não funcionar, uma exceção ocorrerá, e a transação será
					// desfeita, já que o método commit() não executará, e nossa classe
					// Sql já executa um rollback() por nós nesses casos.
					await Upload.gravarArquivo(arquivo, Empresa.caminhoRelativoPasta(e.idevento), e.id + "." + Empresa.extensaoImagem);
				}

				res = sql.linhasAfetadas.toString();

				await sql.commit();
			} catch (e) {
				if (e.code && e.code === "ER_DUP_ENTRY")
					res = "A empresa já existe no evento";
				else
					throw e;
			}
		});

		return res;
	}

	public static async excluir(id: number, idevento: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			let idempresapadrao = await sql.scalar("select idempresapadrao from evento where id = " + idevento) as number;

			if (idempresapadrao === id) {
				res = "A empresa não pode ser excluída";
				return;
			}

			try {
				await sql.beginTransaction();

				await sql.query("delete from eventoempresa where id = ? and idevento = ?", [id, idevento]);

				if (sql.linhasAfetadas) {
					// Chegando aqui, significa que a exclusão foi bem sucedida.
					// Logo, podemos tentar excluir o arquivo físico. Se a exclusão do
					// arquivo não funcionar, uma exceção ocorrerá, e a transação será
					// desfeita, já que o método commit() não executará, e nossa classe
					// Sql já executa um rollback() por nós nesses casos.
					let caminho = Empresa.caminhoRelativoArquivo(idevento, id);
					if (await FS.existeArquivo(caminho))
						await FS.excluirArquivo(caminho);
				}

				res = sql.linhasAfetadas.toString();

				await sql.commit();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "A empresa é referenciada por um ou mais palestrantes";
				else
					throw e;
			}
		});

		return res;
	}
}
