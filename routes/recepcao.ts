import express = require("express");
import wrap = require("express-async-error-wrapper");
import Evento = require("../models/evento");

const router = express.Router();

router.all("/:u", wrap(async (req: express.Request, res: express.Response) => {
	let url = req.params["u"] as string;
	let evt = Evento.idsPorUrl["/" + url];

	if (!evt || !evt.habilitado || !evt.permiteinscricao)
		res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro", mensagem: "Não foi possível encontrar o evento" });
	else
		res.render("recepcao/index", { layout: "layout-externo", imagemFundo: true, panelHeadingPersonalizado: true, titulo: "Recepção", evento: await Evento.obter(evt.id, false) });
}));

export = router;
