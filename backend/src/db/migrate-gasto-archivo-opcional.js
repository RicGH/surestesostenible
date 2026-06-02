require('dotenv').config();
const { pool, query, queryOne } = require('../config/db');

(async () => {
  console.log('Migrando: archivo opcional en viaticos_gastos (basta XML o comprobante)...\n');

  const col = await queryOne(
    `SELECT IS_NULLABLE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'viaticos_gastos'
       AND COLUMN_NAME = 'archivo'`
  );

  if (col && col.IS_NULLABLE === 'YES') {
    console.log('  · La columna archivo ya es nullable, nada que hacer.');
  } else {
    await query(`ALTER TABLE viaticos_gastos MODIFY COLUMN archivo VARCHAR(500) NULL`);
    console.log('  ✓ Columna archivo ahora es opcional (NULL)');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
