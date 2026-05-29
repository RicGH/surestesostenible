require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  const [exists] = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'eliminado'`
  );
  if (exists) {
    console.log('· eliminado ya existe');
  } else {
    await query('ALTER TABLE users ADD COLUMN eliminado TINYINT(1) NOT NULL DEFAULT 0');
    console.log('✓ columna eliminado agregada a users');
  }
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
