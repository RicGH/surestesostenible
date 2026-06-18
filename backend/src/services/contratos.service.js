const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { query } = require('../config/db');

function esDocx(buffer) {
  return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

async function docADocx(buffer) {
  const tmpDir = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  fs.mkdirSync(tmpDir);
  const docPath = path.join(tmpDir, 'input.doc');
  try {
    fs.writeFileSync(docPath, buffer);
    await execFileAsync(
      'libreoffice',
      ['--headless', '--norestore', '--convert-to', 'docx', '--outdir', tmpDir, docPath],
      { timeout: 30000, env: { ...process.env, HOME: tmpDir } }
    );
    const docxPath = path.join(tmpDir, 'input.docx');
    if (!fs.existsSync(docxPath)) throw new Error('LibreOffice no convirtió el archivo');
    return fs.readFileSync(docxPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

const execFileAsync = promisify(execFile);

async function docxAPdf(buffer) {
  const tmpDir = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  fs.mkdirSync(tmpDir);
  const docxPath = path.join(tmpDir, 'contrato.docx');
  try {
    fs.writeFileSync(docxPath, buffer);
    await execFileAsync(
      'libreoffice',
      ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', tmpDir, docxPath],
      { timeout: 60000, env: { ...process.env, HOME: tmpDir } }
    );
    const pdfPath = path.join(tmpDir, 'contrato.pdf');
    if (!fs.existsSync(pdfPath)) throw new Error('LibreOffice no generó el PDF');
    return fs.readFileSync(pdfPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function buildValores(etiquetasJson, proveedor, valoresExtra = {}) {
  const hoy = new Date().toLocaleDateString('es-MX', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const valores = {};
  for (const e of etiquetasJson) {
    const mapa = e.mapa;
    if (mapa === '__fecha__') {
      valores[e.etiqueta] = hoy;
    } else if (mapa === '__ciudad_y_estado__') {
      const partes = [proveedor.municipio, proveedor.estado_republica].filter(Boolean);
      valores[e.etiqueta] = partes.join(', ') || '';
    } else if (mapa && proveedor[mapa] != null && proveedor[mapa] !== '') {
      if (mapa === 'fecha_nacimiento') {
        valores[e.etiqueta] = new Date(proveedor[mapa]).toLocaleDateString('es-MX', {
          day: 'numeric', month: 'long', year: 'numeric',
        });
      } else {
        valores[e.etiqueta] = String(proveedor[mapa]);
      }
    } else if (valoresExtra[e.etiqueta] != null && valoresExtra[e.etiqueta] !== '') {
      valores[e.etiqueta] = String(valoresExtra[e.etiqueta]);
    } else {
      // Leave blank — don't error, just empty string
      valores[e.etiqueta] = '';
    }
  }
  for (const [k, v] of Object.entries(valoresExtra)) {
    if (!(k in valores)) valores[k] = String(v ?? '');
  }
  return valores;
}

async function generarContrato({ plantilla, proveedor, valoresExtra, creadoPor }) {
  const abs = path.resolve(__dirname, '..', '..', plantilla.archivo_path);
  if (!fs.existsSync(abs)) throw new Error('No se encontró el archivo de la plantilla');

  let buffer = fs.readFileSync(abs);
  // Si el archivo guardado es .doc, convertirlo a .docx antes de llenar
  if (!esDocx(buffer)) buffer = await docADocx(buffer);

  const valores = buildValores(plantilla.etiquetas_json || [], proveedor, valoresExtra || {});

  const zip = new PizZip(buffer);
  const doc = new Docxtemplater(zip, {
    delimiters: { start: '«', end: '»' },
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => '',
  });
  doc.render(valores);
  const filledBuffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

  const pdf = await docxAPdf(filledBuffer);

  const dir = path.resolve(__dirname, '..', '..', 'uploads', 'documentos');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `contrato_${proveedor.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.pdf`;
  fs.writeFileSync(path.join(dir, filename), pdf);
  const relPath = path.posix.join('uploads', 'documentos', filename);

  const nombre = `Contrato - ${proveedor.razon_social}`;
  const result = await query(
    `INSERT INTO documentos (nombre, tipo, archivo_path, creado_por, proveedor_id) VALUES (?, 'contrato', ?, ?, ?)`,
    [nombre, relPath, creadoPor, proveedor.id]
  );
  const documentoId = result.insertId;

  // Pre-asignar al proveedor como firmante del contrato (queda listo para colocar su tag).
  if (proveedor.email) {
    await query(
      `INSERT INTO documento_firmantes (documento_id, tipo, referencia_id, nombre, email, orden, color)
       VALUES (?, 'proveedor', ?, ?, ?, 1, '#2563eb')`,
      [documentoId, proveedor.id, proveedor.razon_social || proveedor.nombre || proveedor.email, proveedor.email]
    );
  }

  return { documentoId, nombre };
}

module.exports = { generarContrato };
