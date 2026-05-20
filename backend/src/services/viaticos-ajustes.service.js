const { query, queryOne } = require('../config/db');

function suma(d) {
  return Number(d.monto_vuelos || 0) + Number(d.monto_hospedaje || 0)
    + Number(d.monto_alimentos || 0) + Number(d.monto_transporte || 0)
    + Number(d.monto_otros || 0);
}

async function crear(solicitudId, data) {
  const total = suma(data);
  const result = await query(
    `INSERT INTO viaticos_ajustes
     (solicitud_id, motivo, monto_vuelos, monto_hospedaje, monto_alimentos,
      monto_transporte, monto_otros, monto_total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      solicitudId, data.motivo,
      data.monto_vuelos || 0, data.monto_hospedaje || 0, data.monto_alimentos || 0,
      data.monto_transporte || 0, data.monto_otros || 0, total,
    ]
  );
  return { id: result.insertId, monto_total: total };
}

async function getById(id) {
  return queryOne(
    `SELECT a.*, s.folio AS solicitud_folio, s.colaborador_id, u.nombre AS colaborador_nombre
     FROM viaticos_ajustes a
     JOIN viaticos_solicitudes s ON s.id = a.solicitud_id
     JOIN users u ON u.id = s.colaborador_id
     WHERE a.id = ?`,
    [id]
  );
}

async function listarPendientes() {
  return query(`
    SELECT a.id, a.solicitud_id, a.motivo, a.monto_total, a.estado, a.created_at,
           s.folio AS solicitud_folio, s.destino, u.nombre AS colaborador_nombre
    FROM viaticos_ajustes a
    JOIN viaticos_solicitudes s ON s.id = a.solicitud_id
    JOIN users u ON u.id = s.colaborador_id
    WHERE a.estado = 'pendiente'
    ORDER BY a.created_at ASC
  `);
}

async function aprobar(id, adminId) {
  await query(
    "UPDATE viaticos_ajustes SET estado='aprobado', aprobado_por=?, aprobado_at=NOW(), motivo_rechazo=NULL WHERE id=? AND estado='pendiente'",
    [adminId, id]
  );
}

async function rechazar(id, adminId, motivo) {
  await query(
    "UPDATE viaticos_ajustes SET estado='rechazado', aprobado_por=?, aprobado_at=NOW(), motivo_rechazo=? WHERE id=? AND estado='pendiente'",
    [adminId, motivo, id]
  );
}

module.exports = { crear, getById, listarPendientes, aprobar, rechazar };
