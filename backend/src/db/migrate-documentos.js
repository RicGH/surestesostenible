require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Migrando módulo de documentos (DocuSign)...\n');

  await query(`
    CREATE TABLE IF NOT EXISTS documentos (
      id                    INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      nombre                VARCHAR(200) NOT NULL,
      descripcion           TEXT,
      archivo_path          VARCHAR(500) NOT NULL,
      archivo_firmado_path  VARCHAR(500),
      estado                ENUM('borrador','enviado','parcial','firmado','declinado','cancelado','error')
                            NOT NULL DEFAULT 'borrador',
      envelope_id           VARCHAR(80),
      asunto_correo         VARCHAR(200),
      mensaje_correo        TEXT,
      creado_por            INT UNSIGNED,
      enviado_at            DATETIME,
      completado_at         DATETIME,
      created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_doc_user FOREIGN KEY (creado_por) REFERENCES users(id) ON DELETE SET NULL,
      KEY idx_doc_estado (estado),
      KEY idx_doc_envelope (envelope_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✓ Tabla documentos');

  await query(`
    CREATE TABLE IF NOT EXISTS documento_firmantes (
      id              INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      documento_id    INT UNSIGNED NOT NULL,
      tipo            ENUM('usuario','proveedor','externo') NOT NULL,
      referencia_id   INT UNSIGNED,
      nombre          VARCHAR(160) NOT NULL,
      email           VARCHAR(200) NOT NULL,
      orden           SMALLINT UNSIGNED NOT NULL DEFAULT 1,
      color           VARCHAR(20) NOT NULL DEFAULT '#2563eb',
      estado          ENUM('pendiente','enviado','firmado','declinado') NOT NULL DEFAULT 'pendiente',
      firmado_at      DATETIME,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_firmante_doc FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE,
      KEY idx_firmante_doc (documento_id),
      KEY idx_firmante_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✓ Tabla documento_firmantes');

  await query(`
    CREATE TABLE IF NOT EXISTS documento_tags (
      id              INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      documento_id    INT UNSIGNED NOT NULL,
      firmante_id     INT UNSIGNED NOT NULL,
      tipo            ENUM('firma','iniciales','fecha','texto') NOT NULL DEFAULT 'firma',
      pagina          SMALLINT UNSIGNED NOT NULL DEFAULT 1,
      x               DECIMAL(8,2) NOT NULL,
      y               DECIMAL(8,2) NOT NULL,
      ancho           DECIMAL(8,2) NOT NULL DEFAULT 140,
      alto            DECIMAL(8,2) NOT NULL DEFAULT 40,
      requerido       TINYINT(1) NOT NULL DEFAULT 1,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_tag_doc FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE,
      CONSTRAINT fk_tag_firmante FOREIGN KEY (firmante_id) REFERENCES documento_firmantes(id) ON DELETE CASCADE,
      KEY idx_tag_doc (documento_id),
      KEY idx_tag_firmante (firmante_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✓ Tabla documento_tags');

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
