const router = require('express').Router();
const ctrl = require('../controllers/viaticos-ajustes.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadComprobantes } = require('../config/upload');
const asyncHandler = require('../utils/asyncHandler');

router.use(verifyToken);

router.get('/pendientes', requireRole('admin'), asyncHandler(ctrl.listarPendientes));
router.post('/:id/aprobar', requireRole('admin'), asyncHandler(ctrl.aprobar));
router.post('/:id/rechazar', requireRole('admin'), asyncHandler(ctrl.rechazar));
router.post('/:id/pagar', requireRole('admin', 'finanzas'), uploadComprobantes.single('comprobante'), asyncHandler(ctrl.pagar));

module.exports = router;
