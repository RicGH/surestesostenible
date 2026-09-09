require('dotenv').config();
const { pool, query } = require('../config/db');

const columnas = [
  { nombre: 'eliminado',     tipo: 'TINYINT(1) NOT NULL DEFAULT 0' },
  { nombre: 'eliminado_at',  tipo: 'DATETIME NULL' },
  { nombre: 'eliminado_por', tipo: 'INT UNSIGNED NULL' },
];

const tablas = [
  { tabla: 'viaticos_solicitudes', indice: 'idx_viat_eliminado' },
  { tabla: 'viaticos_ajustes',     indice: 'idx_vaj_eliminado' },
];

(async () => {
  console.log('Agregando columnas de borrado lógico a viáticos...\n');
  for (const { tabla, indice } of tablas) {
    for (const col of columnas) {
      const [exists] = await query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
        [tabla, col.nombre]
      );
      if (exists) {
        console.log(`  · ${tabla}.${col.nombre} ya existe`);
      } else {
        await query(`ALTER TABLE ${tabla} ADD COLUMN ${col.nombre} ${col.tipo}`);
        console.log(`  ✓ ${tabla}.${col.nombre}`);
      }
    }

    const [idx] = await query(
      `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [tabla, indice]
    );
    if (idx) {
      console.log(`  · ${indice} ya existe`);
    } else {
      await query(`ALTER TABLE ${tabla} ADD KEY ${indice} (eliminado)`);
      console.log(`  ✓ ${indice}`);
    }
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
