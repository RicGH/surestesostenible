const { query, queryOne, withTx } = require('../config/db');

async function listarPorPagar() {
  return query(`
    SELECT s.id, s.folio, s.destino, s.fecha_inicio, s.fecha_fin, s.monto_total,
           u.nombre AS colaborador_nombre, u.email AS colaborador_email,
           'solicitud' AS tipo, NULL AS ajuste_id, NULL AS ajuste_motivo
    FROM viaticos_solicitudes s
    JOIN users u ON u.id = s.colaborador_id
    WHERE s.estado = 'aprobado'
    UNION ALL
    SELECT s.id, s.folio, s.destino, s.fecha_inicio, s.fecha_fin, a.monto_total,
           u.nombre AS colaborador_nombre, u.email AS colaborador_email,
           'ajuste' AS tipo, a.id AS ajuste_id, a.motivo AS ajuste_motivo
    FROM viaticos_ajustes a
    JOIN viaticos_solicitudes s ON s.id = a.solicitud_id
    JOIN users u ON u.id = s.colaborador_id
    WHERE a.estado = 'aprobado'
    ORDER BY 1 DESC
  `);
}

async function listarHistorial() {
  return query(`
    SELECT p.id, p.solicitud_id, p.ajuste_id, p.monto, p.fecha_pago, p.referencia,
           s.folio, s.destino, s.monto_total, s.monto_gastado, s.estado,
           u.nombre AS colaborador_nombre,
           CASE WHEN p.ajuste_id IS NULL THEN 'solicitud' ELSE 'ajuste' END AS tipo
    FROM viaticos_pagos p
    JOIN viaticos_solicitudes s ON s.id = p.solicitud_id
    JOIN users u ON u.id = s.colaborador_id
    ORDER BY p.fecha_pago DESC LIMIT 200
  `);
}

async function getPagoSolicitud(solicitudId) {
  return queryOne(
    'SELECT * FROM viaticos_pagos WHERE solicitud_id = ? AND ajuste_id IS NULL ORDER BY id ASC LIMIT 1',
    [solicitudId]
  );
}

async function pagarSolicitud(solicitudId, userId, comprobante, referencia, metodoPago = null) {
  return withTx(async (conn) => {
    const [solRows] = await conn.execute(
      "SELECT id, monto_total, estado FROM viaticos_solicitudes WHERE id = ? FOR UPDATE",
      [solicitudId]
    );
    if (!solRows.length) throw new Error('Solicitud no encontrada');
    if (solRows[0].estado !== 'aprobado') throw new Error('La solicitud no está aprobada');

    await conn.execute(
      `INSERT INTO viaticos_pagos (solicitud_id, monto, fecha_pago, comprobante_path, referencia, metodo_pago, pagado_por)
       VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
      [solicitudId, solRows[0].monto_total, comprobante, referencia || null, metodoPago || null, userId]
    );

    await conn.execute(
      "UPDATE viaticos_solicitudes SET estado = 'pagado' WHERE id = ?",
      [solicitudId]
    );
  });
}

async function pagarAjuste(ajusteId, userId, comprobante, referencia) {
  return withTx(async (conn) => {
    const [ajRows] = await conn.execute(
      "SELECT id, solicitud_id, monto_total, estado FROM viaticos_ajustes WHERE id = ? FOR UPDATE",
      [ajusteId]
    );
    if (!ajRows.length) throw new Error('Ajuste no encontrado');
    if (ajRows[0].estado !== 'aprobado') throw new Error('El ajuste no está aprobado');

    await conn.execute(
      `INSERT INTO viaticos_pagos (solicitud_id, ajuste_id, monto, fecha_pago, comprobante_path, referencia, pagado_por)
       VALUES (?, ?, ?, NOW(), ?, ?, ?)`,
      [ajRows[0].solicitud_id, ajusteId, ajRows[0].monto_total, comprobante, referencia || null, userId]
    );

    await conn.execute("UPDATE viaticos_ajustes SET estado = 'pagado' WHERE id = ?", [ajusteId]);

    // Sumar el ajuste al monto_total de la solicitud
    await conn.execute(
      `UPDATE viaticos_solicitudes
       SET monto_total = monto_total + ?,
           monto_vuelos = monto_vuelos + ?,
           monto_hospedaje = monto_hospedaje + ?,
           monto_alimentos = monto_alimentos + ?,
           monto_transporte = monto_transporte + ?,
           monto_otros = monto_otros + ?
       WHERE id = ?`,
      [
        ajRows[0].monto_total,
        ...await getDesglose(conn, ajusteId),
        ajRows[0].solicitud_id,
      ]
    );

    return { solicitud_id: ajRows[0].solicitud_id };
  });
}

async function getDesglose(conn, ajusteId) {
  const [rows] = await conn.execute(
    'SELECT monto_vuelos, monto_hospedaje, monto_alimentos, monto_transporte, monto_otros FROM viaticos_ajustes WHERE id = ?',
    [ajusteId]
  );
  const r = rows[0];
  return [r.monto_vuelos, r.monto_hospedaje, r.monto_alimentos, r.monto_transporte, r.monto_otros];
}

module.exports = { listarPorPagar, listarHistorial, getPagoSolicitud, pagarSolicitud, pagarAjuste };
