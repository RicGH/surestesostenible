const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const PizZip = require('pizzip');
const { query, queryOne } = require('../config/db');

const execFileAsync = promisify(execFile);

// Convierte .doc a .docx usando LibreOffice y devuelve el buffer .docx
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
    if (!fs.existsSync(docxPath)) throw new Error('LibreOffice no generó el .docx');
    return fs.readFileSync(docxPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function esDocx(buffer) {
  return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

// Auto-mapping: etiqueta en «» → campo del proveedor (se compara en MAYÚSCULAS)
const MAPA_AUTO = {
  'PERSONA_FÍSICA':       'razon_social',
  'PERSONA_FISICA':       'razon_social',
  'RAZÓN_SOCIAL':         'razon_social',
  'RAZON_SOCIAL':         'razon_social',
  'CONSULTOR':            'razon_social',
  'CONSULTOR_INDIVIDUAL': 'razon_social',
  'RFC':                  'rfc',
  'R.F.C.':               'rfc',
  'DOMICILIO':            'direccion',
  'DIRECCIÓN':            'direccion',
  'DIRECCION':            'direccion',
  'DOMICILIO_COMPLETO':   'direccion',
  'BANCO':                'banco',
  'CLABE':                'cuenta_clabe',
  'CUENTA_CLABE':         'cuenta_clabe',
  'NO_CUENTA':            'cuenta_clabe',
  'NUMERO_CUENTA':        'cuenta_clabe',
  'NÚMERO_CUENTA':        'cuenta_clabe',
  'NOMBRE':               'nombre',
  'NOMBRE_COMPLETO':      'nombre',
  'CONTACTO':             'nombre',
  'CORREO':               'email',
  'EMAIL':                'email',
  'CORREO_ELECTRÓNICO':   'email',
  'FECHA':                '__fecha__',
  'FECHA_HOY':            '__fecha__',
  'FECHA_ACTUAL':         '__fecha__',
  // Datos personales/fiscales extendidos
  'FECHA_DE_NACIMIENTO':  'fecha_nacimiento',
  'FECHA_NACIMIENTO':     'fecha_nacimiento',
  'ESTADO_CIVIL':         'estado_civil',
  'NACIONALIDAD':         'nacionalidad',
  'CP':                   'codigo_postal',
  'CODIGO_POSTAL':        'codigo_postal',
  'CÓDIGO_POSTAL':        'codigo_postal',
  'MUNICIPIO':            'municipio',
  'ESTADO':               'estado_republica',
  'ESTADO_REPUBLICA':     'estado_republica',
  'SUCURSAL':             'sucursal_banco',
  'SUCURSAL_BANCO':       'sucursal_banco',
  'CIUDAD_Y_ESTADO':      '__ciudad_y_estado__',
};

// Etiquetas que parecen artefactos de Word y no son campos reales
const ETIQUETAS_IGNORAR = /^(columna\d*|column\d*|fila\d*|row\d*|celda\d*|cell\d*|tabla\d*|table\d*)$/i;

function extraerEtiquetas(buffer) {
  try {
    const zip = new PizZip(buffer);
    const docXml = zip.file('word/document.xml').asText();
    const texto = docXml.replace(/<[^>]+>/g, ' ');
    const matches = texto.match(/«([^»\n]{1,100})»/g) || [];
    return [...new Set(
      matches
        .map((m) => m.slice(1, -1).trim())
        .filter((e) => e && !ETIQUETAS_IGNORAR.test(e))
    )];
  } catch {
    return [];
  }
}

function normKey(s) {
  return s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function lookupMapa(etiqueta) {
  if (MAPA_AUTO[etiqueta]) return MAPA_AUTO[etiqueta];
  const n = normKey(etiqueta);
  for (const [key, val] of Object.entries(MAPA_AUTO)) {
    if (normKey(key) === n) return val;
  }
  return null;
}

function toTitleCase(str) {
  return str
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.length <= 2 && word === word.toUpperCase()
      ? word                                          // siglas cortas: CP, RFC → se quedan
      : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(' ');
}

function buildEtiquetasJson(etiquetas) {
  return etiquetas.map((etiqueta) => ({
    etiqueta,
    mapa: lookupMapa(etiqueta),
    label: toTitleCase(etiqueta),
  }));
}

async function listar() {
  const rows = await query(
    `SELECT cp.id, cp.nombre, cp.descripcion, cp.etiquetas_json, cp.created_at,
            u.nombre AS creado_por_nombre
     FROM contratos_plantillas cp
     LEFT JOIN users u ON u.id = cp.creado_por
     WHERE cp.activo = 1
     ORDER BY cp.created_at DESC LIMIT 200`
  );
  return rows.map((r) => ({
    ...r,
    etiquetas_json: typeof r.etiquetas_json === 'string'
      ? JSON.parse(r.etiquetas_json)
      : (r.etiquetas_json || []),
  }));
}

async function findById(id) {
  const row = await queryOne(
    `SELECT cp.*, u.nombre AS creado_por_nombre
     FROM contratos_plantillas cp
     LEFT JOIN users u ON u.id = cp.creado_por
     WHERE cp.id = ? AND cp.activo = 1`,
    [id]
  );
  if (!row) return null;
  if (typeof row.etiquetas_json === 'string') {
    try { row.etiquetas_json = JSON.parse(row.etiquetas_json); } catch { row.etiquetas_json = []; }
  }
  return row;
}

async function crear({ nombre, descripcion, archivo_path, buffer, creado_por }) {
  // Si es .doc (binario antiguo), convertir a .docx primero para extraer etiquetas
  const bufferDocx = esDocx(buffer) ? buffer : await docADocx(buffer);
  const etiquetas = extraerEtiquetas(bufferDocx);
  const etiquetasJson = buildEtiquetasJson(etiquetas);
  const result = await query(
    `INSERT INTO contratos_plantillas (nombre, descripcion, archivo_path, etiquetas_json, creado_por)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, descripcion || null, archivo_path, JSON.stringify(etiquetasJson), creado_por]
  );
  return { id: result.insertId, etiquetas: etiquetasJson };
}

async function eliminar(id) {
  const row = await queryOne('SELECT archivo_path FROM contratos_plantillas WHERE id = ?', [id]);
  await query('UPDATE contratos_plantillas SET activo = 0 WHERE id = ?', [id]);
  if (row?.archivo_path) {
    try {
      const abs = path.resolve(__dirname, '..', '..', row.archivo_path);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch { /* ignore */ }
  }
}

module.exports = { listar, findById, crear, eliminar, extraerEtiquetas, MAPA_AUTO };
