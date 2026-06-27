require('dotenv').config();
const { pool, query, queryOne } = require('../config/db');

(async () => {
  console.log('Migrando: razon_social en viaticos_gastos...\n');

  const existe = await queryOne(
    `SELECT COUNT(*) AS n
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'viaticos_gastos'
       AND COLUMN_NAME = 'razon_social'`
  );

  if (existe && Number(existe.n) > 0) {
    console.log('  · La columna razon_social ya existe, nada que hacer.');
  } else {
    await query(
      `ALTER TABLE viaticos_gastos
       ADD COLUMN razon_social VARCHAR(255) NULL AFTER rfc_emisor`
    );
    console.log('  ✓ Columna razon_social agregada');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
