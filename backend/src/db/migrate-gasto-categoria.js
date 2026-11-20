require('dotenv').config();
const { pool, query } = require('../config/db');

// Tipo de gasto de cada comprobante (vuelos, hospedaje, alimentos, transporte, otros),
// las mismas categorías con que se solicita el viático.
(async () => {
  console.log('Agregando categoria a viaticos_gastos...\n');

  const [exists] = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'viaticos_gastos' AND COLUMN_NAME = 'categoria'`
  );
  if (exists) {
    console.log('  · categoria ya existe');
  } else {
    await query(
      `ALTER TABLE viaticos_gastos
       ADD COLUMN categoria ENUM('vuelos','hospedaje','alimentos','transporte','otros') NULL AFTER monto`
    );
    console.log('  ✓ viaticos_gastos.categoria');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
