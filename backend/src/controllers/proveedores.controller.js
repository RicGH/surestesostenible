const bcrypt = require('bcrypt');
const { z } = require('zod');
const { HttpError } = require('../middleware/error');
const service = require('../services/proveedores.service');
const usersService = require('../services/users.service');
const notif = require('../services/notificaciones.service');

const registroSchema = z.object({
  rfc: z.string().min(12).max(13),
  razon_social: z.string().min(2).max(200),
  direccion: z.string().max(255).optional(),
  banco: z.string().max(120).optional(),
  cuenta_clabe: z.string().length(18).optional().or(z.literal('')),
});

async function miRegistro(req, res) {
  const data = await service.getByUserId(req.user.sub);
  res.json({ data });
}

async function registrar(req, res) {
  const existente = await service.getByUserId(req.user.sub);
  if (existente) throw new HttpError(409, 'Ya tienes un registro de proveedor');
  const body = registroSchema.parse(req.body);
  const documentacion = req.file ? `proveedores/${req.file.filename}` : null;
  const id = await service.crear(req.user.sub, body, documentacion);
  await notif.crearParaRol('admin', {
    tipo: 'proveedor_nuevo',
    titulo: 'Nuevo proveedor por aprobar',
    mensaje: `${body.razon_social} (${body.rfc})`,
    url: '/admin/proveedores',
  });
  res.status(201).json({ id });
}

async function listarPendientes(req, res) {
  res.json({ data: await service.listarPendientes() });
}

async function listarTodos(req, res) {
  res.json({ data: await service.listarTodos(req.query) });
}

async function detalle(req, res) {
  const data = await service.getById(Number(req.params.id));
  if (!data) throw new HttpError(404, 'Proveedor no encontrado');
  res.json(data);
}

async function aprobar(req, res) {
  await service.aprobar(Number(req.params.id), req.user.sub);
  const prov = await service.getById(Number(req.params.id));
  if (prov) {
    await notif.crear(prov.user_id, {
      tipo: 'proveedor_aprobado',
      titulo: 'Tu registro fue aprobado',
      mensaje: 'Ya puedes subir facturas',
      url: '/proveedores/facturas',
    });
  }
  res.json({ ok: true });
}

async function rechazar(req, res) {
  const { motivo } = z.object({ motivo: z.string().min(3) }).parse(req.body);
  await service.rechazar(Number(req.params.id), req.user.sub, motivo);
  const prov = await service.getById(Number(req.params.id));
  if (prov) {
    await notif.crear(prov.user_id, {
      tipo: 'proveedor_rechazado',
      titulo: 'Tu registro fue rechazado',
      mensaje: motivo,
      url: '/proveedores/registro',
    });
  }
  res.json({ ok: true });
}

const crearAdminSchema = z.object({
  nombre: z.string().min(2).max(120),
  email: z.string().email().max(120),
  password: z.string().min(6).max(72),
  rfc: z.string().min(12).max(13),
  razon_social: z.string().min(2).max(200),
  direccion: z.string().max(255).optional(),
  banco: z.string().max(120).optional(),
  cuenta_clabe: z.string().length(18).optional().or(z.literal('')),
  aprobar: z.coerce.boolean().optional().default(false),
});

async function crearComoAdmin(req, res) {
  const body = crearAdminSchema.parse(req.body);
  const existente = await usersService.findByEmail(body.email);
  if (existente) throw new HttpError(409, 'Ya existe un usuario con ese correo.');
  const password_hash = await bcrypt.hash(body.password, 10);
  const userId = await usersService.create({
    email: body.email,
    password_hash,
    nombre: body.nombre,
    rol: 'proveedor',
  });
  const id = await service.crear(userId, body, null);
  if (body.aprobar) {
    await service.aprobar(id, req.user.sub);
  }
  res.status(201).json({ id, user_id: userId });
}

module.exports = { miRegistro, registrar, listarPendientes, listarTodos, detalle, aprobar, rechazar, crearComoAdmin };
