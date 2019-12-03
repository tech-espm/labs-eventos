import child_process = require("child_process");
import pm2 = require("pm2");

export = class ClusterEventos {
	private static readonly mensagemType = "EVENTOS";
	private static readonly mensagemTopic = "EVENTOS_MENSAGEM";
	private static readonly mensagemAtualizarIdsPorUrl = "EVENTOS_MENSAGEM_ATUALIZARIDSPORURL";
	private static pm2Id: number;
	private static pm2WorkerIds: number[] = null;
	private static callbackMensagemAtualizarIdsPorUrl: () => Promise<void>;

	private static readonly listener: NodeJS.MessageListener = (message: any, sendHandle: any) => {
		if (message && message.data && message.data.mensagem) {
			switch (message.data.mensagem) {
				case ClusterEventos.mensagemAtualizarIdsPorUrl:
					ClusterEventos.callbackMensagemAtualizarIdsPorUrl().catch(console.error);
					break;
			}
		}
	};

	private static enviarMensagemInterno(i: number, mensagem: string, resolve: (value?: void) => void): void {
		if (i >= ClusterEventos.pm2WorkerIds.length) {
			pm2.disconnect();
			resolve();
			return;
		}

		let id = ClusterEventos.pm2WorkerIds[i];

		// Não envia a mensagem para nós mesmos
		if (id === ClusterEventos.pm2Id) {
			ClusterEventos.enviarMensagemInterno(i + 1, mensagem, resolve);
			return;
		}

		// https://github.com/Unitech/pm2/issues/1271
		// https://github.com/Unitech/pm2/issues/325
		// https://pm2.keymetrics.io/docs/usage/pm2-api/
		pm2.sendDataToProcessId(id, {
			id: id,
			type: ClusterEventos.mensagemType,
			topic: ClusterEventos.mensagemTopic,
			data: { mensagem: mensagem }
		}, (err, result) => {
			ClusterEventos.enviarMensagemInterno(i + 1, mensagem, resolve);
		});
	}

	private static async enviarMensagem(mensagem: string): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (!ClusterEventos.pm2WorkerIds) {
				// Tenta listar os ids dos processos gerenciados pelo pm2 utilizando linha de comando
				// em vez de pm2.list(), porque para executar pm2.list() é preciso executar pm2.connect(),
				// e pm2.connect() sobe o serviço do pm2 caso ele ainda não esteja executando (o que não
				// é desejável no ambiente de desenvolvimento)
				child_process.exec("pm2 id eventos", (error, stdout, stderr) => {
					let stdoutTrim: string;

					if (!stdout || !(stdoutTrim = stdout.trim()) || !stdoutTrim.startsWith("[") || !stdoutTrim.endsWith("]")) {
						console.log("enviarMensagem err " + ((error && error.message) || stderr));
						console.log("enviarMensagem err stdout \"" + stdoutTrim + "\"");
						resolve();
						return;
					}

					let ids = stdoutTrim.substr(1, stdoutTrim.length - 2).trim().split(",");
					let idsInt: number[] = [];

					for (let i = 0; i < ids.length; i++)
						idsInt.push(parseInt(ids[i].trim()));

					ClusterEventos.pm2WorkerIds = idsInt;

					if (!ClusterEventos.pm2WorkerIds.length) {
						resolve();
						return;
					}

					pm2.connect((err) => {
						if (err) {
							console.log("pm2.connect err " + err);
							reject(err);
							return;
						}

						ClusterEventos.enviarMensagemInterno(0, mensagem, resolve);
					});
				});
				return;
			}

			if (!ClusterEventos.pm2WorkerIds.length) {
				resolve();
				return;
			}

			pm2.connect((err) => {
				if (err) {
					console.log("pm2.connect err " + err);
					reject(err);
					return;
				}

				ClusterEventos.enviarMensagemInterno(0, mensagem, resolve);
			});
		});
	}

	public static preparar(callbackMensagemAtualizarIdsPorUrl: () => Promise<void>): void {
		// Descobre o id do processo atual dentro do PM2
		ClusterEventos.pm2Id = parseInt(process.env.NODE_APP_INSTANCE);
		ClusterEventos.callbackMensagemAtualizarIdsPorUrl = callbackMensagemAtualizarIdsPorUrl;
		process.on("message", ClusterEventos.listener);
	}

	public static async enviarAtualizarIdsPorUrl(): Promise<void> {
		return ClusterEventos.enviarMensagem(ClusterEventos.mensagemAtualizarIdsPorUrl);
	}
};
