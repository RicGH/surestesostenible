const { query, queryOne } = require('../config/db');

function rangoDefault(filtros = {}) {
  const hoy = new Date();
  const desde = filtros.desde || new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1).toISOString().slice(0, 10);
  const hasta = filtros.hasta || hoy.toISOString().slice(0, 10);
  return { desde, hasta };
}

async function dashboardViaticos(filtros = {}) {
  const { desde, hasta } = rangoDefault(filtros);
  const [kpis, porEstado, porMes, topDestinos, topColaboradores] = await Promise.all([
    queryOne(
      `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(monto_total), 0) AS monto_total,
        COALESCE(SUM(monto_gastado), 0) AS monto_gastado,
        COALESCE(SUM(CASE WHEN estado = 'aprobado' THEN monto_total ELSE 0 END), 0) AS monto_por_pagar,
        COALESCE(SUM(CASE WHEN estado IN ('pagado','en_proceso','cerrado') THEN monto_total ELSE 0 END), 0) AS monto_pagado,
        COALESCE(AVG(monto_total), 0) AS ticket_promedio,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
        SUM(CASE WHEN estado = 'aprobado' THEN 1 ELSE 0 END) AS aprobados,
        SUM(CASE WHEN estado = 'pagado' THEN 1 ELSE 0 END) AS pagados,
        SUM(CASE WHEN estado = 'en_proceso' THEN 1 ELSE 0 END) AS en_proceso,
        SUM(CASE WHEN estado = 'cerrado' THEN 1 ELSE 0 END) AS cerrados,
        SUM(CASE WHEN estado = 'rechazado' THEN 1 ELSE 0 END) AS rechazados
       FROM viaticos_solicitudes
       WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)`,
      [desde, hasta]
    ),
    query(
      `SELECT estado, COUNT(*) AS count, COALESCE(SUM(monto_total),0) AS monto
       FROM viaticos_solicitudes
       WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY estado`,
      [desde, hasta]
    ),
    query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS mes,
              COUNT(*) AS count,
              COALESCE(SUM(monto_total),0) AS monto
       FROM viaticos_solicitudes
       WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY mes ORDER BY mes ASC`,
      [desde, hasta]
    ),
    query(
      `SELECT destino, COUNT(*) AS count, COALESCE(SUM(monto_total),0) AS monto
       FROM viaticos_solicitudes
       WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY destino ORDER BY monto DESC LIMIT 5`,
      [desde, hasta]
    ),
    query(
      `SELECT u.nombre AS colaborador, COUNT(*) AS count, COALESCE(SUM(s.monto_total),0) AS monto
       FROM viaticos_solicitudes s
       JOIN users u ON u.id = s.colaborador_id
       WHERE s.created_at >= ? AND s.created_at < DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY u.id, u.nombre ORDER BY monto DESC LIMIT 5`,
      [desde, hasta]
    ),
  ]);
  return { kpis, por_estado: porEstado, por_mes: porMes, top_destinos: topDestinos, top_colaboradores: topColaboradores };
}

async function dashboardFacturas(filtros = {}) {
  const { desde, hasta } = rangoDefault(filtros);
  const [kpis, porEstado, porMes, topProveedores] = await Promise.all([
    queryOne(
      `SELECT
        COUNT(*) AS total,
        COALESCE(SUM(monto), 0) AS monto_total,
        COALESCE(SUM(CASE WHEN estado = 'pagada' THEN monto ELSE 0 END), 0) AS monto_pagado,
        COALESCE(SUM(CASE WHEN estado = 'aprobada' THEN monto ELSE 0 END), 0) AS monto_por_pagar,
        COALESCE(SUM(CASE WHEN estado = 'pendiente' THEN monto ELSE 0 END), 0) AS monto_pendiente,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
        SUM(CASE WHEN estado = 'aprobada' THEN 1 ELSE 0 END) AS aprobadas,
        SUM(CASE WHEN estado = 'pagada' THEN 1 ELSE 0 END) AS pagadas,
        SUM(CASE WHEN estado = 'rechazada' THEN 1 ELSE 0 END) AS rechazadas
       FROM facturas_proveedor
       WHERE fecha_emision >= ? AND fecha_emision <= ?`,
      [desde, hasta]
    ),
    query(
      `SELECT estado, COUNT(*) AS count, COALESCE(SUM(monto),0) AS monto
       FROM facturas_proveedor
       WHERE fecha_emision >= ? AND fecha_emision <= ?
       GROUP BY estado`,
      [desde, hasta]
    ),
    query(
      `SELECT DATE_FORMAT(fecha_emision, '%Y-%m') AS mes,
              COUNT(*) AS count,
              COALESCE(SUM(monto),0) AS monto
       FROM facturas_proveedor
       WHERE fecha_emision >= ? AND fecha_emision <= ?
       GROUP BY mes ORDER BY mes ASC`,
      [desde, hasta]
    ),
    query(
      `SELECT p.razon_social AS proveedor, COUNT(*) AS count, COALESCE(SUM(f.monto),0) AS monto
       FROM facturas_proveedor f
       JOIN proveedores p ON p.id = f.proveedor_id
       WHERE f.fecha_emision >= ? AND f.fecha_emision <= ?
       GROUP BY p.id, p.razon_social ORDER BY monto DESC LIMIT 5`,
      [desde, hasta]
    ),
  ]);
  return { kpis, por_estado: porEstado, por_mes: porMes, top_proveedores: topProveedores };
}

async function dashboard(filtros = {}) {
  const { desde, hasta } = rangoDefault(filtros);
  const [viaticos, facturas] = await Promise.all([
    dashboardViaticos({ desde, hasta }),
    dashboardFacturas({ desde, hasta }),
  ]);
  return { rango: { desde, hasta }, viaticos, facturas };
}

async function reporteViaticos(filtros = {}) {
  const where = [];
  const params = [];
  if (filtros.estado) { where.push('s.estado = ?'); params.push(filtros.estado); }
  if (filtros.desde) { where.push('s.fecha_inicio >= ?'); params.push(filtros.desde); }
  if (filtros.hasta) { where.push('s.fecha_fin <= ?'); params.push(filtros.hasta); }
  return query(
    `SELECT s.folio, u.nombre AS colaborador, s.destino, s.fecha_inicio, s.fecha_fin,
            s.monto_total, s.monto_gastado, s.estado
     FROM viaticos_solicitudes s
     JOIN users u ON u.id = s.colaborador_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY s.created_at DESC`,
    params
  );
}

async function reporteProveedores(filtros = {}) {
  const where = [];
  const params = [];
  if (filtros.estado) { where.push('f.estado = ?'); params.push(filtros.estado); }
  if (filtros.desde) { where.push('f.fecha_emision >= ?'); params.push(filtros.desde); }
  if (filtros.hasta) { where.push('f.fecha_emision <= ?'); params.push(filtros.hasta); }
  return query(
    `SELECT f.folio, p.razon_social, p.rfc, f.uuid_cfdi, f.monto, f.moneda,
            f.fecha_emision, f.estado
     FROM facturas_proveedor f
     JOIN proveedores p ON p.id = f.proveedor_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY f.fecha_emision DESC`,
    params
  );
}

module.exports = { reporteViaticos, reporteProveedores, dashboard };
