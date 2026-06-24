const router = require('express').Router();
const ctrl = require('../controllers/reportes.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.use(verifyToken);
router.get('/dashboard', requireRole('admin', 'finanzas'), asyncHandler(ctrl.dashboard));
router.get('/dashboard.pdf', requireRole('admin', 'finanzas'), asyncHandler(ctrl.dashboardPdf));
router.get('/dashboard.csv', requireRole('admin', 'finanzas'), asyncHandler(ctrl.dashboardCsv));
router.get('/viaticos.csv', requireRole('admin', 'finanzas'), asyncHandler(ctrl.viaticosReporteCsv));
router.get('/', requireRole('admin', 'finanzas'), asyncHandler(ctrl.generar));

module.exports = router;
