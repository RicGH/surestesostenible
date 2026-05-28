const { query, queryOne } = require('../config/db');

async function listar(filtros = {}) {
  const where = ['p.activo = 1'];
  const params = [];
  if (filtros.q) {
    where.push('(p.nombre LIKE ? OR p.descripcion LIKE ?)');
    params.push(`%${filtros.q}%`, `%${filtros.q}%`);
  }
  return query(
    `SELECT p.id, p.nombre, p.descripcion, p.asunto_correo, p.mensaje_correo, p.created_at, p.updated_at,
            u.nombre AS creado_por_nombre
     FROM plantillas_documentos p
     LEFT JOIN users u ON u.id = p.creado_por
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY p.updated_at DESC LIMIT 200`,
    params
  );
}

async function findById(id) {
  const row = await queryOne(
    `SELECT p.*, u.nombre AS creado_por_nombre
     FROM plantillas_documentos p
     LEFT JOIN users u ON u.id = p.creado_por
     WHERE p.id = ? LIMIT 1`,
    [id]
  );
  if (row && typeof row.campos_json === 'string') {
    try { row.campos_json = JSON.parse(row.campos_json); } catch { row.campos_json = []; }
  }
  return row;
}

async function crear({ nombre, descripcion, contenido_html, campos_json, asunto_correo, mensaje_correo, creado_por }) {
  const result = await query(
    `INSERT INTO plantillas_documentos (nombre, descripcion, contenido_html, campos_json, asunto_correo, mensaje_correo, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      nombre,
      descripcion || null,
      contenido_html,
      JSON.stringify(campos_json || []),
      asunto_correo || null,
      mensaje_correo || null,
      creado_por,
    ]
  );
  return result.insertId;
}

async function actualizar(id, { nombre, descripcion, contenido_html, campos_json, asunto_correo, mensaje_correo }) {
  await query(
    `UPDATE plantillas_documentos
     SET nombre = ?, descripcion = ?, contenido_html = ?, campos_json = ?, asunto_correo = ?, mensaje_correo = ?
     WHERE id = ?`,
    [
      nombre,
      descripcion || null,
      contenido_html,
      JSON.stringify(campos_json || []),
      asunto_correo || null,
      mensaje_correo || null,
      id,
    ]
  );
}

async function eliminar(id) {
  await query('UPDATE plantillas_documentos SET activo = 0 WHERE id = ?', [id]);
}

module.exports = { listar, findById, crear, actualizar, eliminar };
