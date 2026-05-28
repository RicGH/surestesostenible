const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

function hexToRgb(hex) {
  const m = /^#?([a-f0-9]{6})$/i.exec(hex || '');
  if (!m) return { r: 0.07, g: 0.07, b: 0.07 };
  const n = parseInt(m[1], 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function envolverTexto(texto, fuente, fontSize, anchoMax) {
  if (!texto) return [];
  const palabras = String(texto).split(/(\s+)/);
  const lineas = [];
  let actual = '';
  for (const w of palabras) {
    const prueba = actual + w;
    const ancho = fuente.widthOfTextAtSize(prueba, fontSize);
    if (ancho > anchoMax && actual.trim()) {
      lineas.push(actual);
      actual = w.replace(/^\s+/, '');
    } else {
      actual = prueba;
    }
  }
  if (actual) lineas.push(actual);
  return lineas;
}

async function estamparAnotaciones(pdfPathAbs, anotaciones, campos = []) {
  const camposPorNombre = new Map();
  for (const c of campos) camposPorNombre.set(c.nombre, c);

  const bytes = fs.readFileSync(pdfPathAbs);
  const pdfDoc = await PDFDocument.load(bytes);
  const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const paginas = pdfDoc.getPages();

  for (const a of anotaciones) {
    const pageIdx = Math.max(0, Math.min(paginas.length - 1, (Number(a.pagina) || 1) - 1));
    const page = paginas[pageIdx];
    const { height: pageH } = page.getSize();

    let texto = '';
    if (a.tipo === 'texto') texto = a.contenido || '';
    else if (a.tipo === 'campo') {
      const c = camposPorNombre.get(a.campo_nombre);
      texto = c && c.valor ? String(c.valor) : `[${a.campo_nombre}]`;
    }
    if (!texto) continue;

    const fontSize = Number(a.font_size) || 11;
    const color = hexToRgb(a.color);
    const fuente = a.bold ? fontBold : fontReg;
    const ancho = Number(a.ancho) || 200;

    const x = Number(a.x);
    const y = Number(a.y);

    const lineas = envolverTexto(texto, fuente, fontSize, ancho);
    const lineH = fontSize * 1.2;
    lineas.forEach((linea, i) => {
      const cssY = y + i * lineH + fontSize;
      const pdfY = pageH - cssY;
      page.drawText(linea, {
        x,
        y: pdfY,
        size: fontSize,
        font: fuente,
        color: rgb(color.r, color.g, color.b),
      });
    });
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function estamparYGuardar(pdfRelPath, anotaciones, campos) {
  const abs = path.resolve(__dirname, '..', '..', pdfRelPath);
  if (!fs.existsSync(abs)) throw new Error('PDF original no encontrado');
  return estamparAnotaciones(abs, anotaciones, campos);
}

module.exports = { estamparAnotaciones, estamparYGuardar };
