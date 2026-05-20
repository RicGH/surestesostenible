const router = require('express').Router();
const ctrl = require('../controllers/facturas.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadFacturas, uploadComprobantes } = require('../config/upload');
const asyncHandler = require('../utils/asyncHandler');

router.use(verifyToken);

router.post('/preview-xml', requireRole('admin', 'proveedor'), uploadFacturas.single('xml'), asyncHandler(ctrl.preview));
router.post('/', requireRole('admin', 'proveedor'),
  uploadFacturas.fields([{ name: 'pdf', maxCount: 1 }, { name: 'xml', maxCount: 1 }]),
  asyncHandler(ctrl.subir));
router.get('/mias', requireRole('admin', 'proveedor'), asyncHandler(ctrl.misFacturas));
router.get('/admin', requireRole('admin', 'finanzas'), asyncHandler(ctrl.listarAdmin));
router.get('/:id', requireRole('admin', 'finanzas', 'proveedor'), asyncHandler(ctrl.detalle));
router.post('/:id/aprobar', requireRole('admin'), asyncHandler(ctrl.aprobar));
router.post('/:id/rechazar', requireRole('admin'), asyncHandler(ctrl.rechazar));
router.post('/:id/pagar', requireRole('admin', 'finanzas'), uploadComprobantes.single('comprobante'), asyncHandler(ctrl.pagar));
router.get('/:id/comprobante', requireRole('admin', 'finanzas', 'proveedor'), asyncHandler(ctrl.descargarComprobante));
router.get('/:id/archivo/:tipo', requireRole('admin', 'finanzas', 'proveedor'), asyncHandler(ctrl.descargarFactura));

module.exports = router;
