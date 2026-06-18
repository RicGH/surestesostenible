const { z } = require('zod');
const path = require('path');
const { HttpError } = require('../middleware/error');
const service = require('../services/viaticos.service');
const pagosService = require('../services/viaticos-pagos.service');
const notifService = require('../services/notificaciones.service');
const { UPLOAD_ROOT } = require('../config/upload');

const solicitudSchema = z.object({
  destino: z.string().min(2).max(160),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  motivo: z.string().min(5),
  monto_vuelos: z.coerce.number().nonnegative().default(0),
  monto_hospedaje: z.coerce.number().nonnegative().default(0),
  monto_alimentos: z.coerce.number().nonnegative().default(0),
  monto_transporte: z.coerce.number().nonnegative().default(0),
  monto_otros: z.coerce.number().nonnegative().default(0),
  proyecto: z.string().max(80).optional(),
  cuenta: z.string().max(80).optional(),
  partida: z.string().max(80).optional(),
  objetivo_estrategico: z.string().max(160).optional(),
  colaborador_id: z.coerce.number().int().positive().optional(),
});

async function resolverColaboradorId(req, source) {
  if (req.user.rol === 'colaborador') return req.user.sub;
  const id = Number(source?.colaborador_id);
  if (!id) throw new HttpError(400, 'Selecciona el colaborador para esta acción.');
  const u = await require('../services/users.service').findById(id);
  if (!u || u.rol !== 'colaborador') throw new HttpError(400, 'El usuario seleccionado no es un colaborador válido.');
  return id;
}

async function crear(req, res) {
  const data = solicitudSchema.parse(req.body);
  const colaboradorId = await resolverColaboradorId(req, data);
  const { colaborador_id: _ignore, ...payload } = data;
  const justificante = req.file ? `justificantes/${req.file.filename}` : null;
  const result = await service.crearSolicitud(colaboradorId, payload, justificante);
  await notifService.crearParaRol('admin', {
    tipo: 'viaticos_nueva',
    titulo: 'Nueva solicitud de viáticos',
    mensaje: `Folio ${result.folio} pendiente de aprobación`,
    url: `/admin/viaticos`,
  });
  if (req.user.rol === 'admin') {
    await notifService.crear(colaboradorId, {
      tipo: 'viaticos_creada_por_admin',
      titulo: 'Se creó una solicitud a tu nombre',
      mensaje: `Admin creó la solicitud ${result.folio} a tu nombre.`,
      url: `/viaticos/${result.id}`,
    });
  }
  res.status(201).json(result);
}

async function puedoCrear(req, res) {
  const limite = service.LIMITE_VIATICOS_ABIERTOS;
  let colaboradorId;
  try { colaboradorId = await resolverColaboradorId(req, req.query); }
  catch { return res.json({ puede: true, activa: null, abiertos: [], enUso: 0, limite }); }
  const [activa, abiertos] = await Promise.all([
    service.getActivaDeColaborador(colaboradorId),
    service.getAbiertosDeColaborador(colaboradorId),
  ]);
  res.json({
    // Crear siempre se permite; al pasar de 3 en uso, los nuevos quedan en cola.
    puede: true,
    activa: activa || null,
    abiertos,
    enUso: abiertos.length,
    limite,
  });
}

async function listarMios(req, res) {
  const colaboradorId = await resolverColaboradorId(req, req.query);
  const data = await service.listarPorColaborador(colaboradorId, req.query);
  res.json({ data });
}

async function listarPendientes(req, res) {
  const data = await service.listarPendientesAdmin();
  res.json({ data });
}

async function listarActivos(req, res) {
  res.json({ data: await service.listarActivosAdmin() });
}

async function listarCerrados(req, res) {
  res.json({ data: await service.listarCerradosAdmin() });
}

async function listarRechazados(req, res) {
  res.json({ data: await service.listarRechazadosAdmin() });
}

async function listarTodos(req, res) {
  res.json({ data: await service.listarTodosAdmin(req.query) });
}

async function detalle(req, res) {
  const id = Number(req.params.id);
  const restringir = req.user.rol === 'colaborador' ? req.user.sub : null;
  const sol = await service.getById(id, restringir);
  if (!sol) throw new HttpError(404, 'Solicitud no encontrada');
  res.json(sol);
}

async function aprobar(req, res) {
  const id = Number(req.params.id);
  await service.aprobar(id, req.user.sub);
  const sol = await service.getById(id);
  if (sol) {
    await notifService.crear(sol.colaborador_id, {
      tipo: 'viaticos_aprobado',
      titulo: 'Solicitud aprobada',
      mensaje: `Tu solicitud ${sol.folio} fue aprobada por el supervisor. En espera de pago por finanzas.`,
      url: `/viaticos/${id}`,
    });
    await notifService.crearParaRol('finanzas', {
      tipo: 'viaticos_por_pagar',
      titulo: 'Viático por pagar',
      mensaje: `${sol.folio} · ${sol.colaborador_nombre} · $${Number(sol.monto_total).toFixed(2)}`,
      url: '/finanzas/viaticos',
    });
  }
  res.json({ ok: true });
}

async function listarPorPagar(req, res) {
  res.json({ data: await pagosService.listarPorPagar() });
}

async function listarPagosHistorial(req, res) {
  res.json({ data: await pagosService.listarHistorial() });
}

async function pagarSolicitud(req, res) {
  const id = Number(req.params.id);
  const { referencia, metodo_pago } = z.object({
    referencia: z.string().max(80).optional(),
    metodo_pago: z.enum(['tarjeta', 'transferencia']),
  }).parse(req.body);
  const comprobante = req.file ? `comprobantes/${req.file.filename}` : null;
  await pagosService.pagarSolicitud(id, req.user.sub, comprobante, referencia, metodo_pago);
  const sol = await service.getById(id);
  if (sol) {
    await notifService.crear(sol.colaborador_id, {
      tipo: 'viaticos_pagado',
      titulo: 'Viáticos abonados',
      mensaje: `Recibiste el abono de tu viático ${sol.folio}. Ya puedes registrar tus comprobantes.`,
      url: `/viaticos/${id}`,
    });
  }
  res.json({ ok: true });
}

async function descargarComprobantePago(req, res) {
  const id = Number(req.params.id);
  const pago = await pagosService.getPagoSolicitud(id);
  if (!pago || !pago.comprobante_path) throw new HttpError(404, 'Sin comprobante');
  const sol = await service.getById(id);
  if (req.user.rol === 'colaborador' && sol.colaborador_id !== req.user.sub) {
    throw new HttpError(403, 'Sin acceso');
  }
  res.sendFile(path.join(UPLOAD_ROOT, pago.comprobante_path));
}

async function descargarJustificante(req, res) {
  const id = Number(req.params.id);
  const restringir = req.user.rol === 'colaborador' ? req.user.sub : null;
  const sol = await service.getById(id, restringir);
  if (!sol) throw new HttpError(404, 'Solicitud no encontrada');
  if (!sol.justificante_path) throw new HttpError(404, 'Sin justificante');
  res.sendFile(path.join(UPLOAD_ROOT, sol.justificante_path));
}

async function descargarGasto(req, res) {
  const id = Number(req.params.id);
  const gastoId = Number(req.params.gastoId);
  const sol = await service.getById(id);
  if (!sol) throw new HttpError(404, 'Solicitud no encontrada');
  if (req.user.rol === 'colaborador' && sol.colaborador_id !== req.user.sub) {
    throw new HttpError(403, 'Sin acceso');
  }
  const gasto = (sol.gastos || []).find((g) => g.id === gastoId);
  if (!gasto || !gasto.archivo) throw new HttpError(404, 'Comprobante no encontrado');
  res.sendFile(path.join(UPLOAD_ROOT, gasto.archivo));
}

async function descargarGastoXml(req, res) {
  const id = Number(req.params.id);
  const gastoId = Number(req.params.gastoId);
  const sol = await service.getById(id);
  if (!sol) throw new HttpError(404, 'Solicitud no encontrada');
  if (req.user.rol === 'colaborador' && sol.colaborador_id !== req.user.sub) {
    throw new HttpError(403, 'Sin acceso');
  }
  const gasto = (sol.gastos || []).find((g) => g.id === gastoId);
  if (!gasto || !gasto.xml_path) throw new HttpError(404, 'XML no encontrado');
  res.sendFile(path.join(UPLOAD_ROOT, gasto.xml_path));
}

async function rechazar(req, res) {
  const id = Number(req.params.id);
  const schema = z.object({
    motivo: z.string().min(3),
    permite_edicion: z.boolean().optional().default(false),
  });
  const { motivo, permite_edicion } = schema.parse(req.body);
  await service.rechazar(id, req.user.sub, motivo, permite_edicion);
  const sol = await service.getById(id);
  if (sol) {
    await notifService.crear(sol.colaborador_id, {
      tipo: 'viaticos_rechazado',
      titulo: 'Solicitud rechazada',
      mensaje: `Tu solicitud ${sol.folio}: ${motivo}`,
      url: `/viaticos/${id}`,
    });
  }
  res.json({ ok: true });
}

async function editar(req, res) {
  const id = Number(req.params.id);
  const data = solicitudSchema.parse(req.body);
  await service.editarSolicitud(id, req.user.sub, data);
  const sol = await service.getById(id);
  if (sol) {
    await notifService.crearParaRol('admin', {
      tipo: 'viaticos_corregido',
      titulo: 'Solicitud corregida y reenviada',
      mensaje: `${sol.colaborador_nombre} corrigió la solicitud ${sol.folio}. Vuelve a estar pendiente de aprobación.`,
      url: '/admin/viaticos',
    });
  }
  res.json({ ok: true });
}

async function duplicar(req, res) {
  const id = Number(req.params.id);
  let colaboradorId = req.user.sub;
  if (req.user.rol === 'admin') {
    const orig = await service.getById(id);
    if (!orig) throw new HttpError(404, 'Solicitud no encontrada');
    colaboradorId = orig.colaborador_id;
  }
  const result = await service.duplicar(id, colaboradorId);
  res.status(201).json(result);
}

async function cerrar(req, res) {
  const id = Number(req.params.id);

  if (req.user.rol === 'colaborador') {
    const sol = await service.getById(id);
    if (!sol) throw new HttpError(404, 'Viático no encontrado');
    if (sol.colaborador_id !== req.user.sub) throw new HttpError(403, 'Solo puedes cerrar tus propios viáticos');
  }

  try {
    await service.cerrarViaje(id, req.user.sub);
  } catch (e) {
    throw new HttpError(400, e.message);
  }
  const sol = await service.getById(id);
  if (sol) {
    if (req.user.rol === 'colaborador') {
      await notifService.crearParaRol('admin', {
        tipo: 'viaticos_cerrado_colaborador',
        titulo: 'Viaje cerrado por colaborador',
        mensaje: `${sol.colaborador_nombre} cerró el viático ${sol.folio}.`,
        url: `/admin/viaticos`,
      });
    } else {
      await notifService.crear(sol.colaborador_id, {
        tipo: 'viaticos_cerrado',
        titulo: 'Viaje cerrado',
        mensaje: `Tu viático ${sol.folio} fue cerrado por el administrador.`,
        url: `/viaticos/${id}`,
      });
    }
  }
  res.json({ ok: true });
}

const gastoSchema = z.object({
  monto: z.coerce.number().positive(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rfc_emisor: z.string().min(12).max(13).optional().or(z.literal('')),
  nombre_emisor: z.string().max(200).optional(),
  concepto: z.string().max(255).optional(),
});

async function subirGasto(req, res) {
  const archivoFile = req.files?.archivo?.[0];
  const xmlFile = req.files?.xml?.[0];
  if (!archivoFile && !xmlFile) throw new HttpError(400, 'Debes subir el comprobante (PDF/imagen) o el XML del CFDI');
  const id = Number(req.params.id);
  const data = gastoSchema.parse(req.body);
  const archivo = archivoFile ? `gastos/${archivoFile.filename}` : null;
  const xmlPath = xmlFile ? `gastos/${xmlFile.filename}` : null;
  try {
    const colaboradorId = req.user.rol === 'colaborador' ? req.user.sub : null;
    const gastoId = await service.agregarGasto(id, colaboradorId, data, archivo, xmlPath);
    res.status(201).json({ id: gastoId, archivo, xml_path: xmlPath });
  } catch (e) {
    if (e.code === 'SALDO_INSUFICIENTE') throw new HttpError(409, e.message);
    if (e.code === 'BLOQUEADO_POR_USO') throw new HttpError(409, e.message);
    throw e;
  }
}

module.exports = {
  crear, listarMios, listarPendientes, listarActivos, listarCerrados,
  listarRechazados, listarTodos, detalle,
  aprobar, rechazar, editar, duplicar, cerrar, subirGasto, puedoCrear,
  listarPorPagar, listarPagosHistorial, pagarSolicitud, descargarComprobantePago,
  descargarGasto, descargarGastoXml, descargarJustificante,
};
