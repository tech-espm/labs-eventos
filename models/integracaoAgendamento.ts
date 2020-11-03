import appsettings = require("../appsettings");
import formatarHorario = require("../utils/formatarHorario");
import JSONRequest = require("../infra/jsonRequest");
import JSONResponse = require("../infra/jsonResponse");
import extrairJWTPayload = require("../utils/extrairJWTPayload");

class PromiseGeracaoToken {
	public readonly inicioMS: number;
	public readonly promise: Promise<string>;
	public terminada: boolean;

	constructor(promise: Promise<string>) {
		this.inicioMS = (new Date()).getTime();
		this.promise = new Promise<string>((resolve, reject) => {
			promise.then((token) => {
				this.terminada = true;
				resolve(token);
			}, () => {
				this.terminada = true;
				resolve(null);
			});
		});
	}

	public get inicioValido(): boolean {
		// Se passar de 1 minuto, tenta gerar o token de novo...
		return (((new Date()).getTime() - this.inicioMS) < (1 * 60 * 1000));
	}
}

export = class IntegracaoAgendamento {
	private static tokenIntegracaoHeader: string = null;
	private static tokenIntegracaoValidadeMS = 0;
	private static tokenIntegracaoPromise: PromiseGeracaoToken = null;

	private static async gerarToken(): Promise<string> {
		const r = await JSONRequest.post(appsettings.integracaoAgendamentoPathGerarToken, appsettings.integracaoAgendamentoTokenCredentialsJson);

		if (r.sucesso && r.resultado && r.resultado.token) {
			try {
				const token = r.resultado.token as string,
					objJson = extrairJWTPayload(token),
					obj = JSON.parse(objJson);

				if (obj && obj.exp) {
					const validadeMS = parseInt(obj.exp) * 1000;
					if (!IntegracaoAgendamento.tokenIntegracaoHeader ||
						!IntegracaoAgendamento.tokenIntegracaoValidadeMS ||
						IntegracaoAgendamento.tokenIntegracaoValidadeMS < validadeMS) {
						// Faz essa verificação para manter só o token mais novo, caso tenha
						// sido pedido para gerar dois ou mais tokens
						IntegracaoAgendamento.tokenIntegracaoHeader = "bearer " + token;
						IntegracaoAgendamento.tokenIntegracaoValidadeMS = validadeMS;
					}
				}
			} catch (ex) {
				// Apenas ignora e deixa retornar o token existente, mesmo se ele for null
			}
		}

		return IntegracaoAgendamento.tokenIntegracaoHeader;
	}

	private static async obterTokenHeader(): Promise<string> {
		if (IntegracaoAgendamento.tokenIntegracaoHeader) {
			// Descarta o token se estiver a menos de 20 minutos da validade
			if ((IntegracaoAgendamento.tokenIntegracaoValidadeMS - (new Date()).getTime()) < (20 * 60 * 1000)) {
				IntegracaoAgendamento.tokenIntegracaoHeader = null;
				IntegracaoAgendamento.tokenIntegracaoValidadeMS = 0;
			} else {
				// Ajuda o garbage collector limpando, assim que possível,
				// a Promise antiga já terminada
				if (IntegracaoAgendamento.tokenIntegracaoPromise &&
					IntegracaoAgendamento.tokenIntegracaoPromise.terminada)
					IntegracaoAgendamento.tokenIntegracaoPromise = null;

				return IntegracaoAgendamento.tokenIntegracaoHeader;
			}
		}

		// Vamos ter que gerar um token novo!
		// Se ainda ninguém pediu para (re)criar um token, cria uma Promise nova.
		// Se alguém já havia pedido para (re)criar um novo token, mas, se fizer muito tempo,
		// também cria uma Promise nova, porque alguma coisa pode ter dado errado...
		if (!IntegracaoAgendamento.tokenIntegracaoPromise ||
			!IntegracaoAgendamento.tokenIntegracaoPromise.inicioValido ||
			// Se IntegracaoAgendamento.tokenIntegracaoPromise.terminada é true aqui,
			// provavelmente a Promise acabou em erro antes...
			IntegracaoAgendamento.tokenIntegracaoPromise.terminada)
			IntegracaoAgendamento.tokenIntegracaoPromise = new PromiseGeracaoToken(IntegracaoAgendamento.gerarToken());

		return IntegracaoAgendamento.tokenIntegracaoPromise.promise;
	}

	private static throwErroAgendamento(message: string) {
		const err = new Error(message || "Erro");
		err["agendamento"] = err.message;
		throw err;
	}

	public static async localHorarioLivre(data: string, inicio: number, termino: number, id_integra_local: string, id_integra_sessao: number): Promise<boolean> {
		const tokenHeader = await IntegracaoAgendamento.obterTokenHeader();
		if (!tokenHeader)
			IntegracaoAgendamento.throwErroAgendamento("Erro na geração do token de acesso à integração");

		const r = await JSONRequest.get(appsettings.integracaoAgendamentoPathLocalHorarioLivre + "/" + data + "," + encodeURIComponent(formatarHorario(inicio)) + "," + encodeURIComponent(formatarHorario(termino)) + "," + id_integra_local + "," + id_integra_sessao, { "Authorization": tokenHeader });

		if (!r.sucesso)
			IntegracaoAgendamento.throwErroAgendamento(r.erro || r.resultado);

		return !(r.resultado as boolean);
	}

	public static async verificarStatusAprovacao(id_integra_sessao: number): Promise<number> {
		const tokenHeader = await IntegracaoAgendamento.obterTokenHeader();
		if (!tokenHeader)
			IntegracaoAgendamento.throwErroAgendamento("Erro na geração do token de acesso à integração");

		const r = await JSONRequest.get(appsettings.integracaoAgendamentoPathVerificarStatusAprovacao + "/" + id_integra_sessao, { "Authorization": tokenHeader });

		if (!r.sucesso)
			IntegracaoAgendamento.throwErroAgendamento(r.erro || r.resultado);

		if (!r.resultado || !("aprovado" in r.resultado))
			IntegracaoAgendamento.throwErroAgendamento("Status da aprovação do agendamento desconhecido");

		return r.resultado.aprovado as number;
	}

	public static async criarAgendamento(login: string, data: string, inicio: number, termino: number, id_integra_local: string, nome_curto: string): Promise<number> {
		const tokenHeader = await IntegracaoAgendamento.obterTokenHeader();
		if (!tokenHeader)
			IntegracaoAgendamento.throwErroAgendamento("Erro na geração do token de acesso à integração");

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
			IntegracaoAgendamento.throwErroAgendamento(r.erro || r.resultado);

		const o = r.resultado;

		let reason = (o ? o.reasonPhrase : null);

		if (!o || o.statusCode !== 200) {
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
		const tokenHeader = await IntegracaoAgendamento.obterTokenHeader();
		if (!tokenHeader)
			IntegracaoAgendamento.throwErroAgendamento("Erro na geração do token de acesso à integração");

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
			IntegracaoAgendamento.throwErroAgendamento(r.erro || r.resultado);

		return IntegracaoAgendamento.verificarStatusAprovacao(id_integra_sessao);
	}

	public static async excluirAgendamento(id_integra_sessao: number): Promise<void> {
		const tokenHeader = await IntegracaoAgendamento.obterTokenHeader();
		if (!tokenHeader)
			IntegracaoAgendamento.throwErroAgendamento("Erro na geração do token de acesso à integração");

		const r = await JSONRequest.delete(appsettings.integracaoAgendamentoPathExcluirAgendamento + "/" + id_integra_sessao, { "Authorization": tokenHeader });

		if (!r.sucesso)
			IntegracaoAgendamento.throwErroAgendamento(r.erro || r.resultado);
	}
}
