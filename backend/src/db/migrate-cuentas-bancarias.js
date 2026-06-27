const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'adminprov',
    password: process.env.DB_PASSWORD || 'adminprov_pass',
    database: process.env.DB_NAME || 'adminprov',
  });

  try {
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users_cuentas_bancarias (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        clabe_bancaria VARCHAR(18) NOT NULL,
        banco VARCHAR(120) NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uq_user_clabe (user_id, clabe_bancaria)
      )
    `);
    console.log('✓ Tabla users_cuentas_bancarias creada');

    const [migrated] = await conn.execute(`
      INSERT IGNORE INTO users_cuentas_bancarias (user_id, clabe_bancaria, banco)
      SELECT id, clabe_bancaria, COALESCE(banco, '')
      FROM users
      WHERE clabe_bancaria IS NOT NULL AND clabe_bancaria != ''
        AND (eliminado = 0 OR eliminado IS NULL)
    `);
    console.log(`✓ Migradas ${migrated.affectedRows} cuentas existentes del perfil`);
  } finally {
    await conn.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
