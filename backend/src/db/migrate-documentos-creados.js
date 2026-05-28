require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Migrando documentos creados desde editor + plantillas...\n');

  const [tipoCol] = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'documentos'
       AND COLUMN_NAME = 'tipo'`
  );
  if (!tipoCol) {
    await query(`
      ALTER TABLE documentos
      ADD COLUMN tipo ENUM('importado','creado') NOT NULL DEFAULT 'importado' AFTER nombre,
      ADD COLUMN contenido_html LONGTEXT NULL AFTER archivo_firmado_path,
      ADD COLUMN plantilla_id INT UNSIGNED NULL AFTER contenido_html
    `);
    console.log('  ✓ Columnas tipo, contenido_html, plantilla_id agregadas a documentos');
  } else {
    console.log('  · Columnas ya existen en documentos');
  }

  await query(`
    CREATE TABLE IF NOT EXISTS documento_campos (
      id              INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      documento_id    INT UNSIGNED NOT NULL,
      nombre          VARCHAR(80) NOT NULL,
      label           VARCHAR(160) NOT NULL,
      tipo            ENUM('texto','numero','fecha','email','telefono') NOT NULL DEFAULT 'texto',
      valor           TEXT,
      requerido       TINYINT(1) NOT NULL DEFAULT 1,
      orden           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_campo_doc FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE,
      UNIQUE KEY uniq_doc_nombre (documento_id, nombre),
      KEY idx_campo_doc (documento_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✓ Tabla documento_campos');

  await query(`
    CREATE TABLE IF NOT EXISTS plantillas_documentos (
      id              INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      nombre          VARCHAR(200) NOT NULL,
      descripcion     TEXT,
      contenido_html  LONGTEXT NOT NULL,
      campos_json     JSON,
      asunto_correo   VARCHAR(200),
      mensaje_correo  TEXT,
      creado_por      INT UNSIGNED,
      activo          TINYINT(1) NOT NULL DEFAULT 1,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_plant_user FOREIGN KEY (creado_por) REFERENCES users(id) ON DELETE SET NULL,
      KEY idx_plant_activo (activo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✓ Tabla plantillas_documentos');

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
