const router = require('express').Router();
const ctrl = require('../controllers/viaticos.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadGastos, uploadComprobantes, uploadJustificantes } = require('../config/upload');
const asyncHandler = require('../utils/asyncHandler');

router.use(verifyToken);

router.post('/', requireRole('admin', 'colaborador'), uploadJustificantes.array('justificantes', 10), asyncHandler(ctrl.crear));
router.get('/puedo-crear', requireRole('admin', 'colaborador'), asyncHandler(ctrl.puedoCrear));
router.get('/mias', requireRole('admin', 'colaborador'), asyncHandler(ctrl.listarMios));
router.get('/pendientes', requireRole('admin'), asyncHandler(ctrl.listarPendientes));
router.get('/activos', requireRole('admin'), asyncHandler(ctrl.listarActivos));
router.get('/cerrados', requireRole('admin'), asyncHandler(ctrl.listarCerrados));
router.get('/rechazados', requireRole('admin'), asyncHandler(ctrl.listarRechazados));
router.get('/todos', requireRole('admin'), asyncHandler(ctrl.listarTodos));

router.get('/por-pagar', requireRole('admin', 'finanzas'), asyncHandler(ctrl.listarPorPagar));
router.get('/pagos-historial', requireRole('admin', 'finanzas'), asyncHandler(ctrl.listarPagosHistorial));
router.post('/:id/pagar', requireRole('admin', 'finanzas'), uploadComprobantes.single('comprobante'), asyncHandler(ctrl.pagarSolicitud));
router.get('/:id/comprobante-pago', requireRole('admin', 'finanzas', 'colaborador'), asyncHandler(ctrl.descargarComprobantePago));
router.get('/:id/oficio', requireRole('admin', 'finanzas', 'colaborador'), asyncHandler(ctrl.descargarOficio));
router.get('/:id/justificante', requireRole('admin', 'finanzas', 'colaborador'), asyncHandler(ctrl.descargarJustificante));
router.get('/:id/justificantes/:jid', requireRole('admin', 'finanzas', 'colaborador'), asyncHandler(ctrl.descargarJustificanteItem));
router.get('/:id/gastos/:gastoId/archivo', requireRole('admin', 'finanzas', 'colaborador'), asyncHandler(ctrl.descargarGasto));
router.get('/:id/gastos/:gastoId/xml', requireRole('admin', 'finanzas', 'colaborador'), asyncHandler(ctrl.descargarGastoXml));
router.get('/:id', requireRole('admin', 'colaborador', 'finanzas'), asyncHandler(ctrl.detalle));
router.put('/:id', requireRole('admin', 'colaborador'), asyncHandler(ctrl.editar));
router.post('/:id/justificantes', requireRole('admin', 'colaborador'), uploadJustificantes.array('justificantes', 10), asyncHandler(ctrl.subirJustificantes));
router.post('/:id/duplicar', requireRole('admin', 'colaborador'), asyncHandler(ctrl.duplicar));
router.post('/:id/aprobar', requireRole('admin'), asyncHandler(ctrl.aprobar));
router.post('/:id/rechazar', requireRole('admin'), asyncHandler(ctrl.rechazar));
router.post('/:id/cerrar', requireRole('admin', 'colaborador'), asyncHandler(ctrl.cerrar));
router.post('/:id/gastos', requireRole('admin', 'colaborador'), uploadGastos.fields([{ name: 'archivo', maxCount: 1 }, { name: 'xml', maxCount: 1 }]), asyncHandler(ctrl.subirGasto));

const ajustesCtrl = require('../controllers/viaticos-ajustes.controller');
router.post('/:id/ajustes', requireRole('admin', 'colaborador'), asyncHandler(ajustesCtrl.crear));

module.exports = router;
