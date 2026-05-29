require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Migrando módulo de contratos...\n');

  await query(`
    CREATE TABLE IF NOT EXISTS contratos_plantillas (
      id           INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      nombre       VARCHAR(200) NOT NULL,
      descripcion  TEXT,
      archivo_path VARCHAR(500) NOT NULL,
      etiquetas_json JSON,
      activo       TINYINT(1) NOT NULL DEFAULT 1,
      creado_por   INT UNSIGNED,
      created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_cp_user FOREIGN KEY (creado_por) REFERENCES users(id) ON DELETE SET NULL,
      KEY idx_cp_activo (activo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✓ Tabla contratos_plantillas');

  // Añadir 'contrato' al enum de documentos.tipo
  await query(`
    ALTER TABLE documentos
    MODIFY COLUMN tipo ENUM('importado','creado','contrato') NOT NULL DEFAULT 'importado'
  `).catch(() => console.log('  · tipo ya incluye contrato'));
  console.log('  ✓ documentos.tipo actualizado');

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
