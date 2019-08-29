import https = require("https");
import appsettings = require("../appsettings");

export = class Cas {

	public user: string;
	public nome: string;
	public email: string;
	public emailAcademico: string;
	public aluno: boolean;

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
					var xml = "";
					response.setEncoding("utf8");
					response.on("error", function () {
						reject("Falha na comunicação com o servidor de login.");
					});
					response.on("data", function (chunk) {
						xml += chunk;
					});
					response.on("end", function () {
						resolve(null);
					})
				});
				httpreq.end();
			} catch (ex) {
				reject(ex.message || ex.toString());
			}
		});
	}
}
