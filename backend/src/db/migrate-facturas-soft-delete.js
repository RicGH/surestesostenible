require('dotenv').config();
const { pool, query } = require('../config/db');

const columnas = [
  { nombre: 'eliminado',     tipo: 'TINYINT(1) NOT NULL DEFAULT 0', after: 'aprobada_at' },
  { nombre: 'eliminado_at',  tipo: 'DATETIME NULL',                 after: 'eliminado' },
  { nombre: 'eliminado_por', tipo: 'INT UNSIGNED NULL',             after: 'eliminado_at' },
];

(async () => {
  console.log('Agregando columnas de borrado lógico a facturas_proveedor...\n');
  for (const col of columnas) {
    const [exists] = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'facturas_proveedor' AND COLUMN_NAME = ?`,
      [col.nombre]
    );
    if (exists) {
      console.log(`  · facturas_proveedor.${col.nombre} ya existe`);
    } else {
      await query(`ALTER TABLE facturas_proveedor ADD COLUMN ${col.nombre} ${col.tipo} AFTER ${col.after}`);
      console.log(`  ✓ facturas_proveedor.${col.nombre}`);
    }
  }

  const [idx] = await query(
    `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'facturas_proveedor' AND INDEX_NAME = 'idx_fact_eliminado'`
  );
  if (idx) {
    console.log('  · idx_fact_eliminado ya existe');
  } else {
    await query('ALTER TABLE facturas_proveedor ADD KEY idx_fact_eliminado (eliminado)');
    console.log('  ✓ idx_fact_eliminado');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
