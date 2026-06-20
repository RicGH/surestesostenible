require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Agregando avatar_path a users...\n');

  const [exists] = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_path'`
  );
  if (exists) {
    console.log('  · avatar_path ya existe');
  } else {
    await query(`ALTER TABLE users ADD COLUMN avatar_path VARCHAR(255) NULL AFTER banco`);
    console.log('  ✓ users.avatar_path');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
