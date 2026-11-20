const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { PDFDocument } = require('pdf-lib');
const { HttpError } = require('../middleware/error');
const viaticosService = require('./viaticos.service');
const usersService = require('./users.service');
const { convertirAPdf } = require('../utils/libreoffice');

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

const docxAPdf = (buffer) => convertirAPdf(buffer, 'docx');

// Importes reales por concepto: suma de los comprobantes subidos según su tipo de gasto.
// La plantilla solo tiene Alimentos, Transporte, Hospedaje y Extras: los vuelos se
// suman a Transporte, "otros" va a Extras, y los comprobantes antiguos sin tipo
// también van a Extras para que la tabla cuadre con lo comprobado.
function importesComprobados(gastos = []) {
  const t = { alimentos: 0, transporte: 0, hospedaje: 0, extras: 0 };
  const destino = { alimentos: 'alimentos', transporte: 'transporte', vuelos: 'transporte', hospedaje: 'hospedaje', otros: 'extras' };
  for (const g of gastos) t[destino[g.categoria] || 'extras'] += Number(g.monto || 0);
  return t;
}

// Mapea los datos del viático + colaborador a los campos de la plantilla (Oficio de comisión).
function buildDatos(v, user) {
  const importes = importesComprobados(v.gastos);
  // El número se imprime en "Tarjeta" o en "Clabe Interbancaria" según el tipo elegido en el viático
  const numero = v.clabe_bancaria || (user && user.clabe_bancaria) || '';
  const esTarjeta = v.tipo_cuenta === 'tarjeta';
  return {
    folio: v.folio || '',
    fecha: fecha(v.cerrado_at || new Date()),
    trabajador: v.colaborador_nombre || '',
    rfc: (user && user.rfc) || '',
    area: '',
    clabe: esTarjeta ? '' : numero,
    tarjeta: esTarjeta ? numero : '',
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
    alimentos: money(importes.alimentos),
    transporte: money(importes.transporte),
    hospedaje: money(importes.hospedaje),
    extras: money(importes.extras),
    recibe: v.recibe_nombre || v.colaborador_nombre || '',
    autoriza: v.autoriza_nombre || '',
  };
}

// El oficio debe caber SIEMPRE en una sola hoja. Primero se genera tal cual; si
// un texto largo (objetivo, objetivo estratégico...) lo parte en dos páginas, se
// reintenta compactando la plantilla con estas escalas hasta que quepa.
const ESCALAS = [1, 0.9, 0.8, 0.7, 0.6, 0.5];
const TAM_MIN = 8; // medios puntos (4 pt): tamaño mínimo de letra al compactar

const escalarAttr = (xml, re, factor, min = 0) =>
  xml.replace(re, (_, pre, n, post) => `${pre}${Math.max(min, Math.round(Number(n) * factor))}${post}`);

function compactarXml(xml, factor) {
  xml = escalarAttr(xml, /(<w:sz(?:Cs)? w:val=")(\d+)(")/g, factor, TAM_MIN);
  xml = escalarAttr(xml, /(<w:trHeight\b[^>]*?w:val=")(\d+)(")/g, factor);
  xml = escalarAttr(xml, /(<w:spacing\b[^>]*?w:(?:before|after)=")(\d+)(")/g, factor);
  return xml;
}

// Compacta la plantilla (antes de llenarla) con el factor indicado. La tabla de
// firmas se deja intacta: su espacio entre la etiqueta "Recibe/Autoriza" y la
// línea es donde se estampa la firma electrónica del oficio.
function compactarPlantilla(zip, factor) {
  // Los textos que no fijan su tamaño lo heredan de los estilos: también se escalan.
  const styles = compactarXml(zip.file('word/styles.xml').asText(), factor)
    .replace(/(<w:pPrDefault>.*?<w:spacing\b[^>]*?w:after=")\d+(")/s, '$10$2');
  zip.file('word/styles.xml', styles);

  const xml = zip.file('word/document.xml').asText();
  const iFirmas = xml.indexOf('{recibe}');
  const ini = iFirmas >= 0 ? xml.lastIndexOf('<w:tbl>', iFirmas) : -1;
  const fin = iFirmas >= 0 ? xml.indexOf('</w:tbl>', iFirmas) : -1;
  const nuevo = ini >= 0 && fin >= 0
    ? compactarXml(xml.slice(0, ini), factor) + xml.slice(ini, fin) + compactarXml(xml.slice(fin), factor)
    : compactarXml(xml, factor);
  zip.file('word/document.xml', nuevo);
}

async function contarPaginas(pdf) {
  const doc = await PDFDocument.load(pdf, { updateMetadata: false });
  return doc.getPageCount();
}

async function generarPdf(viaticoId) {
  const v = await viaticosService.getById(viaticoId);
  if (!v) throw new HttpError(404, 'Viático no encontrado');
  const user = await usersService.findById(v.colaborador_id);
  const datos = buildDatos(v, user);
  const tplBuf = fs.readFileSync(TEMPLATE);

  let pdf;
  for (const factor of ESCALAS) {
    const zip = new PizZip(tplBuf);
    if (factor < 1) compactarPlantilla(zip, factor);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(datos);
    pdf = await docxAPdf(doc.getZip().generate({ type: 'nodebuffer' }));
    if ((await contarPaginas(pdf)) <= 1) break;
  }
  return { pdf, folio: v.folio };
}

module.exports = { generarPdf };
