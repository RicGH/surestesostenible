const bcrypt = require('bcrypt');
const path = require('path');
const { z } = require('zod');
const { HttpError } = require('../middleware/error');
const { UPLOAD_ROOT } = require('../config/upload');
const { sign } = require('../utils/jwt');
const usersService = require('../services/users.service');
const notifService = require('../services/notificaciones.service');
const passwordReset = require('../services/password-reset.service');
const mail = require('../services/mail.service');

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerProveedorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(2).max(120),
});

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ token: z.string().min(8), password: z.string().min(8) });

async function login(req, res) {
  const data = loginSchema.parse(req.body);
  const user = await usersService.findByEmail(data.email);
  if (!user || !user.activo) {
    throw new HttpError(401, 'Credenciales inválidas');
  }
  const ok = await bcrypt.compare(data.password, user.password_hash);
  if (!ok) {
    throw new HttpError(401, 'Credenciales inválidas');
  }
  const token = sign({ sub: user.id, rol: user.rol, nombre: user.nombre });
  res.json({
    token,
    user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
  });
}

async function registerProveedor(req, res) {
  const data = registerProveedorSchema.parse(req.body);
  const exists = await usersService.findByEmail(data.email);
  if (exists) throw new HttpError(409, 'El correo ya está registrado');
  const password_hash = await bcrypt.hash(data.password, 10);
  const id = await usersService.create({
    email: data.email,
    password_hash,
    nombre: data.nombre,
    rol: 'proveedor',
  });
  await notifService.crearParaRol('admin', {
    tipo: 'proveedor_signup',
    titulo: 'Nuevo proveedor registrado',
    mensaje: `${data.nombre} (${data.email}) creó una cuenta de proveedor. Falta que complete sus datos fiscales.`,
    url: '/admin/usuarios',
  });
  res.status(201).json({ id, email: data.email, rol: 'proveedor' });
}

async function me(req, res) {
  const user = await usersService.findById(req.user.sub);
  if (!user) throw new HttpError(404, 'Usuario no encontrado');
  res.json({ user });
}

const perfilSchema = z.object({
  nombre: z.string().min(2).max(120),
  rfc: z.string().max(20).optional().or(z.literal('')),
  clabe_bancaria: z.string().max(40).optional().or(z.literal('')),
  banco: z.string().max(120).optional().or(z.literal('')),
});

async function actualizarPerfil(req, res) {
  const data = perfilSchema.parse(req.body);
  await usersService.actualizarPerfil(req.user.sub, {
    nombre: data.nombre,
    rfc: data.rfc || null,
    clabe_bancaria: data.clabe_bancaria || null,
    banco: data.banco || null,
  });
  const user = await usersService.findById(req.user.sub);
  res.json({ user });
}

const cambiarPasswordSchema = z.object({
  actual: z.string().min(1),
  nueva: z.string().min(8),
});

async function subirAvatar(req, res) {
  if (!req.file) throw new HttpError(400, 'No se recibió ninguna imagen');
  const avatarPath = `avatars/${req.file.filename}`;
  await usersService.setAvatar(req.user.sub, avatarPath);
  const user = await usersService.findById(req.user.sub);
  res.json({ user });
}

async function eliminarAvatar(req, res) {
  await usersService.setAvatar(req.user.sub, null);
  res.json({ ok: true });
}

async function descargarAvatar(req, res) {
  const user = await usersService.findById(req.user.sub);
  if (!user || !user.avatar_path) throw new HttpError(404, 'Sin foto de perfil');
  res.sendFile(path.join(UPLOAD_ROOT, user.avatar_path));
}

async function cambiarPassword(req, res) {
  const data = cambiarPasswordSchema.parse(req.body);
  const user = await usersService.findByIdConPassword(req.user.sub);
  if (!user) throw new HttpError(404, 'Usuario no encontrado');
  const ok = await bcrypt.compare(data.actual, user.password_hash);
  if (!ok) throw new HttpError(400, 'La contraseña actual no es correcta');
  const hash = await bcrypt.hash(data.nueva, 10);
  await usersService.actualizarPassword(req.user.sub, hash);
  res.json({ ok: true });
}

async function forgotPassword(req, res) {
  const { email } = forgotSchema.parse(req.body);
  const user = await usersService.findByEmail(email);

  // No reveles si el correo existe o no, por seguridad
  if (user && user.activo) {
    const token = await passwordReset.crearToken(user.id);
    const link = `${APP_BASE_URL}/reset-password?token=${token}`;
    setImmediate(async () => {
      try {
        await mail.enviar({
          to: user.email,
          subject: 'Recuperación de contraseña · App Sureste Sostenible',
          text: `Hola ${user.nombre},\n\nSolicitaste restablecer tu contraseña. Visita este enlace para crear una nueva:\n\n${link}\n\nEl enlace expira en ${passwordReset.TOKEN_TTL_MINUTOS} minutos.\n\nSi no fuiste tú, ignora este correo.`,
          html: plantillaReset({ nombre: user.nombre, link, ttl: passwordReset.TOKEN_TTL_MINUTOS }),
        });
      } catch (err) {
        console.error('[forgot-password] Error enviando correo:', err.message);
      }
    });
  }

  res.json({ ok: true, message: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.' });
}

async function resetPassword(req, res) {
  const { token, password } = resetSchema.parse(req.body);
  const reset = await passwordReset.validarToken(token);
  if (!reset) throw new HttpError(400, 'El enlace expiró o no es válido. Solicita uno nuevo.');

  const hash = await bcrypt.hash(password, 10);
  await usersService.actualizarPassword(reset.user_id, hash);
  await passwordReset.usarToken(reset.id);

  await notifService.crear(reset.user_id, {
    tipo: 'password_cambiado',
    titulo: 'Tu contraseña fue restablecida',
    mensaje: 'Acabas de cambiar tu contraseña. Si no fuiste tú, contacta al administrador inmediatamente.',
    url: '/login',
  });

  res.json({ ok: true });
}

async function validarTokenReset(req, res) {
  const reset = await passwordReset.validarToken(req.query.token);
  res.json({ valido: !!reset, email: reset ? reset.email : null });
}

function plantillaReset({ nombre, link, ttl }) {
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
      <tr><td style="background:linear-gradient(135deg,#0f172a,#312e81 60%,#4338ca);padding:24px 28px;color:#fff;">
        <strong style="font-size:14px;letter-spacing:0.5px;">App Sureste Sostenible</strong>
      </td></tr>
      <tr><td style="padding:28px;">
        <h2 style="margin:0 0 12px;font-size:18px;">Restablece tu contraseña</h2>
        <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">Hola ${nombre}, recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón para crear una nueva.</p>
        <p style="margin:24px 0;">
          <a href="${link}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-family:Inter,sans-serif;font-size:14px;font-weight:600;">Restablecer contraseña</a>
        </p>
        <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">El enlace expira en ${ttl} minutos. Si no solicitaste este cambio, ignora este correo.</p>
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;word-break:break-all;">${link}</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

async function impersonate(req, res) {
  const targetId = Number(req.params.userId);
  if (!targetId) throw new HttpError(400, 'Usuario no válido');
  if (targetId === req.user.sub) throw new HttpError(400, 'No puedes impersonar tu propia cuenta');
  const target = await usersService.findById(targetId);
  if (!target || !target.activo) throw new HttpError(404, 'Usuario no encontrado o inactivo');
  if (target.rol === 'admin') throw new HttpError(403, 'No se puede impersonar a otro administrador');

  const token = sign({
    sub: target.id,
    rol: target.rol,
    nombre: target.nombre,
    impersonatedBy: req.user.sub,
    impersonatorName: req.user.nombre,
  });
  console.log(`[impersonate] admin=${req.user.sub} (${req.user.nombre}) → user=${target.id} (${target.email})`);
  res.json({
    token,
    user: { id: target.id, email: target.email, nombre: target.nombre, rol: target.rol },
    impersonatedBy: { id: req.user.sub, nombre: req.user.nombre },
  });
}

module.exports = { login, registerProveedor, me, actualizarPerfil, cambiarPassword, subirAvatar, eliminarAvatar, descargarAvatar, forgotPassword, resetPassword, validarTokenReset, impersonate };
