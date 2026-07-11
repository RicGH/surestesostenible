require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Migrando sistema de firma interna...\n');

  const checkCol = async (table, col) => {
    const [r] = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, col]
    );
    return !!r;
  };

  // documento_firmantes: firma_token + firmado_interno_at
  if (!(await checkCol('documento_firmantes', 'firma_token'))) {
    await query(`ALTER TABLE documento_firmantes ADD COLUMN firma_token VARCHAR(64) NULL AFTER estado`);
    await query(`ALTER TABLE documento_firmantes ADD UNIQUE KEY uniq_firma_token (firma_token)`);
    console.log('  ✓ firma_token en documento_firmantes');
  } else { console.log('  · firma_token ya existe'); }

  if (!(await checkCol('documento_firmantes', 'firmado_interno_at'))) {
    await query(`ALTER TABLE documento_firmantes ADD COLUMN firmado_interno_at DATETIME NULL AFTER firma_token`);
    console.log('  ✓ firmado_interno_at en documento_firmantes');
  } else { console.log('  · firmado_interno_at ya existe'); }

  // documentos: modo_envio
  if (!(await checkCol('documentos', 'modo_envio'))) {
    await query(`ALTER TABLE documentos ADD COLUMN modo_envio ENUM('docusign','interno') NULL AFTER estado`);
    console.log('  ✓ modo_envio en documentos');
  } else { console.log('  · modo_envio ya existe'); }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
