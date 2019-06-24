﻿import Sql = require("../infra/sql");
import FS = require("../infra/fs");
import Upload = require("../infra/upload");

export = class Palestrante {
	public static readonly tamanhoMaximoImagemEmKiB = 512;
	public static readonly tamanhoMaximoImagemEmBytes = Palestrante.tamanhoMaximoImagemEmKiB << 10;
	public static readonly extensaoImagem = "png";

	public id: number;
	public idevento: number;
	public idempresa: number;
	public nome: string;
	public nome_curto: string;
	public cargo: string;
	public bio: string;
	public bio_curta: string;
	public versao: number;

	public static caminhoRelativoPasta(idevento: number): string {
		return `public/evt/${idevento}/palestrantes`;
	}

	public static caminhoAbsolutoPastaExterno(idevento: number): string {
		return `/evt/${idevento}/palestrantes`;
	}

	public static caminhoRelativoArquivo(idevento: number, id: number): string {
		return `public/evt/${idevento}/palestrantes/${id}.${Palestrante.extensaoImagem}`;
	}

	public static caminhoAbsolutoArquivoExterno(idevento: number, id: number, versao: number): string {
		return `/evt/${idevento}/palestrantes/${id}.${Palestrante.extensaoImagem}?v=${versao}`;
	}

	private static validar(p: Palestrante): string {
		if (isNaN(p.idevento) || p.idevento <= 0)
			return "Evento inválido";
		if (isNaN(p.idempresa) || p.idempresa <= 0)
			return "Empresa inválida";
		p.nome = (p.nome || "").trim().toUpperCase();
		if (p.nome.length < 3 || p.nome.length > 100)
			return "Nome inválido";
		p.nome_curto = (p.nome_curto || "").trim().toUpperCase();
		if (p.nome_curto.length < 1 || p.nome_curto.length > 45)
			return "Nome curto inválido";
		p.cargo = (p.cargo || "").trim().toUpperCase();
		if (p.cargo.length < 1 || p.cargo.length > 45)
			return "Cargo inválido";
		p.bio = (p.bio || "").trim().toUpperCase();
		if (p.bio.length > 1000)
			return "Biografia inválido";
		p.bio_curta = (p.bio_curta || "").trim().toUpperCase();
		if (p.bio_curta.length > 200)
			return "Biografia curta inválido";
		if (isNaN(p.versao) || p.versao < 0)
			return "Versão inválida";
		return null;
	}

	public static async listar(idevento: number): Promise<Palestrante[]> {
		let lista: Palestrante[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select p.id, p.idevento, p.idempresa, e.nome nome_empresa, p.nome, p.nome_curto, p.cargo, p.bio, p.bio_curta, p.versao from eventopalestrante p inner join eventoempresa e on e.id = p.idempresa where p.idevento = ? order by p.nome asc", [idevento]) as Palestrante[];
		});

		return (lista || []);
	}

	public static async obter(id: number, idevento: number): Promise<Palestrante> {
		let lista: Palestrante[] = null;

		await Sql.conectar(async (sql: Sql) => {
			lista = await sql.query("select p.id, p.idevento, p.idempresa, e.nome nome_empresa, p.nome, p.nome_curto, p.cargo, p.bio, p.bio_curta, p.versao from eventopalestrante p inner join eventoempresa e on e.id = p.idempresa where p.id = ? and p.idevento = ?", [id, idevento]) as Palestrante[];
		});

		return ((lista && lista[0]) || null);
	}

	public static async criar(p: Palestrante, arquivo: any): Promise<string> {
		let res: string;
		if ((res = Palestrante.validar(p)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("insert into eventopalestrante (idevento, idempresa, nome, nome_curto, cargo, bio, bio_curta, versao) values (?, ?, ?, ?, ?, ?, ?, ?)", [p.idevento, p.idempresa, p.nome, p.nome_curto, p.cargo, p.bio, p.bio_curta, p.versao]);
				p.id = await sql.scalar("select last_insert_id()") as number;

				// Chegando aqui, significa que a inclusão foi bem sucedida.
				// Logo, podemos tentar criar o arquivo físico. Se a criação do
				// arquivo não funcionar, uma exceção ocorrerá, e a transação será
				// desfeita, já que o método commit() não executará, e nossa classe
				// Sql já executa um rollback() por nós nesses casos.
				await Upload.gravarArquivo(arquivo, Palestrante.caminhoRelativoPasta(p.idevento), p.id + "." + Palestrante.extensaoImagem);

				res = p.id.toString();

				await sql.commit();
			} catch (e) {
				if (e.code) {
					switch (e.code) {
						case "ER_DUP_ENTRY":
							res = "O palestrante já existe no evento";
							break;
						case "ER_NO_REFERENCED_ROW":
						case "ER_NO_REFERENCED_ROW_2":
							res = "Evento ou empresa não encontrada";
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

	public static async alterar(p: Palestrante, arquivo: any): Promise<string> {
		let res: string;
		if ((res = Palestrante.validar(p)))
			return res;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("update eventopalestrante set idempresa = ?, nome = ?, nome_curto = ?, cargo = ?, bio = ?, bio_curta = ?, versao = ? where id = ? and idevento = ?", [p.idempresa, p.nome, p.nome_curto, p.cargo, p.bio, p.bio_curta, p.versao, p.id, p.idevento]);

				if (sql.linhasAfetadas && arquivo && arquivo.buffer && arquivo.size) {
					// Chegando aqui, significa que a inclusão foi bem sucedida.
					// Logo, podemos tentar criar o arquivo físico. Se a criação do
					// arquivo não funcionar, uma exceção ocorrerá, e a transação será
					// desfeita, já que o método commit() não executará, e nossa classe
					// Sql já executa um rollback() por nós nesses casos.
					await Upload.gravarArquivo(arquivo, Palestrante.caminhoRelativoPasta(p.idevento), p.id + "." + Palestrante.extensaoImagem);
				}

				res = sql.linhasAfetadas.toString();

				await sql.commit();
			} catch (e) {
				switch (e.code) {
					case "ER_DUP_ENTRY":
						res = "O palestrante já existe no evento";
						break;
					case "ER_NO_REFERENCED_ROW":
					case "ER_NO_REFERENCED_ROW_2":
						res = "Empresa não encontrada";
						break;
					default:
						throw e;
				}
			}
		});

		return res;
	}

	public static async excluir(id: number, idevento: number): Promise<string> {
		let res: string = null;

		await Sql.conectar(async (sql: Sql) => {
			try {
				await sql.beginTransaction();

				await sql.query("delete from eventopalestrante where id = ? and idevento = ?", [id, idevento]);

				if (sql.linhasAfetadas) {
					// Chegando aqui, significa que a exclusão foi bem sucedida.
					// Logo, podemos tentar excluir o arquivo físico. Se a exclusão do
					// arquivo não funcionar, uma exceção ocorrerá, e a transação será
					// desfeita, já que o método commit() não executará, e nossa classe
					// Sql já executa um rollback() por nós nesses casos.
					let caminho = Palestrante.caminhoRelativoArquivo(idevento, id);
					if (await FS.existeArquivo(caminho))
						await FS.excluirArquivo(caminho);
				}

				res = sql.linhasAfetadas.toString();

				await sql.commit();
			} catch (e) {
				if (e.code && (e.code === "ER_ROW_IS_REFERENCED" || e.code === "ER_ROW_IS_REFERENCED_2"))
					res = "O palestrante é referenciado por uma ou mais sessões";
				else
					throw e;
			}
		});

		return res;
	}
}
