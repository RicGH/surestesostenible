require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Permitiendo proveedor sin usuario (creación de login al aprobar)...\n');

  // 1) Hacer user_id NULLABLE (un proveedor pendiente puede no tener usuario aún)
  await query(`ALTER TABLE proveedores MODIFY user_id INT UNSIGNED NULL`);
  console.log('  ✓ user_id ahora NULL');

  // 2) Campos para guardar los datos del usuario hasta que se apruebe
  const cols = [
    { name: 'pending_nombre',        def: 'VARCHAR(120) NULL' },
    { name: 'pending_email',         def: 'VARCHAR(160) NULL' },
    { name: 'pending_password_hash', def: 'VARCHAR(255) NULL' },
  ];
  for (const col of cols) {
    const [exists] = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proveedores' AND COLUMN_NAME = ?`,
      [col.name]
    );
    if (!exists) {
      await query(`ALTER TABLE proveedores ADD COLUMN ${col.name} ${col.def}`);
      console.log(`  ✓ ${col.name}`);
    } else {
      console.log(`  · ${col.name} ya existe`);
    }
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
