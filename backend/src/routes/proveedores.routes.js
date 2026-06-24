const router = require('express').Router();
const ctrl = require('../controllers/proveedores.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadDocsProveedor } = require('../config/upload');
const asyncHandler = require('../utils/asyncHandler');

router.use(verifyToken);

router.get('/mio', requireRole('proveedor'), asyncHandler(ctrl.miRegistro));
router.put('/mio', requireRole('proveedor'), uploadDocsProveedor.single('documentacion'), asyncHandler(ctrl.actualizarMio));
router.post('/', requireRole('proveedor'), uploadDocsProveedor.single('documentacion'), asyncHandler(ctrl.registrar));
router.post('/admin-crear', requireRole('admin'), asyncHandler(ctrl.crearComoAdmin));
router.get('/pendientes', requireRole('admin'), asyncHandler(ctrl.listarPendientes));
router.get('/', requireRole('admin', 'finanzas'), asyncHandler(ctrl.listarTodos));
router.get('/:id', requireRole('admin'), asyncHandler(ctrl.detalle));
router.get('/:id/documentacion', requireRole('admin'), asyncHandler(ctrl.descargarDocumentacion));
router.put('/:id', requireRole('admin'), asyncHandler(ctrl.actualizar));
router.post('/:id/aprobar', requireRole('admin'), asyncHandler(ctrl.aprobar));
router.post('/:id/rechazar', requireRole('admin'), asyncHandler(ctrl.rechazar));

module.exports = router;
