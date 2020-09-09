
export = function formatar2(x: number): string {
	return (x < 10 ? ("0" + x) : x.toString());
}
