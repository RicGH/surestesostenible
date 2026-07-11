const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { query, queryOne } = require('../config/db');
const mail = require('./mail.service');

const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

function generarToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function enviarInterno(documentoId) {
  const doc = await queryOne(
    `SELECT * FROM documentos WHERE id = ? AND estado = 'borrador'`,
    [documentoId]
  );
  if (!doc) throw new Error('Documento no encontrado o no está en borrador');

  const firmantes = await query(
    `SELECT * FROM documento_firmantes WHERE documento_id = ? ORDER BY orden ASC`,
    [documentoId]
  );
  if (!firmantes.length) throw new Error('El documento no tiene firmantes');

  const tags = await query(
    `SELECT * FROM documento_tags WHERE documento_id = ?`,
    [documentoId]
  );
  for (const f of firmantes) {
    const tiene = tags.some((t) => Number(t.firmante_id) === Number(f.id));
    if (!tiene) throw new Error(`El firmante "${f.nombre}" no tiene ningún tag de firma asignado`);
  }

  // Generar token único a cada firmante
  for (const f of firmantes) {
    const token = generarToken();
    await query(
      `UPDATE documento_firmantes SET firma_token = ?, estado = 'pendiente' WHERE id = ?`,
      [token, f.id]
    );
    f.firma_token = token;
  }

  // Copiar PDF original al path firmado (base de trabajo progresivo)
  const absOrig = path.resolve(__dirname, '..', '..', doc.archivo_path);
  if (!fs.existsSync(absOrig)) throw new Error('No se encontró el archivo PDF del documento');

  const origName = path.basename(doc.archivo_path, path.extname(doc.archivo_path));
  const firmadoName = `${origName}_interno_firmado.pdf`;
  const firmadoDir = path.dirname(absOrig);
  const absFirmado = path.join(firmadoDir, firmadoName);
  fs.copyFileSync(absOrig, absFirmado);
  const relFirmado = path.posix.join(path.dirname(doc.archivo_path), firmadoName);

  // Actualizar documento
  await query(
    `UPDATE documentos SET estado = 'enviado', modo_envio = 'interno', enviado_at = NOW(), archivo_firmado_path = ? WHERE id = ?`,
    [relFirmado, documentoId]
  );

  // Enviar correo solo al primer firmante (orden 1)
  const primero = firmantes[0];
  await enviarCorreoFirma(primero, doc);

  return { ok: true, firmantes: firmantes.length };
}

async function enviarCorreoFirma(firmante, doc) {
  const url = `${BASE_URL}/firma/${firmante.firma_token}`;
  await mail.enviar({
    to: firmante.email,
    subject: `Documento pendiente de firma: ${doc.nombre}`,
    text: `Hola ${firmante.nombre},\n\nSe te ha solicitado firmar el documento: "${doc.nombre}".\n\nRevisa y firma aquí: ${url}\n\nEste enlace es personal e intransferible.`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0fafb;font-family:Inter,Arial,sans-serif;color:#1e293b;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #a3eff7;overflow:hidden;box-shadow:0 2px 12px rgba(0,183,198,0.08);">
      <tr><td style="background:linear-gradient(135deg,#0a2c33,#057d8c 60%,#00b7c6);padding:24px 28px;color:#fff;">
        <strong style="font-size:14px;letter-spacing:0.5px;">App Sureste Sostenible</strong>
      </td></tr>
      <tr><td style="padding:28px;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#0a6571;">Tienes un documento pendiente de firma</h2>
        <p style="margin:0 0 12px;color:#475569;font-size:14px;line-height:1.5;">
          Hola <strong>${firmante.nombre}</strong>,
        </p>
        <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.5;">
          Se ha solicitado tu firma en el documento: <strong style="color:#057d8c;">${doc.nombre}</strong>
        </p>
        <a href="${url}" style="display:inline-block;padding:12px 28px;background:#0a2c33;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.3px;">
          Revisar y Firmar
        </a>
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">
          Este enlace es personal e intransferible. Si no esperabas este correo, puedes ignorarlo.
        </p>
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #cffafe;color:#94a3b8;font-size:12px;">
        Este correo fue generado automáticamente por App Sureste Sostenible.
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`,
  });
}

async function obtenerSesion(token) {
  const firmante = await queryOne(
    `SELECT f.*,
            d.id AS doc_id, d.nombre AS doc_nombre, d.descripcion AS doc_descripcion,
            d.estado AS doc_estado, d.modo_envio,
            d.archivo_path, d.archivo_firmado_path
     FROM documento_firmantes f
     JOIN documentos d ON d.id = f.documento_id
     WHERE f.firma_token = ?`,
    [token]
  );
  if (!firmante) return null;

  // Verificar si es su turno (todos los firmantes anteriores deben haber firmado)
  if (firmante.orden > 1) {
    const [prev] = await query(
      `SELECT COUNT(*) AS cnt FROM documento_firmantes
       WHERE documento_id = ? AND orden < ? AND estado != 'firmado'`,
      [firmante.documento_id, firmante.orden]
    );
    if (prev && prev.cnt > 0) {
      return { ...firmante, esperando: true, tags: [] };
    }
  }

  const tags = await query(
    `SELECT * FROM documento_tags WHERE documento_id = ? AND firmante_id = ? ORDER BY pagina ASC, id ASC`,
    [firmante.documento_id, firmante.id]
  );

  const totalFirmantes = await queryOne(
    `SELECT COUNT(*) AS total FROM documento_firmantes WHERE documento_id = ?`,
    [firmante.documento_id]
  );

  return {
    ...firmante,
    esperando: false,
    tags,
    total_firmantes: totalFirmantes?.total || 1,
  };
}

async function streamPdf(token) {
  const row = await queryOne(
    `SELECT d.archivo_path, d.archivo_firmado_path
     FROM documento_firmantes f
     JOIN documentos d ON d.id = f.documento_id
     WHERE f.firma_token = ?`,
    [token]
  );
  if (!row) return null;

  const relPath = row.archivo_firmado_path || row.archivo_path;
  const abs = path.resolve(__dirname, '..', '..', relPath);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs);
}

async function procesarFirma(token, firmas) {
  // firmas: { [tagId]: "data:image/png;base64,..." }
  const firmante = await queryOne(
    `SELECT f.*, d.id AS doc_id, d.nombre AS doc_nombre,
            d.archivo_path, d.archivo_firmado_path
     FROM documento_firmantes f
     JOIN documentos d ON d.id = f.documento_id
     WHERE f.firma_token = ? AND f.estado != 'firmado'`,
    [token]
  );
  if (!firmante) throw new Error('Sesión no válida o el documento ya fue firmado');

  const tags = await query(
    `SELECT * FROM documento_tags WHERE documento_id = ? AND firmante_id = ?`,
    [firmante.doc_id, firmante.id]
  );

  // Validar que todos los tags requeridos de tipo firma/iniciales tengan imagen
  for (const t of tags) {
    if (t.requerido && (t.tipo === 'firma' || t.tipo === 'iniciales')) {
      if (!firmas[String(t.id)]) {
        throw new Error(`Falta la firma en la página ${t.pagina}`);
      }
    }
  }

  // Cargar PDF acumulado
  const relPath = firmante.archivo_firmado_path || firmante.archivo_path;
  const absPath = path.resolve(__dirname, '..', '..', relPath);
  if (!fs.existsSync(absPath)) throw new Error('No se encontró el PDF');

  const bytes = fs.readFileSync(absPath);
  const pdfDoc = await PDFDocument.load(bytes);
  const paginas = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const t of tags) {
    const pageIdx = Math.max(0, Math.min(paginas.length - 1, (Number(t.pagina) || 1) - 1));
    const page = paginas[pageIdx];
    const { height: pageH } = page.getSize();

    const x = Number(t.x);
    const y = Number(t.y);
    const w = Number(t.ancho || 140);
    const h = Number(t.alto || 40);
    // CSS origin=top-left → PDF origin=bottom-left
    const pdfY = pageH - y - h;

    if (t.tipo === 'fecha') {
      const fechaStr = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
      page.drawText(fechaStr, {
        x: x + 4,
        y: pdfY + h / 2 - 5,
        size: 9,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    } else {
      const dataUrl = firmas[String(t.id)];
      if (!dataUrl) continue;
      const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const imgBytes = Buffer.from(b64, 'base64');
      const img = dataUrl.startsWith('data:image/png')
        ? await pdfDoc.embedPng(imgBytes)
        : await pdfDoc.embedJpg(imgBytes);
      const pad = 2;
      page.drawImage(img, {
        x: x + pad,
        y: pdfY + pad,
        width: w - pad * 2,
        height: h - pad * 2,
      });
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(absPath, Buffer.from(pdfBytes));

  // Marcar firmante como firmado
  await query(
    `UPDATE documento_firmantes SET estado = 'firmado', firmado_interno_at = NOW() WHERE id = ?`,
    [firmante.id]
  );

  // ¿Todos firmaron?
  const [pendRow] = await query(
    `SELECT COUNT(*) AS cnt FROM documento_firmantes WHERE documento_id = ? AND estado != 'firmado'`,
    [firmante.doc_id]
  );
  const pendientes = pendRow?.cnt || 0;

  if (pendientes === 0) {
    await query(
      `UPDATE documentos SET estado = 'firmado', completado_at = NOW() WHERE id = ?`,
      [firmante.doc_id]
    );
    return { ok: true, completado: true };
  }

  // Notificar al siguiente firmante
  const siguiente = await queryOne(
    `SELECT * FROM documento_firmantes
     WHERE documento_id = ? AND orden > ? AND estado = 'pendiente'
     ORDER BY orden ASC LIMIT 1`,
    [firmante.doc_id, firmante.orden]
  );
  if (siguiente) {
    const docInfo = { nombre: firmante.doc_nombre };
    await enviarCorreoFirma(siguiente, docInfo).catch(console.error);
  }

  return { ok: true, completado: false };
}

module.exports = { enviarInterno, obtenerSesion, streamPdf, procesarFirma };
