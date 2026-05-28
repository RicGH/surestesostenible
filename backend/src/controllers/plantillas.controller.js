const { z } = require('zod');
const { HttpError } = require('../middleware/error');
const service = require('../services/plantillas.service');

const campoSchema = z.object({
  nombre: z.string().min(1).max(80),
  label: z.string().min(1).max(160),
  tipo: z.enum(['texto', 'numero', 'fecha', 'email', 'telefono']).optional(),
  requerido: z.boolean().optional(),
});

const baseSchema = z.object({
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(2000).optional().nullable(),
  contenido_html: z.string().min(1),
  campos_json: z.array(campoSchema).optional(),
  asunto_correo: z.string().max(200).optional().nullable(),
  mensaje_correo: z.string().max(2000).optional().nullable(),
});

async function listar(req, res) {
  res.json({ data: await service.listar(req.query) });
}

async function detalle(req, res) {
  const p = await service.findById(Number(req.params.id));
  if (!p) throw new HttpError(404, 'Plantilla no encontrada');
  res.json(p);
}

async function crear(req, res) {
  const data = baseSchema.parse(req.body);
  const id = await service.crear({ ...data, creado_por: req.user.sub });
  res.status(201).json({ id });
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const data = baseSchema.parse(req.body);
  await service.actualizar(id, data);
  res.json({ ok: true });
}

async function eliminar(req, res) {
  await service.eliminar(Number(req.params.id));
  res.json({ ok: true });
}

module.exports = { listar, detalle, crear, actualizar, eliminar };
