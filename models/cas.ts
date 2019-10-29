import https = require("https");
import appsettings = require("../appsettings");

export = class Cas {

	public user: string;
	public nome: string;
	public email: string;
	public emailAcademico: string;
	public aluno: boolean;
	public codigoCurso: string;
	public nomeCurso: string;
	public serie: string;

	private static extrairValor(xml: string, tag: string): string {
		let tagI = "<" + tag + ">";
		let i = xml.indexOf(tagI);
		if (i < 0)
			return null;
		i += tagI.length;
		let f = xml.indexOf("</" + tag + ">", i);
		if (f < 0)
			return null;
		return xml.substring(i, f).normalize().trim();
	}

	private static parseXml(xml: string): Cas {
		// NÃO PODE UTILIZAR NENHUM TIPO DE PARSER REAL DE XML, POIS O CAS RETORNA
		// UMA STRING QUE NÃO É UM XML REAL, COMO NO EXEMPLO ABAIXO:
		// <cas:attributes>
		//   **<cas:uid>abc</cas:uid>**
		//   ...
		if (!xml.includes("<cas:authenticationSuccess>"))
			return null;

		let cas = new Cas();

		cas.user = Cas.extrairValor(xml, "cas:user");
		cas.nome = Cas.extrairValor(xml, "cas:Nome");
		cas.emailAcademico = Cas.extrairValor(xml, "cas:emailAddress");
		cas.email = Cas.extrairValor(xml, "cas:EmailPessoal");
		cas.aluno = (Cas.extrairValor(xml, "cas:tipo") == "A");
		cas.codigoCurso = Cas.extrairValor(xml, "cas:CodigoCurso");
		cas.nomeCurso = Cas.extrairValor(xml, "cas:NomeCurso");
		cas.serie = Cas.extrairValor(xml, "cas:Serie");

		if (!cas.user) {
			cas.user = Cas.extrairValor(xml, "cas:uid");
			if (!cas.user)
				return null;
		}

		let i: number;
		if ((i = cas.user.indexOf("@")) > 0)
			cas.user = cas.user.substr(0, i);

		if (!cas.nome)
			cas.nome = cas.user;

		if (!cas.emailAcademico || !cas.emailAcademico.includes("@")) {
			if (cas.aluno)
				cas.emailAcademico = cas.user + "@acad.espm.br";
			else
				cas.emailAcademico = cas.user + "@espm.br";
		}

		if (!cas.email)
			cas.email = cas.emailAcademico;

		return cas;
	}

	public static async download(ticket: string): Promise<Cas> {
		return new Promise<Cas>((resolve, reject) => {
			try {
				let options: https.RequestOptions = {
					host: appsettings.casTicketHost,
					port: appsettings.casTicketPort,
					path: appsettings.casTicketPath + `?service=${appsettings.casLoginService}&ticket=${encodeURIComponent(ticket)}`,
					method: "GET"
				};

				let httpreq = https.request(options, function (response) {
					let xml = "";
					response.setEncoding("utf8");
					response.on("error", function () {
						reject("Falha na comunicação com o servidor de login.");
					});
					response.on("data", function (chunk) {
						xml += chunk;
					});
					response.on("end", function () {
						resolve(Cas.parseXml(xml));
					})
				});
				httpreq.end();
			} catch (ex) {
				reject(ex.message || ex.toString());
			}
		});
	}
}
