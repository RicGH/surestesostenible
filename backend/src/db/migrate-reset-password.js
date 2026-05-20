require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Migrando reset password...\n');

  await query(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id          INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      user_id     INT UNSIGNED NOT NULL,
      token_hash  VARCHAR(255) NOT NULL,
      expires_at  DATETIME NOT NULL,
      used        TINYINT(1) NOT NULL DEFAULT 0,
      created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_pwreset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      KEY idx_pwreset_token (token_hash),
      KEY idx_pwreset_user (user_id, used)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✓ Tabla password_resets lista');

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
