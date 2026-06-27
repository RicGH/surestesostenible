const { query, queryOne, withTx } = require('../config/db');

// Máximo de viáticos "abiertos" (en uso: pagado/en_proceso) que un colaborador
// puede tener activos a la vez para registrar gastos. Los demás quedan en cola.
const LIMITE_VIATICOS_ABIERTOS = 3;

function generarFolio() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `V-${ts}-${rnd}`;
}

function sumarMontos(d) {
  return Number(d.monto_vuelos || 0)
    + Number(d.monto_hospedaje || 0)
    + Number(d.monto_alimentos || 0)
    + Number(d.monto_transporte || 0)
    + Number(d.monto_otros || 0);
}

async function getActivaDeColaborador(colaboradorId) {
  return queryOne(
    `SELECT id, folio, destino, estado, fecha_inicio, fecha_fin
     FROM viaticos_solicitudes
     WHERE colaborador_id = ?
       AND estado IN ('pendiente','aprobado','pagado','en_proceso')
     ORDER BY
       CASE estado
         WHEN 'pagado' THEN 1
         WHEN 'en_proceso' THEN 1
         WHEN 'aprobado' THEN 2
         WHEN 'pendiente' THEN 3
         ELSE 4
       END ASC,
       created_at ASC
     LIMIT 1`,
    [colaboradorId]
  );
}

// Viáticos "abiertos" en uso (pagado/en_proceso) del colaborador, los que cuentan al límite.
async function getAbiertosDeColaborador(colaboradorId) {
  return query(
    `SELECT id, folio, destino, estado, created_at
     FROM viaticos_solicitudes
     WHERE colaborador_id = ? AND estado IN ('pagado','en_proceso')
     ORDER BY created_at ASC`,
    [colaboradorId]
  );
}

async function crearSolicitud(colaboradorId, data, justificantes = []) {
  const folio = generarFolio();
  const monto_total = sumarMontos(data);
  // Se conserva justificante_path (primer archivo) por compatibilidad con registros
  // y rutas antiguas; el conjunto completo vive en viaticos_justificantes.
  const primero = justificantes[0]?.archivo || null;
  const result = await query(
    `INSERT INTO viaticos_solicitudes
     (folio, colaborador_id, destino, fecha_inicio, fecha_fin, motivo,
      autoriza_nombre, recibe_nombre, clabe_bancaria, banco,
      monto_vuelos, monto_hospedaje, monto_alimentos, monto_transporte, monto_otros,
      monto_total, proyecto, cuenta, partida, objetivo_estrategico, resultado, donante, justificante_path, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
    [
      folio, colaboradorId, data.destino, data.fecha_inicio, data.fecha_fin, data.motivo,
      data.autoriza_nombre || null, data.recibe_nombre || null,
      data.clabe_bancaria || null, data.banco || null,
      data.monto_vuelos || 0, data.monto_hospedaje || 0, data.monto_alimentos || 0,
      data.monto_transporte || 0, data.monto_otros || 0,
      monto_total,
      data.proyecto || null, data.cuenta || null, data.partida || null,
      data.objetivo_estrategico || null, data.resultado || null, data.donante || null, primero,
    ]
  );
  const solicitudId = result.insertId;
  for (const j of justificantes) {
    await query(
      `INSERT INTO viaticos_justificantes (solicitud_id, archivo, nombre_original)
       VALUES (?, ?, ?)`,
      [solicitudId, j.archivo, j.nombre_original || null]
    );
  }
  return { id: solicitudId, folio };
}

async function agregarJustificantes(solicitudId, archivos) {
  for (const j of archivos) {
    await query(
      `INSERT INTO viaticos_justificantes (solicitud_id, archivo, nombre_original) VALUES (?, ?, ?)`,
      [solicitudId, j.archivo, j.nombre_original || null]
    );
  }
}

async function listarPorColaborador(colaboradorId, filtros = {}) {
  const where = ['colaborador_id = ?'];
  const params = [colaboradorId];
  if (filtros.estado) { where.push('estado = ?'); params.push(filtros.estado); }
  if (filtros.destino) { where.push('destino LIKE ?'); params.push(`%${filtros.destino}%`); }
  if (filtros.folio) { where.push('folio LIKE ?'); params.push(`%${filtros.folio}%`); }
  if (filtros.proyecto) { where.push('proyecto = ?'); params.push(filtros.proyecto); }
  if (filtros.cuenta) { where.push('cuenta = ?'); params.push(filtros.cuenta); }
  if (filtros.partida) { where.push('partida = ?'); params.push(filtros.partida); }
  if (filtros.desde) { where.push('fecha_inicio >= ?'); params.push(filtros.desde); }
  if (filtros.hasta) { where.push('fecha_fin <= ?'); params.push(filtros.hasta); }

  return query(
    `SELECT id, folio, destino, fecha_inicio, fecha_fin, motivo, monto_total, monto_gastado,
            proyecto, cuenta, partida, estado, motivo_rechazo, permite_edicion, created_at
     FROM viaticos_solicitudes
     WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC
     LIMIT 200`,
    params
  );
}

async function listarPendientesAdmin() {
  return query(
    `SELECT s.id, s.folio, s.destino, s.fecha_inicio, s.fecha_fin, s.motivo, s.monto_total, s.monto_gastado,
            s.estado, s.created_at, u.nombre AS colaborador_nombre, u.email AS colaborador_email
     FROM viaticos_solicitudes s
     JOIN users u ON u.id = s.colaborador_id
     WHERE s.estado = 'pendiente'
     ORDER BY s.created_at ASC`
  );
}

async function listarActivosAdmin() {
  return query(
    `SELECT s.id, s.folio, s.destino, s.fecha_inicio, s.fecha_fin,
            s.monto_total, s.monto_gastado, s.estado, s.aprobado_at,
            u.nombre AS colaborador_nombre, u.email AS colaborador_email,
            (SELECT COUNT(*) FROM viaticos_gastos WHERE solicitud_id = s.id) AS gastos_count
     FROM viaticos_solicitudes s
     JOIN users u ON u.id = s.colaborador_id
     WHERE s.estado IN ('aprobado','pagado','en_proceso')
     ORDER BY s.aprobado_at DESC`
  );
}

async function listarCerradosAdmin() {
  return query(
    `SELECT s.id, s.folio, s.destino, s.fecha_inicio, s.fecha_fin,
            s.monto_total, s.monto_gastado, s.estado,
            u.nombre AS colaborador_nombre
     FROM viaticos_solicitudes s
     JOIN users u ON u.id = s.colaborador_id
     WHERE s.estado = 'cerrado'
     ORDER BY s.updated_at DESC LIMIT 100`
  );
}

async function listarRechazadosAdmin() {
  return query(
    `SELECT s.id, s.folio, s.destino, s.fecha_inicio, s.fecha_fin,
            s.monto_total, s.monto_gastado, s.estado, s.motivo_rechazo, s.permite_edicion, s.aprobado_at,
            u.nombre AS colaborador_nombre, u.email AS colaborador_email
     FROM viaticos_solicitudes s
     JOIN users u ON u.id = s.colaborador_id
     WHERE s.estado = 'rechazado'
     ORDER BY s.updated_at DESC LIMIT 200`
  );
}

async function listarTodosAdmin(filtros = {}) {
  const where = [];
  const params = [];
  if (filtros.estado) { where.push('s.estado = ?'); params.push(filtros.estado); }
  if (filtros.q) {
    where.push('(s.folio LIKE ? OR s.destino LIKE ? OR u.nombre LIKE ?)');
    const like = `%${filtros.q}%`;
    params.push(like, like, like);
  }
  return query(
    `SELECT s.id, s.folio, s.destino, s.fecha_inicio, s.fecha_fin,
            s.monto_total, s.monto_gastado, s.estado, s.created_at,
            u.nombre AS colaborador_nombre, u.email AS colaborador_email
     FROM viaticos_solicitudes s
     JOIN users u ON u.id = s.colaborador_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY s.created_at DESC LIMIT 300`,
    params
  );
}

// Un viático queda EN COLA si el colaborador ya tiene LIMITE viáticos abiertos
// (pagado/en_proceso) creados antes que éste. Devuelve la info de bloqueo o null.
async function getBloqueadoraDeUso(solicitudId, colaboradorId) {
  const adelante = await query(
    `SELECT id, folio, estado, created_at
     FROM viaticos_solicitudes
     WHERE colaborador_id = ?
       AND id <> ?
       AND estado IN ('pagado','en_proceso')
       AND created_at < (SELECT created_at FROM viaticos_solicitudes WHERE id = ?)
     ORDER BY created_at ASC`,
    [colaboradorId, solicitudId, solicitudId]
  );
  if (adelante.length < LIMITE_VIATICOS_ABIERTOS) return null;
  return { limite: LIMITE_VIATICOS_ABIERTOS, abiertos: adelante };
}

async function getById(id, colaboradorId = null) {
  const where = colaboradorId ? 'WHERE s.id = ? AND s.colaborador_id = ?' : 'WHERE s.id = ?';
  const params = colaboradorId ? [id, colaboradorId] : [id];
  const solicitud = await queryOne(
    `SELECT s.*, u.nombre AS colaborador_nombre,
            COALESCE(s.clabe_bancaria, u.clabe_bancaria) AS clabe_bancaria,
            COALESCE(s.banco, u.banco) AS banco
     FROM viaticos_solicitudes s
     JOIN users u ON u.id = s.colaborador_id
     ${where}`,
    params
  );
  if (!solicitud) return null;
  const [gastos, pago, ajustes, bloqueadora, justificantes] = await Promise.all([
    query(
      'SELECT id, archivo, xml_path, monto, rfc_emisor, razon_social, nombre_emisor, fecha, concepto, created_at FROM viaticos_gastos WHERE solicitud_id = ? ORDER BY fecha DESC',
      [id]
    ),
    queryOne(
      'SELECT id, monto, fecha_pago, referencia, metodo_pago, comprobante_path FROM viaticos_pagos WHERE solicitud_id = ? AND ajuste_id IS NULL ORDER BY id ASC LIMIT 1',
      [id]
    ),
    query(
      `SELECT id, motivo, monto_total, monto_vuelos, monto_hospedaje, monto_alimentos,
              monto_transporte, monto_otros, estado, motivo_rechazo, created_at
       FROM viaticos_ajustes WHERE solicitud_id = ? ORDER BY created_at DESC`,
      [id]
    ),
    getBloqueadoraDeUso(id, solicitud.colaborador_id),
    query(
      `SELECT id, archivo, nombre_original, created_at
       FROM viaticos_justificantes WHERE solicitud_id = ? ORDER BY id ASC`,
      [id]
    ),
  ]);
  // Fallback: solicitudes antiguas que solo tienen justificante_path (sin filas en la tabla).
  let listaJustificantes = justificantes;
  if (!listaJustificantes.length && solicitud.justificante_path) {
    listaJustificantes = [{ id: null, archivo: solicitud.justificante_path, nombre_original: null, legacy: true }];
  }
  return { ...solicitud, gastos, pago, ajustes, justificantes: listaJustificantes, bloqueada_por_uso: bloqueadora || null };
}

async function aprobar(id, adminId) {
  await query(
    `UPDATE viaticos_solicitudes
     SET estado = 'aprobado', aprobado_por = ?, aprobado_at = NOW(), motivo_rechazo = NULL
     WHERE id = ? AND estado IN ('pendiente','en_proceso')`,
    [adminId, id]
  );
}

async function rechazar(id, adminId, motivo, permiteEdicion) {
  await query(
    `UPDATE viaticos_solicitudes
     SET estado = 'rechazado', aprobado_por = ?, aprobado_at = NOW(),
         motivo_rechazo = ?, permite_edicion = ?
     WHERE id = ? AND estado IN ('pendiente','en_proceso')`,
    [adminId, motivo, permiteEdicion ? 1 : 0, id]
  );
}

async function editarSolicitud(id, colaboradorId, data) {
  const monto_total = sumarMontos(data);
  await query(
    `UPDATE viaticos_solicitudes
     SET destino = ?, fecha_inicio = ?, fecha_fin = ?, motivo = ?,
         autoriza_nombre = ?, recibe_nombre = ?, clabe_bancaria = ?, banco = ?,
         monto_vuelos = ?, monto_hospedaje = ?, monto_alimentos = ?,
         monto_transporte = ?, monto_otros = ?, monto_total = ?,
         proyecto = ?, cuenta = ?, partida = ?, objetivo_estrategico = ?, resultado = ?, donante = ?,
         estado = 'pendiente', motivo_rechazo = NULL, permite_edicion = 0
     WHERE id = ? AND colaborador_id = ?
       AND ((estado = 'rechazado' AND permite_edicion = 1) OR estado = 'pendiente')`,
    [
      data.destino, data.fecha_inicio, data.fecha_fin, data.motivo,
      data.autoriza_nombre || null, data.recibe_nombre || null,
      data.clabe_bancaria || null, data.banco || null,
      data.monto_vuelos || 0, data.monto_hospedaje || 0, data.monto_alimentos || 0,
      data.monto_transporte || 0, data.monto_otros || 0, monto_total,
      data.proyecto || null, data.cuenta || null, data.partida || null,
      data.objetivo_estrategico || null, data.resultado || null, data.donante || null,
      id, colaboradorId,
    ]
  );
}

async function editarSolicitudAdmin(id, data) {
  const monto_total = sumarMontos(data);
  await query(
    `UPDATE viaticos_solicitudes
     SET destino = ?, fecha_inicio = ?, fecha_fin = ?, motivo = ?,
         autoriza_nombre = ?, recibe_nombre = ?, clabe_bancaria = ?, banco = ?,
         monto_vuelos = ?, monto_hospedaje = ?, monto_alimentos = ?,
         monto_transporte = ?, monto_otros = ?, monto_total = ?,
         proyecto = ?, cuenta = ?, partida = ?, objetivo_estrategico = ?, resultado = ?, donante = ?
     WHERE id = ?`,
    [
      data.destino, data.fecha_inicio, data.fecha_fin, data.motivo,
      data.autoriza_nombre || null, data.recibe_nombre || null,
      data.clabe_bancaria || null, data.banco || null,
      data.monto_vuelos || 0, data.monto_hospedaje || 0, data.monto_alimentos || 0,
      data.monto_transporte || 0, data.monto_otros || 0, monto_total,
      data.proyecto || null, data.cuenta || null, data.partida || null,
      data.objetivo_estrategico || null, data.resultado || null, data.donante || null,
      id,
    ]
  );
}

async function cerrarViaje(id, adminId) {
  const sol = await queryOne(
    'SELECT id, folio, estado FROM viaticos_solicitudes WHERE id = ?',
    [id]
  );
  if (!sol) throw new Error('Viático no encontrado');

  const cerrables = ['aprobado', 'pagado', 'en_proceso'];
  if (!cerrables.includes(sol.estado)) {
    throw new Error(
      `No se puede cerrar el viático ${sol.folio} porque está en estado "${sol.estado}". ` +
      `Solo se pueden cerrar viáticos en estado: ${cerrables.join(', ')}.`
    );
  }

  const result = await query(
    `UPDATE viaticos_solicitudes
     SET estado = 'cerrado', aprobado_por = ?
     WHERE id = ?`,
    [adminId, id]
  );
  if (!result.affectedRows) {
    throw new Error('No se actualizó el viático en la base de datos');
  }
  console.log(`[cerrarViaje] viático ${sol.folio} (id=${id}) cerrado por admin ${adminId} (estado anterior: ${sol.estado})`);
}

async function agregarGasto(solicitudId, colaboradorId, data, archivo, xmlPath = null) {
  return withTx(async (conn) => {
    const sql = colaboradorId
      ? "SELECT id, colaborador_id, estado, monto_total, monto_gastado, created_at FROM viaticos_solicitudes WHERE id = ? AND colaborador_id = ? FOR UPDATE"
      : "SELECT id, colaborador_id, estado, monto_total, monto_gastado, created_at FROM viaticos_solicitudes WHERE id = ? FOR UPDATE";
    const params = colaboradorId ? [solicitudId, colaboradorId] : [solicitudId];
    const [solRows] = await conn.execute(sql, params);
    if (!solRows.length) throw new Error('Solicitud no encontrada');
    const sol = solRows[0];
    if (!['pagado', 'en_proceso'].includes(sol.estado)) {
      throw new Error('Solo puedes subir comprobantes a un viático ya pagado');
    }

    const [adelanteRows] = await conn.execute(
      `SELECT COUNT(*) AS adelante FROM viaticos_solicitudes
       WHERE colaborador_id = ?
         AND id <> ?
         AND estado IN ('pagado','en_proceso')
         AND created_at < ?`,
      [sol.colaborador_id, solicitudId, sol.created_at]
    );
    if (Number(adelanteRows[0].adelante) >= LIMITE_VIATICOS_ABIERTOS) {
      const e = new Error(
        `No puedes registrar gastos en este viático aún: ya tienes ${LIMITE_VIATICOS_ABIERTOS} viáticos abiertos en uso. Cierra alguno para activar este.`
      );
      e.code = 'BLOQUEADO_POR_USO';
      throw e;
    }

    const disponible = Number(sol.monto_total) - Number(sol.monto_gastado);
    const monto = Number(data.monto);
    if (monto > disponible + 0.001) {
      const e = new Error(
        `El monto excede el saldo disponible ($${disponible.toFixed(2)}). Solicita un ajuste si necesitas más presupuesto.`
      );
      e.code = 'SALDO_INSUFICIENTE';
      throw e;
    }

    const [ins] = await conn.execute(
      `INSERT INTO viaticos_gastos
       (solicitud_id, archivo, xml_path, monto, rfc_emisor, razon_social, nombre_emisor, fecha, concepto)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [solicitudId, archivo, xmlPath, monto, data.rfc_emisor || null, data.razon_social || null, data.nombre_emisor || null, data.fecha, data.concepto || null]
    );

    await conn.execute(
      `UPDATE viaticos_solicitudes
       SET monto_gastado = COALESCE((SELECT SUM(monto) FROM viaticos_gastos WHERE solicitud_id = ?), 0),
           estado = CASE WHEN estado = 'pagado' THEN 'en_proceso' ELSE estado END
       WHERE id = ?`,
      [solicitudId, solicitudId]
    );

    return ins.insertId;
  });
}

async function duplicar(id, colaboradorId) {
  const orig = await queryOne(
    'SELECT * FROM viaticos_solicitudes WHERE id = ? AND colaborador_id = ?',
    [id, colaboradorId]
  );
  if (!orig) throw new Error('Solicitud no encontrada');
  return crearSolicitud(colaboradorId, {
    destino: orig.destino,
    fecha_inicio: orig.fecha_inicio,
    fecha_fin: orig.fecha_fin,
    motivo: orig.motivo,
    autoriza_nombre: orig.autoriza_nombre,
    recibe_nombre: orig.recibe_nombre,
    clabe_bancaria: orig.clabe_bancaria,
    banco: orig.banco,
    monto_vuelos: orig.monto_vuelos,
    monto_hospedaje: orig.monto_hospedaje,
    monto_alimentos: orig.monto_alimentos,
    monto_transporte: orig.monto_transporte,
    monto_otros: orig.monto_otros,
    proyecto: orig.proyecto,
    cuenta: orig.cuenta,
    partida: orig.partida,
    objetivo_estrategico: orig.objetivo_estrategico,
    resultado: orig.resultado,
    donante: orig.donante,
  });
}

module.exports = {
  crearSolicitud, listarPorColaborador, listarPendientesAdmin,
  listarActivosAdmin, listarCerradosAdmin, listarRechazadosAdmin, listarTodosAdmin,
  getById,
  aprobar, rechazar, editarSolicitud, editarSolicitudAdmin, cerrarViaje, agregarGasto, agregarJustificantes, duplicar,
  getActivaDeColaborador, getAbiertosDeColaborador, getBloqueadoraDeUso,
  LIMITE_VIATICOS_ABIERTOS,
};
