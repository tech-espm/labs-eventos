import formatarHorario = require("./formatarHorario");

export = function ajustarInicioTermino(s: any): any {
	if (!s)
		return;
	if (s.length) {
		for (let i = s.length - 1; i >= 0; i--)
			ajustarInicioTermino(s[i]);
	} else {
		s.inicio = formatarHorario(s.inicio);
		s.termino = formatarHorario(s.termino);
	}
	return s;
}
