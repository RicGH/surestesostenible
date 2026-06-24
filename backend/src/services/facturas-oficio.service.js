const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');
const PizZip = require('pizzip');
const { HttpError } = require('../middleware/error');
const facturasService = require('./facturas.service');

const execFileAsync = promisify(execFile);
const TEMPLATE = path.join(__dirname, '..', 'templates', 'oficio-proveedores.docx');

function money(n) {
  return Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fechaStr(d) {
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

/**
 * Reemplaza cada bloque MERGEFIELD completo (begin→end) con el valor real.
 * Usa un scanner lineal (indexOf) en lugar de regex para mayor fiabilidad con XML complejo.
 */
function fillMergeFields(xml, datos) {
  const map = {
    'FOLIO':                  datos.folio,
    'Fecha_':                 datos.fecha,
    'Proveedor':              datos.proveedor,
    'RFC':                    datos.rfc,
    'Clabe_Interbancaria':    datos.clabe,
    'Tarjeta':                datos.tarjeta || '',
    'Cantidad':               datos.cantidad,
    'Banco':                  datos.banco,
    'Proyecto':               datos.proyecto,
    'Cuenta_Contable':        datos.cuenta_contable,
    'Partida':                datos.partida,
    'Objetivo_O_Resultado':   datos.objetivo_resultado,
    'OBJETIVOS_ESTRAT':       datos.objetivo_estrategico, // prefijo (encoding puede variar)
    'Solicita':               datos.solicita || '',
    'Autoriza':               datos.autoriza || '',
    'Anexo':                  datos.anexo || '',
    'CampoAutoComb':          datos.concepto,
  };

  const BEGIN = 'fldCharType="begin"';
  const END   = 'fldCharType="end"';

  // Busca el último <w:r> (run) estricto: el carácter tras '<w:r' debe ser '>' o ' '
  // Evita capturar <w:rPr>, <w:rFonts>, etc.
  function lastRunStart(str, before) {
    let i = before;
    while (i >= 0) {
      i = str.lastIndexOf('<w:r', i);
      if (i === -1) return -1;
      const c = str[i + 4];
      if (c === '>' || c === ' ') return i;
      i--;
    }
    return -1;
  }

  let result = '';
  let pos = 0;

  while (pos < xml.length) {
    const beginPos = xml.indexOf(BEGIN, pos);
    if (beginPos === -1) { result += xml.slice(pos); break; }

    // Retroceder al <w:r> que contiene este fldChar begin
    const runStart = lastRunStart(xml, beginPos);
    if (runStart === -1) { result += xml.slice(pos); break; }
    result += xml.slice(pos, runStart);

    // El bloque del campo termina con </w:r> después de fldCharType="end"
    const endPos = xml.indexOf(END, beginPos);
    if (endPos === -1) { result += xml.slice(runStart); pos = xml.length; break; }
    const runEndClose = xml.indexOf('</w:r>', endPos) + '</w:r>'.length;

    const block = xml.slice(runStart, runEndClose);

    const instrMatch = block.match(/MERGEFIELD\s+(\S+)/i);
    if (instrMatch) {
      const fieldKey = instrMatch[1];
      let value;
      if (fieldKey in map) {
        value = map[fieldKey];
      } else {
        const prefix = Object.keys(map).find(k => fieldKey.startsWith(k));
        value = prefix !== undefined ? map[prefix] : undefined;
      }

      if (value !== undefined) {
        // Extraer rPr del bloque para preservar fuente/tamaño del template
        const rPrMatch = block.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
        const rPr = rPrMatch ? `<w:rPr>${rPrMatch[1]}</w:rPr>` : '';
        result += `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(value)}</w:t></w:r>`;
      } else {
        result += block;
      }
    } else {
      result += block;
    }

    pos = runEndClose;
  }

  // Inyectar Área (celda sin MERGEFIELD, paraId conocido)
  result = result.replace(
    /(<w:p[^>]*paraId="13F74A7E"[^>]*>)([\s\S]*?)(<\/w:p>)/,
    (m, open, inner, close) => {
      const rPrMatch = inner.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
      const rPr = rPrMatch ? `<w:rPr>${rPrMatch[1]}</w:rPr>` : '';
      return `${open}${inner}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(datos.proyecto || '')}</w:t></w:r>${close}`;
    }
  );

  return result;
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildDatos(f) {
  return {
    folio:                f.folio || '',
    fecha:                fechaStr(f.fecha_emision || f.created_at),
    proveedor:            f.razon_social || f.nombre_emisor || '',
    rfc:                  f.rfc || f.rfc_emisor || '',
    clabe:                f.cuenta_clabe || '',
    tarjeta:              '',
    cantidad:             money(f.monto) + ' ' + (f.moneda || 'MXN'),
    banco:                f.banco || '',
    concepto:             f.concepto || '',
    proyecto:             f.proyecto || '',
    cuenta_contable:      f.cuenta || '',
    partida:              f.partida || '',
    objetivo_resultado:   f.resultado || '',
    objetivo_estrategico: f.objetivo_estrategico || '',
    solicita:             '',
    autoriza:             '',
    anexo:                '',
  };
}

async function generarPdf(facturaId) {
  const f = await facturasService.getById(facturaId);
  if (!f) throw new HttpError(404, 'Factura no encontrada');

  const datos = buildDatos(f);

  const tplBuf = fs.readFileSync(TEMPLATE);
  const zip = new PizZip(tplBuf);
  let docXml = zip.file('word/document.xml').asText();
  // Ensanchar la tabla flotante del Folio/Fecha (1943→3200 dxa) y reubicarla
  docXml = docXml
    .replace(/(<w:tblpPr[^>]*w:tblpX=)"9771"/, '$1"7600"')
    .replace(/(<w:tblW[^>]*w:w=)"1943"(\s+w:type="dxa"\/>)/, '$1"3200"$2')
    .replace(/(<w:gridCol[^>]*w:w=)"1943"/, '$1"3200"');
  docXml = fillMergeFields(docXml, datos);
  zip.file('word/document.xml', docXml);

  // Generar el docx con los valores inyectados
  const docxBuf = zip.generate({ type: 'nodebuffer' });
  const pdf = await docxAPdf(docxBuf);
  return { pdf, folio: f.folio };
}

module.exports = { generarPdf };
