require('dotenv').config();
const path = require('path');
const { pool, query } = require('../config/db');
const { parseCfdi } = require('../utils/cfdi-parser');

// Informe de comisión con gastos y bitácoras (7.1):
//  - viaticos_informe: datos que captura el colaborador (objetivo, fecha de
//    presentación, nota, resumen y bitácora de kilometraje) y los que llena
//    administración (retención de ISR y monto total).
//  - viaticos_gastos.folio_fiscal: "Fact. o rec. núm." (UUID del CFDI).
(async () => {
  console.log('Migrando informe de comisión...\n');

  await query(`
    CREATE TABLE IF NOT EXISTS viaticos_informe (
      solicitud_id        INT UNSIGNED PRIMARY KEY,
      objetivo            TEXT NULL,
      fecha_presentacion  DATE NULL,
      nota                TEXT NULL,
      resumen             TEXT NULL,
      usa_vehiculo        TINYINT(1) NOT NULL DEFAULT 0,
      vehiculo_marca      VARCHAR(80) NULL,
      vehiculo_submarca   VARCHAR(80) NULL,
      vehiculo_modelo     VARCHAR(80) NULL,
      vehiculo_placa      VARCHAR(30) NULL,
      kilometraje         JSON NULL,
      ret_isr             DECIMAL(12,2) NULL,
      monto_total         DECIMAL(12,2) NULL,
      updated_by          INT UNSIGNED NULL,
      created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_informe_solicitud
        FOREIGN KEY (solicitud_id) REFERENCES viaticos_solicitudes(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  console.log('  ✓ Tabla viaticos_informe');

  const [existe] = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'viaticos_gastos' AND COLUMN_NAME = 'folio_fiscal'`
  );
  if (existe) {
    console.log('  · viaticos_gastos.folio_fiscal ya existe');
  } else {
    await query('ALTER TABLE viaticos_gastos ADD COLUMN folio_fiscal VARCHAR(64) NULL AFTER xml_nombre_original');
    console.log('  ✓ viaticos_gastos.folio_fiscal');
  }

  // Rellena el folio fiscal de los comprobantes que ya tienen XML
  const uploads = path.resolve(__dirname, '..', '..', 'uploads');
  const pendientes = await query(
    'SELECT id, xml_path FROM viaticos_gastos WHERE xml_path IS NOT NULL AND folio_fiscal IS NULL'
  );
  let llenados = 0;
  for (const g of pendientes) {
    try {
      const { uuid } = parseCfdi(path.join(uploads, g.xml_path));
      if (uuid) {
        await query('UPDATE viaticos_gastos SET folio_fiscal = ? WHERE id = ?', [uuid.toUpperCase(), g.id]);
        llenados++;
      }
    } catch (e) {
      console.log(`  · gasto ${g.id}: no se pudo leer el XML (${e.message})`);
    }
  }
  console.log(`  ✓ Folio fiscal obtenido del XML en ${llenados} de ${pendientes.length} comprobante(s)`);

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
