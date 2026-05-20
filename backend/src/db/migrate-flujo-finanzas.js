require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Migrando flujo finanzas + ajustes...\n');

  // 1. Agregar 'pagado' al ENUM si no existe
  const [estadoCol] = await query(
    `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'viaticos_solicitudes'
       AND COLUMN_NAME = 'estado'`
  );
  if (estadoCol && !estadoCol.COLUMN_TYPE.includes("'pagado'")) {
    await query(
      `ALTER TABLE viaticos_solicitudes
       MODIFY COLUMN estado ENUM('pendiente','aprobado','pagado','rechazado','en_proceso','cerrado','cancelado')
       NOT NULL DEFAULT 'pendiente'`
    );
    console.log('  ✓ Estado pagado agregado al ENUM');
  } else {
    console.log('  · Estado pagado ya existe');
  }

  // 2. Crear tabla viaticos_pagos
  await query(`
    CREATE TABLE IF NOT EXISTS viaticos_pagos (
      id                 INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      solicitud_id       INT UNSIGNED NOT NULL,
      ajuste_id          INT UNSIGNED NULL,
      monto              DECIMAL(12,2) NOT NULL,
      fecha_pago         DATETIME NOT NULL,
      comprobante_path   VARCHAR(500) NOT NULL,
      referencia         VARCHAR(80),
      pagado_por         INT UNSIGNED,
      created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_vpago_solicitud FOREIGN KEY (solicitud_id) REFERENCES viaticos_solicitudes(id) ON DELETE CASCADE,
      CONSTRAINT fk_vpago_user FOREIGN KEY (pagado_por) REFERENCES users(id) ON DELETE SET NULL,
      KEY idx_vpago_solicitud (solicitud_id),
      KEY idx_vpago_ajuste (ajuste_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✓ Tabla viaticos_pagos lista');

  // 3. Crear tabla viaticos_ajustes
  await query(`
    CREATE TABLE IF NOT EXISTS viaticos_ajustes (
      id                 INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
      solicitud_id       INT UNSIGNED NOT NULL,
      motivo             TEXT NOT NULL,
      monto_vuelos       DECIMAL(12,2) NOT NULL DEFAULT 0,
      monto_hospedaje    DECIMAL(12,2) NOT NULL DEFAULT 0,
      monto_alimentos    DECIMAL(12,2) NOT NULL DEFAULT 0,
      monto_transporte   DECIMAL(12,2) NOT NULL DEFAULT 0,
      monto_otros        DECIMAL(12,2) NOT NULL DEFAULT 0,
      monto_total        DECIMAL(12,2) NOT NULL DEFAULT 0,
      estado             ENUM('pendiente','aprobado','pagado','rechazado') NOT NULL DEFAULT 'pendiente',
      motivo_rechazo     VARCHAR(500),
      aprobado_por       INT UNSIGNED,
      aprobado_at        DATETIME,
      created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_vaj_solicitud FOREIGN KEY (solicitud_id) REFERENCES viaticos_solicitudes(id) ON DELETE CASCADE,
      CONSTRAINT fk_vaj_aprobador FOREIGN KEY (aprobado_por) REFERENCES users(id) ON DELETE SET NULL,
      KEY idx_vaj_solicitud (solicitud_id),
      KEY idx_vaj_estado (estado)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✓ Tabla viaticos_ajustes lista');

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error en migración:', err);
  await pool.end();
  process.exit(1);
});
