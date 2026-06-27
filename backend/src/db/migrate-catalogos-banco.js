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
      ALTER TABLE catalogos
      MODIFY COLUMN tipo ENUM(
        'proyecto','cuenta','partida','objetivo_estrategico','resultado','donante','banco'
      ) NOT NULL
    `);
    console.log('✓ ENUM de catalogos.tipo actualizado con banco');
  } finally {
    await conn.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
