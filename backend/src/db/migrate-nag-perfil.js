// Agrega columna nag_perfil_ignorado a users para persistir el "Ya no molestar" del modal de perfil incompleto
require('dotenv').config();
const { query } = require('../config/db');

(async () => {
  try {
    await query(`
      ALTER TABLE users
      ADD COLUMN nag_perfil_ignorado TINYINT(1) NOT NULL DEFAULT 0
    `);
    console.log('✅ Columna nag_perfil_ignorado agregada a users');
  } catch (e) {
    if (e.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️  La columna ya existe, nada que hacer.');
    } else {
      console.error('❌ Error:', e.message);
      process.exit(1);
    }
  }
  process.exit(0);
})();
