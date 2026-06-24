require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Agregando campos contables a facturas_proveedor...\n');

  const columnas = [
    { nombre: 'proyecto',             tipo: 'VARCHAR(160)', after: 'xml_path' },
    { nombre: 'cuenta',               tipo: 'VARCHAR(160)', after: 'proyecto' },
    { nombre: 'partida',              tipo: 'VARCHAR(160)', after: 'cuenta' },
    { nombre: 'objetivo_estrategico', tipo: 'VARCHAR(160)', after: 'partida' },
    { nombre: 'resultado',            tipo: 'VARCHAR(160)', after: 'objetivo_estrategico' },
    { nombre: 'concepto',             tipo: 'TEXT',         after: 'resultado' },
  ];

  for (const col of columnas) {
    const [exists] = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'facturas_proveedor' AND COLUMN_NAME = ?`,
      [col.nombre]
    );
    if (exists) {
      console.log(`  · ${col.nombre} ya existe`);
    } else {
      await query(
        `ALTER TABLE facturas_proveedor ADD COLUMN ${col.nombre} ${col.tipo} NULL AFTER ${col.after}`
      );
      console.log(`  ✓ facturas_proveedor.${col.nombre}`);
    }
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
