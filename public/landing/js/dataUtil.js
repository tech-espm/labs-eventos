"use strict";

window.DataUtil = {
	converterISOParaNumero: function (dataISO) {
		return (dataISO && dataISO.length >= 10) ? (((10000 * parseInt(dataISO.substring(0, 4))) +
				(100 * parseInt(dataISO.substring(5, 7))) +
				parseInt(dataISO.substring(8, 10))) | 0) : 0;
	},

	formatarBr: function (ano, mes, dia) {
		return ((dia < 10) ? ("0" + dia) : dia) + "/" + ((mes < 10) ? ("0" + mes) : mes) + "/" + ano;
	},

	formatarBrComHorario: function (ano, mes, dia, hora, minuto, segundo) {
		return ((dia < 10) ? ("0" + dia) : dia) + "/" + ((mes < 10) ? ("0" + mes) : mes) + "/" + ano + " " + ((hora < 10) ? ("0" + hora) : hora) + ":" + ((minuto < 10) ? ("0" + minuto) : minuto) + ":" + ((segundo < 10) ? ("0" + segundo) : segundo);
	},

	formatar: function (ano, mes, dia) {
		return ano + "-" + ((mes < 10) ? ("0" + mes) : mes) + "-" + ((dia < 10) ? ("0" + dia) : dia);
	},

	formatarComHorario: function (ano, mes, dia, hora, minuto, segundo) {
		return ano + "-" + ((mes < 10) ? ("0" + mes) : mes) + "-" + ((dia < 10) ? ("0" + dia) : dia) + " " + ((hora < 10) ? ("0" + hora) : hora) + ":" + ((minuto < 10) ? ("0" + minuto) : minuto) + ":" + ((segundo < 10) ? ("0" + segundo) : segundo);
	},

	converterDataISO: function (dataComOuSemHorario, formatoBr) {
		if (!dataComOuSemHorario || !(dataComOuSemHorario = dataComOuSemHorario.trim()))
			return null;
		let b1 = dataComOuSemHorario.indexOf("/");
		let b2 = dataComOuSemHorario.lastIndexOf("/");
		let dia, mes, ano;
		if (b1 <= 0 || b2 <= b1) {
			let b1 = dataComOuSemHorario.indexOf("-");
			let b2 = dataComOuSemHorario.lastIndexOf("-");
			if (b1 <= 0 || b2 <= b1)
				return null;
			ano = parseInt(dataComOuSemHorario.substring(0, b1));
			mes = parseInt(dataComOuSemHorario.substring(b1 + 1, b2));
			dia = parseInt(dataComOuSemHorario.substring(b2 + 1));
		} else {
			dia = parseInt(dataComOuSemHorario.substring(0, b1));
			mes = parseInt(dataComOuSemHorario.substring(b1 + 1, b2));
			ano = parseInt(dataComOuSemHorario.substring(b2 + 1));
		}
		if (isNaN(dia) || isNaN(mes) || isNaN(ano) ||
			dia < 1 || mes < 1 || ano < 1 ||
			dia > 31 || mes > 12 || ano > 9999)
			return null;
		switch (mes) {
			case 2:
				if (!(ano % 4) && ((ano % 100) || !(ano % 400))) {
					if (dia > 29)
						return null;
				} else {
					if (dia > 28)
						return null;
				}
				break;
			case 4:
			case 6:
			case 9:
			case 11:
				if (dia > 30)
					return null;
				break;
		}
		let sepHorario = dataComOuSemHorario.indexOf(" ");
		if (sepHorario < 0)
			sepHorario = dataComOuSemHorario.indexOf("T");
		if (sepHorario >= 0) {
			const horario = dataComOuSemHorario.substring(sepHorario + 1);
			const sepMinuto = horario.indexOf(":");
			if (sepMinuto >= 0) {
				const hora = parseInt(horario);
				const minuto = parseInt(horario.substring(sepMinuto + 1));
				if (hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59) {
					const sepSegundo = horario.indexOf(":", sepMinuto + 1);
					if (sepSegundo >= 0) {
						const segundo = parseInt(horario.substring(sepSegundo + 1));
						if (segundo >= 0 && segundo <= 59)
							return (formatoBr ?
								DataUtil.formatarBrComHorario(ano, mes, dia, hora, minuto, segundo) :
								DataUtil.formatarComHorario(ano, mes, dia, hora, minuto, segundo));
					} else {
						return (formatoBr ?
							DataUtil.formatarBrComHorario(ano, mes, dia, hora, minuto, 0) :
							DataUtil.formatarComHorario(ano, mes, dia, hora, minuto, 0));
					}
				}
			}
			return null;
		}
		return (formatoBr ?
			DataUtil.formatarBr(ano, mes, dia) :
			DataUtil.formatar(ano, mes, dia));
	},

	removerHorario: function (dataISOOuBrComHorario) {
		return ((!dataISOOuBrComHorario || dataISOOuBrComHorario.length < 10) ? "" : dataISOOuBrComHorario.substring(0, 10));
	},

	obterHorario: function (dataISOOuBrComHorario) {
		return ((!dataISOOuBrComHorario || dataISOOuBrComHorario.length < 16) ? "" : dataISOOuBrComHorario.substring(11));
	},

	obterHorarioSemSegundos: function (dataISOOuBrComHorario) {
		return ((!dataISOOuBrComHorario || dataISOOuBrComHorario.length < 16) ? "" : dataISOOuBrComHorario.substring(11, 16));
	},

	dateUTC: function (deltaSegundos) {
		return (deltaSegundos ? new Date((new Date()).getTime() + (deltaSegundos * 1000)) : new Date());
	},

	horarioDeBrasiliaComoDateUTC: function (deltaSegundos) {
		let time = (new Date()).getTime();
		if (deltaSegundos)
			time += (deltaSegundos * 1000);
		return new Date(time - (180 * 60000));
	},

	horarioDeBrasiliaBr: function (deltaSegundos) {
		const hoje = DataUtil.horarioDeBrasiliaComoDateUTC(deltaSegundos);

		return DataUtil.formatarBr(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, hoje.getUTCDate());
	},

	horarioDeBrasiliaBrComHorario: function (deltaSegundos) {
		const hoje = DataUtil.horarioDeBrasiliaComoDateUTC(deltaSegundos);

		return DataUtil.formatarBrComHorario(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, hoje.getUTCDate(), hoje.getUTCHours(), hoje.getUTCMinutes(), hoje.getUTCSeconds());
	},

	horarioDeBrasiliaBrInicioDoDia: function (deltaSegundos) {
		const hoje = DataUtil.horarioDeBrasiliaComoDateUTC(deltaSegundos);

		return DataUtil.formatarBrComHorario(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, hoje.getUTCDate(), 0, 0, 0);
	},

	horarioDeBrasiliaBrFimDoDia: function (deltaSegundos) {
		const hoje = DataUtil.horarioDeBrasiliaComoDateUTC(deltaSegundos);

		return DataUtil.formatarBrComHorario(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, hoje.getUTCDate(), 23, 59, 59);
	},

	horarioDeBrasiliaISO: function (deltaSegundos) {
		const hoje = DataUtil.horarioDeBrasiliaComoDateUTC(deltaSegundos);

		return DataUtil.formatar(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, hoje.getUTCDate());
	},

	horarioDeBrasiliaISOComHorario: function (deltaSegundos) {
		const hoje = DataUtil.horarioDeBrasiliaComoDateUTC(deltaSegundos);

		return DataUtil.formatarComHorario(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, hoje.getUTCDate(), hoje.getUTCHours(), hoje.getUTCMinutes(), hoje.getUTCSeconds());
	},

	horarioDeBrasiliaISOInicioDoDia: function (deltaSegundos) {
		const hoje = DataUtil.horarioDeBrasiliaComoDateUTC(deltaSegundos);

		return DataUtil.formatarComHorario(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, hoje.getUTCDate(), 0, 0, 0);
	},

	horarioDeBrasiliaISOFimDoDia: function (deltaSegundos) {
		const hoje = DataUtil.horarioDeBrasiliaComoDateUTC(deltaSegundos);

		return DataUtil.formatarComHorario(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, hoje.getUTCDate(), 23, 59, 59);
	},

	horarioUTCISO: function (deltaSegundos) {
		const hoje = DataUtil.dateUTC(deltaSegundos);

		return DataUtil.formatar(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, hoje.getUTCDate());
	},

	horarioUTCISOComHorario: function (deltaSegundos) {
		const hoje = DataUtil.dateUTC(deltaSegundos);

		return DataUtil.formatarComHorario(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, hoje.getUTCDate(), hoje.getUTCHours(), hoje.getUTCMinutes(), hoje.getUTCSeconds());
	},

	horarioLocalISO: function (deltaSegundos) {
		const hoje = DataUtil.dateUTC(deltaSegundos);

		return DataUtil.formatar(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate());
	},

	horarioLocalISOComHorario: function (deltaSegundos) {
		const hoje = DataUtil.dateUTC(deltaSegundos);

		return DataUtil.formatarComHorario(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate(), hoje.getHours(), hoje.getMinutes(), hoje.getSeconds());
	},

	horarioLocalBr: function (deltaSegundos) {
		const hoje = DataUtil.dateUTC(deltaSegundos);

		return DataUtil.formatarBr(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate());
	},

	horarioLocalBrComHorario: function (deltaSegundos) {
		const hoje = DataUtil.dateUTC(deltaSegundos);

		return DataUtil.formatarBrComHorario(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate(), hoje.getHours(), hoje.getMinutes(), hoje.getSeconds());
	}
};
