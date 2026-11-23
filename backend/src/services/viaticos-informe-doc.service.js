const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');
const { HttpError } = require('../middleware/error');
const viaticosService = require('./viaticos.service');
const { convertirAPdf } = require('../utils/libreoffice');

// Genera el "7.1 Informe de comisión con gastos y bitácoras" replicando el
// formato de Excel de Sureste Sostenible. Se arma la hoja desde código (en vez
// de rellenar una plantilla) porque las tablas de gastos y kilometraje crecen
// con el número de registros.

const LOGO = path.join(__dirname, '..', 'templates', 'logo-informe-comision.jpeg');
const VERDE = 'FFA8D08D';
const FUENTE = 'Lato';
const MONEDA = '_-"$"* #,##0.00_-;\\-"$"* #,##0.00_-;_-"$"* "-"??_-;_-@_-';
const MIN_FILAS_GASTOS = 12;
const MIN_FILAS_KM = 5;

const CATEGORIAS = {
  vuelos: 'Vuelos', hospedaje: 'Hospedaje', alimentos: 'Alimentos', transporte: 'Transporte', otros: 'Otros',
};

// Anchos en caracteres de las columnas A..J (medidos del formato original)
const ANCHOS = [11.44, 19.55, 11.44, 11.44, 16.78, 11.44, 11.44, 11.44, 13.55, 11.44];

function fechaCorta(d) {
  if (!d) return '';
  const [y, m, dd] = String(d).slice(0, 10).split('-');
  return y && m && dd ? `${dd}/${m}/${y}` : '';
}

function fechaLarga(d) {
  if (!d) return '';
  const dt = new Date(`${String(d).slice(0, 10)}T12:00:00`);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

/** Suma de anchos (en caracteres) de las columnas c1..c2 (1 = A). */
const anchoCols = (c1, c2) => ANCHOS.slice(c1 - 1, c2).reduce((a, b) => a + b, 0);

/**
 * Alto (pt) que necesita un texto envuelto en un ancho dado, para fijarlo a mano:
 * LibreOffice no auto-ajusta el alto de celdas combinadas.
 */
function altoTexto(texto, anchoChars, tamFuente, minimo) {
  if (!texto) return minimo;
  const porLinea = Math.max(1, Math.floor(anchoChars * (11 / tamFuente) * 0.95));
  const lineas = String(texto).split('\n')
    .reduce((t, l) => t + Math.max(1, Math.ceil(l.length / porLinea)), 0);
  return Math.max(minimo, lineas * tamFuente * 1.35 + 4);
}

function construirLibro(v) {
  const inf = v.informe || {};
  const gastos = [...(v.gastos || [])].sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)) || a.id - b.id);
  const km = (inf.kilometraje || []).filter((r) => r && Object.values(r).some((x) => x !== '' && x !== null && x !== undefined));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sureste Sostenible';
  const ws = wb.addWorksheet('Informe de comisión', {
    pageSetup: {
      paperSize: 1, // carta
      orientation: 'portrait',
      // Siempre en una sola hoja: si hay muchos gastos o tramos se reduce la escala.
      // Así las firmas (Entrega / Autoriza) nunca quedan separadas en otra página.
      fitToPage: true, fitToWidth: 1, fitToHeight: 1,
      horizontalCentered: true,
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    },
    views: [{ showGridLines: false }],
  });
  ws.columns = ANCHOS.map((width) => ({ width }));

  const fino = { style: 'thin' };
  const todo = { top: fino, left: fino, bottom: fino, right: fino };

  // Combina un rango y le da valor/estilo. opts: { bold, size, fill, h, v, wrap, fmt, border }
  function celda(rango, valor, opts = {}) {
    if (rango.includes(':')) ws.mergeCells(rango);
    const [ini] = rango.split(':');
    const c = ws.getCell(ini);
    if (valor !== undefined && valor !== null) c.value = valor;
    c.font = { name: FUENTE, size: opts.size || 10, bold: !!opts.bold };
    c.alignment = { horizontal: opts.h || 'center', vertical: opts.v || 'middle', wrapText: opts.wrap !== false };
    if (opts.fmt) c.numFmt = opts.fmt;
    if (opts.fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
    if (opts.border !== false) {
      // borde en todas las celdas del rango (LibreOffice lo toma de cada celda)
      const [a, b = a] = rango.split(':');
      const ca = ws.getCell(a); const cb = ws.getCell(b);
      for (let r = ca.row; r <= cb.row; r++) {
        for (let col = ca.col; col <= cb.col; col++) ws.getCell(r, col).border = opts.border || todo;
      }
    }
    return c;
  }
  const etiqueta = (rango, texto, extra = {}) => celda(rango, texto, { bold: true, fill: VERDE, ...extra });
  const alto = (fila, pt) => { ws.getRow(fila).height = pt; };

  // ── Encabezado ──────────────────────────────────────────────
  for (let r = 1; r <= 4; r++) alto(r, 14.25);
  if (fs.existsSync(LOGO)) {
    const img = wb.addImage({ buffer: fs.readFileSync(LOGO), extension: 'jpeg' });
    ws.addImage(img, { tl: { col: 0.3, row: 0.1 }, ext: { width: 136, height: 60 } });
  }
  celda('C2:J2', 'Sureste Sostenible A.C.', { bold: true, size: 12, border: false });
  celda('C3:J3', '7.1 Informe de comisión con gastos y bitácoras', { bold: true, size: 12, border: false });

  // ── Datos de la comisión ───────────────────────────────────
  celda('A5:J5', 'DATOS DE LA COMISIÓN', { bold: true, border: { bottom: { style: 'medium' } } });
  alto(5, 16);

  const hObjetivo = altoTexto(v.motivo, anchoCols(3, 5), 9, 28.5) / 2;
  alto(6, hObjetivo); alto(7, hObjetivo);
  etiqueta('A6:B7', 'Objetivo:');
  celda('C6:E7', v.motivo || '', { size: 9 }); // objetivo de la salida = motivo
  etiqueta('F6:H7', 'Fecha de presentación:');
  celda('I6:J7', fechaLarga(inf.fecha_presentacion), { size: 9 });

  alto(8, 14.25); alto(9, 14.25);
  etiqueta('A8:B9', 'Destino:');
  celda('C8:E9', v.destino || '', { size: 9 });
  etiqueta('F8:G9', 'Periodo de la comisión:');
  celda('H8:J9', v.fecha_inicio ? `${fechaCorta(v.fecha_inicio)} al ${fechaCorta(v.fecha_fin)}` : '', { size: 9 });

  const ctaProyecto = [v.cuenta, v.proyecto].filter(Boolean).join(' / ');
  const hNota = Math.max(altoTexto(inf.nota, anchoCols(8, 10), 9, 60), altoTexto(ctaProyecto, anchoCols(3, 5), 9, 30) * 2) / 4;
  for (let r = 10; r <= 13; r++) alto(r, hNota);
  etiqueta('A10:B11', 'Cta. contable y proyecto:');
  celda('C10:E11', ctaProyecto, { size: 9 });
  etiqueta('F10:G13', 'Nota:');
  celda('H10:J13', inf.nota || '', { size: 9 });
  etiqueta('A12:C13', 'Nombre proyecto');
  celda('D12:E13', v.proyecto || '', { size: 9 });

  alto(14, 16);
  celda('A14:J14', 'Resumen:', { bold: true, h: 'left' });
  const hResumen = altoTexto(inf.resumen, anchoCols(1, 10), 10, 75) / 5;
  for (let r = 15; r <= 19; r++) alto(r, hResumen);
  celda('A15:J19', inf.resumen || '', { h: 'left', v: 'top' });

  // ── Presentación de gastos ─────────────────────────────────
  alto(20, 18);
  celda('A20:J20', 'PRESENTACIÓN DE GASTOS', { bold: true, border: false });
  alto(21, 14.25); alto(22, 14.25);
  etiqueta('A21:A22', 'FECHA:', { size: 8 });
  etiqueta('B21:B22', 'FACT. O REC. NUM.', { size: 8 });
  etiqueta('C21:E22', 'PROVEEDOR', { size: 8 });
  etiqueta('F21:H22', 'CONCEPTO', { size: 8 });
  etiqueta('I21:I22', 'Monto', { size: 8 });
  etiqueta('J21:J22', 'PARTIDA', { size: 8 });

  let fila = 23;
  const primeraGasto = fila;
  const nGastos = Math.max(gastos.length, MIN_FILAS_GASTOS);
  for (let i = 0; i < nGastos; i++, fila++) {
    const g = gastos[i];
    const concepto = g ? [CATEGORIAS[g.categoria], g.concepto].filter(Boolean).join(' - ') : '';
    const proveedor = g ? (g.razon_social || g.nombre_emisor || '') : '';
    const folio = g ? (g.folio_fiscal || '') : '';
    alto(fila, Math.max(
      24,
      altoTexto(concepto, anchoCols(6, 8), 8, 24),
      altoTexto(proveedor, anchoCols(3, 5), 8, 24),
      altoTexto(folio, anchoCols(2, 2) * 0.8, 8, 24),
    ));
    const op = { size: 8, h: 'left', v: 'top' };
    celda(`A${fila}`, g ? fechaCorta(g.fecha) : '', op);
    celda(`B${fila}`, folio, { ...op, size: 7 });
    celda(`C${fila}:E${fila}`, proveedor, op);
    celda(`F${fila}:H${fila}`, concepto, op);
    celda(`I${fila}`, g ? Number(g.monto) : null, { ...op, h: 'right', fmt: MONEDA });
    celda(`J${fila}`, '', op); // PARTIDA: se deja vacía
  }
  const ultimaGasto = fila - 1;

  const comprobado = gastos.reduce((t, g) => t + Number(g.monto || 0), 0);
  const solicitado = Number(v.monto_total || 0);
  const retIsr = num(inf.ret_isr);
  const montoTotal = num(inf.monto_total);

  const fComprobado = fila;
  alto(fila, 16);
  celda(`F${fila}:H${fila}`, 'Monto comprobado:', { bold: true, h: 'right', border: false });
  celda(`I${fila}`, { formula: `SUM(I${primeraGasto}:I${ultimaGasto})`, result: comprobado }, { bold: true, fmt: MONEDA, h: 'right' });
  fila++;

  alto(fila, 16);
  celda(`G${fila}:H${fila}`, 'Ret ISR', { bold: true });
  celda(`I${fila}`, retIsr, { fmt: MONEDA, h: 'right' });
  fila++;

  const fSolicitado = fila;
  alto(fila, 16);
  celda(`A${fila}:C${fila}`, 'Viáticos recibidos previos a la salida:', { bold: true, h: 'right', border: false });
  celda(`D${fila}:E${fila}`, solicitado, { bold: true, fmt: MONEDA, h: 'right', border: { bottom: fino } });
  celda(`G${fila}:H${fila}`, 'Monto total', { bold: true });
  celda(`I${fila}`, montoTotal, { fmt: MONEDA, h: 'right' });
  fila++;

  alto(fila, 16);
  celda(`A${fila}:E${fila}`, 'Diferencia por depositar o pagar:', { bold: true, h: 'right', border: false });
  celda(`F${fila}:G${fila}`, { formula: `D${fSolicitado}-I${fComprobado}`, result: solicitado - comprobado }, {
    bold: true, fmt: MONEDA, h: 'right', border: { bottom: { style: 'double' } },
  });
  fila += 2;

  // ── Bitácora de kilometraje ────────────────────────────────
  alto(fila, 18);
  celda(`A${fila}:J${fila}`, 'BITÁCORA DE KILOMETRAJE', { bold: true, border: false });
  fila++;
  alto(fila, 16);
  etiqueta(`A${fila}`, 'MARCA:');
  celda(`B${fila}:C${fila}`, inf.vehiculo_marca || '', { size: 9 });
  etiqueta(`D${fila}`, 'SUBMARCA:');
  celda(`E${fila}:F${fila}`, inf.vehiculo_submarca || '', { size: 9 });
  etiqueta(`G${fila}:H${fila}`, 'MODELO:');
  celda(`I${fila}:J${fila}`, inf.vehiculo_modelo || '', { size: 9 });
  fila++;
  alto(fila, 16);
  etiqueta(`A${fila}`, 'PLACA:');
  celda(`B${fila}:C${fila}`, inf.vehiculo_placa || '', { size: 9 });
  etiqueta(`D${fila}:G${fila}`, 'KILOMETRAJE');
  etiqueta(`H${fila}:J${fila}`, 'COMBUSTIBLE');
  fila++;
  alto(fila, 14.25); alto(fila + 1, 14.25);
  etiqueta(`A${fila}:C${fila + 1}`, 'COMENTARIOS');
  etiqueta(`D${fila}:D${fila + 1}`, 'INICIAL');
  etiqueta(`E${fila}:E${fila + 1}`, 'FINAL');
  etiqueta(`F${fila}:G${fila + 1}`, 'KM/ RECORRIDOS');
  etiqueta(`H${fila}:H${fila + 1}`, 'LITROS');
  etiqueta(`I${fila}:J${fila + 1}`, 'MONTO');
  fila += 2;

  const primeraKm = fila;
  const nKm = Math.max(km.length, MIN_FILAS_KM);
  let totKm = 0; let totLitros = 0; let totMonto = 0;
  for (let i = 0; i < nKm; i++, fila++) {
    const r = km[i] || {};
    const ini = num(r.km_inicial); const fin = num(r.km_final);
    const recorridos = ini !== null && fin !== null ? fin - ini : null;
    totKm += recorridos || 0; totLitros += num(r.litros) || 0; totMonto += num(r.monto) || 0;
    alto(fila, Math.max(16, altoTexto(r.comentarios, anchoCols(1, 3), 9, 16)));
    celda(`A${fila}:C${fila}`, r.comentarios || '', { size: 9, h: 'left' });
    celda(`D${fila}`, ini, { size: 9, fmt: '#,##0.##' });
    celda(`E${fila}`, fin, { size: 9, fmt: '#,##0.##' });
    celda(`F${fila}:G${fila}`, recorridos !== null ? { formula: `E${fila}-D${fila}`, result: recorridos } : null, { size: 9, fmt: '#,##0.##' });
    celda(`H${fila}`, num(r.litros), { size: 9, fmt: '#,##0.##' });
    celda(`I${fila}:J${fila}`, num(r.monto), { size: 9, fmt: MONEDA, h: 'right' });
  }
  const ultimaKm = fila - 1;
  alto(fila, 16);
  celda(`A${fila}:D${fila}`, '', { fill: VERDE });
  etiqueta(`E${fila}`, 'TOTAL:');
  celda(`F${fila}:G${fila}`, { formula: `SUM(F${primeraKm}:F${ultimaKm})`, result: totKm }, { bold: true, fill: VERDE, fmt: '#,##0.##' });
  celda(`H${fila}`, { formula: `SUM(H${primeraKm}:H${ultimaKm})`, result: totLitros }, { bold: true, fill: VERDE, fmt: '#,##0.##' });
  celda(`I${fila}:J${fila}`, { formula: `SUM(I${primeraKm}:I${ultimaKm})`, result: totMonto }, { bold: true, fill: VERDE, fmt: MONEDA, h: 'right' });
  fila += 2;

  // ── Firmas (mismos firmantes que el oficio de comisión) ────
  // Dos bloques casi simétricos (A:D y G:J). La línea es una cadena de guiones bajos
  // del mismo largo en ambos, para que las dos líneas midan igual y queden centradas
  // con su etiqueta y su nombre.
  const BLOQUES = ['A{f}:D{f}', 'G{f}:J{f}'];
  const LINEA = '_'.repeat(38);
  const firmas = [
    ['ENTREGA', v.recibe_nombre || v.colaborador_nombre || ''],
    ['AUTORIZA', v.autoriza_nombre || ''],
  ];
  const rango = (i, f) => BLOQUES[i].replace(/\{f\}/g, f);
  alto(fila, 16);
  firmas.forEach(([etq], i) => celda(rango(i, fila), etq, { bold: true, border: false }));
  fila++;
  for (let i = 0; i < 3; i++, fila++) alto(fila, 14.25); // espacio para la firma
  alto(fila, 16);
  firmas.forEach((_, i) => celda(rango(i, fila), LINEA, { v: 'bottom', wrap: false, border: false }));
  fila++;
  alto(fila, 16);
  firmas.forEach(([, nombre], i) => celda(rango(i, fila), nombre, { bold: true, v: 'top', border: false }));

  ws.pageSetup.printArea = `A1:J${fila}`;
  return wb;
}

async function cargarViatico(viaticoId) {
  const v = await viaticosService.getById(viaticoId);
  if (!v) throw new HttpError(404, 'Viático no encontrado');
  return v;
}

async function generarXlsx(viaticoId) {
  const v = await cargarViatico(viaticoId);
  const buffer = Buffer.from(await construirLibro(v).xlsx.writeBuffer());
  return { buffer, folio: v.folio };
}

async function generarPdf(viaticoId) {
  const v = await cargarViatico(viaticoId);
  const xlsx = Buffer.from(await construirLibro(v).xlsx.writeBuffer());
  const pdf = await convertirAPdf(xlsx, 'xlsx');
  return { pdf, folio: v.folio };
}

module.exports = { generarXlsx, generarPdf };
