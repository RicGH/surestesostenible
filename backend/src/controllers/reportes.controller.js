const PDFDocument = require('pdfkit');
const { z } = require('zod');
const service = require('../services/reportes.service');

const filtrosSchema = z.object({
  modulo: z.enum(['viaticos', 'proveedores']),
  estado: z.string().optional(),
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function generar(req, res) {
  const filtros = filtrosSchema.parse(req.query);

  let titulo, columnas, rows;
  if (filtros.modulo === 'viaticos') {
    titulo = 'Reporte de Viáticos';
    columnas = ['Folio', 'Colaborador', 'Destino', 'Inicio', 'Fin', 'Total', 'Gastado', 'Estado'];
    const data = await service.reporteViaticos(filtros);
    rows = data.map((r) => [
      r.folio, r.colaborador, r.destino, r.fecha_inicio, r.fecha_fin,
      Number(r.monto_total).toFixed(2), Number(r.monto_gastado).toFixed(2), r.estado,
    ]);
  } else {
    titulo = 'Reporte de Proveedores / Facturas';
    columnas = ['Folio', 'Razón Social', 'RFC', 'UUID', 'Monto', 'Fecha', 'Estado'];
    const data = await service.reporteProveedores(filtros);
    rows = data.map((r) => [
      r.folio, r.razon_social, r.rfc, r.uuid_cfdi || '-',
      `${Number(r.monto).toFixed(2)} ${r.moneda}`, r.fecha_emision, r.estado,
    ]);
  }

  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="reporte-${filtros.modulo}-${Date.now()}.pdf"`);
  doc.pipe(res);

  doc.fontSize(16).text(titulo, { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#555').text(
    `Filtros — Estado: ${filtros.estado || 'todos'} · Desde: ${filtros.desde || '-'} · Hasta: ${filtros.hasta || '-'}`,
    { align: 'center' }
  );
  doc.moveDown();

  const tableTop = doc.y;
  const colWidth = (doc.page.width - 60) / columnas.length;
  doc.fillColor('#000').fontSize(9).font('Helvetica-Bold');
  columnas.forEach((c, i) => doc.text(c, 30 + i * colWidth, tableTop, { width: colWidth - 5 }));
  doc.moveTo(30, tableTop + 14).lineTo(doc.page.width - 30, tableTop + 14).stroke();

  doc.font('Helvetica').fontSize(8);
  let y = tableTop + 18;
  for (const row of rows) {
    if (y > doc.page.height - 40) {
      doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
      y = 30;
    }
    row.forEach((cell, i) => doc.text(String(cell ?? ''), 30 + i * colWidth, y, { width: colWidth - 5 }));
    y += 16;
  }

  if (rows.length === 0) {
    doc.moveDown().fontSize(10).fillColor('#777').text('Sin resultados con esos filtros.', { align: 'center' });
  }

  doc.end();
}

const dashboardSchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

async function dashboard(req, res) {
  const filtros = dashboardSchema.parse(req.query);
  const data = await service.dashboard(filtros);
  res.json(data);
}

const MES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const COLORS = {
  brand: '#6366f1', amber: '#f59e0b', emerald: '#10b981', violet: '#8b5cf6', red: '#ef4444',
  ink900: '#0f172a', ink700: '#334155', ink500: '#64748b', ink300: '#cbd5e1', ink100: '#f1f5f9', ink50: '#f8fafc',
};
const ESTADO_COLOR = {
  pendiente: '#f59e0b', aprobado: '#3b82f6', aprobada: '#3b82f6',
  pagado: '#10b981', pagada: '#10b981', en_proceso: '#8b5cf6',
  cerrado: '#64748b', rechazado: '#ef4444', rechazada: '#ef4444', cancelado: '#94a3b8',
};

function fmtMoney(n) {
  const v = Number(n || 0);
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtMes(s) {
  if (typeof s !== 'string') return String(s);
  const m = s.match(/^(\d{4})-(\d{2})$/);
  return m ? `${MES_ES[Number(m[2]) - 1]} ${m[1].slice(2)}` : s;
}

function drawKpi(doc, x, y, w, h, label, value, sub, color) {
  doc.save();
  doc.roundedRect(x, y, w, h, 8).fillAndStroke('#ffffff', COLORS.ink100);
  doc.roundedRect(x + w - 30, y + 8, 22, 22, 6).fill(color);
  doc.fillColor(COLORS.ink500).font('Helvetica').fontSize(8).text(label.toUpperCase(), x + 12, y + 12, { width: w - 50, characterSpacing: 0.5 });
  doc.fillColor(COLORS.ink900).font('Helvetica-Bold').fontSize(15).text(String(value), x + 12, y + 28, { width: w - 24 });
  if (sub) doc.fillColor(COLORS.ink500).font('Helvetica').fontSize(8).text(sub, x + 12, y + 52, { width: w - 24 });
  doc.restore();
}

function drawBars(doc, x, y, w, h, series, labelKey, valueKey) {
  doc.save();
  doc.roundedRect(x, y, w, h, 8).fillAndStroke('#ffffff', COLORS.ink100);
  doc.fillColor(COLORS.ink900).font('Helvetica-Bold').fontSize(10).text('Evolución mensual', x + 12, y + 10);
  doc.fillColor(COLORS.ink500).font('Helvetica').fontSize(8).text('Monto por mes', x + 12, y + 24);

  const padL = 12, padR = 12, padT = 44, padB = 24;
  const innerX = x + padL, innerY = y + padT;
  const innerW = w - padL - padR, innerH = h - padT - padB;

  if (!series.length) {
    doc.fillColor(COLORS.ink300).font('Helvetica').fontSize(9).text('Sin datos en el rango', x, y + h / 2 - 5, { width: w, align: 'center' });
    doc.restore();
    return;
  }

  const max = Math.max(...series.map((s) => Number(s[valueKey]) || 0), 1);
  for (let i = 1; i <= 3; i++) {
    const gy = innerY + (innerH * i) / 4;
    doc.strokeColor(COLORS.ink100).lineWidth(0.5).moveTo(innerX, gy).lineTo(innerX + innerW, gy).stroke();
  }

  const slot = innerW / series.length;
  const barW = Math.min(slot - 8, 36);
  series.forEach((s, i) => {
    const v = Number(s[valueKey]) || 0;
    const bh = (v / max) * innerH;
    const bx = innerX + i * slot + (slot - barW) / 2;
    const by = innerY + innerH - bh;
    doc.fillColor(COLORS.brand).roundedRect(bx, by, barW, bh, 3).fill();
    doc.fillColor(COLORS.ink500).font('Helvetica').fontSize(7)
      .text(fmtMes(s[labelKey]), innerX + i * slot, innerY + innerH + 6, { width: slot, align: 'center' });
  });

  doc.restore();
}

function drawDonut(doc, x, y, w, h, series, labelKey, valueKey) {
  doc.save();
  doc.roundedRect(x, y, w, h, 8).fillAndStroke('#ffffff', COLORS.ink100);
  doc.fillColor(COLORS.ink900).font('Helvetica-Bold').fontSize(10).text('Distribución por estado', x + 12, y + 10);

  const total = series.reduce((s, r) => s + Number(r[valueKey] || 0), 0);
  if (!total) {
    doc.fillColor(COLORS.ink300).font('Helvetica').fontSize(9).text('Sin datos', x, y + h / 2 - 5, { width: w, align: 'center' });
    doc.restore();
    return;
  }

  const cx = x + 60, cy = y + h / 2 + 8, rOuter = 38, rInner = 24;
  let startAngle = -Math.PI / 2;
  series.forEach((r, i) => {
    const v = Number(r[valueKey] || 0);
    if (!v) return;
    const angle = (v / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const color = ESTADO_COLOR[r[labelKey]] || ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6'][i % 5];
    drawArcSegment(doc, cx, cy, rInner, rOuter, startAngle, endAngle, color);
    startAngle = endAngle;
  });

  doc.fillColor(COLORS.ink900).font('Helvetica-Bold').fontSize(14).text(String(total), cx - 30, cy - 8, { width: 60, align: 'center' });
  doc.fillColor(COLORS.ink500).font('Helvetica').fontSize(7).text('TOTAL', cx - 30, cy + 8, { width: 60, align: 'center', characterSpacing: 1 });

  let ly = y + 36;
  const lx = x + 130;
  series.forEach((r, i) => {
    const v = Number(r[valueKey] || 0);
    if (!v) return;
    const pct = Math.round((v / total) * 100);
    const color = ESTADO_COLOR[r[labelKey]] || ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6'][i % 5];
    doc.roundedRect(lx, ly + 1, 8, 8, 2).fill(color);
    const label = String(r[labelKey] || '').replace(/_/g, ' ');
    doc.fillColor(COLORS.ink700).font('Helvetica').fontSize(8).text(label, lx + 14, ly, { width: w - 150, continued: false });
    doc.fillColor(COLORS.ink500).font('Helvetica').fontSize(8).text(`${v} · ${pct}%`, lx + 14, ly + 9, { width: w - 150 });
    ly += 22;
  });

  doc.restore();
}

function drawArcSegment(doc, cx, cy, rIn, rOut, a0, a1, color) {
  const x0 = cx + rOut * Math.cos(a0), y0 = cy + rOut * Math.sin(a0);
  const x1 = cx + rOut * Math.cos(a1), y1 = cy + rOut * Math.sin(a1);
  const x2 = cx + rIn * Math.cos(a1), y2 = cy + rIn * Math.sin(a1);
  const x3 = cx + rIn * Math.cos(a0), y3 = cy + rIn * Math.sin(a0);
  const largeArc = (a1 - a0) > Math.PI ? 1 : 0;
  const path = `M ${x0} ${y0} A ${rOut} ${rOut} 0 ${largeArc} 1 ${x1} ${y1} L ${x2} ${y2} A ${rIn} ${rIn} 0 ${largeArc} 0 ${x3} ${y3} Z`;
  doc.path(path).fill(color);
}

function drawTopList(doc, x, y, w, h, title, items, nameKey) {
  doc.save();
  doc.roundedRect(x, y, w, h, 8).fillAndStroke('#ffffff', COLORS.ink100);
  doc.fillColor(COLORS.ink900).font('Helvetica-Bold').fontSize(10).text(title, x + 12, y + 10);
  doc.fillColor(COLORS.ink500).font('Helvetica').fontSize(8).text('Top 5 por monto', x + 12, y + 24);

  if (!items.length) {
    doc.fillColor(COLORS.ink300).font('Helvetica').fontSize(9).text('Sin datos', x, y + h / 2, { width: w, align: 'center' });
    doc.restore();
    return;
  }

  const max = Math.max(...items.map((i) => Number(i.monto || 0)), 1);
  let ry = y + 42;
  items.forEach((it, idx) => {
    doc.circle(x + 22, ry + 6, 8).fillAndStroke(COLORS.ink100, COLORS.ink100);
    doc.fillColor(COLORS.ink700).font('Helvetica-Bold').fontSize(8).text(String(idx + 1), x + 18, ry + 3, { width: 8, align: 'center' });
    doc.fillColor(COLORS.ink900).font('Helvetica').fontSize(9).text(String(it[nameKey] || '—'), x + 38, ry, { width: w - 130, ellipsis: true });
    const pct = Math.round((Number(it.monto || 0) / max) * 100);
    doc.fillColor(COLORS.ink100).roundedRect(x + 38, ry + 12, w - 130, 4, 2).fill();
    doc.fillColor(COLORS.brand).roundedRect(x + 38, ry + 12, ((w - 130) * pct) / 100, 4, 2).fill();
    doc.fillColor(COLORS.ink900).font('Helvetica-Bold').fontSize(9).text(fmtMoney(it.monto), x + w - 90, ry + 2, { width: 80, align: 'right' });
    doc.fillColor(COLORS.ink500).font('Helvetica').fontSize(7).text(`${it.count} reg.`, x + w - 90, ry + 13, { width: 80, align: 'right' });
    ry += 26;
  });

  doc.restore();
}

function drawHeader(doc, titulo, rango) {
  doc.save();
  const W = doc.page.width;
  doc.rect(0, 0, W, 70).fill(COLORS.ink900);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text(titulo, 30, 18);
  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(9).text(`Periodo: ${rango.desde} a ${rango.hasta}`, 30, 42);
  doc.fillColor('#cbd5e1').font('Helvetica').fontSize(8).text(`Generado: ${new Date().toLocaleString('es-MX')}`, 30, 56);
  doc.restore();
}

async function dashboardPdf(req, res) {
  const filtros = dashboardSchema.parse(req.query);
  const data = await service.dashboard(filtros);

  const doc = new PDFDocument({ margin: 0, size: 'A4', layout: 'portrait' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="dashboard-${Date.now()}.pdf"`);
  doc.pipe(res);

  const M = 24;
  const W = doc.page.width;

  drawHeader(doc, 'Dashboard de Viáticos', data.rango);
  let y = 86;
  const v = data.viaticos;
  const kpis = [
    { label: 'Solicitudes', value: v.kpis.total || 0, sub: `${v.kpis.pendientes || 0} pendientes`, color: COLORS.brand },
    { label: 'Monto total', value: fmtMoney(v.kpis.monto_total), sub: `Prom. ${fmtMoney(v.kpis.ticket_promedio)}`, color: COLORS.violet },
    { label: 'Por pagar', value: fmtMoney(v.kpis.monto_por_pagar), sub: `${v.kpis.aprobados || 0} aprobados`, color: COLORS.amber },
    { label: 'Gastado', value: fmtMoney(v.kpis.monto_gastado), sub: `${v.kpis.cerrados || 0} cerrados`, color: COLORS.emerald },
  ];
  const kpiW = (W - M * 2 - 18) / 4;
  kpis.forEach((k, i) => drawKpi(doc, M + i * (kpiW + 6), y, kpiW, 70, k.label, k.value, k.sub, k.color));
  y += 82;

  const chartW1 = (W - M * 2) * 0.6 - 6;
  const chartW2 = (W - M * 2) * 0.4 - 6;
  drawBars(doc, M, y, chartW1, 160, v.por_mes, 'mes', 'monto');
  drawDonut(doc, M + chartW1 + 12, y, chartW2, 160, v.por_estado, 'estado', 'count');
  y += 172;

  const topW = (W - M * 2 - 12) / 2;
  drawTopList(doc, M, y, topW, 160, 'Top destinos', v.top_destinos || [], 'destino');
  drawTopList(doc, M + topW + 12, y, topW, 160, 'Top colaboradores', v.top_colaboradores || [], 'colaborador');

  doc.addPage({ margin: 0, size: 'A4', layout: 'portrait' });
  drawHeader(doc, 'Dashboard de Facturas', data.rango);
  y = 86;
  const f = data.facturas;
  const kpisF = [
    { label: 'Facturas', value: f.kpis.total || 0, sub: `${f.kpis.pendientes || 0} pendientes`, color: COLORS.brand },
    { label: 'Monto total', value: fmtMoney(f.kpis.monto_total), sub: '', color: COLORS.violet },
    { label: 'Por pagar', value: fmtMoney(f.kpis.monto_por_pagar), sub: `${f.kpis.aprobadas || 0} aprobadas`, color: COLORS.amber },
    { label: 'Pagadas', value: fmtMoney(f.kpis.monto_pagado), sub: `${f.kpis.pagadas || 0} facturas`, color: COLORS.emerald },
  ];
  kpisF.forEach((k, i) => drawKpi(doc, M + i * (kpiW + 6), y, kpiW, 70, k.label, k.value, k.sub, k.color));
  y += 82;

  drawBars(doc, M, y, chartW1, 160, f.por_mes, 'mes', 'monto');
  drawDonut(doc, M + chartW1 + 12, y, chartW2, 160, f.por_estado, 'estado', 'count');
  y += 172;

  drawTopList(doc, M, y, W - M * 2, 160, 'Top proveedores', f.top_proveedores || [], 'proveedor');

  doc.end();
}

async function dashboardCsv(req, res) {
  const filtros = dashboardSchema.parse(req.query);
  const data = await service.dashboard(filtros);
  const lines = [];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  lines.push(`Dashboard App Sureste Sostenible,Periodo,${data.rango.desde},${data.rango.hasta}`);
  lines.push('');
  lines.push('=== VIATICOS - KPIs ===');
  Object.entries(data.viaticos.kpis || {}).forEach(([k, v]) => lines.push(`${k},${v}`));
  lines.push('');
  lines.push('=== VIATICOS - Por mes ===');
  lines.push('mes,count,monto');
  (data.viaticos.por_mes || []).forEach((r) => lines.push(`${esc(r.mes)},${r.count},${r.monto}`));
  lines.push('');
  lines.push('=== VIATICOS - Por estado ===');
  lines.push('estado,count,monto');
  (data.viaticos.por_estado || []).forEach((r) => lines.push(`${esc(r.estado)},${r.count},${r.monto}`));
  lines.push('');
  lines.push('=== VIATICOS - Top destinos ===');
  lines.push('destino,count,monto');
  (data.viaticos.top_destinos || []).forEach((r) => lines.push(`${esc(r.destino)},${r.count},${r.monto}`));
  lines.push('');
  lines.push('=== VIATICOS - Top colaboradores ===');
  lines.push('colaborador,count,monto');
  (data.viaticos.top_colaboradores || []).forEach((r) => lines.push(`${esc(r.colaborador)},${r.count},${r.monto}`));
  lines.push('');
  lines.push('=== FACTURAS - KPIs ===');
  Object.entries(data.facturas.kpis || {}).forEach(([k, v]) => lines.push(`${k},${v}`));
  lines.push('');
  lines.push('=== FACTURAS - Por mes ===');
  lines.push('mes,count,monto');
  (data.facturas.por_mes || []).forEach((r) => lines.push(`${esc(r.mes)},${r.count},${r.monto}`));
  lines.push('');
  lines.push('=== FACTURAS - Por estado ===');
  lines.push('estado,count,monto');
  (data.facturas.por_estado || []).forEach((r) => lines.push(`${esc(r.estado)},${r.count},${r.monto}`));
  lines.push('');
  lines.push('=== FACTURAS - Top proveedores ===');
  lines.push('proveedor,count,monto');
  (data.facturas.top_proveedores || []).forEach((r) => lines.push(`${esc(r.proveedor)},${r.count},${r.monto}`));

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="dashboard-${Date.now()}.csv"`);
  res.send('﻿' + lines.join('\n'));
}

async function viaticosReporteCsv(req, res) {
  const filtros = dashboardSchema.parse(req.query);
  const rows = await service.reporteViaticosDetallado(filtros);

  const HEADERS = [
    'CTA CONTABLE', 'PROYECTO', 'DONANTE', 'PARTIDA', 'RESULTADO', 'OBJETIVO',
    'FECHA INICIO', 'FECHA FIN', 'DESTINO', 'MOTIVO DE VIAJE',
    'NOMBRE DE QUIEN SOLICITA', 'NOMBRE DE QUIEN AUTORIZA',
    'CLABE INTERBANCARIA', 'BANCO',
    'MONTO DE VUELOS', 'MONTO DE HOSPEDAJE', 'MONTO DE ALIMENTOS',
    'MONTO DE TRANSPORTE', 'MONTO OTROS', 'TOTAL',
  ];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const fmtFecha = (d) => d ? new Date(d).toLocaleDateString('es-MX') : '';
  const fmtNum = (n) => n != null ? Number(n).toFixed(2) : '';

  const lines = ['', '', ''];
  lines.push(HEADERS.map(esc).join(','));
  for (const r of rows) {
    lines.push([
      r.cta_contable, r.proyecto, r.donante, r.partida, r.resultado, r.objetivo_estrategico,
      fmtFecha(r.fecha_inicio), fmtFecha(r.fecha_fin),
      r.destino, r.motivo,
      r.nombre_solicita, r.nombre_autoriza,
      r.clabe_bancaria, r.banco,
      fmtNum(r.monto_vuelos), fmtNum(r.monto_hospedaje), fmtNum(r.monto_alimentos),
      fmtNum(r.monto_transporte), fmtNum(r.monto_otros), fmtNum(r.monto_total),
    ].map(esc).join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="REPORTE VIATICOS.csv"');
  res.send('﻿' + lines.join('\n'));
}

module.exports = { generar, dashboard, dashboardPdf, dashboardCsv, viaticosReporteCsv };
