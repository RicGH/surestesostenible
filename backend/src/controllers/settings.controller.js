const { z } = require('zod');
const { HttpError } = require('../middleware/error');
const settings = require('../services/settings.service');
const mail = require('../services/mail.service');
const users = require('../services/users.service');

const emailSchema = z.object({
  host: z.string().min(2).max(160),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean().default(false),
  user: z.string().max(160).optional().or(z.literal('')),
  password: z.string().max(255).optional().or(z.literal('')),
  from_email: z.string().email(),
  from_name: z.string().max(120).optional().or(z.literal('')),
  allow_self_signed: z.boolean().default(false),
  activo: z.boolean().default(true),
});

async function getEmail(req, res) {
  const cfg = await settings.getEmailConfigPublic();
  res.json({ data: cfg });
}

async function setEmail(req, res) {
  const input = emailSchema.parse(req.body);
  const existente = await settings.getEmailConfig();

  // Si no envía password y ya había una guardada, conservarla
  if (!input.password && existente?.password) {
    input.password = existente.password;
  }

  await settings.setEmailConfig(input);
  mail.reset();
  res.json({ ok: true });
}

async function deleteEmail(req, res) {
  await settings.removeEmailConfig();
  mail.reset();
  res.json({ ok: true });
}

async function probar(req, res) {
  const { to } = z.object({ to: z.string().email().optional() }).parse(req.body || {});
  let destino = to;
  if (!destino) {
    const u = await users.findById(req.user.sub);
    destino = u?.email;
  }
  if (!destino) throw new HttpError(400, 'No se pudo determinar el correo destino');

  try {
    await mail.enviarPrueba(destino);
    res.json({ ok: true, destino });
  } catch (e) {
    throw new HttpError(400, `Error al enviar: ${e.message}`);
  }
}

module.exports = { getEmail, setEmail, deleteEmail, probar };
