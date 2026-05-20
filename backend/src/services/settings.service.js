const { query, queryOne } = require('../config/db');

const KEY_EMAIL = 'email_smtp';

async function get(key) {
  const row = await queryOne('SELECT `value` FROM app_settings WHERE `key` = ?', [key]);
  if (!row) return null;
  if (typeof row.value === 'string') {
    try { return JSON.parse(row.value); } catch { return null; }
  }
  return row.value;
}

async function set(key, value) {
  await query(
    'INSERT INTO app_settings (`key`, `value`) VALUES (?, CAST(? AS JSON)) ON DUPLICATE KEY UPDATE `value` = CAST(? AS JSON)',
    [key, JSON.stringify(value), JSON.stringify(value)]
  );
}

async function remove(key) {
  await query('DELETE FROM app_settings WHERE `key` = ?', [key]);
}

async function getEmailConfig() {
  return get(KEY_EMAIL);
}

async function getEmailConfigPublic() {
  const cfg = await get(KEY_EMAIL);
  if (!cfg) return null;
  const { password, ...resto } = cfg;
  return { ...resto, password_set: !!password };
}

async function setEmailConfig(cfg) {
  await set(KEY_EMAIL, cfg);
}

async function removeEmailConfig() {
  await remove(KEY_EMAIL);
}

module.exports = { get, set, remove, getEmailConfig, getEmailConfigPublic, setEmailConfig, removeEmailConfig };
