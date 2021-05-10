import JSONRequest = require("../../infra/jsonRequest");
import extrairJWTPayload = require("../../utils/extrairJWTPayload");

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

export = class Token {
	private readonly url: string;
	private readonly credentialsJson: string;

	private header: string;
	private validadeMS: number;
	private promiseGeracao: PromiseGeracaoToken;

	constructor(url: string, credentialsJson: string) {
		this.url = url;
		this.credentialsJson = credentialsJson;
		this.header = null;
		this.validadeMS = 0;
		this.promiseGeracao = null;
	}

	private async gerar(): Promise<string> {
		const r = await JSONRequest.post(this.url, this.credentialsJson);

		if (r.sucesso && r.resultado && r.resultado.token) {
			try {
				const token = r.resultado.token as string,
					objJson = extrairJWTPayload(token),
					obj = JSON.parse(objJson);

				if (obj && obj.exp) {
					const validadeMS = parseInt(obj.exp) * 1000;
					if (!this.header ||
						!this.validadeMS ||
						this.validadeMS < validadeMS) {
						// Faz essa verificação para manter só o token mais novo, caso tenha
						// sido pedido para gerar dois ou mais tokens
						this.header = "bearer " + token;
						this.validadeMS = validadeMS;
					}
				}
			} catch (ex) {
				// Apenas ignora e deixa retornar o token existente, mesmo se ele for null
			}
		}

		return this.header;
	}

	public async obterHeader(): Promise<string> {
		if (this.header) {
			// Descarta o token se estiver a menos de 5 minutos da validade
			if ((this.validadeMS - (new Date()).getTime()) < (5 * 60 * 1000)) {
				this.header = null;
				this.validadeMS = 0;
			} else {
				// Ajuda o garbage collector limpando, assim que possível,
				// a Promise antiga já terminada
				if (this.promiseGeracao &&
					this.promiseGeracao.terminada)
					this.promiseGeracao = null;

				return this.header;
			}
		}

		// Vamos ter que gerar um token novo!
		// Se ainda ninguém pediu para (re)criar um token, cria uma Promise nova.
		// Se alguém já havia pedido para (re)criar um novo token, mas, se fizer muito tempo,
		// também cria uma Promise nova, porque alguma coisa pode ter dado errado...
		if (!this.promiseGeracao ||
			!this.promiseGeracao.inicioValido ||
			// Se IntegracaoAgendamento.tokenIntegracaoPromise.terminada é true aqui,
			// provavelmente a Promise acabou em erro antes...
			this.promiseGeracao.terminada)
			this.promiseGeracao = new PromiseGeracaoToken(this.gerar());

		return this.promiseGeracao.promise;
	}
}
