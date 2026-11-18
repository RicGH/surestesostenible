require('dotenv').config();
const { pool, query } = require('../config/db');

// Firma del oficio de comisión de viáticos: el oficio se guarda como un documento
// (tipo 'oficio') con dos firmantes en orden (Autoriza → Recibe) y el viático
// apunta a él con oficio_documento_id.
(async () => {
  console.log('Migrando firma de oficios de comisión...\n');

  const [tipoCol] = await query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'documentos' AND COLUMN_NAME = 'tipo'`
  );
  if (tipoCol && !String(tipoCol.COLUMN_TYPE).includes("'oficio'")) {
    await query(
      `ALTER TABLE documentos MODIFY COLUMN tipo ENUM('importado','creado','contrato','oficio') NOT NULL DEFAULT 'importado'`
    );
    console.log("  ✓ documentos.tipo admite 'oficio'");
  } else {
    console.log("  · documentos.tipo ya admite 'oficio'");
  }

  const [col] = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'viaticos_solicitudes' AND COLUMN_NAME = 'oficio_documento_id'`
  );
  if (col) {
    console.log('  · viaticos_solicitudes.oficio_documento_id ya existe');
  } else {
    await query(`ALTER TABLE viaticos_solicitudes ADD COLUMN oficio_documento_id INT UNSIGNED NULL`);
    console.log('  ✓ viaticos_solicitudes.oficio_documento_id');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
