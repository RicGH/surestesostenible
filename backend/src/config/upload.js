const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_ROOT = path.resolve(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_ROOT)) fs.mkdirSync(UPLOAD_ROOT, { recursive: true });

function makeStorage(subdir) {
  const dir = path.join(UPLOAD_ROOT, subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const id = crypto.randomBytes(8).toString('hex');
      cb(null, `${Date.now()}_${id}${ext}`);
    },
  });
}

const uploadGastos = multer({
  storage: makeStorage('gastos'),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // El comprobante debe ser imagen/PDF; el XML (CFDI) opcional solo acepta .xml
    const okArchivo = file.fieldname === 'archivo' && /\.(jpe?g|png|pdf)$/i.test(file.originalname);
    const okXml = file.fieldname === 'xml' && /\.xml$/i.test(file.originalname);
    const ok = okArchivo || okXml;
    if (ok) return cb(null, true);
    const err = new Error(file.fieldname === 'xml'
      ? 'El CFDI debe ser un archivo .xml'
      : 'El archivo del comprobante debe ser PDF, JPG o PNG (el XML va en "XML del CFDI")');
    err.status = 400;
    cb(err, false);
  },
});

const uploadFacturas = multer({
  storage: makeStorage('facturas'),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(pdf|xml)$/i.test(file.originalname);
    cb(ok ? null : new Error('Solo se permiten PDF o XML'), ok);
  },
});

const uploadComprobantes = multer({
  storage: makeStorage('comprobantes'),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const uploadJustificantes = multer({
  storage: makeStorage('justificantes'),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpe?g|png|pdf|docx?|xlsx?)$/i.test(file.originalname);
    cb(ok ? null : new Error('Solo se permiten imágenes, PDF, Word o Excel'), ok);
  },
});

const uploadAvatars = multer({
  storage: makeStorage('avatars'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(jpe?g|png|webp|gif)$/i.test(file.originalname);
    cb(ok ? null : new Error('La foto debe ser una imagen (JPG, PNG, WEBP o GIF)'), ok);
  },
});

const uploadDocsProveedor = multer({
  storage: makeStorage('proveedores'),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const uploadDocumentos = multer({
  storage: makeStorage('documentos'),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.pdf$/i.test(file.originalname);
    cb(ok ? null : new Error('Solo se permiten archivos PDF'), ok);
  },
});

const uploadDocx = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.docx?$/i.test(file.originalname);
    cb(ok ? null : new Error('Solo se permiten archivos .doc o .docx (Word).'), ok);
  },
});

// Multer 1.x entrega originalname decodificado como latin1, así que los nombres
// con acentos llegan como "ReuniÃ³n". Lo re-decodificamos como UTF-8; si el
// resultado no es UTF-8 válido, se deja el nombre tal como llegó.
function nombreOriginal(file) {
  const raw = file?.originalname;
  if (!raw) return null;
  const utf8 = Buffer.from(raw, 'latin1').toString('utf8');
  return (utf8.includes('�') ? raw : utf8).slice(0, 255);
}

module.exports = { UPLOAD_ROOT, nombreOriginal, uploadGastos, uploadFacturas, uploadComprobantes, uploadJustificantes, uploadAvatars, uploadDocsProveedor, uploadDocumentos, uploadDocx };
