import formatar2 = require("./formatar2");

export = function formatarHorario(horario: number): string {
	return formatar2((horario / 100) | 0) + ":" + formatar2(horario % 100);
}
