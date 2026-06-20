require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Agregando datos de perfil (rfc/clabe/banco) a users...\n');

  const columnas = [
    { nombre: 'rfc', tipo: 'VARCHAR(20)', after: 'nombre' },
    { nombre: 'clabe_bancaria', tipo: 'VARCHAR(40)', after: 'rfc' },
    { nombre: 'banco', tipo: 'VARCHAR(120)', after: 'clabe_bancaria' },
  ];

  for (const col of columnas) {
    const [exists] = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = ?`,
      [col.nombre]
    );
    if (exists) {
      console.log(`  · ${col.nombre} ya existe`);
    } else {
      await query(`ALTER TABLE users ADD COLUMN ${col.nombre} ${col.tipo} NULL AFTER ${col.after}`);
      console.log(`  ✓ users.${col.nombre}`);
    }
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
