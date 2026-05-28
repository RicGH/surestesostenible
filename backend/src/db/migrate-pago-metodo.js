require('dotenv').config();
const { pool, query, queryOne } = require('../config/db');

(async () => {
  console.log('Migrando: método de pago en viaticos_pagos...\n');

  const existe = await queryOne(
    `SELECT COUNT(*) AS n
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'viaticos_pagos'
       AND COLUMN_NAME = 'metodo_pago'`
  );

  if (existe && Number(existe.n) > 0) {
    console.log('  · La columna metodo_pago ya existe, nada que hacer.');
  } else {
    await query(
      `ALTER TABLE viaticos_pagos
       ADD COLUMN metodo_pago VARCHAR(20) NULL AFTER referencia`
    );
    console.log('  ✓ Columna metodo_pago agregada');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
