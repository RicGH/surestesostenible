const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { query, queryOne } = require('../config/db');
const { HttpError } = require('../middleware/error');
const viaticosService = require('./viaticos.service');
const oficioService = require('./viaticos-oficio.service');
const firmaInterna = require('./firma-interna.service');

// Firma del oficio de comisión: se envía primero a quien Autoriza y, cuando firma,
// el flujo de firma interna manda automáticamente el correo a quien Recibe.

const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'documentos');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Tamaño del recuadro de firma sobre la línea de cada firmante (puntos PDF)
const FIRMA_ANCHO = 150;
const FIRMA_ALTO = 34;

/**
 * Busca en el PDF las etiquetas "Recibe" y "Autoriza" y devuelve el recuadro de
 * firma de cada una: centrado bajo la etiqueta y apoyado sobre la línea de firma.
 * Coordenadas con origen arriba-izquierda (lo que espera documento_tags).
 */
async function ubicarFirmas(pdfBuffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(pdfBuffer), verbosity: 0 }).promise;
  const encontrados = {};
  try {
    // Se recorre de la última página a la primera: las firmas van al final
    for (let p = doc.numPages; p >= 1 && (!encontrados.recibe || !encontrados.autoriza); p--) {
      const page = await doc.getPage(p);
      const { height } = page.getViewport({ scale: 1 });
      const { items } = await page.getTextContent();
      for (const it of items) {
        const txt = String(it.str || '').trim().toLowerCase();
        const clave = txt === 'recibe' ? 'recibe' : txt === 'autoriza' ? 'autoriza' : null;
        if (!clave || encontrados[clave]) continue;
        const [, , , , x, yBase] = it.transform;
        const centro = x + it.width / 2;
        encontrados[clave] = {
          pagina: p,
          x: Math.max(0, centro - FIRMA_ANCHO / 2),
          y: height - yBase + 4, // justo debajo de la etiqueta
          ancho: FIRMA_ANCHO,
          alto: FIRMA_ALTO,
        };
      }
    }
  } finally {
    await doc.destroy();
  }
  if (!encontrados.recibe || !encontrados.autoriza) {
    throw new HttpError(500, 'No se encontraron los espacios de firma "Recibe" y "Autoriza" en el oficio');
  }
  return encontrados;
}

async function usuarioPorNombre(nombre, soloAprobadores) {
  if (!nombre) return null;
  return queryOne(
    `SELECT id, nombre, email FROM users
     WHERE nombre = ? AND activo = 1 AND eliminado = 0 ${soloAprobadores ? 'AND es_aprobador_viaticos = 1' : ''}
     ORDER BY id ASC LIMIT 1`,
    [nombre]
  );
}

/** Firmantes sugeridos a partir de los datos del viático (con su correo si es usuario). */
async function firmantesSugeridos(v) {
  const autorizaUser =
    (await usuarioPorNombre(v.autoriza_nombre, true)) || (await usuarioPorNombre(v.autoriza_nombre, false));
  const colaborador = await queryOne(`SELECT id, nombre, email FROM users WHERE id = ?`, [v.colaborador_id]);
  const recibeNombre = v.recibe_nombre || v.colaborador_nombre || '';
  // Quien recibe normalmente es el colaborador del viático
  const recibeUser =
    colaborador && (!v.recibe_nombre || v.recibe_nombre === colaborador.nombre)
      ? colaborador
      : await usuarioPorNombre(v.recibe_nombre, false);

  return {
    autoriza: {
      nombre: v.autoriza_nombre || '',
      email: autorizaUser?.email || '',
      usuario_id: autorizaUser?.id || null,
    },
    recibe: {
      nombre: recibeNombre,
      email: recibeUser?.email || '',
      usuario_id: recibeUser?.id || null,
    },
  };
}

async function documentoDeViatico(v) {
  if (!v.oficio_documento_id) return null;
  const doc = await queryOne(
    `SELECT id, nombre, estado, archivo_path, archivo_firmado_path, enviado_at, completado_at
     FROM documentos WHERE id = ?`,
    [v.oficio_documento_id]
  );
  if (!doc) return null;
  const firmantes = await query(
    `SELECT id, nombre, email, orden, estado, firmado_interno_at
     FROM documento_firmantes WHERE documento_id = ? ORDER BY orden ASC`,
    [doc.id]
  );
  return { ...doc, firmantes };
}

async function cargarViatico(viaticoId) {
  const v = await viaticosService.getById(viaticoId);
  if (!v) throw new HttpError(404, 'Viático no encontrado');
  return v;
}

/** Estado de la firma del oficio + firmantes sugeridos para un envío nuevo. */
async function estado(viaticoId) {
  const v = await cargarViatico(viaticoId);
  const documento = await documentoDeViatico(v);
  const sugeridos = await firmantesSugeridos(v);
  return {
    folio: v.folio,
    documento: documento
      ? {
          id: documento.id,
          estado: documento.estado,
          enviado_at: documento.enviado_at,
          completado_at: documento.completado_at,
          firmantes: documento.firmantes.map((f) => ({
            nombre: f.nombre,
            email: f.email,
            orden: f.orden,
            rol: f.orden === 1 ? 'autoriza' : 'recibe',
            estado: f.estado,
            firmado_at: f.firmado_interno_at,
          })),
        }
      : null,
    sugeridos,
  };
}

async function eliminarDocumento(doc) {
  for (const rel of [doc.archivo_path, doc.archivo_firmado_path]) {
    if (!rel) continue;
    const abs = path.resolve(__dirname, '..', '..', rel);
    if (fs.existsSync(abs)) fs.rmSync(abs, { force: true });
  }
  await query(`DELETE FROM documentos WHERE id = ?`, [doc.id]); // firmantes y tags en cascada
}

/**
 * Genera el oficio y lo envía a firma: Autoriza (orden 1) → Recibe (orden 2).
 * Si ya había un envío sin terminar se reemplaza por uno nuevo.
 */
async function enviar(viaticoId, { autoriza_email, recibe_email }, creadoPor) {
  const v = await cargarViatico(viaticoId);
  if (!v.autoriza_nombre) {
    throw new HttpError(400, 'El viático no tiene asignado quién autoriza. Edítalo y elige "Autorizado por".');
  }

  const sugeridos = await firmantesSugeridos(v);
  const autoriza = { ...sugeridos.autoriza, email: String(autoriza_email || sugeridos.autoriza.email || '').trim() };
  const recibe = { ...sugeridos.recibe, email: String(recibe_email || sugeridos.recibe.email || '').trim() };
  if (!EMAIL_RE.test(autoriza.email)) throw new HttpError(400, `Captura un correo válido para quien autoriza (${autoriza.nombre})`);
  if (!EMAIL_RE.test(recibe.email)) throw new HttpError(400, `Captura un correo válido para quien recibe (${recibe.nombre})`);

  const previo = await documentoDeViatico(v);
  if (previo && previo.estado === 'firmado') {
    throw new HttpError(409, 'El oficio de este viático ya está firmado por ambas partes');
  }

  // 1. Generar el PDF y ubicar los espacios de firma
  const { pdf } = await oficioService.generarPdf(viaticoId);
  const pos = await ubicarFirmas(pdf);

  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const filename = `oficio_viatico_${v.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.pdf`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), pdf);
  const relPath = path.posix.join('uploads', 'documentos', filename);

  // 2. Crear el documento nuevo con sus firmantes y espacios de firma
  const nombre = `Oficio de comisión ${v.folio}`;
  const docRes = await query(
    `INSERT INTO documentos (nombre, descripcion, tipo, archivo_path, creado_por)
     VALUES (?, ?, 'oficio', ?, ?)`,
    [nombre, `Viático ${v.folio} — ${v.colaborador_nombre || ''}`.trim(), relPath, creadoPor || null]
  );
  const documentoId = docRes.insertId;

  try {
    const firmantes = [
      { ...autoriza, orden: 1, color: '#2563eb', tag: pos.autoriza },
      { ...recibe, orden: 2, color: '#16a34a', tag: pos.recibe },
    ];
    for (const f of firmantes) {
      const fr = await query(
        `INSERT INTO documento_firmantes (documento_id, tipo, referencia_id, nombre, email, orden, color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [documentoId, f.usuario_id ? 'usuario' : 'externo', f.usuario_id, f.nombre, f.email, f.orden, f.color]
      );
      await query(
        `INSERT INTO documento_tags (documento_id, firmante_id, tipo, pagina, x, y, ancho, alto, requerido)
         VALUES (?, ?, 'firma', ?, ?, ?, ?, ?, 1)`,
        [documentoId, fr.insertId, f.tag.pagina, f.tag.x, f.tag.y, f.tag.ancho, f.tag.alto]
      );
    }

    // 3. Enviar: el correo llega primero a quien autoriza
    await firmaInterna.enviarInterno(documentoId);
  } catch (err) {
    // Si falla (p. ej. el correo), se deshace el envío nuevo y se conserva el anterior
    const nuevo = await queryOne(`SELECT * FROM documentos WHERE id = ?`, [documentoId]);
    if (nuevo) await eliminarDocumento(nuevo);
    if (/auth|login|535|ECONNREFUSED|ETIMEDOUT|ESOCKET|EAUTH/i.test(String(err?.message || err?.code))) {
      throw new HttpError(502, 'No se pudo enviar el correo de firma: revisa la configuración de correo (SMTP) en Configuración. Detalle: ' + err.message);
    }
    throw err;
  }

  // 4. El viático apunta al envío nuevo; el anterior (si lo había) se descarta
  await query(`UPDATE viaticos_solicitudes SET oficio_documento_id = ? WHERE id = ?`, [documentoId, v.id]);
  if (previo) await eliminarDocumento(previo);

  return estado(viaticoId);
}

/** PDF del oficio enviado a firma (con las firmas que lleve hasta el momento). */
async function pdfFirmado(viaticoId) {
  const v = await cargarViatico(viaticoId);
  const doc = await documentoDeViatico(v);
  if (!doc) throw new HttpError(404, 'El oficio de este viático aún no se ha enviado a firma');
  const rel = doc.archivo_firmado_path || doc.archivo_path;
  const abs = path.resolve(__dirname, '..', '..', rel);
  if (!fs.existsSync(abs)) throw new HttpError(404, 'No se encontró el PDF del oficio');
  return { pdf: fs.readFileSync(abs), folio: v.folio, firmado: doc.estado === 'firmado' };
}

module.exports = { estado, enviar, pdfFirmado, ubicarFirmas };
