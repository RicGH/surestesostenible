const { query, queryOne } = require('../config/db');

const TIPOS = ['proyecto', 'cuenta', 'partida', 'objetivo_estrategico', 'resultado', 'donante', 'banco'];

function esTipoValido(tipo) {
  return TIPOS.includes(tipo);
}

async function listar(tipo, { todos = false } = {}) {
  const where = ['tipo = ?'];
  const params = [tipo];
  if (!todos) where.push('activo = 1');
  return query(
    `SELECT id, tipo, nombre, activo, created_at
     FROM catalogos
     WHERE ${where.join(' AND ')}
     ORDER BY nombre ASC`,
    params
  );
}

async function findById(id) {
  return queryOne('SELECT id, tipo, nombre, activo FROM catalogos WHERE id = ?', [id]);
}

async function crear(tipo, nombre) {
  const result = await query(
    'INSERT INTO catalogos (tipo, nombre) VALUES (?, ?)',
    [tipo, nombre]
  );
  return result.insertId;
}

async function actualizar(id, { nombre, activo }) {
  const sets = [];
  const params = [];
  if (nombre !== undefined) { sets.push('nombre = ?'); params.push(nombre); }
  if (activo !== undefined) { sets.push('activo = ?'); params.push(activo ? 1 : 0); }
  if (!sets.length) return;
  params.push(id);
  await query(`UPDATE catalogos SET ${sets.join(', ')} WHERE id = ?`, params);
}

async function eliminar(id) {
  await query('DELETE FROM catalogos WHERE id = ?', [id]);
}

module.exports = { TIPOS, esTipoValido, listar, findById, crear, actualizar, eliminar };
