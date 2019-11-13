import express = require("express");
import wrap = require("express-async-error-wrapper");
import fs = require("../infra/fs");

const router = express.Router();

router.all("/:id?", wrap(async (req: express.Request, res: express.Response) => {
	let id = req.params["id"] as string;
	let caminhoRelativo: string = null;
	if (!id ||
		id.indexOf(".") >= 0 ||
		id.indexOf("\\") >= 0 ||
		id.indexOf("/") >= 0 ||
		id.indexOf("?") >= 0 ||
		id.indexOf("*") >= 0 ||
		id.indexOf("{") >= 0 ||
		id.indexOf("{") >= 0 ||
		!await fs.existeArquivo(caminhoRelativo = ("dados/certificados/" + id.toLowerCase() + ".pdf"))) {
		res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro de Certificado", mensagem: "Certificado não encontrado" });
	} else {
		res.sendFile(fs.gerarCaminhoAbsoluto(caminhoRelativo));
	}
}));

export = router;
