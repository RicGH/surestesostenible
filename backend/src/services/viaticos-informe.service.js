const { query, queryOne } = require('../config/db');

// Datos del "Informe de comisión con gastos y bitácoras" (1 por viático).
// El "Objetivo de la salida" ES el motivo del viático (viaticos_solicitudes.motivo):
// se lee de ahí y, al guardarlo desde el informe, se actualiza el motivo.

function parseKilometraje(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try { const arr = JSON.parse(v); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

async function obtener(solicitudId) {
  const row = await queryOne(
    `SELECT s.motivo AS objetivo, i.fecha_presentacion, i.nota, i.resumen, i.usa_vehiculo,
            i.vehiculo_marca, i.vehiculo_submarca, i.vehiculo_modelo, i.vehiculo_placa,
            i.kilometraje, i.ret_isr, i.monto_total, i.updated_at
     FROM viaticos_informe i
     JOIN viaticos_solicitudes s ON s.id = i.solicitud_id
     WHERE i.solicitud_id = ?`,
    [solicitudId]
  );
  if (!row) return null;
  return { ...row, usa_vehiculo: !!row.usa_vehiculo, kilometraje: parseKilometraje(row.kilometraje) };
}

// Campos que captura el colaborador (o administración en su nombre)
const CAMPOS_COLABORADOR = [
  'objetivo', 'fecha_presentacion', 'nota', 'resumen', 'usa_vehiculo',
  'vehiculo_marca', 'vehiculo_submarca', 'vehiculo_modelo', 'vehiculo_placa', 'kilometraje',
];
// Campos que solo llena administración
const CAMPOS_ADMIN = ['ret_isr', 'monto_total'];

/**
 * Crea o actualiza el informe. Solo se escriben los campos presentes en `data`;
 * `ret_isr` y `monto_total` únicamente si `esAdmin`.
 */
async function guardar(solicitudId, data, userId, { esAdmin = false } = {}) {
  // Objetivo de la salida = motivo del viático
  if (typeof data.objetivo === 'string' && data.objetivo.trim()) {
    await query('UPDATE viaticos_solicitudes SET motivo = ? WHERE id = ?', [data.objetivo.trim(), solicitudId]);
  }
  const permitidos = esAdmin ? [...CAMPOS_COLABORADOR, ...CAMPOS_ADMIN] : CAMPOS_COLABORADOR;
  const campos = permitidos.filter((c) => data[c] !== undefined);
  const valores = campos.map((c) => {
    if (c === 'kilometraje') return JSON.stringify(data.kilometraje || []);
    if (c === 'usa_vehiculo') return data.usa_vehiculo ? 1 : 0;
    return data[c] === '' ? null : data[c];
  });

  const cols = ['solicitud_id', ...campos, 'updated_by'];
  const placeholders = cols.map(() => '?').join(', ');
  const updates = [...campos, 'updated_by'].map((c) => `${c} = VALUES(${c})`).join(', ');
  await query(
    `INSERT INTO viaticos_informe (${cols.join(', ')}) VALUES (${placeholders})
     ON DUPLICATE KEY UPDATE ${updates}`,
    [solicitudId, ...valores, userId]
  );
  return obtener(solicitudId);
}

module.exports = { obtener, guardar };
