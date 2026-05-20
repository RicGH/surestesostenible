const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.post('/login', asyncHandler(ctrl.login));
router.post('/register-proveedor', asyncHandler(ctrl.registerProveedor));
router.post('/forgot-password', asyncHandler(ctrl.forgotPassword));
router.post('/reset-password', asyncHandler(ctrl.resetPassword));
router.get('/reset-password/validar', asyncHandler(ctrl.validarTokenReset));
router.get('/me', verifyToken, asyncHandler(ctrl.me));
router.post('/impersonate/:userId', verifyToken, requireRole('admin'), asyncHandler(ctrl.impersonate));

module.exports = router;
