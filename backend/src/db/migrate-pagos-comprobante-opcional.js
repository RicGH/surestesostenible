require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Haciendo comprobante_path opcional en viaticos_pagos...\n');

  await query(`ALTER TABLE viaticos_pagos MODIFY COLUMN comprobante_path VARCHAR(500) NULL`);
  console.log('  ✓ viaticos_pagos.comprobante_path ahora es NULL');

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
