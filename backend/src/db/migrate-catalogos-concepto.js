require('dotenv').config();
const { pool, query } = require('../config/db');

// Agrega el catálogo "concepto" (concepto de la factura) al ENUM de catalogos.tipo
(async () => {
  await query(`
    ALTER TABLE catalogos
    MODIFY COLUMN tipo ENUM(
      'proyecto','cuenta','partida','objetivo_estrategico','resultado','donante','banco','concepto'
    ) NOT NULL
  `);
  console.log('✓ ENUM de catalogos.tipo actualizado con concepto');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
