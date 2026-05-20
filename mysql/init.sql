-- Plataforma de Administración: schema inicial
SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS users (
  id              INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  email           VARCHAR(160) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  nombre          VARCHAR(120) NOT NULL,
  rol             ENUM('admin','colaborador','proveedor','finanzas') NOT NULL,
  activo          TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_users_rol (rol),
  KEY idx_users_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS proveedores (
  id              INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id         INT UNSIGNED NOT NULL UNIQUE,
  rfc             VARCHAR(13) NOT NULL UNIQUE,
  razon_social    VARCHAR(200) NOT NULL,
  direccion       VARCHAR(255),
  banco           VARCHAR(120),
  cuenta_clabe    VARCHAR(18),
  documentacion   VARCHAR(500),
  estado          ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  motivo_rechazo  VARCHAR(500),
  aprobado_por    INT UNSIGNED,
  aprobado_at     DATETIME,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_prov_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_prov_aprobador FOREIGN KEY (aprobado_por) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_prov_estado (estado),
  KEY idx_prov_rfc (rfc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS viaticos_solicitudes (
  id                 INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  folio              VARCHAR(20) NOT NULL UNIQUE,
  colaborador_id     INT UNSIGNED NOT NULL,
  destino            VARCHAR(160) NOT NULL,
  fecha_inicio       DATE NOT NULL,
  fecha_fin          DATE NOT NULL,
  motivo             TEXT NOT NULL,
  monto_vuelos       DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_hospedaje    DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_alimentos    DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_transporte   DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_otros        DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_total        DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_gastado      DECIMAL(12,2) NOT NULL DEFAULT 0,
  proyecto           VARCHAR(80),
  cuenta             VARCHAR(80),
  partida            VARCHAR(80),
  estado             ENUM('pendiente','aprobado','pagado','rechazado','en_proceso','cerrado','cancelado') NOT NULL DEFAULT 'pendiente',
  motivo_rechazo     VARCHAR(500),
  permite_edicion    TINYINT(1) NOT NULL DEFAULT 0,
  aprobado_por       INT UNSIGNED,
  aprobado_at        DATETIME,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_viat_colab FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_viat_aprobador FOREIGN KEY (aprobado_por) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_viat_estado (estado),
  KEY idx_viat_colab (colaborador_id),
  KEY idx_viat_fecha (fecha_inicio, fecha_fin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS viaticos_pagos (
  id                 INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  solicitud_id       INT UNSIGNED NOT NULL,
  ajuste_id          INT UNSIGNED NULL,
  monto              DECIMAL(12,2) NOT NULL,
  fecha_pago         DATETIME NOT NULL,
  comprobante_path   VARCHAR(500) NULL,
  referencia         VARCHAR(80),
  pagado_por         INT UNSIGNED,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vpago_solicitud FOREIGN KEY (solicitud_id) REFERENCES viaticos_solicitudes(id) ON DELETE CASCADE,
  CONSTRAINT fk_vpago_user FOREIGN KEY (pagado_por) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_vpago_solicitud (solicitud_id),
  KEY idx_vpago_ajuste (ajuste_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS viaticos_ajustes (
  id                 INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  solicitud_id       INT UNSIGNED NOT NULL,
  motivo             TEXT NOT NULL,
  monto_vuelos       DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_hospedaje    DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_alimentos    DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_transporte   DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_otros        DECIMAL(12,2) NOT NULL DEFAULT 0,
  monto_total        DECIMAL(12,2) NOT NULL DEFAULT 0,
  estado             ENUM('pendiente','aprobado','pagado','rechazado') NOT NULL DEFAULT 'pendiente',
  motivo_rechazo     VARCHAR(500),
  aprobado_por       INT UNSIGNED,
  aprobado_at        DATETIME,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_vaj_solicitud FOREIGN KEY (solicitud_id) REFERENCES viaticos_solicitudes(id) ON DELETE CASCADE,
  CONSTRAINT fk_vaj_aprobador FOREIGN KEY (aprobado_por) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_vaj_solicitud (solicitud_id),
  KEY idx_vaj_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS viaticos_gastos (
  id              INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  solicitud_id    INT UNSIGNED NOT NULL,
  archivo         VARCHAR(500) NOT NULL,
  monto           DECIMAL(12,2) NOT NULL,
  rfc_emisor      VARCHAR(13),
  nombre_emisor   VARCHAR(200),
  fecha           DATE NOT NULL,
  concepto        VARCHAR(255),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_gasto_solicitud FOREIGN KEY (solicitud_id) REFERENCES viaticos_solicitudes(id) ON DELETE CASCADE,
  KEY idx_gasto_solicitud (solicitud_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS facturas_proveedor (
  id              INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  folio           VARCHAR(40) NOT NULL UNIQUE,
  proveedor_id    INT UNSIGNED NOT NULL,
  uuid_cfdi       VARCHAR(40),
  rfc_emisor      VARCHAR(13),
  nombre_emisor   VARCHAR(200),
  monto           DECIMAL(12,2) NOT NULL,
  moneda          VARCHAR(3) NOT NULL DEFAULT 'MXN',
  fecha_emision   DATE NOT NULL,
  pdf_path        VARCHAR(500) NOT NULL,
  xml_path        VARCHAR(500) NOT NULL,
  estado          ENUM('en_revision','aprobada','rechazada','pagada','cancelada') NOT NULL DEFAULT 'en_revision',
  motivo_rechazo  VARCHAR(500),
  aprobada_por    INT UNSIGNED,
  aprobada_at     DATETIME,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fact_prov FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE RESTRICT,
  CONSTRAINT fk_fact_aprobador FOREIGN KEY (aprobada_por) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_fact_estado (estado),
  KEY idx_fact_proveedor (proveedor_id),
  KEY idx_fact_fecha (fecha_emision)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS pagos (
  id                  INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  factura_id          INT UNSIGNED NOT NULL UNIQUE,
  fecha_pago          DATETIME NOT NULL,
  comprobante_path    VARCHAR(500) NOT NULL,
  referencia          VARCHAR(80),
  pagado_por          INT UNSIGNED,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pago_factura FOREIGN KEY (factura_id) REFERENCES facturas_proveedor(id) ON DELETE CASCADE,
  CONSTRAINT fk_pago_user FOREIGN KEY (pagado_por) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notificaciones (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  tipo        VARCHAR(40) NOT NULL,
  titulo      VARCHAR(160) NOT NULL,
  mensaje     VARCHAR(500) NOT NULL,
  url         VARCHAR(255),
  leida       TINYINT(1) NOT NULL DEFAULT 0,
  email_estado ENUM('no_enviado','enviado','fallido','desactivado') NOT NULL DEFAULT 'no_enviado',
  email_error  VARCHAR(500),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_notif_user_leida (user_id, leida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS password_resets (
  id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  DATETIME NOT NULL,
  used        TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pwreset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  KEY idx_pwreset_token (token_hash),
  KEY idx_pwreset_user (user_id, used)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_settings (
  `key`        VARCHAR(80) PRIMARY KEY,
  `value`      JSON NOT NULL,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS auditoria (
  id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id     INT UNSIGNED,
  accion      VARCHAR(80) NOT NULL,
  entidad     VARCHAR(60) NOT NULL,
  entidad_id  INT UNSIGNED,
  detalle     JSON,
  ip          VARCHAR(45),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  KEY idx_audit_entidad (entidad, entidad_id),
  KEY idx_audit_fecha (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- El admin inicial se crea con `npm run seed:admin` desde backend/
-- (genera hash bcrypt real con la contraseña que pongas en .env)
