import appsettings = require("../../appsettings");
import formatarHorario = require("../../utils/formatarHorario");
import JSONRequest = require("../../infra/jsonRequest");
import JSONResponse = require("../../infra/jsonResponse");
import Token = require("./token");

export = class IntegracaoMicroservices {
	private static readonly token: Token = new Token(appsettings.integracaoMicroservicesPathGerarToken, appsettings.integracaoMicroservicesTokenCredentialsJson);

	private static throwErro(message: string) {
		const err = new Error(message || "Erro");
		err["microservices"] = err.message;
		throw err;
	}

	public static async obterRA(email: string): Promise<string> {
		if (!email)
			return null;

		const tokenHeader = await IntegracaoMicroservices.token.obterHeader();
		if (!tokenHeader)
			IntegracaoMicroservices.throwErro("Erro na geração do token de acesso à integração");

		const r = await JSONRequest.get(appsettings.integracaoMicroservicesPathObterRA + "?Email_Addr=" + encodeURIComponent(email), { "Authorization": tokenHeader });

		if (!r.sucesso)
			IntegracaoMicroservices.throwErro(r.erro || r.resultado);

		const ra = (r.resultado && r.resultado.length && r.resultado[0] && r.resultado[0].emplid) as string;

		return (ra ? ra.trim() : null);
	}

	public static async obterCampusPlano(ra: string): Promise<[string, string]> {
		if (!ra)
			return null;

		const tokenHeader = await IntegracaoMicroservices.token.obterHeader();
		if (!tokenHeader)
			IntegracaoMicroservices.throwErro("Erro na geração do token de acesso à integração");

		const r = await JSONRequest.get(appsettings.integracaoMicroservicesPathObterCursos + "?Emplid=" + encodeURIComponent(ra), { "Authorization": tokenHeader });

		if (!r.sucesso)
			IntegracaoMicroservices.throwErro(r.erro || r.resultado);

		if (r.resultado) {
			// Pega a partir da última (deveria ser a mais recente)
			for (let i = r.resultado.length - 1; i >= 0; i--) {
				const curso = r.resultado[i];
				let campus: string, plano: string;
				if (curso &&
					(campus = curso.campus) && (campus = campus.trim()) &&
					(plano = curso.acad_plan) && (plano = plano.trim()))
					return [campus, plano];
			}
		}

		return null;
	}
}
