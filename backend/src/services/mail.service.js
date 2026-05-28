const nodemailer = require('nodemailer');
const settings = require('./settings.service');

let _transporter = null;
let _config = null;

function plantilla({ titulo, mensaje, url, baseUrl }) {
  const cta = url
    ? `<p style="margin:24px 0;">
         <a href="${baseUrl}${url}" style="display:inline-block;padding:10px 18px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-family:Inter,sans-serif;font-size:14px;font-weight:600;">
           Ver detalle
         </a>
       </p>`
    : '';
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#0f172a,#312e81 60%,#4338ca);padding:24px 28px;color:#fff;">
          <strong style="font-size:14px;letter-spacing:0.5px;">App Sureste Sostenible</strong>
        </td></tr>
        <tr><td style="padding:28px;">
          <h2 style="margin:0 0 12px;font-size:18px;">${titulo}</h2>
          <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;">${mensaje}</p>
          ${cta}
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:12px;">
          Este correo fue generado automáticamente por la plataforma App Sureste Sostenible.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildTransporter(cfg) {
  return nodemailer.createTransport({
    host: cfg.host,
    port: Number(cfg.port),
    secure: !!cfg.secure,
    auth: cfg.user ? { user: cfg.user, pass: cfg.password } : undefined,
    tls: cfg.allow_self_signed ? { rejectUnauthorized: false } : undefined,
  });
}

async function getTransporter() {
  const cfg = await settings.getEmailConfig();
  if (!cfg || !cfg.activo) return null;
  if (!_transporter || JSON.stringify(_config) !== JSON.stringify(cfg)) {
    _transporter = buildTransporter(cfg);
    _config = cfg;
  }
  return _transporter;
}

function reset() {
  _transporter = null;
  _config = null;
}

async function verificar(cfg) {
  const t = buildTransporter(cfg);
  await t.verify();
}

async function enviar({ to, subject, text, html }) {
  const cfg = await settings.getEmailConfig();
  if (!cfg || !cfg.activo) return { skipped: true, reason: 'desactivado' };
  const t = await getTransporter();
  if (!t) return { skipped: true, reason: 'sin_config' };
  const from = cfg.from_name ? `"${cfg.from_name}" <${cfg.from_email}>` : cfg.from_email;
  return t.sendMail({ from, to, subject, text, html });
}

async function enviarPrueba(to) {
  const cfg = await settings.getEmailConfig();
  if (!cfg) throw new Error('No hay configuración SMTP guardada');
  const t = buildTransporter(cfg);
  await t.verify();
  const from = cfg.from_name ? `"${cfg.from_name}" <${cfg.from_email}>` : cfg.from_email;
  return t.sendMail({
    from,
    to,
    subject: 'Prueba de configuración · App Sureste Sostenible',
    text: 'Este es un correo de prueba enviado desde App Sureste Sostenible. Tu configuración SMTP está funcionando correctamente.',
    html: plantilla({
      titulo: 'Configuración exitosa',
      mensaje: 'Este correo confirma que tu configuración SMTP está funcionando correctamente. A partir de ahora la plataforma podrá enviar notificaciones por correo a los usuarios.',
      baseUrl: '',
    }),
  });
}

async function enviarNotificacion({ to, titulo, mensaje, url, baseUrl }) {
  return enviar({
    to,
    subject: titulo,
    text: `${mensaje}${url ? `\n\n${baseUrl}${url}` : ''}`,
    html: plantilla({ titulo, mensaje, url, baseUrl }),
  });
}

module.exports = { verificar, enviar, enviarPrueba, enviarNotificacion, reset };
