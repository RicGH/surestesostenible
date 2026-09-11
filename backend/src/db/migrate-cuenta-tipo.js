require('dotenv').config();
const { pool, query } = require('../config/db');

// Distingue si el número guardado es una CLABE (cuenta bancaria) o un número de tarjeta.
// Los registros existentes quedan como 'cuenta', que es lo que eran hasta ahora.
const columnas = [
  { tabla: 'users_cuentas_bancarias', nombre: 'tipo',        after: 'user_id' },
  { tabla: 'viaticos_solicitudes',    nombre: 'tipo_cuenta', after: 'recibe_nombre' },
];

(async () => {
  console.log('Agregando tipo de cuenta (cuenta bancaria / tarjeta)...\n');
  for (const col of columnas) {
    const [exists] = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [col.tabla, col.nombre]
    );
    if (exists) {
      console.log(`  · ${col.tabla}.${col.nombre} ya existe`);
    } else {
      await query(
        `ALTER TABLE ${col.tabla} ADD COLUMN ${col.nombre} ENUM('cuenta','tarjeta') NOT NULL DEFAULT 'cuenta' AFTER ${col.after}`
      );
      console.log(`  ✓ ${col.tabla}.${col.nombre}`);
    }
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
