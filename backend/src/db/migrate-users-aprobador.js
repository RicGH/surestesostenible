require('dotenv').config();
const { pool, query, queryOne } = require('../config/db');

(async () => {
  console.log('Migrando: es_aprobador_viaticos en users...\n');

  const existe = await queryOne(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'es_aprobador_viaticos'`
  );

  if (existe && Number(existe.n) > 0) {
    console.log('  · La columna es_aprobador_viaticos ya existe, nada que hacer.');
  } else {
    await query(
      `ALTER TABLE users ADD COLUMN es_aprobador_viaticos TINYINT(1) NOT NULL DEFAULT 0 AFTER rol`
    );
    console.log('  ✓ Columna es_aprobador_viaticos agregada');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
