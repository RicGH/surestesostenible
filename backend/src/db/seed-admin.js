require('dotenv').config();
const bcrypt = require('bcrypt');
const { query, queryOne, pool } = require('../config/db');

(async () => {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@adminprov.local';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
  const nombre = process.env.SEED_ADMIN_NOMBRE || 'Administrador';

  const exists = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (exists) {
    console.log(`Admin ya existe (id=${exists.id}). Nada que hacer.`);
    await pool.end();
    return;
  }

  const hash = await bcrypt.hash(password, 10);
  const result = await query(
    'INSERT INTO users (email, password_hash, nombre, rol) VALUES (?, ?, ?, ?)',
    [email, hash, nombre, 'admin']
  );
  console.log(`Admin creado id=${result.insertId} email=${email} password=${password}`);
  await pool.end();
})().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
