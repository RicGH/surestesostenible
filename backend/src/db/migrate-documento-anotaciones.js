require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Migrando anotaciones para PDFs importados...\n');

  await query(`
    CREATE TABLE IF NOT EXISTS documento_anotaciones (
      id              INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      documento_id    INT UNSIGNED NOT NULL,
      tipo            ENUM('texto','campo') NOT NULL DEFAULT 'texto',
      pagina          SMALLINT UNSIGNED NOT NULL DEFAULT 1,
      x               DECIMAL(8,2) NOT NULL,
      y               DECIMAL(8,2) NOT NULL,
      ancho           DECIMAL(8,2) NOT NULL DEFAULT 200,
      alto            DECIMAL(8,2) NOT NULL DEFAULT 24,
      contenido       TEXT,
      campo_nombre    VARCHAR(80),
      font_size       DECIMAL(5,1) NOT NULL DEFAULT 11.0,
      color           VARCHAR(20) NOT NULL DEFAULT '#111111',
      bold            TINYINT(1) NOT NULL DEFAULT 0,
      created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_anot_doc FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE,
      KEY idx_anot_doc (documento_id),
      KEY idx_anot_pag (documento_id, pagina)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✓ Tabla documento_anotaciones');

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
