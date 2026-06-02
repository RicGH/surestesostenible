require('dotenv').config();
const { pool, query, queryOne } = require('../config/db');

(async () => {
  console.log('Migrando: xml_path (CFDI) en viaticos_gastos...\n');

  const existe = await queryOne(
    `SELECT COUNT(*) AS n
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'viaticos_gastos'
       AND COLUMN_NAME = 'xml_path'`
  );

  if (existe && Number(existe.n) > 0) {
    console.log('  · La columna xml_path ya existe, nada que hacer.');
  } else {
    await query(
      `ALTER TABLE viaticos_gastos
       ADD COLUMN xml_path VARCHAR(255) NULL AFTER archivo`
    );
    console.log('  ✓ Columna xml_path agregada');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
