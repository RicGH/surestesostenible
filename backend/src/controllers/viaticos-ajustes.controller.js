const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const { HttpError } = require('../middleware/error');
const service = require('../services/viaticos-ajustes.service');
const pagosService = require('../services/viaticos-pagos.service');
const viaticos = require('../services/viaticos.service');
const notif = require('../services/notificaciones.service');
const { UPLOAD_ROOT } = require('../config/upload');

const ajusteSchema = z.object({
  motivo: z.string().min(5).max(500),
  monto_vuelos: z.coerce.number().nonnegative().default(0),
  monto_hospedaje: z.coerce.number().nonnegative().default(0),
  monto_alimentos: z.coerce.number().nonnegative().default(0),
  monto_transporte: z.coerce.number().nonnegative().default(0),
  monto_otros: z.coerce.number().nonnegative().default(0),
});

async function crear(req, res) {
  const solicitudId = Number(req.params.id);
  const filtroColab = req.user.rol === 'colaborador' ? req.user.sub : null;
  const sol = await viaticos.getById(solicitudId, filtroColab);
  if (!sol) throw new HttpError(404, 'Solicitud no encontrada');
  if (!['pagado', 'en_proceso'].includes(sol.estado)) {
    throw new HttpError(400, 'Solo puedes solicitar ajustes sobre un viático activo');
  }
  const data = ajusteSchema.parse(req.body);
  const total = (data.monto_vuelos || 0) + (data.monto_hospedaje || 0)
    + (data.monto_alimentos || 0) + (data.monto_transporte || 0) + (data.monto_otros || 0);
  if (total <= 0) throw new HttpError(400, 'El ajuste debe ser mayor a $0');

  const r = await service.crear(solicitudId, data);
  await notif.crearParaRol('admin', {
    tipo: 'ajuste_pendiente',
    titulo: 'Ajuste de viático por aprobar',
    mensaje: `${sol.folio} · +$${total.toFixed(2)} · ${data.motivo.slice(0, 60)}`,
    url: '/admin/viaticos',
  });
  res.status(201).json(r);
}

async function listarPendientes(req, res) {
  res.json({ data: await service.listarPendientes() });
}

async function aprobar(req, res) {
  const id = Number(req.params.id);
  await service.aprobar(id, req.user.sub);
  const aj = await service.getById(id);
  if (aj) {
    await notif.crear(aj.colaborador_id, {
      tipo: 'ajuste_aprobado',
      titulo: 'Ajuste aprobado',
      mensaje: `Tu ajuste de $${Number(aj.monto_total).toFixed(2)} fue aprobado. En espera de pago.`,
      url: `/viaticos/${aj.solicitud_id}`,
    });
    await notif.crearParaRol('finanzas', {
      tipo: 'ajuste_por_pagar',
      titulo: 'Ajuste de viático por pagar',
      mensaje: `${aj.solicitud_folio} · ${aj.colaborador_nombre} · +$${Number(aj.monto_total).toFixed(2)}`,
      url: '/finanzas/viaticos',
    });
  }
  res.json({ ok: true });
}

async function rechazar(req, res) {
  const id = Number(req.params.id);
  const { motivo } = z.object({ motivo: z.string().min(3) }).parse(req.body);
  await service.rechazar(id, req.user.sub, motivo);
  const aj = await service.getById(id);
  if (aj) {
    await notif.crear(aj.colaborador_id, {
      tipo: 'ajuste_rechazado',
      titulo: 'Ajuste rechazado',
      mensaje: motivo,
      url: `/viaticos/${aj.solicitud_id}`,
    });
  }
  res.json({ ok: true });
}

async function pagar(req, res) {
  const id = Number(req.params.id);
  const { referencia } = z.object({ referencia: z.string().max(80).optional() }).parse(req.body);
  const comprobante = req.file ? `comprobantes/${req.file.filename}` : null;
  const r = await pagosService.pagarAjuste(id, req.user.sub, comprobante, referencia);
  const aj = await service.getById(id);
  if (aj) {
    await notif.crear(aj.colaborador_id, {
      tipo: 'ajuste_pagado',
      titulo: 'Ajuste abonado',
      mensaje: `Tu ajuste de $${Number(aj.monto_total).toFixed(2)} fue pagado y sumado a tu viático.`,
      url: `/viaticos/${r.solicitud_id}`,
    });
  }
  res.json({ ok: true });
}

const eliminarSchema = z.object({
  modo: z.enum(['logico', 'fisico']).default('logico'),
});

function borrarArchivo(rel) {
  if (!rel) return;
  const abs = path.resolve(UPLOAD_ROOT, rel);
  if (!abs.startsWith(path.resolve(UPLOAD_ROOT))) return;
  fs.unlink(abs, () => {});
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const { modo } = eliminarSchema.parse({ ...req.query, ...req.body });

  const aj = await service.getById(id, { incluirEliminados: modo === 'fisico' });
  if (!aj) throw new HttpError(404, 'Ajuste no encontrado');
  if (aj.estado === 'pagado') {
    throw new HttpError(409, 'No se puede eliminar un ajuste ya pagado: su monto está sumado al viático.');
  }

  if (modo === 'fisico') {
    const archivos = await service.getArchivos(id);
    await service.eliminarFisico(id);
    archivos.forEach(borrarArchivo);
  } else {
    await service.eliminarLogico(id, req.user.sub);
  }

  res.json({ ok: true, modo });
}

module.exports = { crear, listarPendientes, aprobar, rechazar, pagar, eliminar };
