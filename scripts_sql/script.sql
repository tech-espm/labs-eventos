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

INSERT INTO usuario (login, nome, tipo, senha, token, idevento_logado) VALUES ('ADMIN', 'ADMINISTRADOR', 1, 'peTcC99vkvvLqGQL7mdhGuJZIvL2iMEqvCNvZw3475PJ:JVyo1Pg2HyDyw9aSOd3gNPT30KdEyiUYCjs7RUzSoYGN', NULL, 0);

-- DROP TABLE IF EXISTS curso;
CREATE TABLE curso (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
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
  PRIMARY KEY (id),
  UNIQUE KEY nome_UN (nome),
  UNIQUE KEY sigla_UN (sigla)
);

-- DROP TABLE IF EXISTS local;
CREATE TABLE local (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  idunidade int NOT NULL,
  capacidade_real int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nomeidunidade_UN (nome,idunidade),
  KEY idunidade_FK_idx (idunidade),
  CONSTRAINT idunidade_FK FOREIGN KEY (idunidade) REFERENCES unidade (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS evento;
CREATE TABLE evento (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  url varchar(50) NOT NULL,
  descricao varchar(250) NOT NULL,
  habilitado tinyint(4) NOT NULL,
  aspectratioempresa varchar(16) DEFAULT NULL,
  aspectratiopalestrante varchar(16) DEFAULT NULL,
  permitealuno tinyint(4) NOT NULL,
  permitefuncionario tinyint(4) NOT NULL,
  permiteexterno tinyint(4) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UN (nome),
  UNIQUE KEY url_UN (url)
);

-- DROP TABLE IF EXISTS eventodata;
CREATE TABLE eventodata (
  id int NOT NULL AUTO_INCREMENT,
  idevento int NOT NULL,
  ano int NOT NULL,
  mes int NOT NULL,
  dia int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idevento_ano_mes_dia_eventodata_UN (idevento,ano,mes,dia),
  CONSTRAINT idevento_eventodata_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventoempresa;
CREATE TABLE eventoempresa (
  id int NOT NULL AUTO_INCREMENT,
  idevento int NOT NULL,
  idtipo int NOT NULL,
  nome varchar(100) NOT NULL,
  nome_curto varchar(45) NOT NULL,
  versao int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idevento_nome_eventoempresa_UN (idevento,nome),
  KEY idtipo_eventoempresa_FK_idx (idtipo),
  CONSTRAINT idevento_eventoempresa_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT idtipo_eventoempresa_FK FOREIGN KEY (idtipo) REFERENCES tipoempresa (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventohorario;
CREATE TABLE eventohorario (
  id int NOT NULL AUTO_INCREMENT,
  idevento int NOT NULL,
  inicio varchar(50) NOT NULL,
  termino varchar(50) NOT NULL,
  ordem int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idevento_inicio_termino_eventohorario_UN (idevento,inicio,termino),
  CONSTRAINT idevento_eventohorario_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventolocal;
CREATE TABLE eventolocal (
  id int NOT NULL AUTO_INCREMENT,
  idevento int NOT NULL,
  idlocal int NOT NULL,
  capacidade int NOT NULL,
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
  cargo varchar(45) NOT NULL,
  url_site varchar(100) NOT NULL,
  url_twitter varchar(100) NOT NULL,
  url_facebook varchar(100) NOT NULL,
  url_linkedin varchar(100) NOT NULL,
  bio varchar(1000) NOT NULL,
  bio_curta varchar(200) NOT NULL,
  versao int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY idevento_nome_eventopalestrante_UN (idevento,nome),
  KEY idempresa_eventopalestrante_FK_idx (idempresa),
  CONSTRAINT idempresa_eventopalestrante_FK FOREIGN KEY (idempresa) REFERENCES eventoempresa (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT idevento_eventopalestrante_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventosessao;
CREATE TABLE eventosessao (
  id int NOT NULL AUTO_INCREMENT,
  idcurso int NOT NULL,
  idevento int NOT NULL,
  ideventodata int NOT NULL,
  ideventohorario int NOT NULL,
  ideventolocal int NOT NULL,
  idformato int NOT NULL,
  idtiposessao int NOT NULL,
  idvertical int NOT NULL,
  nome varchar(100) NOT NULL,
  nome_curto varchar(45) NOT NULL,
  publico_alvo varchar(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ideventodatahorariolocal_eventosessao_UN (idevento,ideventodata,ideventohorario,ideventolocal),
  KEY idcurso_eventosessao_FK_idx (idcurso),
  KEY ideventodata_eventosessao_FK_idx (ideventodata),
  KEY ideventohorario_eventosessao_FK_idx (ideventohorario),
  KEY ideventolocal_eventosessao_FK_idx (ideventolocal),
  KEY idformato_eventosessao_FK_idx (idformato),
  KEY idtiposessao_eventosessao_FK_idx (idtiposessao),
  KEY idvertical_eventosessao_FK_idx (idvertical),
  CONSTRAINT idcurso_eventosessao_FK FOREIGN KEY (idcurso) REFERENCES curso (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT idevento_eventosessao_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT ideventodata_eventosessao_FK FOREIGN KEY (ideventodata) REFERENCES eventodata (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT ideventohorario_eventosessao_FK FOREIGN KEY (ideventohorario) REFERENCES eventohorario (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
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
  PRIMARY KEY (id),
  UNIQUE KEY ideventosessaopalestrante_eventosessaopalestrante_UN (idevento,ideventosessao,ideventopalestrante),
  KEY ideventosessao_eventosessaopalestrante_FK_idx (ideventosessao),
  KEY ideventopalestrante_eventosessaopalestrante_FK_idx (ideventopalestrante),
  CONSTRAINT idevento_eventosessaopalestrante_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT ideventosessao_eventosessaopalestrante_FK FOREIGN KEY (ideventosessao) REFERENCES eventosessao (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT ideventopalestrante_eventosessaopalestrante_FK FOREIGN KEY (ideventopalestrante) REFERENCES eventopalestrante (id) ON DELETE RESTRICT ON UPDATE RESTRICT
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
  tipo tinyint(4) NOT NULL,
  idindustria int DEFAULT NULL,
  idinstrucao int DEFAULT NULL,
  idprofissao int DEFAULT NULL,
  senha varchar(100) NOT NULL,
  token char(32) DEFAULT NULL,
  data_criacao datetime NOT NULL,
  data_reset_senha datetime DEFAULT NULL,
  token_reset_senha char(64) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY email_UN (email),
  CONSTRAINT idindustria_FK FOREIGN KEY (idindustria) REFERENCES industria (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT idinstrucao_FK FOREIGN KEY (idinstrucao) REFERENCES instrucao (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT idprofissao_FK FOREIGN KEY (idprofissao) REFERENCES profissao (id) ON DELETE RESTRICT ON UPDATE RESTRICT
);
