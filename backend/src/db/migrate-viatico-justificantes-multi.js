require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Creando tabla viaticos_justificantes (múltiples documentos)...\n');

  await query(`
    CREATE TABLE IF NOT EXISTS viaticos_justificantes (
      id             INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      solicitud_id   INT UNSIGNED NOT NULL,
      archivo        VARCHAR(255) NOT NULL,
      nombre_original VARCHAR(255) NULL,
      created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_justificante_solicitud (solicitud_id),
      CONSTRAINT fk_justificante_solicitud
        FOREIGN KEY (solicitud_id) REFERENCES viaticos_solicitudes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✓ Tabla viaticos_justificantes');

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
