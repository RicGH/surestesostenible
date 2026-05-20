require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Migrando módulo de correo...\n');

  await query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      \`key\`      VARCHAR(80) PRIMARY KEY,
      \`value\`    JSON NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✓ Tabla app_settings lista');

  const cols = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notificaciones'`
  );
  const set = new Set(cols.map((c) => c.COLUMN_NAME));

  const adds = [];
  if (!set.has('email_estado')) {
    adds.push("ADD COLUMN email_estado ENUM('no_enviado','enviado','fallido','desactivado') NOT NULL DEFAULT 'no_enviado' AFTER leida");
  }
  if (!set.has('email_error')) {
    adds.push('ADD COLUMN email_error VARCHAR(500) AFTER email_estado');
  }

  if (adds.length) {
    await query(`ALTER TABLE notificaciones ${adds.join(', ')}`);
    console.log(`  ✓ Notificaciones: ${adds.length} columna(s) agregadas`);
  } else {
    console.log('  · Notificaciones ya tienen columnas de email');
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
