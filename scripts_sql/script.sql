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
  UNIQUE KEY login_UNIQUE (login)
)

INSERT INTO usuario (login, nome, tipo, senha, token, idevento_logado) VALUES ('ADMIN', 'ADMINISTRADOR', 1, 'peTcC99vkvvLqGQL7mdhGuJZIvL2iMEqvCNvZw3475PJ:JVyo1Pg2HyDyw9aSOd3gNPT30KdEyiUYCjs7RUzSoYGN', NULL, 0);

-- DROP TABLE IF EXISTS curso;
CREATE TABLE curso (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UNIQUE (nome)
);

-- DROP TABLE IF EXISTS formato;
CREATE TABLE formato (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UNIQUE (nome)
);

-- DROP TABLE IF EXISTS industria;
CREATE TABLE industria (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UNIQUE (nome)
);

-- DROP TABLE IF EXISTS instrucao;
CREATE TABLE instrucao (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  ordem int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UNIQUE (nome),
  KEY ordem_INDEX (ordem)
);

-- DROP TABLE IF EXISTS profissao;
CREATE TABLE profissao (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UNIQUE (nome)
);

-- DROP TABLE IF EXISTS tiposessao;
CREATE TABLE tiposessao (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UNIQUE (nome)
);

-- DROP TABLE IF EXISTS tipoempresa;
CREATE TABLE tipoempresa (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(40) NOT NULL,
  nome_site varchar(40) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UNIQUE (nome)
);

-- DROP TABLE IF EXISTS vertical;
CREATE TABLE vertical (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  descricao varchar(100) DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UNIQUE (nome)
);

-- DROP TABLE IF EXISTS unidade;
CREATE TABLE unidade (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  sigla varchar(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nome_UNIQUE (nome),
  UNIQUE KEY sigla_UNIQUE (sigla)
);

-- DROP TABLE IF EXISTS local;
CREATE TABLE local (
  id int NOT NULL AUTO_INCREMENT,
  nome varchar(100) NOT NULL,
  idunidade int NOT NULL,
  capacidade_real int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY nomeidunidade_UNIQUE (nome,idunidade),
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
  UNIQUE KEY nome_INDEX (nome)
);

-- DROP TABLE IF EXISTS eventodata;
CREATE TABLE eventodata (
  id int NOT NULL AUTO_INCREMENT,
  idevento int NOT NULL,
  ano int NOT NULL,
  mes int NOT NULL,
  dia int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ano_mes_dia_eventodata_UN (ano,mes,dia),
  KEY idevento_eventodata_FK_idx (idevento),
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
  UNIQUE KEY nome_eventoempresa_UN (nome) /*!80000 INVISIBLE */,
  KEY idevento_eventoempresa_FK_idx (idevento),
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
  UNIQUE KEY inicio_termino_eventohorario_FK (inicio,termino),
  KEY idevento_eventohorario_FK_idx (idevento),
  CONSTRAINT idevento_eventohorario_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventolocal;
CREATE TABLE eventolocal (
  id int NOT NULL AUTO_INCREMENT,
  idevento int NOT NULL,
  idlocal int NOT NULL,
  capacidade int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY eventolocal_UNIQUE (idevento,idlocal),
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
  UNIQUE KEY nome_eventopalestrante_UN (nome),
  KEY idevento_eventopalestrante_FK_idx (idevento),
  KEY idempresa_eventopalestrante_FK_idx (idempresa),
  CONSTRAINT idempresa_eventopalestrante_FK FOREIGN KEY (idempresa) REFERENCES eventoempresa (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT idevento_eventopalestrante_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT
);

-- DROP TABLE IF EXISTS eventousuario;
CREATE TABLE eventousuario (
  id int NOT NULL AUTO_INCREMENT,
  idevento int NOT NULL,
  idusuario int NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY eventousuario_UNIQUE (idevento,idusuario),
  KEY idusuario_FK_idx (idusuario),
  CONSTRAINT idevento_FK FOREIGN KEY (idevento) REFERENCES evento (id) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (id) ON DELETE CASCADE ON UPDATE RESTRICT
);
