require('dotenv').config();
const { pool, query } = require('../config/db');

// El colaborador avisa que su viático ya puede cerrarse; administración lo cierra.
(async () => {
  console.log('Agregando solicitud de cierre a viaticos_solicitudes...\n');

  const columnas = [
    ['cierre_solicitado_at', 'DATETIME NULL AFTER sharepoint_url'],
    ['cierre_solicitado_por', 'INT NULL AFTER cierre_solicitado_at'],
  ];
  for (const [nombre, def] of columnas) {
    const [exists] = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'viaticos_solicitudes' AND COLUMN_NAME = ?`,
      [nombre]
    );
    if (exists) {
      console.log(`  · ${nombre} ya existe`);
    } else {
      await query(`ALTER TABLE viaticos_solicitudes ADD COLUMN ${nombre} ${def}`);
      console.log(`  ✓ viaticos_solicitudes.${nombre}`);
    }
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
