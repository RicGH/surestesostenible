require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Agregando sharepoint_url a viaticos_solicitudes...\n');

  const [exists] = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'viaticos_solicitudes' AND COLUMN_NAME = 'sharepoint_url'`
  );
  if (exists) {
    console.log('  · sharepoint_url ya existe');
  } else {
    await query('ALTER TABLE viaticos_solicitudes ADD COLUMN sharepoint_url VARCHAR(1000) NULL AFTER donante');
    console.log('  ✓ viaticos_solicitudes.sharepoint_url');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
