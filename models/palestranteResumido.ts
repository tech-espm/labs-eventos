import Sql = require("../infra/sql");
import Empresa = require("./empresa");
import Evento = require("./evento");
import Palestrante = require("./palestrante");
import TipoEmpresa = require("./tipoEmpresa");
import emailValido = require("../utils/emailValido");

export = class PalestranteResumido {
	public id: number;
	public nome: string;
	public email: string;
	public empresa: string;

	private static validar(p: PalestranteResumido): string {
		p.nome = (p.nome || "").normalize().trim();
		if (p.nome.length > 100)
			return "Nome inválido";
		p.email = (p.email || "").normalize().trim().toUpperCase();
		if (p.email.length > 100 || (p.email && !emailValido(p.email)))
			return "E-mail inválido";
		p.empresa = (p.empresa || "").normalize().trim();
		if (p.empresa.length > 100)
			return "Empresa inválido";
		return null;
	}

	public static async criar(idevento: number, pr: PalestranteResumido): Promise<string> {
		let res: string;
		if ((res = PalestranteResumido.validar(pr)))
			return res;

		if (!pr.nome && !pr.email && !pr.empresa)
			return null;

		if (!pr.nome || !pr.email || !pr.empresa)
			return "Dados inválidos!";

		pr.id = await Palestrante.obterIdDeEmail(idevento, pr.email);
		if (pr.id)
			return null;

		let p = new Palestrante();
		p.id = 0;
		p.idevento = idevento;
		p.idempresa = await Empresa.obterIdDeNome(idevento, pr.empresa);
		p.nome = pr.nome;
		p.nome_curto = (pr.nome.length <= 45 ? pr.nome : pr.nome.substr(0, 45)),
		p.email = pr.email;
		p.oculto = 0;
		p.prioridade = 0;
		p.versao = 0;

		if (!p.idempresa) {
			let e = new Empresa();
			e.id = 0;
			e.idevento = idevento;
			e.nome = pr.empresa;
			e.nome_curto = (pr.empresa.length <= 45 ? pr.empresa : pr.empresa.substr(0, 45));
			e.idtipo = await TipoEmpresa.obterIdPadrao();
			e.versao = 0;

			res = await Empresa.criar(e, { buffer: new Buffer(Evento.gerarPNGVazio()) });

			if (res && res !== parseInt(res).toString())
				return res;

			p.idempresa = e.id;
		}

		res = await Palestrante.criar(p, { buffer: new Buffer(Evento.gerarPNGVazio()) });

		pr.id = p.id;

		return res;
	}
}
