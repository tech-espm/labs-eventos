import express = require("express");
import wrap = require("express-async-error-wrapper");
import Evento = require("../models/evento");
import Data = require("../models/data");
import Local = require("../models/local");
import Sessao = require("../models/sessao");

const router = express.Router();

router.all("/:u", wrap(async (req: express.Request, res: express.Response) => {
	let url = req.params["u"] as string;
	let evt = Evento.idsPorUrl["/" + url];

	if (!evt || !evt.habilitado || !evt.permiteinscricao)
		res.render("shared/erro-fundo", { layout: "layout-externo", imagemFundo: true, titulo: "Erro", mensagem: "Não foi possível encontrar o evento" });
	else
		res.render("checkin/index", { layout: "layout-externo", imagemFundo: true, panelHeadingPersonalizado: true, titulo: "Check-In", evento: await Evento.obter(evt.id), datas: await Data.listar(evt.id), locais: await Local.eventoListar(evt.id), sessoes: await Sessao.listar(evt.id) });
}));

export = router;
