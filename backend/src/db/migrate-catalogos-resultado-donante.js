require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Migrando: ampliar ENUM tipo en catalogos...\n');

  await query(`
    ALTER TABLE catalogos
    MODIFY COLUMN tipo ENUM('proyecto','cuenta','partida','objetivo_estrategico','resultado','donante') NOT NULL
  `);
  console.log('  ✓ ENUM tipo actualizado con resultado y donante');

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
