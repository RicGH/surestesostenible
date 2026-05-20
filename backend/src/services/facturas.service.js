const { query, queryOne } = require('../config/db');

function generarFolio() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `F-${ts}-${rnd}`;
}

async function crear(proveedorId, cfdi, pdfPath, xmlPath) {
  const folio = generarFolio();
  const result = await query(
    `INSERT INTO facturas_proveedor
     (folio, proveedor_id, uuid_cfdi, rfc_emisor, nombre_emisor, monto, moneda, fecha_emision, pdf_path, xml_path, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_revision')`,
    [folio, proveedorId, cfdi.uuid, cfdi.rfc_emisor, cfdi.nombre_emisor, cfdi.monto, cfdi.moneda, cfdi.fecha_emision, pdfPath, xmlPath]
  );
  return { id: result.insertId, folio };
}

async function listarPorProveedor(proveedorId, filtros = {}) {
  const where = ['proveedor_id = ?'];
  const params = [proveedorId];
  if (filtros.estado) { where.push('estado = ?'); params.push(filtros.estado); }
  if (filtros.folio) { where.push('folio LIKE ?'); params.push(`%${filtros.folio}%`); }
  if (filtros.desde) { where.push('fecha_emision >= ?'); params.push(filtros.desde); }
  if (filtros.hasta) { where.push('fecha_emision <= ?'); params.push(filtros.hasta); }
  return query(
    `SELECT f.id, f.folio, f.uuid_cfdi, f.monto, f.moneda, f.fecha_emision, f.estado,
            f.motivo_rechazo, f.created_at,
            (SELECT COUNT(*) FROM pagos p WHERE p.factura_id = f.id) AS pagada
     FROM facturas_proveedor f
     WHERE ${where.join(' AND ')}
     ORDER BY f.created_at DESC LIMIT 200`,
    params
  );
}

async function listarParaAdmin(filtros = {}) {
  const where = [];
  const params = [];
  if (filtros.estado) { where.push('f.estado = ?'); params.push(filtros.estado); }
  if (filtros.proveedor_id) { where.push('f.proveedor_id = ?'); params.push(filtros.proveedor_id); }
  return query(
    `SELECT f.id, f.folio, f.monto, f.moneda, f.fecha_emision, f.estado, f.created_at,
            p.razon_social, p.rfc
     FROM facturas_proveedor f
     JOIN proveedores p ON p.id = f.proveedor_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY f.created_at DESC LIMIT 200`,
    params
  );
}

async function getById(id) {
  return queryOne(
    `SELECT f.*, p.razon_social, p.rfc, p.user_id AS proveedor_user_id, p.banco, p.cuenta_clabe
     FROM facturas_proveedor f
     JOIN proveedores p ON p.id = f.proveedor_id
     WHERE f.id = ?`,
    [id]
  );
}

async function aprobar(id, adminId) {
  await query(
    "UPDATE facturas_proveedor SET estado='aprobada', aprobada_por=?, aprobada_at=NOW(), motivo_rechazo=NULL WHERE id=? AND estado='en_revision'",
    [adminId, id]
  );
}

async function rechazar(id, adminId, motivo) {
  await query(
    "UPDATE facturas_proveedor SET estado='rechazada', aprobada_por=?, aprobada_at=NOW(), motivo_rechazo=? WHERE id=? AND estado='en_revision'",
    [adminId, motivo, id]
  );
}

async function pagar(facturaId, userId, comprobantePath, referencia) {
  await query(
    'INSERT INTO pagos (factura_id, fecha_pago, comprobante_path, referencia, pagado_por) VALUES (?, NOW(), ?, ?, ?)',
    [facturaId, comprobantePath, referencia || null, userId]
  );
  await query("UPDATE facturas_proveedor SET estado='pagada' WHERE id=? AND estado='aprobada'", [facturaId]);
}

async function getPago(facturaId) {
  return queryOne('SELECT * FROM pagos WHERE factura_id = ?', [facturaId]);
}

module.exports = {
  crear, listarPorProveedor, listarParaAdmin, getById,
  aprobar, rechazar, pagar, getPago,
};
