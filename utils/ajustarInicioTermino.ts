
export = function ajustarInicioTermino(s: any): any {
	if (!s)
		return;
	if (s.length) {
		for (let i = s.length - 1; i >= 0; i--)
			ajustarInicioTermino(s[i]);
	} else {
		let h = (s.inicio / 100) | 0;
		let m = s.inicio % 100;
		s.inicio = ((h < 10) ? ("0" + h) : h) + ":" + ((m < 10) ? ("0" + m) : m);
		h = (s.termino / 100) | 0;
		m = s.termino % 100;
		s.termino = ((h < 10) ? ("0" + h) : h) + ":" + ((m < 10) ? ("0" + m) : m);
	}
	return s;
}
