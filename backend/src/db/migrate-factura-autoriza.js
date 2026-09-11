require('dotenv').config();
const { pool, query } = require('../config/db');

// Nombre de quien autoriza la factura (se imprime en el oficio de pago a proveedores)
(async () => {
  const [exists] = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'facturas_proveedor' AND COLUMN_NAME = 'autoriza_nombre'`
  );
  if (exists) {
    console.log('  · facturas_proveedor.autoriza_nombre ya existe');
  } else {
    await query('ALTER TABLE facturas_proveedor ADD COLUMN autoriza_nombre VARCHAR(160) NULL AFTER concepto');
    console.log('  ✓ facturas_proveedor.autoriza_nombre');
  }
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
