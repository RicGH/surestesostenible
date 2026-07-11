const { HttpError } = require('../middleware/error');
const service = require('../services/firma-interna.service');

async function enviar(req, res) {
  const documentoId = Number(req.params.id);
  if (!documentoId) throw new HttpError(400, 'ID inválido');
  const result = await service.enviarInterno(documentoId);
  res.json(result);
}

async function getSesion(req, res) {
  const { token } = req.params;
  const sesion = await service.obtenerSesion(token);
  if (!sesion) throw new HttpError(404, 'Enlace de firma no válido o expirado');
  res.json(sesion);
}

async function getPdf(req, res) {
  const { token } = req.params;
  const buffer = await service.streamPdf(token);
  if (!buffer) throw new HttpError(404, 'PDF no encontrado');
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', 'inline');
  res.send(buffer);
}

async function firmar(req, res) {
  const { token } = req.params;
  const { firmas } = req.body;
  if (!firmas || typeof firmas !== 'object') throw new HttpError(400, 'Datos de firma inválidos');
  const result = await service.procesarFirma(token, firmas);
  res.json(result);
}

module.exports = { enviar, getSesion, getPdf, firmar };
