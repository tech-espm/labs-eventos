import appsettings = require("../appsettings");
import formatarHorario = require("../utils/formatarHorario");
import JSONRequest = require("../infra/jsonRequest");
import JSONResponse = require("../infra/jsonResponse");

export = class IntegracaoAgendamento {
	private static throwErroAgendamento(message: string) {
		const err = new Error(message || "Erro");
		err["agendamento"] = err.message;
		throw err;
	}

	public static async localHorarioLivre(data: string, inicio: number, termino: number, id_integra_local: string, id_integra_sessao: number): Promise<boolean> {
		const r = await JSONRequest.get(appsettings.integracaoAgendamentoPathLocalHorarioLivre + "?datainicial=" + data + "&HI=" + formatarHorario(inicio) + "&HF=" + formatarHorario(termino) + "&salaId=" + id_integra_local + "&reservaId=" + id_integra_sessao);

		if (!r.sucesso)
			IntegracaoAgendamento.throwErroAgendamento(r.erro || r.resultado);

		return !(r.resultado as boolean);
	}

	public static async verificarStatusAprovacao(id_integra_sessao: number): Promise<number> {
		const r = await JSONRequest.get(appsettings.integracaoAgendamentoPathVerificarStatusAprovacao + "?id=" + id_integra_sessao);

		if (!r.sucesso)
			IntegracaoAgendamento.throwErroAgendamento(r.erro || r.resultado);

		if (!r.resultado || !("Aprovado" in r.resultado))
			IntegracaoAgendamento.throwErroAgendamento("Status da aprovação do agendamento desconhecido");

		return r.resultado.Aprovado as number;
	}

	public static async criarAgendamento(login: string, data: string, inicio: number, termino: number, id_integra_local: string, nome_curto: string): Promise<number> {
		const r = await JSONRequest.post(appsettings.integracaoAgendamentoPathCriarAgendamento, JSON.stringify({
			DataInicial: data,
			DataFinal: data,
			HI: formatarHorario(inicio),
			HF: formatarHorario(termino),
			SalaId: id_integra_local,
			Reservado_por: login,
			Obs: nome_curto,
			PermitirPostosEstudo: false  
		}));

		if (!r.sucesso)
			IntegracaoAgendamento.throwErroAgendamento(r.erro || r.resultado);

		const o = r.resultado;

		let reason = (o ? o.ReasonPhrase : null);

		if (!o || o.StatusCode !== 200) {
			IntegracaoAgendamento.throwErroAgendamento(reason);
		} else {
			const i = parseInt(reason);
			if (isNaN(i))
				IntegracaoAgendamento.throwErroAgendamento(reason);
			else
				return i;
		}
	}

	public static async alterarAgendamento(login: string, data: string, inicio: number, termino: number, nome_curto: string, id_integra_local: string, id_integra_sessao: number): Promise<number> {
		const r = await JSONRequest.put(appsettings.integracaoAgendamentoPathAlterarAgendamento + "?id=" + id_integra_sessao, JSON.stringify({
			Id: id_integra_sessao,
			DataInicial: data,
			DataFinal: data,
			HI: formatarHorario(inicio),
			HF: formatarHorario(termino),
			SalaId: id_integra_local,
			Reservado_por: login,
			Obs: nome_curto,
			PermitirPostosEstudo: false  
		}));

		if (!r.sucesso)
			IntegracaoAgendamento.throwErroAgendamento(r.erro || r.resultado);

		return IntegracaoAgendamento.verificarStatusAprovacao(id_integra_sessao);
	}

	public static async excluirAgendamento(id_integra_sessao: number): Promise<void> {
		const r = await JSONRequest.delete(appsettings.integracaoAgendamentoPathExcluirAgendamento + "?id=" + id_integra_sessao);

		if (!r.sucesso)
			IntegracaoAgendamento.throwErroAgendamento(r.erro || r.resultado);
	}
}
