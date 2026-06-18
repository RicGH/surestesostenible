const router = require('express').Router();
const ctrl = require('../controllers/documentos.controller');
const { verifyToken, requireRole } = require('../middleware/auth');
const { uploadDocumentos, uploadDocx } = require('../config/upload');
const asyncHandler = require('../utils/asyncHandler');

router.post('/webhook/docusign', asyncHandler(ctrl.webhookDocusign));

// Rutas para el rol proveedor (sus propios contratos). Deben ir antes del requireRole('admin').
router.get('/mis-contratos', verifyToken, requireRole('proveedor'), asyncHandler(ctrl.misContratos));
router.get('/mis-contratos/:id/archivo', verifyToken, requireRole('proveedor'), asyncHandler(ctrl.descargarContratoProveedor));
router.post('/mis-contratos/:id/firmar', verifyToken, requireRole('proveedor'), asyncHandler(ctrl.firmarComoProveedor));

router.use(verifyToken, requireRole('admin'));

router.get('/', asyncHandler(ctrl.listar));
router.post('/', uploadDocumentos.single('archivo'), asyncHandler(ctrl.subir));
router.post('/importar-docx', uploadDocx.single('archivo'), asyncHandler(ctrl.importarDocx));
router.post('/crear-html', asyncHandler(ctrl.crearHtml));
router.get('/:id', asyncHandler(ctrl.detalle));
router.put('/:id', asyncHandler(ctrl.actualizar));
router.put('/:id/html', asyncHandler(ctrl.actualizarHtml));
router.put('/:id/valores', asyncHandler(ctrl.guardarValoresCampos));
router.delete('/:id', asyncHandler(ctrl.eliminar));
router.get('/:id/archivo', asyncHandler(ctrl.descargarArchivo));
router.put('/:id/firmantes', asyncHandler(ctrl.guardarFirmantes));
router.put('/:id/tags', asyncHandler(ctrl.guardarTags));
router.put('/:id/anotaciones', asyncHandler(ctrl.guardarAnotaciones));
router.put('/:id/campos', asyncHandler(ctrl.guardarCamposImportado));
router.post('/:id/enviar', asyncHandler(ctrl.enviarADocusign));
router.post('/:id/firmantes/:firmanteId/url-firma', asyncHandler(ctrl.urlFirma));
router.post('/:id/cancelar', asyncHandler(ctrl.cancelar));
router.post('/:id/refrescar', asyncHandler(ctrl.refrescarEstado));

module.exports = router;
