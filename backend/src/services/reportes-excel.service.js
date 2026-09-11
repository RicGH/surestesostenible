const ExcelJS = require('exceljs');

// Paleta de la plataforma (tailwind brand / ink)
const COLOR = {
  brand950: 'FF0A2C33',
  brand600: 'FF057D8C',
  brand100: 'FFCFFAFE',
  brand50: 'FFECFEFF',
  ink200: 'FFE2E8F0',
  ink500: 'FF64748B',
  blanco: 'FFFFFFFF',
};

// Colores de la etiqueta de estado (fondo / texto)
const AMBAR = { fondo: 'FFFEF3C7', texto: 'FF92400E' };
const AZUL = { fondo: 'FFDBEAFE', texto: 'FF1E40AF' };
const INDIGO = { fondo: 'FFE0E7FF', texto: 'FF3730A3' };
const MORADO = { fondo: 'FFEDE9FE', texto: 'FF5B21B6' };
const VERDE = { fondo: 'FFD1FAE5', texto: 'FF065F46' };
const ROJO = { fondo: 'FFFEE2E2', texto: 'FF991B1B' };
const GRIS = { fondo: 'FFF1F5F9', texto: 'FF475569' };

const ESTADOS_VIATICO = {
  pendiente:  { label: 'Pendiente',  ...AMBAR },
  aprobado:   { label: 'Aprobado',   ...AZUL },
  pagado:     { label: 'Pagado',     ...INDIGO },
  en_proceso: { label: 'En proceso', ...MORADO },
  cerrado:    { label: 'Cerrado',    ...VERDE },
  rechazado:  { label: 'Rechazado',  ...ROJO },
  cancelado:  { label: 'Cancelado',  ...GRIS },
};

const ESTADOS_FACTURA = {
  en_revision: { label: 'En revisión', ...AMBAR },
  aprobada:    { label: 'Aprobada',    ...AZUL },
  pagada:      { label: 'Pagada',      ...VERDE },
  rechazada:   { label: 'Rechazada',   ...ROJO },
  cancelada:   { label: 'Cancelada',   ...GRIS },
};

const FMT_MONEDA = '"$"#,##0.00';
const FMT_FECHA = 'dd/mm/yyyy';

// Fecha de MySQL (hora local) → fecha UTC del mismo día, para que Excel no la recorra un día
function fechaExcel(v) {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function fechaTexto(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

const borde = (color = COLOR.ink200) => ({
  top: { style: 'thin', color: { argb: color } },
  left: { style: 'thin', color: { argb: color } },
  bottom: { style: 'thin', color: { argb: color } },
  right: { style: 'thin', color: { argb: color } },
});
const relleno = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

/**
 * Hoja con el diseño común de los reportes: título, franja de periodo, cabecera en color
 * de la plataforma, filas alternadas, estado con color, fechas/montos nativos y totales.
 *
 * columnas: [{ header, key, width, fecha?, moneda?, texto?, negrita?, mono?, ajustar? }]
 *   (la columna con key 'estado' se pinta según `estados`)
 * totalesPorMoneda: key de la columna de moneda; genera una fila de totales por cada moneda
 */
function construirHoja(wb, { hoja, titulo, columnas, filas, estados, rango, unidad, totalesPorMoneda }) {
  const ws = wb.addWorksheet(hoja, {
    views: [{ state: 'frozen', xSplit: 1, ySplit: 4 }],
    // Al imprimir: horizontal, todas las columnas en el ancho de la hoja y cabecera repetida
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '4:4' },
  });
  const nCols = columnas.length;
  ws.columns = columnas.map((c) => ({ key: c.key, width: c.width }));

  // Título
  ws.mergeCells(1, 1, 1, nCols);
  const celdaTitulo = ws.getCell(1, 1);
  celdaTitulo.value = titulo;
  celdaTitulo.font = { name: 'Calibri', size: 16, bold: true, color: { argb: COLOR.blanco } };
  celdaTitulo.fill = relleno(COLOR.brand950);
  celdaTitulo.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 30;

  // Subtítulo con periodo
  ws.mergeCells(2, 1, 2, nCols);
  const sub = ws.getCell(2, 1);
  const generado = new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short' });
  const conteo = `${filas.length} ${filas.length === 1 ? unidad[0] : unidad[1]}`;
  sub.value = `App Sureste Sostenible  ·  Periodo: ${fechaTexto(rango.desde)} al ${fechaTexto(rango.hasta)}  ·  ${conteo}  ·  Generado: ${generado}`;
  sub.font = { name: 'Calibri', size: 10, italic: true, color: { argb: COLOR.brand950 } };
  sub.fill = relleno(COLOR.brand100);
  sub.alignment = { vertical: 'middle', indent: 1 };
  ws.getRow(2).height = 20;

  ws.getRow(3).height = 6;

  // Cabecera
  const cab = ws.getRow(4);
  columnas.forEach((c, i) => {
    const cell = cab.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR.blanco } };
    cell.fill = relleno(COLOR.brand600);
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = borde(COLOR.brand950);
  });
  cab.height = 32;

  // Datos
  const colEstado = columnas.findIndex((c) => c.key === 'estado') + 1;
  filas.forEach((r, idx) => {
    const estado = estados[r.estado] || { label: r.estado || '', fondo: COLOR.blanco, texto: COLOR.ink500 };
    const valores = { ...r, estado: estado.label };
    const row = ws.addRow(columnas.map((c) => {
      const v = valores[c.key];
      if (c.fecha) return fechaExcel(v);
      if (c.moneda) return v != null ? Number(v) : null;
      return v ?? '';
    }));
    const zebra = idx % 2 === 1;
    columnas.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.font = { name: 'Calibri', size: 10, bold: !!c.negrita };
      cell.border = borde();
      cell.alignment = { vertical: 'top', wrapText: !!c.ajustar };
      if (zebra) cell.fill = relleno(COLOR.brand50);
      if (c.fecha) { cell.numFmt = FMT_FECHA; cell.alignment = { vertical: 'top', horizontal: 'center' }; }
      if (c.moneda) cell.numFmt = FMT_MONEDA;
      if (c.texto) cell.numFmt = '@';
      if (c.mono) cell.font = { name: 'Consolas', size: 9, color: { argb: COLOR.brand950 } };
    });
    if (colEstado) {
      const celdaEstado = row.getCell(colEstado);
      celdaEstado.fill = relleno(estado.fondo);
      celdaEstado.font = { name: 'Calibri', size: 10, bold: true, color: { argb: estado.texto } };
      celdaEstado.alignment = { vertical: 'top', horizontal: 'center' };
    }
  });

  // Totales (una fila, o una por moneda para no sumar MXN con USD)
  if (filas.length) {
    const primera = 5;
    const ultima = 4 + filas.length;
    const letra = (key) => ws.getColumn(columnas.findIndex((c) => c.key === key) + 1).letter;
    const monedas = totalesPorMoneda
      ? [...new Set(filas.map((r) => r[totalesPorMoneda] || 'MXN'))].sort()
      : [null];

    monedas.forEach((moneda, n) => {
      const tot = ws.addRow([]);
      columnas.forEach((c, i) => {
        const cell = tot.getCell(i + 1);
        cell.fill = relleno(COLOR.brand100);
        cell.border = {
          top: n === 0 ? { style: 'medium', color: { argb: COLOR.brand600 } } : undefined,
          bottom: { style: 'thin', color: { argb: COLOR.brand600 } },
        };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: COLOR.brand950 } };
        if (c.moneda) {
          const col = ws.getColumn(i + 1).letter;
          const rangoCol = `${col}${primera}:${col}${ultima}`;
          cell.value = moneda
            ? { formula: `SUMIF(${letra(totalesPorMoneda)}${primera}:${letra(totalesPorMoneda)}${ultima},"${moneda}",${rangoCol})` }
            : { formula: `SUM(${rangoCol})` };
          cell.numFmt = FMT_MONEDA;
        }
        if (moneda && c.key === totalesPorMoneda) cell.value = moneda;
      });
      tot.getCell(1).value = moneda ? `TOTAL ${moneda}` : 'TOTALES';
      tot.height = 20;
    });
  }

  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + filas.length, column: nCols } };
  return ws;
}

const COLUMNAS_VIATICOS = [
  { header: 'FOLIO',                    key: 'folio',                width: 18, mono: true },
  { header: 'ESTADO',                   key: 'estado',               width: 13 },
  { header: 'FECHA SOLICITUD',          key: 'fecha_solicitud',      width: 13, fecha: true },
  { header: 'CTA CONTABLE',             key: 'cta_contable',         width: 14 },
  { header: 'PROYECTO',                 key: 'proyecto',             width: 22 },
  { header: 'DONANTE',                  key: 'donante',              width: 18 },
  { header: 'PARTIDA',                  key: 'partida',              width: 24 },
  { header: 'RESULTADO',                key: 'resultado',            width: 22 },
  { header: 'OBJETIVO',                 key: 'objetivo_estrategico', width: 22 },
  { header: 'FECHA INICIO',             key: 'fecha_inicio',         width: 13, fecha: true },
  { header: 'FECHA FIN',                key: 'fecha_fin',            width: 13, fecha: true },
  { header: 'DESTINO',                  key: 'destino',              width: 20 },
  { header: 'MOTIVO DE VIAJE',          key: 'motivo',               width: 34, ajustar: true },
  { header: 'NOMBRE DE QUIEN SOLICITA', key: 'nombre_solicita',      width: 28 },
  { header: 'NOMBRE DE QUIEN AUTORIZA', key: 'nombre_autoriza',      width: 28 },
  { header: 'TIPO DE CUENTA',           key: 'tipo_cuenta',          width: 16 },
  { header: 'CLABE / TARJETA',          key: 'clabe_bancaria',       width: 22, texto: true },
  { header: 'BANCO',                    key: 'banco',                width: 16 },
  { header: 'MONTO DE VUELOS',          key: 'monto_vuelos',         width: 15, moneda: true },
  { header: 'MONTO DE HOSPEDAJE',       key: 'monto_hospedaje',      width: 15, moneda: true },
  { header: 'MONTO DE ALIMENTOS',       key: 'monto_alimentos',      width: 15, moneda: true },
  { header: 'MONTO DE TRANSPORTE',      key: 'monto_transporte',     width: 15, moneda: true },
  { header: 'MONTO OTROS',              key: 'monto_otros',          width: 15, moneda: true },
  { header: 'TOTAL',                    key: 'monto_total',          width: 16, moneda: true, negrita: true },
];

const COLUMNAS_FACTURAS = [
  { header: 'FOLIO',                    key: 'folio',                width: 18, mono: true },
  { header: 'ESTADO',                   key: 'estado',               width: 13 },
  { header: 'FECHA EMISIÓN',            key: 'fecha_emision',        width: 13, fecha: true },
  { header: 'FECHA REGISTRO',           key: 'fecha_registro',       width: 13, fecha: true },
  { header: 'PROVEEDOR',                key: 'proveedor',            width: 30 },
  { header: 'RFC',                      key: 'rfc',                  width: 16, texto: true },
  { header: 'UUID CFDI',                key: 'uuid_cfdi',            width: 38, mono: true },
  { header: 'CONCEPTO',                 key: 'concepto',             width: 30, ajustar: true },
  { header: 'PROYECTO',                 key: 'proyecto',             width: 22 },
  { header: 'CTA CONTABLE',             key: 'cuenta',               width: 14 },
  { header: 'PARTIDA',                  key: 'partida',              width: 24 },
  { header: 'RESULTADO',                key: 'resultado',            width: 22 },
  { header: 'OBJETIVO',                 key: 'objetivo_estrategico', width: 22 },
  { header: 'NOMBRE DE QUIEN AUTORIZA', key: 'autoriza_nombre',      width: 28 },
  { header: 'BANCO',                    key: 'banco',                width: 16 },
  { header: 'CLABE INTERBANCARIA',      key: 'cuenta_clabe',         width: 22, texto: true },
  { header: 'FECHA DE PAGO',            key: 'fecha_pago',           width: 13, fecha: true },
  { header: 'REFERENCIA DE PAGO',       key: 'referencia_pago',      width: 20 },
  { header: 'MOTIVO DE RECHAZO',        key: 'motivo_rechazo',       width: 28, ajustar: true },
  { header: 'MONEDA',                   key: 'moneda',               width: 9 },
  { header: 'MONTO',                    key: 'monto',                width: 16, moneda: true, negrita: true },
];

function nuevoLibro() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'App Sureste Sostenible';
  wb.created = new Date();
  return wb;
}

async function reporteViaticosXlsx(filas, rango) {
  const wb = nuevoLibro();
  const datos = filas.map((r) => ({
    ...r,
    tipo_cuenta: r.clabe_bancaria ? (r.tipo_cuenta === 'tarjeta' ? 'Tarjeta' : 'Cuenta bancaria') : '',
  }));
  construirHoja(wb, {
    hoja: 'Viáticos', titulo: 'REPORTE DE VIÁTICOS', columnas: COLUMNAS_VIATICOS,
    filas: datos, estados: ESTADOS_VIATICO, rango, unidad: ['solicitud', 'solicitudes'],
  });
  return wb.xlsx.writeBuffer();
}

async function reporteFacturasXlsx(filas, rango) {
  const wb = nuevoLibro();
  construirHoja(wb, {
    hoja: 'Facturas', titulo: 'REPORTE DE FACTURAS', columnas: COLUMNAS_FACTURAS,
    filas, estados: ESTADOS_FACTURA, rango, unidad: ['factura', 'facturas'], totalesPorMoneda: 'moneda',
  });
  return wb.xlsx.writeBuffer();
}

module.exports = { reporteViaticosXlsx, reporteFacturasXlsx };
