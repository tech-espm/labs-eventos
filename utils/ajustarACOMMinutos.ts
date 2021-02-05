import SessaoConstantes = require("../models/sessaoConstantes");

export = function ajustarACOMMinutos(lista: any[]): any[] {
	if (lista && lista.length) {
		for (let i = lista.length - 1; i >= 0; i--) {
			const s = lista[i];
			// Em sessões multidata, creditaracom só será 1 se o participante tiver direito a horas ACOM
			if (!s.creditaracom)
				s.acomminutos = 0;
			else if (s.tipomultidata === SessaoConstantes.TIPOMULTIDATA_PROPORCIONAL && s.encontrostotais && s.encontrospresentes < s.encontrostotais)
				s.acomminutos = ((s.acomminutos * s.encontrospresentes) / s.encontrostotais) | 0;
		}
	}
	return lista;
}
