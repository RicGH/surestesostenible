const { z } = require('zod');
const { HttpError } = require('../middleware/error');
const plantillasService = require('../services/contratos-plantillas.service');
const contratosService = require('../services/contratos.service');
const proveedoresService = require('../services/proveedores.service');

const crearPlantillaSchema = z.object({
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(2000).optional().nullable(),
});

const generarSchema = z.object({
  plantilla_id: z.number().int().positive(),
  proveedor_id: z.number().int().positive(),
  valores_extra: z.record(z.string(), z.string()).optional(),
});

async function listarPlantillas(req, res) {
  res.json({ data: await plantillasService.listar() });
}

async function detallePlantilla(req, res) {
  const p = await plantillasService.findById(Number(req.params.id));
  if (!p) throw new HttpError(404, 'Plantilla de contrato no encontrada');
  res.json(p);
}

async function subirPlantilla(req, res) {
  if (!req.file) throw new HttpError(400, 'Debes adjuntar un archivo .docx');
  const data = crearPlantillaSchema.parse({
    nombre: req.body.nombre,
    descripcion: req.body.descripcion,
  });
  const relPath = `uploads/contratos-plantillas/${req.file.filename}`;
  const { id, etiquetas } = await plantillasService.crear({
    nombre: data.nombre,
    descripcion: data.descripcion,
    archivo_path: relPath,
    buffer: req.file.buffer,
    creado_por: req.user.sub,
  });
  res.status(201).json({ id, etiquetas });
}

async function eliminarPlantilla(req, res) {
  const p = await plantillasService.findById(Number(req.params.id));
  if (!p) throw new HttpError(404, 'Plantilla no encontrada');
  await plantillasService.eliminar(p.id);
  res.json({ ok: true });
}

async function generarContrato(req, res) {
  const data = generarSchema.parse(req.body);

  const plantilla = await plantillasService.findById(data.plantilla_id);
  if (!plantilla) throw new HttpError(404, 'Plantilla de contrato no encontrada');

  const proveedor = await proveedoresService.getById(data.proveedor_id);
  if (!proveedor) throw new HttpError(404, 'Proveedor no encontrado');

  try {
    const { documentoId, nombre } = await contratosService.generarContrato({
      plantilla,
      proveedor,
      valoresExtra: data.valores_extra || {},
      creadoPor: req.user.sub,
    });
    res.status(201).json({ documento_id: documentoId, nombre });
  } catch (err) {
    if (err.message?.includes('LibreOffice')) {
      throw new HttpError(500, 'No se pudo generar el PDF. Verifica que LibreOffice esté instalado en el servidor.');
    }
    throw err;
  }
}

module.exports = { listarPlantillas, detallePlantilla, subirPlantilla, eliminarPlantilla, generarContrato };
