const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { HttpError } = require('../middleware/error');
const viaticosService = require('./viaticos.service');
const usersService = require('./users.service');

const execFileAsync = promisify(execFile);
const TEMPLATE = path.join(__dirname, '..', 'templates', 'oficio-viaticos.docx');

function money(n) {
  return Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fecha(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

async function docxAPdf(buffer) {
  const tmpDir = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  fs.mkdirSync(tmpDir);
  const docxPath = path.join(tmpDir, 'oficio.docx');
  try {
    fs.writeFileSync(docxPath, buffer);
    await execFileAsync(
      'libreoffice',
      ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', tmpDir, docxPath],
      { timeout: 60000, env: { ...process.env, HOME: tmpDir } }
    );
    const pdfPath = path.join(tmpDir, 'oficio.pdf');
    if (!fs.existsSync(pdfPath)) throw new Error('LibreOffice no generó el PDF');
    return fs.readFileSync(pdfPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// Mapea los datos del viático + colaborador a los campos de la plantilla (Oficio de comisión).
// Nota: el viático tiene categoría "Vuelos" que la plantilla no contempla; se suma a Transporte.
function buildDatos(v, user) {
  const transporte = Number(v.monto_transporte || 0) + Number(v.monto_vuelos || 0);
  return {
    folio: v.folio || '',
    fecha: fecha(v.cerrado_at || new Date()),
    trabajador: v.colaborador_nombre || '',
    rfc: (user && user.rfc) || '',
    area: '',
    clabe: v.clabe_bancaria || (user && user.clabe_bancaria) || '',
    tarjeta: '',
    cantidad: money(v.monto_total),
    banco: v.banco || (user && user.banco) || '',
    destino: v.destino || '',
    inicio: fecha(v.fecha_inicio),
    termino: fecha(v.fecha_fin),
    objetivo: v.motivo || '',
    cuenta_contable: v.cuenta || '',
    proyecto: v.proyecto || '',
    partida: v.partida || '',
    resultado: v.resultado || '',
    objetivo_estrategico: v.objetivo_estrategico || '',
    alimentos: money(v.monto_alimentos),
    transporte: money(transporte),
    hospedaje: money(v.monto_hospedaje),
    extras: money(v.monto_otros),
    recibe: v.recibe_nombre || v.colaborador_nombre || '',
    autoriza: v.autoriza_nombre || '',
  };
}

async function generarPdf(viaticoId) {
  const v = await viaticosService.getById(viaticoId);
  if (!v) throw new HttpError(404, 'Viático no encontrado');
  const user = await usersService.findById(v.colaborador_id);
  const datos = buildDatos(v, user);

  const tplBuf = fs.readFileSync(TEMPLATE);
  const zip = new PizZip(tplBuf);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.render(datos);
  const docxBuf = doc.getZip().generate({ type: 'nodebuffer' });

  const pdf = await docxAPdf(docxBuf);
  return { pdf, folio: v.folio };
}

module.exports = { generarPdf };
