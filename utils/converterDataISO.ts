
export = function converterDataISO(data: string): string {
	if (!data || !(data = data.trim()) || data.length > 10)
		return null;
	const b1 = data.indexOf("/");
	const b2 = data.lastIndexOf("/");
	if (b1 <= 0 || b2 <= b1)
		return null;
	const dia = parseInt(data.substring(0, b1));
	const mes = parseInt(data.substring(b1 + 1, b2));
	const ano = parseInt(data.substring(b2 + 1));
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
	return ano + "-" + ((mes < 10) ? ("0" + mes) : mes) + "-" + ((dia < 10) ? ("0" + dia) : dia);
}
