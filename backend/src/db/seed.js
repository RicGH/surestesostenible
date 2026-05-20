require('dotenv').config();
const bcrypt = require('bcrypt');
const { query, queryOne, pool } = require('../config/db');

const USUARIOS = [
  { email: 'admin@adminprov.local', password: 'Admin123!', nombre: 'Administrador', rol: 'admin' },
  { email: 'colaborador@adminprov.local', password: 'Colab123!', nombre: 'Colaborador Demo', rol: 'colaborador' },
  { email: 'proveedor@adminprov.local', password: 'Prov123!', nombre: 'Proveedor Demo', rol: 'proveedor' },
  { email: 'finanzas@adminprov.local', password: 'Fina123!', nombre: 'Finanzas Demo', rol: 'finanzas' },
];

(async () => {
  console.log('Sembrando usuarios de prueba...\n');

  for (const u of USUARIOS) {
    const existente = await queryOne('SELECT id FROM users WHERE email = ?', [u.email]);
    if (existente) {
      console.log(`  · ${u.rol.padEnd(12)} ${u.email}  (ya existe id=${existente.id})`);
      continue;
    }
    const hash = await bcrypt.hash(u.password, 10);
    const result = await query(
      'INSERT INTO users (email, password_hash, nombre, rol) VALUES (?, ?, ?, ?)',
      [u.email, hash, u.nombre, u.rol]
    );
    console.log(`  ✓ ${u.rol.padEnd(12)} ${u.email}  password: ${u.password}  (id=${result.insertId})`);
  }

  console.log('\nListo. Credenciales arriba.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en seed:', err);
  await pool.end();
  process.exit(1);
});
