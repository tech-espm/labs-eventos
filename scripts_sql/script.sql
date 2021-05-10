CREATE DATABASE IF NOT EXISTS eventos;
USE eventos;

-- DROP TABLE IF EXISTS usuario;
CREATE TABLE usuario (
  id int NOT NULL AUTO_INCREMENT,
  login varchar(50) NOT NULL,
  nome varchar(100) NOT NULL,
  tipo int NOT NULL,
  senha varchar(100) NOT NULL,
  token char(32) DEFAULT NULL,
  idevento_logado int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY login_UN (login)
);

INSERT INTO usuario (login, nome, tipo, senha, token, idevento_logado) VALUES ('ADMIN', 'ADMINISTRADOR', 0, 'peTcC99vkvvLqGQL7mdhGuJZIvL2iMEqvCNvZw3475PJ:JVyo1Pg2HyDyw9aSOd3gNPT30KdEyiUYCjs7RUzSoYGN', NULL, 0);

-- DROP TABLE IF EXISTS curso;
CREATE TABLE curso (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  emailresponsavel varchar(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UN (nome)
);

-- DROP TABLE IF EXISTS formato;
CREATE TABLE formato (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UN (nome)
);

-- DROP TABLE IF EXISTS industria;
CREATE TABLE industria (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UN (nome)
);

-- DROP TABLE IF EXISTS instrucao;
CREATE TABLE instrucao (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  ordem int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UN (nome),
  KEY ordem_INDEX (ordem)
);

-- DROP TABLE IF EXISTS profissao;
CREATE TABLE profissao (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  ordem int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UN (nome)
);

-- DROP TABLE IF EXISTS tiposessao;
CREATE TABLE tiposessao (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UN (nome)
);

-- DROP TABLE IF EXISTS tipoempresa;
CREATE TABLE tipoempresa (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(40) NOT NULL,
  nome_site varchar(40) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UN (nome)
);

INSERT INTO tipoempresa (nome, nome_site) VALUES ('APOIADORA', 'APOIADORA');

-- DROP TABLE IF EXISTS vertical;
CREATE TABLE vertical (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  descricao varchar(100) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UN (nome)
);

-- DROP TABLE IF EXISTS unidade;
CREATE TABLE unidade (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  sigla varchar(50) NOT NULL,
  id_integra int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UN (nome),
  UNIQUE KEY sigla_UN (sigla)
);

INSERT INTO unidade (nome, sigla, id_integra) VALUES ('A Definir', '-', 0), ('Virtual', 'VIRTUAL', 0);
UPDATE unidade SET id = -1 WHERE id = 2;

-- DROP TABLE IF EXISTS local;
CREATE TABLE local (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  idunidade int NOT NULL,
  capacidade_real int NOT NULL,
  id_integra char(36) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nomeidunidade_UN (nome,idunidade),
  KEY idunidade_FK_idx (idunidade),
  CONSTRAINT idunidade_FK FOREIGN KEY (idunidade) REFERENCES unidade (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

INSERT INTO local (nome, idunidade, capacidade_real, id_integra) VALUES ('A Definir', 1, 1, ''), ('Online', -1, 9999999, '');
UPDATE local SET id = -1 WHERE id = 2;

-- DROP TABLE IF EXISTS evento;
CREATE TABLE evento (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  cidade varchar(40) NOT NULL,
  url varchar(50) NOT NULL,
  titulo varchar(100) NOT NULL,
  descricao varchar(250) NOT NULL,
  inicio datetime NOT NULL,
  termino datetime NOT NULL,
  versao int NOT NULL,
  versaobanner int NOT NULL,
  versaologo int NOT NULL,
  habilitado tinyint(4) NOT NULL,
  certificadoliberado tinyint(4) NOT NULL,
  permiteinscricao tinyint(4) NOT NULL,
  aspectratioempresa varchar(16) DEFAULT NULL,
  aspectratiopalestrante varchar(16) DEFAULT NULL,
  permitealuno tinyint(4) NOT NULL,
  permitefuncionario tinyint(4) NOT NULL,
  permiteexterno tinyint(4) NOT NULL,
  secoesocultas int NOT NULL,
	contatocorfundo char(7) NOT NULL,
  contatocortexto char(7) NOT NULL,
  contatocoluna1 text NOT NULL,
  contatocoluna2 text NOT NULL,
	urlmapa varchar(400) NOT NULL,
	mensagemrodape varchar(100) NOT NULL,
  idempresapadrao int NOT NULL,
  emailpadrao varchar(100) NOT NULL,
  senharecepcao varchar(45) NOT NULL,
  senhacheckin varchar(45) NOT NULL,
  senhasugestao varchar(45) NOT NULL,
  termoaceite text NOT NULL,
  certificado1 tinytext NOT NULL,
  certificado2 text NOT NULL,
  certificado1palestrante tinytext NOT NULL,
  certificado2palestrante text NOT NULL,
  assuntoemailinscricao tinytext NOT NULL,
  emailinscricao text NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UN (nome),
  UNIQUE KEY url_UN (url)
);

-- DROP TABLE IF EXISTS eventoempresa;
CREATE TABLE eventoempresa (
  id int NOT NULL AUTO_INCREMENT,
  idevento int NOT NULL,
  idtipo int NOT NULL,
  nome varchar(100) NOT NULL,
  nome_curto varchar(45) NOT NULL,
  url_site varchar(100) NOT NULL,
  imagem_ok tinyint(4) NOT NULL,
  versao int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idevento_nome_eventoempresa_UN (idevento,nome),
  KEY idtipo_eventoempresa_FK_idx (idtipo),
  CONSTRAINT idevento_eventoempresa_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT idtipo_eventoempresa_FK FOREIGN KEY (idtipo) REFERENCES tipoempresa (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventolocal;
CREATE TABLE eventolocal (
  id int NOT NULL AUTO_INCREMENT,
  idevento int NOT NULL,
  idlocal int NOT NULL,
  capacidade int NOT NULL,
  cor int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idevento_idlocal_eventolocal_UN (idevento,idlocal),
  KEY idlocal_FK_idx (idlocal),
  CONSTRAINT idevento_eventolocal_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT idlocal_eventolocal_FK FOREIGN KEY (idlocal) REFERENCES local (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventopalestrante;
CREATE TABLE eventopalestrante (
  id int NOT NULL AUTO_INCREMENT,
  idevento int NOT NULL,
  idempresa int NOT NULL,
  nome varchar(100) NOT NULL,
  nome_curto varchar(45) NOT NULL,
  email varchar(100) NOT NULL,
  oculto tinyint(4) NOT NULL,
  confirmado tinyint(4) NOT NULL,
  prioridade tinyint(4) NOT NULL,
  cargo varchar(45) NOT NULL,
  url_site varchar(100) NOT NULL,
  url_twitter varchar(100) NOT NULL,
  url_facebook varchar(100) NOT NULL,
  url_linkedin varchar(100) NOT NULL,
  bio varchar(1000) NOT NULL,
  bio_curta varchar(200) NOT NULL,
  versao int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idevento_email_eventopalestrante_UN (idevento,email),
  KEY idempresa_eventopalestrante_FK_idx (idempresa),
  CONSTRAINT idempresa_eventopalestrante_FK FOREIGN KEY (idempresa) REFERENCES eventoempresa (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT idevento_eventopalestrante_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventosessao;
CREATE TABLE eventosessao (
  id int NOT NULL AUTO_INCREMENT,
  idcurso int NOT NULL,
  idevento int NOT NULL,
  ideventolocal int NOT NULL,
  idformato int NOT NULL,
  idtiposessao int NOT NULL,
  idvertical int NOT NULL,
  nome varchar(100) NOT NULL,
  nome_curto varchar(45) NOT NULL,
  data datetime NOT NULL,
  inicio smallint NOT NULL,
  termino smallint NOT NULL,
  url_remota varchar(100) NOT NULL,
  url_privada tinyint(4) NOT NULL,
  descricao varchar(200) NOT NULL,
  oculta tinyint(4) NOT NULL,
  sugestao tinyint(4) NOT NULL,
  publico_alvo varchar(100) NOT NULL,
  tags varchar(100) NOT NULL,
  permiteinscricao tinyint(4) NOT NULL,
  permitesimultanea tinyint(4) NOT NULL,
  acomminutos int NOT NULL,
  senhacontrole varchar(45) NOT NULL,
  senhapresenca varchar(45) NOT NULL,
  mensagemesgotada varchar(250) NOT NULL,
  -- TIPOMULTIDATA_NENHUM = 0
  -- TIPOMULTIDATA_MINIMO_EXIGIDO = 1
  -- TIPOMULTIDATA_PROPORCIONAL = 2
  tipomultidata tinyint(4) NOT NULL,
  presencaminima tinyint(4) NOT NULL,
  encontrostotais tinyint(4) NOT NULL,
  id_integra bigint NOT NULL,
  status_integra tinyint(4) NOT NULL,
  PRIMARY KEY (id),
  KEY ideventodatainiciotermino_eventosessao_FK_idx (idevento,data,inicio,termino,permitesimultanea),
  KEY datainiciotermino_eventosessao_FK_idx (data,inicio,termino,permitesimultanea),
  KEY ideventoeventolocal_eventosessao_FK_idx (idevento,ideventolocal),
  KEY idcurso_eventosessao_FK_idx (idcurso),
  KEY ideventolocal_eventosessao_FK_idx (ideventolocal),
  KEY idformato_eventosessao_FK_idx (idformato),
  KEY idtiposessao_eventosessao_FK_idx (idtiposessao),
  KEY idvertical_eventosessao_FK_idx (idvertical),
  KEY ideventosessao_id_integra_idx (id_integra),
  CONSTRAINT idcurso_eventosessao_FK FOREIGN KEY (idcurso) REFERENCES curso (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT idevento_eventosessao_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT ideventolocal_eventosessao_FK FOREIGN KEY (ideventolocal) REFERENCES eventolocal (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT idformato_eventosessao_FK FOREIGN KEY (idformato) REFERENCES formato (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT idtiposessao_eventosessao_FK FOREIGN KEY (idtiposessao) REFERENCES tiposessao (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT idvertical_eventosessao_FK FOREIGN KEY (idvertical) REFERENCES vertical (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventosessaopalestrante;
CREATE TABLE eventosessaopalestrante (
  id int NOT NULL AUTO_INCREMENT,
  idevento int NOT NULL,
  ideventosessao int NOT NULL,
  ideventopalestrante int NOT NULL,
  ordem tinyint(4) NOT NULL,
  email datetime DEFAULT NULL,
  aceite datetime DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ideventosessaopalestrante_eventosessaopalestrante_UN (idevento,ideventosessao,ideventopalestrante),
  KEY ideventosessao_eventosessaopalestrante_FK_idx (ideventosessao),
  KEY ideventopalestrante_eventosessaopalestrante_FK_idx (ideventopalestrante),
  CONSTRAINT idevento_eventosessaopalestrante_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT ideventosessao_eventosessaopalestrante_FK FOREIGN KEY (ideventosessao) REFERENCES eventosessao (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT ideventopalestrante_eventosessaopalestrante_FK FOREIGN KEY (ideventopalestrante) REFERENCES eventopalestrante (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventosessaomultidata;
CREATE TABLE eventosessaomultidata (
  id bigint NOT NULL AUTO_INCREMENT,
  ideventosessao int NOT NULL,
  data datetime NOT NULL,
  inicio smallint NOT NULL,
  termino smallint NOT NULL,
  permitesimultanea tinyint(4) NOT NULL,
  PRIMARY KEY (id),
  KEY ideventosessaodata_eventosessaomultidata_FK_idx (ideventosessao,data),
  KEY datainiciotermino_eventosessaomultidata_FK_idx (data,inicio,termino,permitesimultanea),
  CONSTRAINT ideventosessao_eventosessaomultidata_FK FOREIGN KEY (ideventosessao) REFERENCES eventosessao (id) ON DELETE CASCADE ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventousuario;
CREATE TABLE eventousuario (
  id int NOT NULL AUTO_INCREMENT,
  idevento int NOT NULL,
  idusuario int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idevento_idusuario_eventousuario_UN (idevento,idusuario),
  KEY idusuario_FK_idx (idusuario),
  CONSTRAINT idevento_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (id) ON DELETE CASCADE ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS participante;
CREATE TABLE participante (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  login varchar(50) DEFAULT NULL,
  email varchar(100) NOT NULL,
  campus varchar(25) DEFAULT NULL,
  plano varchar(50) DEFAULT NULL,
  ra varchar(25) DEFAULT NULL,
  tipo tinyint(4) NOT NULL,
  idinstrucao int DEFAULT NULL,
  idprofissao int DEFAULT NULL,
  empresa varchar(100) DEFAULT NULL,
  senha varchar(100) NOT NULL,
  token char(32) DEFAULT NULL,
  data_criacao datetime NOT NULL,
  data_reset_senha datetime DEFAULT NULL,
  token_reset_senha char(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY email_UN (email),
  CONSTRAINT idinstrucao_FK FOREIGN KEY (idinstrucao) REFERENCES instrucao (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT idprofissao_FK FOREIGN KEY (idprofissao) REFERENCES profissao (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventosessaoparticipante;
CREATE TABLE eventosessaoparticipante (
  id bigint NOT NULL AUTO_INCREMENT,
  idevento int NOT NULL, -- Para acelerar as buscas e contagens, sem utilizar JOIN's
  ideventosessao int NOT NULL,
  idparticipante int NOT NULL,
  creditaracom tinyint(4) NOT NULL,
  encontrospresentes tinyint(4) NOT NULL,
  data_inscricao datetime NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idsessao_idparticipante_eventosessaoparticipante_UN (idevento,ideventosessao,idparticipante),
  KEY idparticipante_FK_idx (idparticipante),
  KEY idevento_idparticipante_idx (idevento, idparticipante),
  KEY ideventosessao_idparticipante_idx (ideventosessao, idparticipante),
  CONSTRAINT ideventosessao_FK FOREIGN KEY (ideventosessao) REFERENCES eventosessao (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT idparticipante_FK FOREIGN KEY (idparticipante) REFERENCES participante (id) ON DELETE CASCADE ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventosessaoparticipantemultidata;
CREATE TABLE eventosessaoparticipantemultidata (
  id bigint NOT NULL AUTO_INCREMENT,
  ideventosessaoparticipante bigint NOT NULL,
  data_presenca datetime NOT NULL,
  ideventosessao int NOT NULL,
  idparticipante int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ideventosessaoparticipante_data_presenca_multidata_UN (ideventosessaoparticipante, data_presenca),
  KEY ideventosessao_idparticipante_multidata_idx (ideventosessao, idparticipante),
  CONSTRAINT ideventosessaoparticipante_multidata_FK FOREIGN KEY (ideventosessaoparticipante) REFERENCES eventosessaoparticipante (id) ON DELETE CASCADE ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventosessaoavaliacao;
CREATE TABLE eventosessaoavaliacao (
  id bigint NOT NULL AUTO_INCREMENT,
  ideventosessaoparticipante bigint NOT NULL,
  avaliacao tinyint(4) NOT NULL,
  comentario varchar(100) NULL,
  data_avaliacao datetime NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ideventosessaoparticipante_eventosessaoavaliacao_UN (ideventosessaoparticipante),
  CONSTRAINT ideventosessaoparticipante_FK FOREIGN KEY (ideventosessaoparticipante) REFERENCES eventosessaoparticipante (id) ON DELETE CASCADE ON UPDATE RESTRICT
);
