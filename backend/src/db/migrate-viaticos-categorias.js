require('dotenv').config();
const { pool, query, queryOne } = require('../config/db');

(async () => {
  console.log('Migrando viaticos_solicitudes a categorías de gasto...\n');

  const cols = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'viaticos_solicitudes'`
  );
  const set = new Set(cols.map((c) => c.COLUMN_NAME));

  const adds = [];
  if (!set.has('monto_vuelos'))     adds.push('ADD COLUMN monto_vuelos DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER motivo');
  if (!set.has('monto_hospedaje'))  adds.push('ADD COLUMN monto_hospedaje DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER monto_vuelos');
  if (!set.has('monto_alimentos'))  adds.push('ADD COLUMN monto_alimentos DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER monto_hospedaje');
  if (!set.has('monto_transporte')) adds.push('ADD COLUMN monto_transporte DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER monto_alimentos');
  if (!set.has('monto_otros'))      adds.push('ADD COLUMN monto_otros DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER monto_transporte');

  if (adds.length) {
    await query(`ALTER TABLE viaticos_solicitudes ${adds.join(', ')}`);
    console.log(`  ✓ Agregadas ${adds.length} columna(s) nueva(s)`);
  } else {
    console.log('  · Columnas nuevas ya existen');
  }

  if (set.has('costo_vuelo_ida') && set.has('costo_vuelo_vuelta')) {
    await query('UPDATE viaticos_solicitudes SET monto_vuelos = COALESCE(costo_vuelo_ida,0) + COALESCE(costo_vuelo_vuelta,0) WHERE monto_vuelos = 0');
    console.log('  ✓ monto_vuelos poblado desde columnas legacy');

    await query('ALTER TABLE viaticos_solicitudes DROP COLUMN costo_vuelo_ida, DROP COLUMN costo_vuelo_vuelta');
    console.log('  ✓ Columnas legacy eliminadas (costo_vuelo_ida, costo_vuelo_vuelta)');
  } else {
    console.log('  · Sin columnas legacy que migrar');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
