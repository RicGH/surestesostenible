const router = require('express').Router();
const ctrl = require('../controllers/users.controller');
const cuentasCtrl = require('../controllers/cuentasBancarias.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// Accesible para cualquier usuario autenticado
router.get('/autorizadores', verifyToken, asyncHandler(ctrl.listarAutorizadores));

router.use(verifyToken, requireRole('admin'));

router.get('/', asyncHandler(ctrl.listar));
router.post('/', asyncHandler(ctrl.crear));
router.put('/:id', asyncHandler(ctrl.actualizar));
router.put('/:id/activo', asyncHandler(ctrl.setActivo));
router.put('/:id/aprobador', asyncHandler(ctrl.setAprobador));
router.put('/:id/password', asyncHandler(ctrl.resetPassword));
router.post('/bulk-delete', asyncHandler(ctrl.eliminarVarios));
router.delete('/:id', asyncHandler(ctrl.eliminar));
router.get('/:id/cuentas-bancarias', asyncHandler(cuentasCtrl.listarDeUsuario));
router.post('/:id/cuentas-bancarias', asyncHandler(cuentasCtrl.guardarParaUsuario));

module.exports = router;
