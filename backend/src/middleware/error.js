const { ZodError } = require('zod');

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function notFound(req, res, next) {
  next(new HttpError(404, 'Ruta no encontrada'));
}

const FIELD_LABELS = {
  email: 'Correo',
  password: 'Contraseña',
  nombre: 'Nombre',
  rol: 'Rol',
  rfc: 'RFC',
  razon_social: 'Razón social',
  direccion: 'Dirección',
  banco: 'Banco',
  cuenta_clabe: 'CLABE',
  destino: 'Destino',
  fecha_inicio: 'Fecha de inicio',
  fecha_fin: 'Fecha fin',
  motivo: 'Motivo',
  monto: 'Monto',
  monto_vuelos: 'Vuelos',
  monto_hospedaje: 'Hospedaje',
  monto_alimentos: 'Alimentos',
  monto_transporte: 'Transporte',
  monto_otros: 'Otros',
  proyecto: 'Proyecto',
  cuenta: 'Cuenta',
  partida: 'Partida',
  host: 'Host',
  port: 'Puerto',
  user: 'Usuario',
  from_email: 'Correo del remitente',
  from_name: 'Nombre del remitente',
  referencia: 'Referencia',
};

function formatearZod(err) {
  return err.issues.map((i) => {
    const campo = i.path.length ? (FIELD_LABELS[i.path[i.path.length - 1]] || i.path.join('.')) : '';
    let msg = i.message;
    if (i.code === 'invalid_string' && i.validation === 'email') msg = 'no es un correo válido';
    else if (i.code === 'too_small') msg = i.type === 'string' ? `debe tener al menos ${i.minimum} caracteres` : `debe ser mayor o igual a ${i.minimum}`;
    else if (i.code === 'too_big') msg = i.type === 'string' ? `máximo ${i.maximum} caracteres` : `debe ser menor o igual a ${i.maximum}`;
    else if (i.code === 'invalid_type') msg = `es requerido`;
    return campo ? `${campo}: ${msg}` : msg;
  }).join(' · ');
}

function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: formatearZod(err),
      details: err.issues,
    });
  }
  if (err.errno === 1451) {
    return res.status(409).json({ error: 'No se puede eliminar: el registro está siendo usado en otras partes del sistema. Desactívalo en lugar de eliminarlo.' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'El archivo excede el tamaño máximo permitido (25 MB).',
    });
  }
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: err.message || 'Error interno',
    details: err.details,
  });
}

module.exports = { HttpError, notFound, errorHandler };
