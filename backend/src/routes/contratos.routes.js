const router = require('express').Router();
const ctrl = require('../controllers/contratos.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

router.use(verifyToken, requireRole('admin'));

// Disk storage for DOCX templates
const uploadDir = path.resolve(__dirname, '..', '..', 'uploads', 'contratos-plantillas');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const uploadPlantilla = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.docx?$/i.test(file.originalname);
    cb(ok ? null : new Error('Solo se permiten archivos .doc o .docx'), ok);
  },
});

// Store to disk after parsing (need buffer for etiqueta extraction)
const saveToDisk = (req, res, next) => {
  if (!req.file) return next();
  const ext = path.extname(req.file.originalname).toLowerCase();
  const filename = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${ext}`;
  const abs = path.join(uploadDir, filename);
  fs.writeFileSync(abs, req.file.buffer);
  req.file.filename = filename;
  next();
};

router.get('/plantillas', asyncHandler(ctrl.listarPlantillas));
router.post('/plantillas', uploadPlantilla.single('archivo'), saveToDisk, asyncHandler(ctrl.subirPlantilla));
router.get('/plantillas/:id', asyncHandler(ctrl.detallePlantilla));
router.delete('/plantillas/:id', asyncHandler(ctrl.eliminarPlantilla));
router.post('/generar', asyncHandler(ctrl.generarContrato));

module.exports = router;
