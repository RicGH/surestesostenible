const { z } = require('zod');
const { HttpError } = require('../middleware/error');
const service = require('../services/catalogos.service');

function validarTipo(tipo) {
  if (!service.esTipoValido(tipo)) {
    throw new HttpError(400, `Tipo de catálogo inválido. Usa: ${service.TIPOS.join(', ')}`);
  }
}

async function listar(req, res) {
  const tipo = req.query.tipo;
  validarTipo(tipo);
  // Solo admin puede ver inactivos (para gestión); el resto solo activos (selectores).
  const todos = req.user.rol === 'admin' && req.query.todos === '1';
  res.json({ data: await service.listar(tipo, { todos }) });
}

const crearSchema = z.object({
  tipo: z.string(),
  nombre: z.string().trim().min(1).max(160),
});

async function crear(req, res) {
  const data = crearSchema.parse(req.body);
  validarTipo(data.tipo);
  try {
    const id = await service.crear(data.tipo, data.nombre);
    res.status(201).json({ id });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Ya existe un registro con ese nombre en este catálogo.');
    throw err;
  }
}

const actualizarSchema = z.object({
  nombre: z.string().trim().min(1).max(160).optional(),
  activo: z.coerce.boolean().optional(),
});

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const item = await service.findById(id);
  if (!item) throw new HttpError(404, 'Registro no encontrado');
  const data = actualizarSchema.parse(req.body);
  try {
    await service.actualizar(id, data);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Ya existe un registro con ese nombre en este catálogo.');
    throw err;
  }
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const item = await service.findById(id);
  if (!item) throw new HttpError(404, 'Registro no encontrado');
  await service.eliminar(id);
  res.json({ ok: true });
}

module.exports = { listar, crear, actualizar, eliminar };
