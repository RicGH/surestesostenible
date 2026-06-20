require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Agregando campos autoriza/recibe a viaticos_solicitudes...\n');

  const columnas = [
    { nombre: 'autoriza_nombre', after: 'motivo' },
    { nombre: 'recibe_nombre', after: 'autoriza_nombre' },
  ];

  for (const col of columnas) {
    const [exists] = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'viaticos_solicitudes' AND COLUMN_NAME = ?`,
      [col.nombre]
    );
    if (exists) {
      console.log(`  · ${col.nombre} ya existe`);
    } else {
      await query(
        `ALTER TABLE viaticos_solicitudes ADD COLUMN ${col.nombre} VARCHAR(160) NULL AFTER ${col.after}`
      );
      console.log(`  ✓ viaticos_solicitudes.${col.nombre}`);
    }
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
