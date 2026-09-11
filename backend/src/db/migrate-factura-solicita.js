require('dotenv').config();
const { pool, query } = require('../config/db');

// Nombre de quien solicita el pago (se imprime en el oficio de pago a proveedores)
(async () => {
  const [exists] = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'facturas_proveedor' AND COLUMN_NAME = 'solicita_nombre'`
  );
  if (exists) {
    console.log('  · facturas_proveedor.solicita_nombre ya existe');
  } else {
    await query('ALTER TABLE facturas_proveedor ADD COLUMN solicita_nombre VARCHAR(160) NULL AFTER autoriza_nombre');
    console.log('  ✓ facturas_proveedor.solicita_nombre');
  }
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
