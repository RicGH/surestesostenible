const { query, queryOne } = require('../config/db');
const mail = require('./mail.service');

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

async function crear(userId, { tipo, titulo, mensaje, url }) {
  const result = await query(
    'INSERT INTO notificaciones (user_id, tipo, titulo, mensaje, url) VALUES (?, ?, ?, ?, ?)',
    [userId, tipo, titulo, mensaje, url || null]
  );
  enviarCorreoFireAndForget(result.insertId, userId, { titulo, mensaje, url });
  return result.insertId;
}

async function crearParaRol(rol, payload) {
  const users = await query('SELECT id FROM users WHERE rol = ? AND activo = 1', [rol]);
  for (const u of users) await crear(u.id, payload);
}

async function listar(userId) {
  return query(
    'SELECT id, tipo, titulo, mensaje, url, leida, email_estado, created_at FROM notificaciones WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
}

async function marcarLeida(id, userId) {
  await query('UPDATE notificaciones SET leida = 1 WHERE id = ? AND user_id = ?', [id, userId]);
}

function enviarCorreoFireAndForget(notifId, userId, payload) {
  setImmediate(async () => {
    try {
      const user = await queryOne('SELECT email FROM users WHERE id = ?', [userId]);
      if (!user || !user.email) return;
      const r = await mail.enviarNotificacion({
        to: user.email,
        titulo: payload.titulo,
        mensaje: payload.mensaje,
        url: payload.url,
        baseUrl: APP_BASE_URL,
      });
      if (r && r.skipped) {
        await query('UPDATE notificaciones SET email_estado = ? WHERE id = ?', ['desactivado', notifId]);
      } else {
        await query('UPDATE notificaciones SET email_estado = ? WHERE id = ?', ['enviado', notifId]);
      }
    } catch (err) {
      console.error('[notificaciones] Error enviando correo:', err.message);
      try {
        await query(
          'UPDATE notificaciones SET email_estado = ?, email_error = ? WHERE id = ?',
          ['fallido', String(err.message || '').slice(0, 500), notifId]
        );
      } catch {}
    }
  });
}

module.exports = { crear, crearParaRol, listar, marcarLeida };
