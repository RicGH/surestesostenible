const path = require('path');
const fs = require('fs');
const { query, queryOne, withTx } = require('../config/db');
const { z } = require('zod');

const COLORES_FIRMANTE = ['#2563eb', '#16a34a', '#dc2626', '#ea580c', '#9333ea', '#0891b2', '#ca8a04'];

function colorParaIndice(i) {
  return COLORES_FIRMANTE[i % COLORES_FIRMANTE.length];
}

async function listar(filtros = {}) {
  const where = [];
  const params = [];
  if (filtros.estado) { where.push('d.estado = ?'); params.push(filtros.estado); }
  if (filtros.tipo) { where.push('d.tipo = ?'); params.push(filtros.tipo); }
  if (filtros.q) {
    where.push('(d.nombre LIKE ? OR d.descripcion LIKE ?)');
    params.push(`%${filtros.q}%`, `%${filtros.q}%`);
  }
  return query(
    `SELECT d.id, d.nombre, d.descripcion, d.tipo, d.estado, d.envelope_id,
            d.enviado_at, d.completado_at, d.created_at, d.updated_at,
            u.nombre AS creado_por_nombre,
            (SELECT COUNT(*) FROM documento_firmantes f WHERE f.documento_id = d.id) AS total_firmantes,
            (SELECT COUNT(*) FROM documento_firmantes f WHERE f.documento_id = d.id AND f.estado = 'firmado') AS total_firmados
     FROM documentos d
     LEFT JOIN users u ON u.id = d.creado_por
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY d.created_at DESC LIMIT 200`,
    params
  );
}

async function listarContratosDeProveedor(userId) {
  return query(
    `SELECT d.id, d.nombre, d.descripcion, d.estado, d.envelope_id,
            d.archivo_firmado_path, d.enviado_at, d.completado_at, d.created_at,
            (SELECT COUNT(*) FROM documento_firmantes f WHERE f.documento_id = d.id) AS total_firmantes,
            (SELECT COUNT(*) FROM documento_firmantes f WHERE f.documento_id = d.id AND f.estado = 'firmado') AS total_firmados,
            (SELECT f.estado FROM documento_firmantes f
              WHERE f.documento_id = d.id AND f.tipo = 'proveedor' AND f.referencia_id = p.id LIMIT 1) AS mi_estado
     FROM documentos d
     JOIN proveedores p ON p.id = d.proveedor_id
     WHERE p.user_id = ? AND d.estado <> 'borrador'
     ORDER BY d.created_at DESC LIMIT 200`,
    [userId]
  );
}

async function findById(id) {
  return queryOne(
    `SELECT d.*, u.nombre AS creado_por_nombre,
            p.razon_social AS proveedor_nombre, pu.email AS proveedor_email
     FROM documentos d
     LEFT JOIN users u ON u.id = d.creado_por
     LEFT JOIN proveedores p ON p.id = d.proveedor_id
     LEFT JOIN users pu ON pu.id = p.user_id
     WHERE d.id = ? LIMIT 1`,
    [id]
  );
}

async function obtenerFirmantes(documentoId) {
  return query(
    `SELECT id, documento_id, tipo, referencia_id, nombre, email, orden, color, estado, firmado_at
     FROM documento_firmantes
     WHERE documento_id = ?
     ORDER BY orden ASC, id ASC`,
    [documentoId]
  );
}

async function obtenerTags(documentoId) {
  return query(
    `SELECT id, documento_id, firmante_id, tipo, pagina, x, y, ancho, alto, requerido
     FROM documento_tags
     WHERE documento_id = ?
     ORDER BY pagina ASC, id ASC`,
    [documentoId]
  );
}

async function detalleCompleto(id) {
  const doc = await findById(id);
  if (!doc) return null;
  const firmantes = await obtenerFirmantes(id);
  const tags = await obtenerTags(id);
  const campos = await obtenerCampos(id);
  const anotaciones = await obtenerAnotaciones(id);
  return { ...doc, firmantes, tags, campos, anotaciones };
}

async function obtenerCampos(documentoId) {
  return query(
    `SELECT id, nombre, label, tipo, valor, requerido, orden
     FROM documento_campos
     WHERE documento_id = ?
     ORDER BY orden ASC, id ASC`,
    [documentoId]
  );
}

async function obtenerAnotaciones(documentoId) {
  return query(
    `SELECT id, tipo, pagina, x, y, ancho, alto, contenido, campo_nombre, font_size, color, bold
     FROM documento_anotaciones
     WHERE documento_id = ?
     ORDER BY pagina ASC, id ASC`,
    [documentoId]
  );
}

async function reemplazarAnotaciones(documentoId, anotaciones) {
  return withTx(async (conn) => {
    await conn.execute('DELETE FROM documento_anotaciones WHERE documento_id = ?', [documentoId]);
    for (const a of anotaciones) {
      await conn.execute(
        `INSERT INTO documento_anotaciones
           (documento_id, tipo, pagina, x, y, ancho, alto, contenido, campo_nombre, font_size, color, bold)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          documentoId,
          a.tipo || 'texto',
          a.pagina || 1,
          a.x,
          a.y,
          a.ancho || 200,
          a.alto || 24,
          a.tipo === 'texto' ? (a.contenido || '') : null,
          a.tipo === 'campo' ? (a.campo_nombre || null) : null,
          a.font_size || 11,
          a.color || '#111111',
          a.bold ? 1 : 0,
        ]
      );
    }
  });
}

async function reemplazarCamposImportado(documentoId, campos) {
  return withTx(async (conn) => {
    await conn.execute('DELETE FROM documento_campos WHERE documento_id = ?', [documentoId]);
    for (let i = 0; i < campos.length; i++) {
      const c = campos[i];
      await conn.execute(
        `INSERT INTO documento_campos (documento_id, nombre, label, tipo, valor, requerido, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [documentoId, c.nombre, c.label, c.tipo || 'texto', c.valor || null, c.requerido === false ? 0 : 1, i]
      );
    }
  });
}

async function crear({ nombre, descripcion, archivo_path, creado_por }) {
  const result = await query(
    `INSERT INTO documentos (nombre, descripcion, archivo_path, creado_por, tipo)
     VALUES (?, ?, ?, ?, 'importado')`,
    [nombre, descripcion || null, archivo_path, creado_por]
  );
  return result.insertId;
}

async function crearDesdeHtml({ nombre, descripcion, contenido_html, plantilla_id, creado_por, campos }) {
  return withTx(async (conn) => {
    const [res] = await conn.execute(
      `INSERT INTO documentos (nombre, descripcion, archivo_path, contenido_html, plantilla_id, creado_por, tipo)
       VALUES (?, ?, '', ?, ?, ?, 'creado')`,
      [nombre, descripcion || null, contenido_html, plantilla_id || null, creado_por]
    );
    const id = res.insertId;
    if (campos && campos.length) {
      for (let i = 0; i < campos.length; i++) {
        const c = campos[i];
        await conn.execute(
          `INSERT INTO documento_campos (documento_id, nombre, label, tipo, valor, requerido, orden)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, c.nombre, c.label, c.tipo || 'texto', c.valor || null, c.requerido === false ? 0 : 1, i]
        );
      }
    }
    return id;
  });
}

async function actualizarHtml(id, { nombre, descripcion, contenido_html, asunto_correo, mensaje_correo, campos }) {
  return withTx(async (conn) => {
    await conn.execute(
      `UPDATE documentos
       SET nombre = ?, descripcion = ?, contenido_html = ?, asunto_correo = ?, mensaje_correo = ?
       WHERE id = ?`,
      [nombre, descripcion || null, contenido_html, asunto_correo || null, mensaje_correo || null, id]
    );
    if (Array.isArray(campos)) {
      await conn.execute('DELETE FROM documento_campos WHERE documento_id = ?', [id]);
      for (let i = 0; i < campos.length; i++) {
        const c = campos[i];
        await conn.execute(
          `INSERT INTO documento_campos (documento_id, nombre, label, tipo, valor, requerido, orden)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [id, c.nombre, c.label, c.tipo || 'texto', c.valor || null, c.requerido === false ? 0 : 1, i]
        );
      }
    }
  });
}

async function actualizarValoresCampos(id, valores) {
  return withTx(async (conn) => {
    for (const [nombre, valor] of Object.entries(valores || {})) {
      await conn.execute(
        `UPDATE documento_campos SET valor = ? WHERE documento_id = ? AND nombre = ?`,
        [valor == null ? null : String(valor), id, nombre]
      );
    }
  });
}

async function guardarArchivoPdf(id, archivo_path) {
  await query(`UPDATE documentos SET archivo_path = ? WHERE id = ?`, [archivo_path, id]);
}

async function actualizarDatos(id, { nombre, descripcion, asunto_correo, mensaje_correo }) {
  await query(
    `UPDATE documentos
     SET nombre = ?, descripcion = ?, asunto_correo = ?, mensaje_correo = ?
     WHERE id = ?`,
    [nombre, descripcion || null, asunto_correo || null, mensaje_correo || null, id]
  );
}

async function eliminar(id) {
  const doc = await findById(id);
  if (!doc) return;
  if (doc.archivo_path) {
    const abs = path.resolve(__dirname, '..', '..', doc.archivo_path);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  }
  if (doc.archivo_firmado_path) {
    const abs = path.resolve(__dirname, '..', '..', doc.archivo_firmado_path);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  }
  await query('DELETE FROM documentos WHERE id = ?', [id]);
}

async function reemplazarFirmantes(documentoId, firmantes) {
  return withTx(async (conn) => {
    await conn.execute('DELETE FROM documento_firmantes WHERE documento_id = ?', [documentoId]);
    const ids = [];
    for (let i = 0; i < firmantes.length; i++) {
      const f = firmantes[i];
      const [res] = await conn.execute(
        `INSERT INTO documento_firmantes
           (documento_id, tipo, referencia_id, nombre, email, orden, color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          documentoId,
          f.tipo,
          f.referencia_id || null,
          f.nombre,
          f.email,
          f.orden || i + 1,
          f.color || colorParaIndice(i),
        ]
      );
      ids.push(res.insertId);
    }
    return ids;
  });
}

async function reemplazarTags(documentoId, tags) {
  return withTx(async (conn) => {
    await conn.execute('DELETE FROM documento_tags WHERE documento_id = ?', [documentoId]);
    for (const t of tags) {
      await conn.execute(
        `INSERT INTO documento_tags
           (documento_id, firmante_id, tipo, pagina, x, y, ancho, alto, requerido)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          documentoId,
          t.firmante_id,
          t.tipo || 'firma',
          t.pagina || 1,
          t.x,
          t.y,
          t.ancho || 140,
          t.alto || 40,
          t.requerido === false ? 0 : 1,
        ]
      );
    }
  });
}

async function marcarEnviado(id, envelopeId, estado = 'enviado') {
  await query(
    `UPDATE documentos
     SET envelope_id = ?, estado = ?, enviado_at = NOW()
     WHERE id = ?`,
    [envelopeId, estado, id]
  );
  await query(
    `UPDATE documento_firmantes SET estado = 'enviado' WHERE documento_id = ?`,
    [id]
  );
}

function aMysqlDatetime(valor) {
  if (!valor) return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function actualizarEstado(id, estado, completadoAt = null) {
  const fecha = aMysqlDatetime(completadoAt);
  if (fecha) {
    await query('UPDATE documentos SET estado = ?, completado_at = ? WHERE id = ?', [estado, fecha, id]);
  } else {
    await query('UPDATE documentos SET estado = ? WHERE id = ?', [estado, id]);
  }
}

async function marcarFirmantePorEmail(documentoId, email, estado, firmadoAt = null) {
  await query(
    `UPDATE documento_firmantes
     SET estado = ?, firmado_at = ?
     WHERE documento_id = ? AND email = ?`,
    [estado, aMysqlDatetime(firmadoAt), documentoId, email]
  );
}

async function findByEnvelopeId(envelopeId) {
  return queryOne(
    `SELECT * FROM documentos WHERE envelope_id = ? LIMIT 1`,
    [envelopeId]
  );
}

async function guardarPdfFirmado(id, archivoFirmadoPath) {
  await query(
    `UPDATE documentos SET archivo_firmado_path = ? WHERE id = ?`,
    [archivoFirmadoPath, id]
  );
}

module.exports = {
  listar,
  listarContratosDeProveedor,
  findById,
  detalleCompleto,
  obtenerFirmantes,
  obtenerTags,
  obtenerCampos,
  obtenerAnotaciones,
  crear,
  crearDesdeHtml,
  actualizarDatos,
  actualizarHtml,
  actualizarValoresCampos,
  reemplazarAnotaciones,
  reemplazarCamposImportado,
  guardarArchivoPdf,
  eliminar,
  reemplazarFirmantes,
  reemplazarTags,
  marcarEnviado,
  actualizarEstado,
  marcarFirmantePorEmail,
  findByEnvelopeId,
  guardarPdfFirmado,
  colorParaIndice,
};
