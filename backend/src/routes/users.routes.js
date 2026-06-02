const router = require('express').Router();
const ctrl = require('../controllers/users.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(verifyToken, requireRole('admin'));

router.get('/', asyncHandler(ctrl.listar));
router.post('/', asyncHandler(ctrl.crear));
router.put('/:id', asyncHandler(ctrl.actualizar));
router.put('/:id/activo', asyncHandler(ctrl.setActivo));
router.put('/:id/password', asyncHandler(ctrl.resetPassword));
router.post('/bulk-delete', asyncHandler(ctrl.eliminarVarios));
router.delete('/:id', asyncHandler(ctrl.eliminar));

module.exports = router;
