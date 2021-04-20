import ajustarInicioTermino = require("./ajustarInicioTermino");
import formatarHorario = require("./formatarHorario");

export = async function preencherMultidatas(sql: any, lista: any[], ajustarInicioTerminoDaLista: boolean): Promise<any[]> {
	if (lista) {
		for (let i = lista.length - 1; i >= 0; i--) {
			if (lista[i].tipomultidata) {
				lista[i].multidatas = await sql.query("select id, date_format(data, '%d/%m/%Y') data, inicio, termino, permitesimultanea from eventosessaomultidata where ideventosessao = " + (lista[i].ideventosessao || lista[i].id));
				if (ajustarInicioTerminoDaLista)
					ajustarInicioTermino(lista[i].multidatas);
			}
		}
	}
	return lista;
}
