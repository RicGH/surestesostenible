/**
 * Seed: bancos de México
 * Ejecutar: DB_HOST=127.0.0.1 DB_PORT=3306 DB_USER=adminprov DB_PASSWORD=adminprov_pass DB_NAME=adminprov node backend/src/db/seed-bancos.js
 */
const mysql = require('mysql2/promise');

const BANCOS = [
  'BBVA México',
  'Citibanamex',
  'Santander',
  'Banorte',
  'HSBC',
  'Scotiabank',
  'Inbursa',
  'Banco Azteca',
  'BanBajío',
  'Afirme',
  'Banbajío',
  'Bansí',
  'Banca Mifel',
  'Banco del Ejército (Banjército)',
  'Banco Inmobiliario Mexicano (BIM)',
  'Banco Multiva',
  'BASE',
  'CIBanco',
  'Consubanco',
  'Famsa',
  'Intercam Banco',
  'Invex',
  'Ixe Banco',
  'Monexcb',
  'Sabadell',
  'Ve por Más (BX+)',
  'Actinver',
  'Compartamos Banco',
  'Banco del Bienestar',
  'Banco Nacional de México (Banamex)',
  'Nacional Financiera (NAFIN)',
  'Bancomext',
  'FIRA',
];

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'adminprov',
    password: process.env.DB_PASSWORD || 'adminprov_pass',
    database: process.env.DB_NAME || 'adminprov',
  });

  try {
    let insertados = 0;
    let omitidos = 0;

    for (const nombre of BANCOS) {
      const [rows] = await conn.execute(
        'SELECT id FROM catalogos WHERE tipo = ? AND nombre = ?',
        ['banco', nombre]
      );
      if (rows.length > 0) {
        omitidos++;
        continue;
      }
      await conn.execute(
        'INSERT INTO catalogos (tipo, nombre) VALUES (?, ?)',
        ['banco', nombre]
      );
      insertados++;
    }

    console.log(`✓ Bancos insertados: ${insertados}, ya existían: ${omitidos}`);
  } finally {
    await conn.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
