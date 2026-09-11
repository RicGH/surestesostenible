require('dotenv').config();
const { pool, query } = require('../config/db');
const plantillas = require('../services/contratos-plantillas.service');

// Vuelve a detectar las etiquetas de las plantillas de contrato activas.
// Necesario una vez: antes solo se leía el cuerpo del .docx y no la cabecera ni el pie.
(async () => {
  const rows = await query('SELECT id, nombre, etiquetas_json FROM contratos_plantillas WHERE activo = 1');
  console.log(`Re-escaneando ${rows.length} plantilla(s)...\n`);
  for (const r of rows) {
    const antes = (typeof r.etiquetas_json === 'string' ? JSON.parse(r.etiquetas_json || '[]') : r.etiquetas_json || []).length;
    const nuevas = await plantillas.reescanear(r.id);
    if (!nuevas) console.log(`  ! ${r.nombre} (#${r.id}): archivo no encontrado, se deja igual`);
    else console.log(`  ✓ ${r.nombre} (#${r.id}): ${antes} → ${nuevas.length} etiquetas`);
  }
  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
