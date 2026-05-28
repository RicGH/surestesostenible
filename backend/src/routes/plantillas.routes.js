const router = require('express').Router();
const ctrl = require('../controllers/plantillas.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(verifyToken, requireRole('admin'));

router.get('/', asyncHandler(ctrl.listar));
router.post('/', asyncHandler(ctrl.crear));
router.get('/:id', asyncHandler(ctrl.detalle));
router.put('/:id', asyncHandler(ctrl.actualizar));
router.delete('/:id', asyncHandler(ctrl.eliminar));

module.exports = router;
