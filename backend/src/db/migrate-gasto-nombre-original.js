require('dotenv').config();
const { pool, query } = require('../config/db');

// Guarda el nombre con el que el colaborador subió el comprobante y el XML
// del gasto, para que al descargarlos salgan con ese mismo nombre.
(async () => {
  console.log('Agregando nombres originales a viaticos_gastos...\n');

  const columnas = [
    { nombre: 'archivo_nombre_original', after: 'archivo' },
    { nombre: 'xml_nombre_original', after: 'xml_path' },
  ];

  for (const c of columnas) {
    const [exists] = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'viaticos_gastos' AND COLUMN_NAME = ?`,
      [c.nombre]
    );
    if (exists) {
      console.log(`  · ${c.nombre} ya existe`);
    } else {
      await query(`ALTER TABLE viaticos_gastos ADD COLUMN ${c.nombre} VARCHAR(255) NULL AFTER ${c.after}`);
      console.log(`  ✓ viaticos_gastos.${c.nombre}`);
    }
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
