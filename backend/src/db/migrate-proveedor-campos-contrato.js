require('dotenv').config();
const { pool, query } = require('../config/db');

(async () => {
  console.log('Agregando campos de contrato a proveedores...\n');

  const cols = [
    { name: 'fecha_nacimiento',  def: 'DATE NULL' },
    { name: 'estado_civil',      def: 'VARCHAR(60) NULL' },
    { name: 'nacionalidad',      def: 'VARCHAR(80) NULL DEFAULT "Mexicana"' },
    { name: 'codigo_postal',     def: 'VARCHAR(10) NULL' },
    { name: 'municipio',         def: 'VARCHAR(120) NULL' },
    { name: 'estado_republica',  def: 'VARCHAR(80) NULL' },
    { name: 'sucursal_banco',    def: 'VARCHAR(120) NULL' },
  ];

  for (const col of cols) {
    const [exists] = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'proveedores' AND COLUMN_NAME = ?`,
      [col.name]
    );
    if (!exists) {
      await query(`ALTER TABLE proveedores ADD COLUMN ${col.name} ${col.def}`);
      console.log(`  ✓ ${col.name}`);
    } else {
      console.log(`  · ${col.name} ya existe`);
    }
  }

  console.log('\nListo.');
  await pool.end();
})().catch(async (err) => {
  console.error('Error:', err);
  await pool.end();
  process.exit(1);
});
