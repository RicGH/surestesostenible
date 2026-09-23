require('dotenv').config();
const { pool, query } = require('../config/db');

function folioDesdeId(id) {
  return `V-${id}`;
}

(async () => {
  console.log('Renumerando folios de viaticos_solicitudes a formato numerico (V-<id>)...\n');

  const rows = await query('SELECT id, folio FROM viaticos_solicitudes ORDER BY id');
  let cambiados = 0;
  for (const row of rows) {
    const nuevo = folioDesdeId(row.id);
    if (row.folio === nuevo) continue;
    await query('UPDATE viaticos_solicitudes SET folio = ? WHERE id = ?', [nuevo, row.id]);
    console.log(`  ${row.folio}  ->  ${nuevo}`);
    cambiados++;
  }

  console.log(`\nListo. ${cambiados}/${rows.length} folios actualizados.`);
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
