require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Creando catálogos contables...\n');

  await query(`
    CREATE TABLE IF NOT EXISTS catalogos (
      id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      tipo        ENUM('proyecto','cuenta','partida','objetivo_estrategico') NOT NULL,
      nombre      VARCHAR(160) NOT NULL,
      activo      TINYINT(1) NOT NULL DEFAULT 1,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_catalogo_tipo_nombre (tipo, nombre),
      KEY idx_catalogo_tipo (tipo, activo)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✓ Tabla catalogos');

  const [exists] = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'viaticos_solicitudes' AND COLUMN_NAME = 'objetivo_estrategico'`
  );
  if (exists) {
    console.log('  · objetivo_estrategico ya existe');
  } else {
    await query(`ALTER TABLE viaticos_solicitudes ADD COLUMN objetivo_estrategico VARCHAR(160) NULL AFTER partida`);
    console.log('  ✓ viaticos_solicitudes.objetivo_estrategico');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
