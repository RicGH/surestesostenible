require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Agregando proveedor_id a documentos...\n');

  const [exists] = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documentos' AND COLUMN_NAME = 'proveedor_id'`
  );

  if (exists) {
    console.log('  · proveedor_id ya existe');
  } else {
    await query(`ALTER TABLE documentos ADD COLUMN proveedor_id INT UNSIGNED NULL AFTER creado_por`);
    await query(
      `ALTER TABLE documentos
       ADD CONSTRAINT fk_doc_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE SET NULL`
    );
    await query(`ALTER TABLE documentos ADD KEY idx_doc_proveedor (proveedor_id)`);
    console.log('  ✓ proveedor_id + FK + índice');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
