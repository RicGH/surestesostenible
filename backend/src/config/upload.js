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
    const ok = /\.(jpe?g|png|pdf)$/i.test(file.originalname);
    cb(ok ? null : new Error('Solo se permiten imágenes o PDF'), ok);
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

const uploadDocsProveedor = multer({
  storage: makeStorage('proveedores'),
  limits: { fileSize: 25 * 1024 * 1024 },
});

module.exports = { UPLOAD_ROOT, uploadGastos, uploadFacturas, uploadComprobantes, uploadDocsProveedor };
