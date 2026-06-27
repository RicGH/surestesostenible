const z = require('zod');
const svc = require('../services/cuentasBancarias.service');

const cuentaSchema = z.object({
  clabe_bancaria: z.string().min(1).max(18),
  banco: z.string().max(120).optional().default(''),
});

async function listar(req, res) {
  const data = await svc.listarPorUsuario(req.user.sub);
  res.json({ data });
}

async function agregar(req, res) {
  const { clabe_bancaria, banco } = cuentaSchema.parse(req.body);
  await svc.guardarSiNueva(req.user.sub, clabe_bancaria, banco);
  res.json({ ok: true });
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const ok = await svc.eliminar(id, req.user.sub);
  if (!ok) return res.status(404).json({ error: 'No encontrado' });
  res.json({ ok: true });
}

// Admin: ver/guardar cuentas de cualquier usuario
async function listarDeUsuario(req, res) {
  const data = await svc.listarPorUsuario(Number(req.params.id));
  res.json({ data });
}

async function guardarParaUsuario(req, res) {
  const { clabe_bancaria, banco } = cuentaSchema.parse(req.body);
  await svc.guardarSiNueva(Number(req.params.id), clabe_bancaria, banco);
  res.json({ ok: true });
}

module.exports = { listar, agregar, eliminar, listarDeUsuario, guardarParaUsuario };
