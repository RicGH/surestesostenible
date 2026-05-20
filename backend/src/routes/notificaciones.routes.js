const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const service = require('../services/notificaciones.service');
const asyncHandler = require('../utils/asyncHandler');

router.use(verifyToken);

router.get('/', asyncHandler(async (req, res) => {
  res.json({ data: await service.listar(req.user.sub) });
}));

router.post('/:id/leer', asyncHandler(async (req, res) => {
  await service.marcarLeida(Number(req.params.id), req.user.sub);
  res.json({ ok: true });
}));

module.exports = router;
