const { query, queryOne, withTx } = require('../config/db');

async function getByUserId(userId) {
  return queryOne(
    `SELECT id, user_id, rfc, razon_social, direccion, banco, cuenta_clabe,
            documentacion, estado, motivo_rechazo, created_at,
            fecha_nacimiento, estado_civil, nacionalidad,
            codigo_postal, municipio, estado_republica, sucursal_banco
     FROM proveedores WHERE user_id = ?`,
    [userId]
  );
}

async function getById(id) {
  const row = await queryOne(
    `SELECT p.*,
            COALESCE(u.email, p.pending_email) AS email,
            COALESCE(u.nombre, p.pending_nombre) AS nombre,
            COALESCE(u.activo, 0) AS activo
     FROM proveedores p LEFT JOIN users u ON u.id = p.user_id
     WHERE p.id = ?`,
    [id]
  );
  if (row) delete row.pending_password_hash;
  return row;
}

async function emailEnUso(email) {
  const u = await queryOne('SELECT id FROM users WHERE email = ?', [email]);
  if (u) return true;
  const p = await queryOne(
    "SELECT id FROM proveedores WHERE pending_email = ? AND estado = 'pendiente'",
    [email]
  );
  return !!p;
}

async function actualizarCamposContrato(id, data) {
  await query(
    `UPDATE proveedores
     SET fecha_nacimiento = ?, estado_civil = ?, nacionalidad = ?,
         codigo_postal = ?, municipio = ?, estado_republica = ?, sucursal_banco = ?
     WHERE id = ?`,
    [
      data.fecha_nacimiento || null,
      data.estado_civil || null,
      data.nacionalidad || null,
      data.codigo_postal || null,
      data.municipio || null,
      data.estado_republica || null,
      data.sucursal_banco || null,
      id,
    ]
  );
}

// Alta de proveedor por admin SIN crear el usuario de login.
// Los datos del usuario (nombre, email, contraseña) quedan guardados como "pendientes";
// el usuario de la plataforma se crea recién al APROBAR el proveedor.
async function crearComoAdminPendiente({ email, password_hash, nombre, data }) {
  const result = await query(
    `INSERT INTO proveedores
     (user_id, rfc, razon_social, direccion, banco, cuenta_clabe, documentacion, estado,
      fecha_nacimiento, estado_civil, nacionalidad, codigo_postal, municipio, estado_republica, sucursal_banco,
      pending_nombre, pending_email, pending_password_hash)
     VALUES (NULL, ?, ?, ?, ?, ?, NULL, 'pendiente', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.rfc, data.razon_social, data.direccion || null, data.banco || null, data.cuenta_clabe || null,
      data.fecha_nacimiento || null, data.estado_civil || null, data.nacionalidad || null,
      data.codigo_postal || null, data.municipio || null, data.estado_republica || null, data.sucursal_banco || null,
      nombre, email, password_hash,
    ]
  );
  return result.insertId;
}

async function crear(userId, data, documentacion) {
  const result = await query(
    `INSERT INTO proveedores
     (user_id, rfc, razon_social, direccion, banco, cuenta_clabe, documentacion, estado,
      fecha_nacimiento, estado_civil, nacionalidad, codigo_postal, municipio, estado_republica, sucursal_banco)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId, data.rfc, data.razon_social, data.direccion || null, data.banco || null, data.cuenta_clabe || null, documentacion || null,
      data.fecha_nacimiento || null, data.estado_civil || null, data.nacionalidad || null,
      data.codigo_postal || null, data.municipio || null, data.estado_republica || null, data.sucursal_banco || null,
    ]
  );
  return result.insertId;
}

async function listarPendientes() {
  return query(
    `SELECT p.id, p.rfc, p.razon_social, p.direccion, p.banco, p.estado, p.created_at,
            COALESCE(u.email, p.pending_email) AS email,
            COALESCE(u.nombre, p.pending_nombre) AS nombre
     FROM proveedores p LEFT JOIN users u ON u.id = p.user_id
     WHERE p.estado = 'pendiente' ORDER BY p.created_at ASC`
  );
}

async function listarTodos(filtros = {}) {
  const where = [];
  const params = [];
  if (filtros.estado) { where.push('p.estado = ?'); params.push(filtros.estado); }
  if (filtros.activo === '1' || filtros.activo === '0') {
    where.push('COALESCE(u.activo, 0) = ?');
    params.push(filtros.activo === '1' ? 1 : 0);
  }
  const sql = `
    SELECT p.id, p.rfc, p.razon_social, p.estado,
           COALESCE(u.activo, 0) AS activo,
           COALESCE(u.email, p.pending_email) AS email,
           COALESCE(u.nombre, p.pending_nombre) AS nombre
    FROM proveedores p LEFT JOIN users u ON u.id = p.user_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY p.created_at DESC LIMIT 200`;
  return query(sql, params);
}

async function actualizar(id, data, documentacion) {
  const docSet = documentacion ? ', documentacion = ?' : '';
  const params = [
    data.rfc, data.razon_social,
    data.direccion || null, data.banco || null, data.cuenta_clabe || null,
    data.fecha_nacimiento || null, data.estado_civil || null, data.nacionalidad || null,
    data.codigo_postal || null, data.municipio || null, data.estado_republica || null,
    data.sucursal_banco || null,
  ];
  if (documentacion) params.push(documentacion);
  params.push(id);
  await query(
    `UPDATE proveedores
     SET rfc = ?, razon_social = ?, direccion = ?, banco = ?, cuenta_clabe = ?,
         fecha_nacimiento = ?, estado_civil = ?, nacionalidad = ?,
         codigo_postal = ?, municipio = ?, estado_republica = ?, sucursal_banco = ?${docSet}
     WHERE id = ?`,
    params
  );
  if (typeof data.activo === 'boolean') {
    await query(
      `UPDATE users u JOIN proveedores p ON p.user_id = u.id
       SET u.activo = ? WHERE p.id = ?`,
      [data.activo ? 1 : 0, id]
    );
  }
}

async function aprobar(id, adminId) {
  return withTx(async (conn) => {
    const [rows] = await conn.execute('SELECT * FROM proveedores WHERE id = ?', [id]);
    const prov = rows[0];
    if (!prov) return;

    if (prov.user_id) {
      // Proveedor con usuario existente (ej. auto-registro): solo aprobar y activar.
      await conn.execute(
        "UPDATE proveedores SET estado='aprobado', aprobado_por=?, aprobado_at=NOW(), motivo_rechazo=NULL WHERE id=?",
        [adminId, id]
      );
      await conn.execute("UPDATE users SET activo=1, rol='proveedor' WHERE id=?", [prov.user_id]);
      return;
    }

    // Proveedor sin usuario: ES AQUÍ donde se crea el login, a partir de los datos pendientes.
    const email = prov.pending_email;
    if (!email || !prov.pending_password_hash) {
      const e = new Error('PENDING_DATA_MISSING');
      e.code = 'PENDING_DATA_MISSING';
      throw e;
    }
    const [dup] = await conn.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (dup.length) {
      const e = new Error('EMAIL_TAKEN');
      e.code = 'EMAIL_TAKEN';
      throw e;
    }
    const [u] = await conn.execute(
      "INSERT INTO users (email, password_hash, nombre, rol, activo) VALUES (?, ?, ?, 'proveedor', 1)",
      [email, prov.pending_password_hash, prov.pending_nombre || email]
    );
    await conn.execute(
      `UPDATE proveedores
       SET user_id=?, estado='aprobado', aprobado_por=?, aprobado_at=NOW(), motivo_rechazo=NULL,
           pending_nombre=NULL, pending_email=NULL, pending_password_hash=NULL
       WHERE id=?`,
      [u.insertId, adminId, id]
    );
  });
}

async function rechazar(id, adminId, motivo) {
  await query(
    "UPDATE proveedores SET estado='rechazado', aprobado_por=?, aprobado_at=NOW(), motivo_rechazo=? WHERE id=? AND estado='pendiente'",
    [adminId, motivo, id]
  );
}

module.exports = { getByUserId, getById, emailEnUso, crear, crearComoAdminPendiente, actualizar, actualizarCamposContrato, listarPendientes, listarTodos, aprobar, rechazar };
