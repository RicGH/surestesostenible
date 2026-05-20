const router = require('express').Router();
const ctrl = require('../controllers/settings.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(verifyToken, requireRole('admin'));

router.get('/email', asyncHandler(ctrl.getEmail));
router.put('/email', asyncHandler(ctrl.setEmail));
router.delete('/email', asyncHandler(ctrl.deleteEmail));
router.post('/email/probar', asyncHandler(ctrl.probar));

module.exports = router;
