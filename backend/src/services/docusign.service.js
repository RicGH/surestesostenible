const fs = require('fs');
const path = require('path');
const docusign = require('docusign-esign');

const SCOPES = ['signature', 'impersonation'];
const TOKEN_TTL_SAFETY_MS = 5 * 60 * 1000;

let _accessToken = null;
let _accessTokenExpiresAt = 0;
let _apiClient = null;

function getEnv() {
  const cfg = {
    integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY,
    userId: process.env.DOCUSIGN_USER_ID,
    accountId: process.env.DOCUSIGN_ACCOUNT_ID,
    baseUri: process.env.DOCUSIGN_BASE_URI,
    authServer: process.env.DOCUSIGN_AUTH_SERVER || 'account.docusign.com',
    privateKeyPath: process.env.DOCUSIGN_PRIVATE_KEY_PATH,
  };
  const faltan = Object.entries(cfg).filter(([, v]) => !v).map(([k]) => k);
  if (faltan.length) {
    throw new Error(`DocuSign sin configurar. Variables faltantes: ${faltan.join(', ')}`);
  }
  return cfg;
}

function leerPrivateKey(privateKeyPath) {
  const abs = path.isAbsolute(privateKeyPath)
    ? privateKeyPath
    : path.resolve(__dirname, '..', '..', privateKeyPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`No se encontró la clave privada de DocuSign en ${abs}`);
  }
  return fs.readFileSync(abs);
}

async function obtenerAccessToken() {
  if (_accessToken && Date.now() < _accessTokenExpiresAt - TOKEN_TTL_SAFETY_MS) {
    return _accessToken;
  }
  const cfg = getEnv();
  const apiClient = new docusign.ApiClient({ basePath: 'https://www.docusign.net/restapi' });
  apiClient.setOAuthBasePath(cfg.authServer);

  const privateKey = leerPrivateKey(cfg.privateKeyPath);

  let result;
  try {
    result = await apiClient.requestJWTUserToken(
      cfg.integrationKey,
      cfg.userId,
      SCOPES,
      privateKey,
      3600
    );
  } catch (err) {
    const body = err.response && err.response.body;
    if (body && body.error === 'consent_required') {
      const consentUrl =
        `https://${cfg.authServer}/oauth/auth?response_type=code` +
        `&scope=${encodeURIComponent(SCOPES.join(' '))}` +
        `&client_id=${cfg.integrationKey}` +
        `&redirect_uri=${encodeURIComponent(process.env.APP_BASE_URL || 'http://localhost:3000')}`;
      const e = new Error(
        `DocuSign requiere consentimiento del usuario. Abre esta URL en el navegador (logueado como el usuario de la cuenta) y acepta:\n${consentUrl}`
      );
      e.code = 'DOCUSIGN_CONSENT_REQUIRED';
      e.consentUrl = consentUrl;
      throw e;
    }
    throw err;
  }

  _accessToken = result.body.access_token;
  _accessTokenExpiresAt = Date.now() + result.body.expires_in * 1000;
  return _accessToken;
}

async function obtenerApiClient() {
  const cfg = getEnv();
  const token = await obtenerAccessToken();
  if (!_apiClient) {
    _apiClient = new docusign.ApiClient();
    _apiClient.setBasePath(`${cfg.baseUri}/restapi`);
  }
  _apiClient.addDefaultHeader('Authorization', `Bearer ${token}`);
  return { apiClient: _apiClient, accountId: cfg.accountId };
}

function construirRecipients(firmantes, tagsPorFirmante) {
  return firmantes.map((f, idx) => {
    const tags = tagsPorFirmante[f.id] || [];
    const signHereTabs = [];
    const initialHereTabs = [];
    const dateSignedTabs = [];
    const textTabs = [];

    tags.forEach((t) => {
      const baseTab = {
        documentId: '1',
        pageNumber: String(t.pagina),
        xPosition: String(Math.round(t.x)),
        yPosition: String(Math.round(t.y)),
        width: String(Math.round(t.ancho || 140)),
        height: String(Math.round(t.alto || 40)),
        recipientId: String(idx + 1),
        tabLabel: `${t.tipo}_${t.id}`,
      };
      if (t.tipo === 'firma') signHereTabs.push(baseTab);
      else if (t.tipo === 'iniciales') initialHereTabs.push(baseTab);
      else if (t.tipo === 'fecha') dateSignedTabs.push(baseTab);
      else if (t.tipo === 'texto') textTabs.push({ ...baseTab, required: 'true' });
    });

    return docusign.Signer.constructFromObject({
      email: f.email,
      name: f.nombre,
      recipientId: String(idx + 1),
      routingOrder: String(f.orden || idx + 1),
      clientUserId: undefined,
      tabs: docusign.Tabs.constructFromObject({
        signHereTabs,
        initialHereTabs,
        dateSignedTabs,
        textTabs,
      }),
    });
  });
}

async function crearYEnviarEnvelope({ documento, firmantes, tagsPorFirmante }) {
  const { apiClient, accountId } = await obtenerApiClient();
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  const pdfPath = path.isAbsolute(documento.archivo_path)
    ? documento.archivo_path
    : path.resolve(__dirname, '..', '..', documento.archivo_path);
  const pdfBytes = fs.readFileSync(pdfPath);

  const doc = docusign.Document.constructFromObject({
    documentBase64: pdfBytes.toString('base64'),
    name: documento.nombre,
    fileExtension: 'pdf',
    documentId: '1',
  });

  const signers = construirRecipients(firmantes, tagsPorFirmante);

  const envelopeDefinition = docusign.EnvelopeDefinition.constructFromObject({
    emailSubject: documento.asunto_correo || `Firma requerida: ${documento.nombre}`,
    emailBlurb: documento.mensaje_correo || 'Por favor revisa y firma este documento.',
    documents: [doc],
    recipients: docusign.Recipients.constructFromObject({ signers }),
    status: 'sent',
  });

  const result = await envelopesApi.createEnvelope(accountId, { envelopeDefinition });
  return { envelopeId: result.envelopeId, status: result.status };
}

async function obtenerEstado(envelopeId) {
  const { apiClient, accountId } = await obtenerApiClient();
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  const envelope = await envelopesApi.getEnvelope(accountId, envelopeId);
  return { status: envelope.status, completedDateTime: envelope.completedDateTime };
}

async function descargarPdfFirmado(envelopeId) {
  const { apiClient, accountId } = await obtenerApiClient();
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  return envelopesApi.getDocument(accountId, envelopeId, 'combined');
}

async function cancelarEnvelope(envelopeId, motivo) {
  const { apiClient, accountId } = await obtenerApiClient();
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  const update = docusign.Envelope.constructFromObject({
    status: 'voided',
    voidedReason: motivo || 'Cancelado desde App Sureste Sostenible',
  });
  return envelopesApi.update(accountId, envelopeId, { envelope: update });
}

function mapearEstadoDocusign(estadoDS) {
  const m = {
    created: 'borrador',
    sent: 'enviado',
    delivered: 'enviado',
    completed: 'firmado',
    declined: 'declinado',
    voided: 'cancelado',
  };
  return m[estadoDS] || 'enviado';
}

function reset() {
  _accessToken = null;
  _accessTokenExpiresAt = 0;
  _apiClient = null;
}

module.exports = {
  obtenerAccessToken,
  crearYEnviarEnvelope,
  obtenerEstado,
  descargarPdfFirmado,
  cancelarEnvelope,
  mapearEstadoDocusign,
  reset,
};
