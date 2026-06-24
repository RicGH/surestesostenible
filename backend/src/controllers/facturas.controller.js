const path = require('path');
const fs = require('fs');
const { z } = require('zod');
const { HttpError } = require('../middleware/error');
const facturas = require('../services/facturas.service');
const proveedores = require('../services/proveedores.service');
const notif = require('../services/notificaciones.service');
const { parseCfdi } = require('../utils/cfdi-parser');
const { UPLOAD_ROOT } = require('../config/upload');
const oficioService = require('../services/facturas-oficio.service');

async function subir(req, res) {
  let prov;
  if (req.user.rol === 'admin') {
    const provId = Number(req.body.proveedor_id);
    if (!provId) throw new HttpError(400, 'Selecciona el proveedor para esta factura.');
    prov = await proveedores.getById(provId);
    if (!prov) throw new HttpError(400, 'Proveedor no encontrado.');
    if (prov.estado !== 'aprobado') throw new HttpError(400, 'El proveedor seleccionado no está aprobado.');
  } else {
    prov = await proveedores.getByUserId(req.user.sub);
    if (!prov) throw new HttpError(400, 'Debes registrarte como proveedor');
    if (prov.estado !== 'aprobado') throw new HttpError(403, 'Tu registro aún no está aprobado');
  }

  const pdf = req.files?.pdf?.[0];
  const xml = req.files?.xml?.[0];
  if (!pdf || !xml) throw new HttpError(400, 'Debes subir PDF y XML');

  let cfdi;
  try {
    cfdi = parseCfdi(xml.path);
  } catch (e) {
    throw new HttpError(400, `XML inválido: ${e.message}`);
  }

  const contabilidad = {
    proyecto:             req.body.proyecto             || null,
    cuenta:               req.body.cuenta               || null,
    partida:              req.body.partida              || null,
    objetivo_estrategico: req.body.objetivo_estrategico || null,
    resultado:            req.body.resultado            || null,
    concepto:             req.body.concepto             || null,
  };

  const result = await facturas.crear(prov.id, cfdi, `facturas/${pdf.filename}`, `facturas/${xml.filename}`, contabilidad);

  await notif.crearParaRol('admin', {
    tipo: 'factura_nueva',
    titulo: 'Nueva factura por revisar',
    mensaje: `${prov.razon_social} - ${cfdi.monto} ${cfdi.moneda}`,
    url: '/admin/facturas',
  });

  res.status(201).json({ ...result, cfdi });
}

async function preview(req, res) {
  const xml = req.file;
  if (!xml) throw new HttpError(400, 'XML requerido');
  try {
    const cfdi = parseCfdi(xml.path);
    fs.unlink(xml.path, () => {});
    res.json(cfdi);
  } catch (e) {
    fs.unlink(xml.path, () => {});
    throw new HttpError(400, `XML inválido: ${e.message}`);
  }
}

async function misFacturas(req, res) {
  const prov = await proveedores.getByUserId(req.user.sub);
  if (!prov) return res.json({ data: [] });
  res.json({ data: await facturas.listarPorProveedor(prov.id, req.query) });
}

async function listarAdmin(req, res) {
  res.json({ data: await facturas.listarParaAdmin(req.query) });
}

async function detalle(req, res) {
  const factura = await facturas.getById(Number(req.params.id));
  if (!factura) throw new HttpError(404, 'Factura no encontrada');
  if (req.user.rol === 'proveedor' && factura.proveedor_user_id !== req.user.sub) {
    throw new HttpError(403, 'Sin acceso a esta factura');
  }
  const pago = await facturas.getPago(factura.id);
  res.json({ ...factura, pago });
}

async function aprobar(req, res) {
  const id = Number(req.params.id);
  await facturas.aprobar(id, req.user.sub);
  const f = await facturas.getById(id);
  if (f) {
    await notif.crear(f.proveedor_user_id, {
      tipo: 'factura_aprobada',
      titulo: 'Factura aprobada',
      mensaje: `Factura ${f.folio} fue aprobada`,
      url: `/proveedores/historial`,
    });
    await notif.crearParaRol('finanzas', {
      tipo: 'factura_para_pagar',
      titulo: 'Factura lista para pagar',
      mensaje: `${f.razon_social} - ${f.monto} ${f.moneda}`,
      url: '/finanzas/pendientes',
    });
  }
  res.json({ ok: true });
}

async function rechazar(req, res) {
  const id = Number(req.params.id);
  const { motivo } = z.object({ motivo: z.string().min(3) }).parse(req.body);
  await facturas.rechazar(id, req.user.sub, motivo);
  const f = await facturas.getById(id);
  if (f) {
    await notif.crear(f.proveedor_user_id, {
      tipo: 'factura_rechazada',
      titulo: 'Factura rechazada',
      mensaje: motivo,
      url: `/proveedores/historial`,
    });
  }
  res.json({ ok: true });
}

async function pagar(req, res) {
  const id = Number(req.params.id);
  const { referencia } = z.object({ referencia: z.string().max(80).optional() }).parse(req.body);
  const comprobante = req.file ? `comprobantes/${req.file.filename}` : null;
  await facturas.pagar(id, req.user.sub, comprobante, referencia);
  const f = await facturas.getById(id);
  if (f) {
    await notif.crear(f.proveedor_user_id, {
      tipo: 'factura_pagada',
      titulo: 'Factura pagada',
      mensaje: `${f.folio} fue pagada`,
      url: `/proveedores/historial`,
    });
  }
  res.json({ ok: true });
}

async function descargarComprobante(req, res) {
  const id = Number(req.params.id);
  const factura = await facturas.getById(id);
  if (!factura) throw new HttpError(404, 'Factura no encontrada');
  if (req.user.rol === 'proveedor' && factura.proveedor_user_id !== req.user.sub) {
    throw new HttpError(403, 'Sin acceso');
  }
  const pago = await facturas.getPago(id);
  if (!pago) throw new HttpError(404, 'Sin comprobante');
  res.sendFile(path.join(UPLOAD_ROOT, pago.comprobante_path));
}

async function descargarFactura(req, res) {
  const id = Number(req.params.id);
  const tipo = req.params.tipo === 'xml' ? 'xml_path' : 'pdf_path';
  const factura = await facturas.getById(id);
  if (!factura) throw new HttpError(404, 'Factura no encontrada');
  if (req.user.rol === 'proveedor' && factura.proveedor_user_id !== req.user.sub) {
    throw new HttpError(403, 'Sin acceso');
  }
  res.sendFile(path.join(UPLOAD_ROOT, factura[tipo]));
}

async function descargarOficio(req, res) {
  const id = Number(req.params.id);
  if (req.user.rol === 'proveedor') {
    const prov = await proveedores.getByUserId(req.user.sub);
    const f = await facturas.getById(id);
    if (!f || !prov || f.proveedor_id !== prov.id) throw new HttpError(404, 'Factura no encontrada');
  }
  const { pdf, folio } = await oficioService.generarPdf(id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="oficio-${folio}.pdf"`);
  res.send(pdf);
}

module.exports = {
  subir, preview, misFacturas, listarAdmin, detalle,
  aprobar, rechazar, pagar, descargarComprobante, descargarFactura, descargarOficio,
};
