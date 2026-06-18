const router = require('express').Router();
const ctrl = require('../controllers/catalogos.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(verifyToken);

// Lectura: admin (gestión) y colaborador (selectores al crear viático).
router.get('/', requireRole('admin', 'colaborador'), asyncHandler(ctrl.listar));

// Gestión: solo admin.
router.post('/', requireRole('admin'), asyncHandler(ctrl.crear));
router.put('/:id', requireRole('admin'), asyncHandler(ctrl.actualizar));
router.delete('/:id', requireRole('admin'), asyncHandler(ctrl.eliminar));

module.exports = router;
