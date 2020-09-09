import appsettings = require("../appsettings");
import formatarHorario = require("../utils/formatarHorario");
import JSONRequest = require("../infra/jsonRequest");
import JSONResponse = require("../infra/jsonResponse");

export = class IntegracaoReserva {
	private static throwErroJson(message: string) {
		const err = new Error(message || "Erro");
		err["jsonCode"] = err.message;
		throw err;
	}

	public static async localHorarioLivre(data: string, inicio: number, termino: number, id_integra_local: string): Promise<boolean> {
		const r = await JSONRequest.get(appsettings.integracaoReservaPathLocalHorarioLivre + "?datainicial=" + data + "&HI=" + formatarHorario(inicio) + "&HF=" + formatarHorario(termino) + "&salaId=" + id_integra_local);

		if (!r.sucesso)
			IntegracaoReserva.throwErroJson(r.erro || r.resultado);

		return !(r.resultado as boolean);
	}

	public static async criarReserva(login: string, data: string, inicio: number, termino: number, id_integra_local: string, nome_curto: string): Promise<number> {
		const r = await JSONRequest.post(appsettings.integracaoReservaPathCriarReserva, JSON.stringify({
			DataInicial: data + "T" + formatarHorario(inicio),
			DataFinal: data + "T" + formatarHorario(termino),
			SalaId: id_integra_local,
			Reservado_por: login,
			Obs: nome_curto,
			PermitirPostosEstudo: false  
		}));

		if (!r.sucesso)
			IntegracaoReserva.throwErroJson(r.erro || r.resultado);

		const o = r.resultado;

		let reason = (o ? o.ReasonPhrase : null);

		if (!o || o.StatusCode !== 200) {
			IntegracaoReserva.throwErroJson(reason);
		} else {
			const i = parseInt(reason);
			if (isNaN(i))
				IntegracaoReserva.throwErroJson(reason);
			else
				return i;
		}
	}

	public static async excluirReserva(id_integra_sessao: string): Promise<void> {
		const r = await JSONRequest.delete(appsettings.integracaoReservaPathExcluirReserva + "?id=" + id_integra_sessao);

		if (!r.sucesso)
			IntegracaoReserva.throwErroJson(r.erro || r.resultado);
	}

}
