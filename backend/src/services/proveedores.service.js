const { query, queryOne } = require('../config/db');

async function getByUserId(userId) {
  return queryOne(
    `SELECT id, user_id, rfc, razon_social, direccion, banco, cuenta_clabe,
            documentacion, estado, motivo_rechazo, created_at
     FROM proveedores WHERE user_id = ?`,
    [userId]
  );
}

async function getById(id) {
  return queryOne(
    `SELECT p.*, u.email, u.nombre
     FROM proveedores p JOIN users u ON u.id = p.user_id
     WHERE p.id = ?`,
    [id]
  );
}

async function crear(userId, data, documentacion) {
  const result = await query(
    `INSERT INTO proveedores
     (user_id, rfc, razon_social, direccion, banco, cuenta_clabe, documentacion, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
    [userId, data.rfc, data.razon_social, data.direccion, data.banco, data.cuenta_clabe, documentacion || null]
  );
  return result.insertId;
}

async function listarPendientes() {
  return query(
    `SELECT p.id, p.rfc, p.razon_social, p.direccion, p.banco, p.estado, p.created_at,
            u.email, u.nombre
     FROM proveedores p JOIN users u ON u.id = p.user_id
     WHERE p.estado = 'pendiente' ORDER BY p.created_at ASC`
  );
}

async function listarTodos(filtros = {}) {
  const where = [];
  const params = [];
  if (filtros.estado) { where.push('p.estado = ?'); params.push(filtros.estado); }
  if (filtros.activo === '1' || filtros.activo === '0') {
    where.push('u.activo = ?');
    params.push(filtros.activo === '1' ? 1 : 0);
  }
  const sql = `
    SELECT p.id, p.rfc, p.razon_social, p.estado, u.activo, u.email, u.nombre
    FROM proveedores p JOIN users u ON u.id = p.user_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY p.created_at DESC LIMIT 200`;
  return query(sql, params);
}

async function actualizar(id, data) {
  await query(
    `UPDATE proveedores
     SET rfc = ?, razon_social = ?, direccion = ?, banco = ?, cuenta_clabe = ?
     WHERE id = ?`,
    [data.rfc, data.razon_social, data.direccion || null, data.banco || null, data.cuenta_clabe || null, id]
  );
}

async function aprobar(id, adminId) {
  await query(
    "UPDATE proveedores SET estado='aprobado', aprobado_por=?, aprobado_at=NOW(), motivo_rechazo=NULL WHERE id=? AND estado='pendiente'",
    [adminId, id]
  );
}

async function rechazar(id, adminId, motivo) {
  await query(
    "UPDATE proveedores SET estado='rechazado', aprobado_por=?, aprobado_at=NOW(), motivo_rechazo=? WHERE id=? AND estado='pendiente'",
    [adminId, motivo, id]
  );
}

module.exports = { getByUserId, getById, crear, actualizar, listarPendientes, listarTodos, aprobar, rechazar };
