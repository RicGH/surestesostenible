const crypto = require('crypto');
const { query, queryOne } = require('../config/db');

const TOKEN_TTL_MINUTOS = 60;

function generarToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function crearToken(userId) {
  await query('UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0', [userId]);
  const token = generarToken();
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + TOKEN_TTL_MINUTOS * 60 * 1000);
  await query(
    'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expires]
  );
  return token;
}

async function validarToken(token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  return queryOne(
    `SELECT pr.id, pr.user_id, u.email, u.nombre
     FROM password_resets pr
     JOIN users u ON u.id = pr.user_id
     WHERE pr.token_hash = ? AND pr.used = 0 AND pr.expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
}

async function usarToken(id) {
  await query('UPDATE password_resets SET used = 1 WHERE id = ?', [id]);
}

module.exports = { crearToken, validarToken, usarToken, TOKEN_TTL_MINUTOS };
