
export = function converterDataISOParaPtBr(data: string): string {
	if (!data || !(data = data.trim()) || data.length > 10)
		return null;
	let b1 = data.indexOf("-");
	let b2 = data.lastIndexOf("-");
	let dia: string, mes: string, ano: string;
	if (b1 <= 0 || b2 <= b1)
		return null;
	ano = data.substring(0, b1);
	mes = data.substring(b1 + 1, b2);
	dia = data.substring(b2 + 1);
	return dia + "/" + mes + "/" + ano;
}
