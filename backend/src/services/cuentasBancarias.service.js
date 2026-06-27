const { query } = require('../config/db');

async function listarPorUsuario(userId) {
  return query(
    'SELECT id, user_id, clabe_bancaria, banco, created_at FROM users_cuentas_bancarias WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
}

async function guardarSiNueva(userId, clabe, banco) {
  await query(
    'INSERT IGNORE INTO users_cuentas_bancarias (user_id, clabe_bancaria, banco) VALUES (?, ?, ?)',
    [userId, clabe, banco || '']
  );
}

async function eliminar(id, userId) {
  const result = await query(
    'DELETE FROM users_cuentas_bancarias WHERE id = ? AND user_id = ?',
    [id, userId]
  );
  return result.affectedRows > 0;
}

module.exports = { listarPorUsuario, guardarSiNueva, eliminar };
