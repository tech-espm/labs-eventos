import express = require("express");
import wrap = require("express-async-error-wrapper");
import jsonRes = require("../utils/jsonRes");
import Usuario = require("../models/usuario");
import Evento = require("../models/evento");
import Local = require("../models/local");
import Data = require("../models/data");
import Horario = require("../models/horario");
import Empresa = require("../models/empresa");
import TipoEmpresa = require("../models/tipoEmpresa");
import Palestrante = require("../models/palestrante");

const router = express.Router();

router.all("/criar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("evento/alterar", { titulo: "Criar Evento", usuario: u, item: null });
	}
}));

router.all("/alterar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		let id = parseInt(req.query["id"]);
		let item: Evento = null;
		if (isNaN(id) || !(item = await Evento.obter(id)))
			res.render("home/nao-encontrado", { usuario: u });
		else
			res.render("evento/alterar", { titulo: "Editar Evento", usuario: u, item: item });
	}
}));

router.get("/listar", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin) {
		res.redirect("/acesso");
	} else {
		res.render("evento/listar", { titulo: "Gerenciar Eventos", usuario: u, lista: JSON.stringify(await Evento.listar()) });
	}
}));

router.get("/", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u) {
		res.redirect("/acesso");
	} else if (!u.idevento_logado || !u.nomeevento_logado) {
		res.redirect("/");
	} else {
		let item: Evento = null;
		if (!(item = await Evento.obter(u.idevento_logado))) {
			res.render("home/nao-encontrado", { usuario: u });
		} else {
			res.render("evento/controlar", {
				titulo: "Controlar Evento",
				usuario: u,
				item: item
			});
		}
	}
}));

router.get("/controlar-usuarios", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.admin || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		let usuarios: Usuario[] = (u.admin ? await Usuario.listar() : null);
		let eventoUsuarios: Usuario[] = (u.admin ? await Usuario.eventoListar(u.idevento_logado) : null);

		res.render("evento/controlar-usuarios", {
			layout: "layout-vazio",
			usuario: u,
			usuarios: JSON.stringify(usuarios),
			eventoUsuarios: JSON.stringify(eventoUsuarios),
		});
	}
}));

router.get("/controlar-locais", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		let locais: Local[] = await Local.listar();
		let eventoLocais: Local[] = await Local.eventoListar(u.idevento_logado);

		res.render("evento/controlar-locais", {
			layout: "layout-vazio",
			usuario: u,
			locais: JSON.stringify(locais),
			eventoLocais: JSON.stringify(eventoLocais)
		});
	}
}));

router.get("/controlar-arquivos", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		res.render("evento/controlar-arquivos", {
			layout: "layout-vazio",
			usuario: u,
			caminhoAbsolutoExterno: Evento.caminhoAbsolutoExterno(u.idevento_logado),
			arquivos: JSON.stringify(await Evento.listarArquivos(u.idevento_logado))
		});
	}
}));

router.get("/controlar-landing-page", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		res.render("evento/controlar-landing-page", {
			layout: "layout-vazio",
			usuario: u,
			evento: await Evento.obter(u.idevento_logado),
			caminhoAbsolutoExterno: Evento.caminhoAbsolutoExterno(u.idevento_logado),
			landingPageExiste: await Evento.landingPageExiste(u.idevento_logado)
		});
	}
}));

router.get("/controlar-datas", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		res.render("evento/controlar-datas", {
			layout: "layout-vazio",
			usuario: u,
			idevento: u.idevento_logado,
			datas: JSON.stringify(await Data.listar(u.idevento_logado))
		});
	}
}));

router.get("/controlar-horarios", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		res.render("evento/controlar-horarios", {
			layout: "layout-vazio",
			usuario: u,
			idevento: u.idevento_logado,
			horarios: JSON.stringify(await Horario.listar(u.idevento_logado))
		});
	}
}));

router.get("/controlar-empresas", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		res.render("evento/controlar-empresas", {
			layout: "layout-vazio",
			usuario: u,
			idevento: u.idevento_logado,
			extensaoImagem: Empresa.extensaoImagem,
			caminhoAbsolutoPastaExterno: Empresa.caminhoAbsolutoPastaExterno(u.idevento_logado),
			tipoEmpresas: await TipoEmpresa.listar(),
			empresas: JSON.stringify(await Empresa.listar(u.idevento_logado))
		});
	}
}));

router.get("/controlar-palestrantes", wrap(async (req: express.Request, res: express.Response) => {
	let u = await Usuario.cookie(req);
	if (!u || !u.idevento_logado || !u.nomeevento_logado) {
		jsonRes(res, 400, "Sem acesso!");
	} else {
		res.render("evento/controlar-palestrantes", {
			layout: "layout-vazio",
			usuario: u,
			idevento: u.idevento_logado,
			extensaoImagem: Palestrante.extensaoImagem,
			caminhoAbsolutoPastaExterno: Palestrante.caminhoAbsolutoPastaExterno(u.idevento_logado),
			empresas: JSON.stringify(await Empresa.listar(u.idevento_logado)),
			palestrantes: JSON.stringify(await Palestrante.listar(u.idevento_logado))
		});
	}
}));

export = router;
