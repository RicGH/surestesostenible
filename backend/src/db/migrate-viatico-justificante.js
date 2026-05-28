require('dotenv').config();
const { pool, query, queryOne } = require('../config/db');

(async () => {
  console.log('Migrando: justificante de salida en viaticos_solicitudes...\n');

  const existe = await queryOne(
    `SELECT COUNT(*) AS n
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'viaticos_solicitudes'
       AND COLUMN_NAME = 'justificante_path'`
  );

  if (existe && Number(existe.n) > 0) {
    console.log('  · La columna justificante_path ya existe, nada que hacer.');
  } else {
    await query(
      `ALTER TABLE viaticos_solicitudes
       ADD COLUMN justificante_path VARCHAR(255) NULL AFTER partida`
    );
    console.log('  ✓ Columna justificante_path agregada');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
