const bcrypt = require('bcrypt');
const { z } = require('zod');
const { HttpError } = require('../middleware/error');
const service = require('../services/users.service');
const notifService = require('../services/notificaciones.service');

const crearSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(2).max(120),
  rol: z.enum(['admin', 'colaborador', 'proveedor', 'finanzas']),
});

const actualizarSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(2).max(120),
  rol: z.enum(['admin', 'colaborador', 'proveedor', 'finanzas']),
});

const passwordSchema = z.object({ password: z.string().min(8) });

async function listar(req, res) {
  res.json({ data: await service.listar(req.query) });
}

async function crear(req, res) {
  const data = crearSchema.parse(req.body);
  const existente = await service.findByEmail(data.email);
  if (existente) throw new HttpError(409, 'El correo ya está registrado');
  const password_hash = await bcrypt.hash(data.password, 10);
  const id = await service.create({
    email: data.email,
    password_hash,
    nombre: data.nombre,
    rol: data.rol,
  });
  await notifService.crear(id, {
    tipo: 'usuario_creado',
    titulo: 'Bienvenido a App Sureste Sostenible',
    mensaje: `Se creó tu cuenta como ${data.rol}. Tu correo es ${data.email} y tu contraseña inicial es: ${data.password}. Te recomendamos cambiarla al iniciar sesión.`,
    url: '/login',
  });
  res.status(201).json({ id, email: data.email, rol: data.rol });
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const data = actualizarSchema.parse(req.body);

  const usuario = await service.findById(id);
  if (!usuario) throw new HttpError(404, 'Usuario no encontrado');

  if (id === req.user.sub && data.rol !== usuario.rol) {
    throw new HttpError(400, 'No puedes cambiar tu propio rol');
  }

  if (await service.existeEmailEnOtro(data.email, id)) {
    throw new HttpError(409, 'Ese correo ya está registrado en otro usuario');
  }

  await service.actualizar(id, data);

  const cambios = [];
  if (usuario.email !== data.email) cambios.push(`correo cambiado a ${data.email}`);
  if (usuario.nombre !== data.nombre) cambios.push(`nombre actualizado`);
  if (usuario.rol !== data.rol) cambios.push(`rol cambiado a ${data.rol}`);
  if (cambios.length && id !== req.user.sub) {
    await notifService.crear(id, {
      tipo: 'usuario_actualizado',
      titulo: 'Tu cuenta fue actualizada',
      mensaje: `El administrador actualizó tu cuenta: ${cambios.join(', ')}.`,
      url: '/',
    });
  }

  res.json({ ok: true });
}

async function setActivo(req, res) {
  const id = Number(req.params.id);
  const { activo } = z.object({ activo: z.boolean() }).parse(req.body);
  if (id === req.user.sub) throw new HttpError(400, 'No puedes desactivarte a ti mismo');
  await service.setActivo(id, activo);
  res.json({ ok: true });
}

async function resetPassword(req, res) {
  const id = Number(req.params.id);
  const { password } = passwordSchema.parse(req.body);
  const hash = await bcrypt.hash(password, 10);
  await service.actualizarPassword(id, hash);
  if (id !== req.user.sub) {
    await notifService.crear(id, {
      tipo: 'password_reset',
      titulo: 'Tu contraseña fue restablecida',
      mensaje: `El administrador restableció tu contraseña. Tu nueva contraseña es: ${password}. Te recomendamos cambiarla al iniciar sesión.`,
      url: '/login',
    });
  }
  res.json({ ok: true });
}

module.exports = { listar, crear, actualizar, setActivo, resetPassword };
