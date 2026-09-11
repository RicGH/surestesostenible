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
  'NOMBRE':               'razon_social',
  'NOMBRE_PROVEEDOR':     'razon_social',
  'NOMBRE_COMPLETO':      'razon_social',
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

// Nombre legible de cada campo del mapa (para el listado "Campos que reconoce el sistema")
const CAMPOS_INFO = {
  razon_social:       { nombre: 'Nombre o razón social', origen: 'Registro del proveedor' },
  rfc:                { nombre: 'RFC', origen: 'Registro del proveedor' },
  direccion:          { nombre: 'Domicilio', origen: 'Registro del proveedor' },
  codigo_postal:      { nombre: 'Código postal', origen: 'Registro del proveedor' },
  municipio:          { nombre: 'Municipio', origen: 'Registro del proveedor' },
  estado_republica:   { nombre: 'Estado de la República', origen: 'Registro del proveedor' },
  __ciudad_y_estado__:{ nombre: 'Ciudad y estado', origen: 'Municipio y estado del proveedor, separados por coma' },
  fecha_nacimiento:   { nombre: 'Fecha de nacimiento', origen: 'Registro del proveedor (ej. 5 de marzo de 1990)' },
  estado_civil:       { nombre: 'Estado civil', origen: 'Registro del proveedor' },
  nacionalidad:       { nombre: 'Nacionalidad', origen: 'Registro del proveedor' },
  banco:              { nombre: 'Banco', origen: 'Datos bancarios del proveedor' },
  cuenta_clabe:       { nombre: 'CLABE / número de cuenta', origen: 'Datos bancarios del proveedor' },
  sucursal_banco:     { nombre: 'Sucursal bancaria', origen: 'Datos bancarios del proveedor' },
  nombre:             { nombre: 'Nombre del contacto', origen: 'Usuario del proveedor' },
  email:              { nombre: 'Correo electrónico', origen: 'Usuario del proveedor' },
  __fecha__:          { nombre: 'Fecha de hoy', origen: 'Fecha en que se genera el contrato' },
};

// Etiquetas que parecen artefactos de Word y no son campos reales
const ETIQUETAS_IGNORAR = /^(columna\d*|column\d*|fila\d*|row\d*|celda\d*|cell\d*|tabla\d*|table\d*)$/i;

// Partes del .docx con texto de la plantilla: cuerpo, cabeceras y pies de página
// (mismas partes que llena contratos.service al generar el contrato)
const PARTES_DOCX = /^word\/(document|header\d*|footer\d*)\.xml$/;

function extraerEtiquetas(buffer) {
  try {
    const zip = new PizZip(buffer);
    // El cuerpo primero para conservar el orden en que aparecen las etiquetas
    const partes = Object.keys(zip.files)
      .filter((f) => PARTES_DOCX.test(f) && !zip.files[f].dir)
      .sort((a, b) => (a === 'word/document.xml' ? -1 : b === 'word/document.xml' ? 1 : a.localeCompare(b)));
    const encontradas = [];
    for (const f of partes) {
      const xml = zip.file(f).asText();
      // Word parte el texto en varios <w:r>: se unen sin espacios para no romper «RFC» → «R FC».
      // Los fines de párrafo/salto de línea se vuelven \n para que una etiqueta no cruce párrafos.
      const texto = xml
        .replace(/<\/w:p>|<w:br[^>]*\/>|<w:cr[^>]*\/>/g, '\n')
        .replace(/<w:tab[^>]*\/>/g, ' ')
        .replace(/<[^>]+>/g, '');
      encontradas.push(...(texto.match(/«([^»\n]{1,100})»/g) || []).map((m) => m.slice(1, -1).trim()));
      // También <TAG>, que en el XML queda como &lt;TAG&gt;
      encontradas.push(...(xml.match(/&lt;([A-ZÁÉÍÓÚÑ_][A-ZÁÉÍÓÚÑ_0-9]{0,99})&gt;/g) || [])
        .map((m) => m.replace(/^&lt;/, '').replace(/&gt;$/, '').trim()));
    }
    return [...new Set(encontradas.filter((e) => e && !ETIQUETAS_IGNORAR.test(e)))];
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

// Campos que se llenan solos, con todas las etiquetas que los activan.
// Las variantes que solo difieren en acentos se muestran una vez (la comparación los ignora).
function camposReconocidos() {
  const grupos = new Map();
  for (const [etiqueta, campo] of Object.entries(MAPA_AUTO)) {
    if (!grupos.has(campo)) grupos.set(campo, new Map());
    const variantes = grupos.get(campo);
    const clave = normKey(etiqueta);
    if (!variantes.has(clave)) variantes.set(clave, etiqueta);
  }
  // Orden de CAMPOS_INFO (datos personales → domicilio → banco → contacto → fecha)
  const orden = Object.keys(CAMPOS_INFO);
  const pos = (campo) => (orden.includes(campo) ? orden.indexOf(campo) : orden.length);
  return [...grupos].sort(([a], [b]) => pos(a) - pos(b)).map(([campo, variantes]) => ({
    campo,
    nombre: CAMPOS_INFO[campo]?.nombre || toTitleCase(campo),
    origen: CAMPOS_INFO[campo]?.origen || '',
    etiquetas: [...variantes.values()],
  }));
}

// Vuelve a leer las etiquetas del archivo de una plantilla ya guardada
async function reescanear(id) {
  const row = await queryOne('SELECT archivo_path FROM contratos_plantillas WHERE id = ?', [id]);
  if (!row?.archivo_path) return null;
  const abs = path.resolve(__dirname, '..', '..', row.archivo_path);
  if (!fs.existsSync(abs)) return null;
  let buffer = fs.readFileSync(abs);
  if (!esDocx(buffer)) buffer = await docADocx(buffer);
  const etiquetasJson = buildEtiquetasJson(extraerEtiquetas(buffer));
  await query('UPDATE contratos_plantillas SET etiquetas_json = ? WHERE id = ?', [JSON.stringify(etiquetasJson), id]);
  return etiquetasJson;
}

module.exports = { listar, findById, crear, eliminar, extraerEtiquetas, MAPA_AUTO, camposReconocidos, reescanear };
