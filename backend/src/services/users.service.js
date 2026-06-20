const { query, queryOne } = require('../config/db');

async function findByEmail(email) {
  return queryOne(
    'SELECT id, email, password_hash, nombre, rol, activo FROM users WHERE email = ? AND eliminado = 0 LIMIT 1',
    [email]
  );
}

async function findById(id) {
  return queryOne(
    'SELECT id, email, nombre, rfc, clabe_bancaria, banco, avatar_path, rol, activo, created_at FROM users WHERE id = ? AND eliminado = 0 LIMIT 1',
    [id]
  );
}

async function setAvatar(id, avatarPath) {
  await query('UPDATE users SET avatar_path = ? WHERE id = ?', [avatarPath, id]);
}

async function findByIdConPassword(id) {
  return queryOne(
    'SELECT id, email, nombre, password_hash, rol FROM users WHERE id = ? AND eliminado = 0 LIMIT 1',
    [id]
  );
}

async function create({ email, password_hash, nombre, rol }) {
  const result = await query(
    'INSERT INTO users (email, password_hash, nombre, rol) VALUES (?, ?, ?, ?)',
    [email, password_hash, nombre, rol]
  );
  return result.insertId;
}

async function listar(filtros = {}) {
  const where = ['eliminado = 0'];
  const params = [];
  if (filtros.rol) { where.push('rol = ?'); params.push(filtros.rol); }
  if (filtros.activo === '1' || filtros.activo === '0') {
    where.push('activo = ?');
    params.push(filtros.activo === '1' ? 1 : 0);
  }
  if (filtros.q) {
    where.push('(email LIKE ? OR nombre LIKE ?)');
    params.push(`%${filtros.q}%`, `%${filtros.q}%`);
  }
  return query(
    `SELECT id, email, nombre, rfc, clabe_bancaria, banco, rol, activo, created_at
     FROM users
     WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC LIMIT 200`,
    params
  );
}

async function setActivo(id, activo) {
  await query('UPDATE users SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
}

async function actualizarPassword(id, password_hash) {
  await query('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id]);
}

async function existeEmailEnOtro(email, exceptId) {
  const row = await queryOne(
    'SELECT id FROM users WHERE email = ? AND id <> ? AND eliminado = 0 LIMIT 1',
    [email, exceptId]
  );
  return !!row;
}

async function actualizar(id, { email, nombre, rol }) {
  await query(
    'UPDATE users SET email = ?, nombre = ?, rol = ? WHERE id = ?',
    [email, nombre, rol, id]
  );
}

async function actualizarPerfil(id, { nombre, rfc, clabe_bancaria, banco }) {
  await query(
    'UPDATE users SET nombre = ?, rfc = ?, clabe_bancaria = ?, banco = ? WHERE id = ?',
    [nombre, rfc, clabe_bancaria, banco, id]
  );
}

async function tieneProveedor(id) {
  const row = await queryOne('SELECT id FROM proveedores WHERE user_id = ? LIMIT 1', [id]);
  return !!row;
}

async function eliminar(id) {
  await query('UPDATE users SET eliminado = 1, activo = 0 WHERE id = ?', [id]);
}

async function eliminarVarios(ids) {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const result = await query(
    `UPDATE users SET eliminado = 1, activo = 0 WHERE id IN (${placeholders}) AND eliminado = 0`,
    ids
  );
  return result.affectedRows;
}

module.exports = {
  findByEmail, findById, findByIdConPassword, create, listar, setActivo, actualizarPassword,
  existeEmailEnOtro, actualizar, actualizarPerfil, setAvatar, tieneProveedor, eliminar, eliminarVarios,
};
