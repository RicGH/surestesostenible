const router = require('express').Router();
const ctrl = require('../controllers/firma-interna.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

// Ruta protegida: solo admin puede lanzar el envío interno
router.post('/:id/enviar', verifyToken, requireRole('admin'), asyncHandler(ctrl.enviar));

// Rutas públicas: solo se valida el token del firmante (sin JWT)
router.get('/sesion/:token', asyncHandler(ctrl.getSesion));
router.get('/sesion/:token/pdf', asyncHandler(ctrl.getPdf));
router.post('/sesion/:token/firmar', asyncHandler(ctrl.firmar));

module.exports = router;
