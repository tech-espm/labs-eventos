import appsettings = require("../../appsettings");
import formatarHorario = require("../../utils/formatarHorario");
import JSONRequest = require("../../infra/jsonRequest");
import JSONResponse = require("../../infra/jsonResponse");
import Token = require("./token");

export = class IntegracaoAgendamento {
	private static readonly token: Token = new Token(appsettings.integracaoAgendamentoPathGerarToken, appsettings.integracaoAgendamentoTokenCredentialsJson);

	private static throwErro(message: string) {
		const err = new Error(message || "Erro");
		err["agendamento"] = err.message;
		throw err;
	}

	public static async localHorarioLivre(data: string, inicio: number, termino: number, id_integra_local: string, id_integra_sessao: number): Promise<boolean> {
		const tokenHeader = await IntegracaoAgendamento.token.obterHeader();
		if (!tokenHeader)
			IntegracaoAgendamento.throwErro("Erro na geração do token de acesso à integração");

		const r = await JSONRequest.get(appsettings.integracaoAgendamentoPathLocalHorarioLivre + "/" + data + "," + encodeURIComponent(formatarHorario(inicio)) + "," + encodeURIComponent(formatarHorario(termino)) + "," + id_integra_local + "," + id_integra_sessao, { "Authorization": tokenHeader });

		if (!r.sucesso)
			IntegracaoAgendamento.throwErro(r.erro || r.resultado);

		return !(r.resultado as boolean);
	}

	public static async verificarStatusAprovacao(id_integra_sessao: number): Promise<number> {
		const tokenHeader = await IntegracaoAgendamento.token.obterHeader();
		if (!tokenHeader)
			IntegracaoAgendamento.throwErro("Erro na geração do token de acesso à integração");

		const r = await JSONRequest.get(appsettings.integracaoAgendamentoPathVerificarStatusAprovacao + "/" + id_integra_sessao, { "Authorization": tokenHeader });

		if (!r.sucesso)
			IntegracaoAgendamento.throwErro(r.erro || r.resultado);

		if (!r.resultado || !("aprovado" in r.resultado))
			IntegracaoAgendamento.throwErro("Status da aprovação do agendamento desconhecido");

		return r.resultado.aprovado as number;
	}

	public static async criarAgendamento(login: string, data: string, inicio: number, termino: number, id_integra_local: string, nome_curto: string): Promise<number> {
		const tokenHeader = await IntegracaoAgendamento.token.obterHeader();
		if (!tokenHeader)
			IntegracaoAgendamento.throwErro("Erro na geração do token de acesso à integração");

		const r = await JSONRequest.post(appsettings.integracaoAgendamentoPathCriarAgendamento, JSON.stringify({
			DataInicial: data,
			DataFinal: data,
			HI: formatarHorario(inicio),
			HF: formatarHorario(termino),
			SalaId: id_integra_local,
			Reservado_por: login,
			Obs: nome_curto,
			PermitirPostosEstudo: false  
		}), { "Authorization": tokenHeader });

		if (!r.sucesso)
			IntegracaoAgendamento.throwErro(r.erro || r.resultado);

		const o = r.resultado;

		let reason = (o ? o.reasonPhrase : null);

		if (!o || o.statusCode !== 200) {
			IntegracaoAgendamento.throwErro(reason);
		} else {
			const i = parseInt(reason);
			if (isNaN(i))
				IntegracaoAgendamento.throwErro(reason);
			else
				return i;
		}
	}

	public static async alterarAgendamento(login: string, data: string, inicio: number, termino: number, nome_curto: string, id_integra_local: string, id_integra_sessao: number): Promise<number> {
		const tokenHeader = await IntegracaoAgendamento.token.obterHeader();
		if (!tokenHeader)
			IntegracaoAgendamento.throwErro("Erro na geração do token de acesso à integração");

		const r = await JSONRequest.put(appsettings.integracaoAgendamentoPathAlterarAgendamento + "/" + id_integra_sessao, JSON.stringify({
			Id: id_integra_sessao,
			DataInicial: data,
			DataFinal: data,
			HI: formatarHorario(inicio),
			HF: formatarHorario(termino),
			SalaId: id_integra_local,
			Reservado_por: login,
			Obs: nome_curto,
			PermitirPostosEstudo: false  
		}), { "Authorization": tokenHeader });

		if (!r.sucesso)
			IntegracaoAgendamento.throwErro(r.erro || r.resultado);

		return IntegracaoAgendamento.verificarStatusAprovacao(id_integra_sessao);
	}

	public static async excluirAgendamento(id_integra_sessao: number): Promise<void> {
		const tokenHeader = await IntegracaoAgendamento.token.obterHeader();
		if (!tokenHeader)
			IntegracaoAgendamento.throwErro("Erro na geração do token de acesso à integração");

		const r = await JSONRequest.delete(appsettings.integracaoAgendamentoPathExcluirAgendamento + "/" + id_integra_sessao, { "Authorization": tokenHeader });

		if (!r.sucesso)
			IntegracaoAgendamento.throwErro(r.erro || r.resultado);
	}
}
