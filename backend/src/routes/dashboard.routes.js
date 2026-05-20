const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { query, queryOne } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');

router.use(verifyToken);

router.get('/resumen', asyncHandler(async (req, res) => {
  const rol = req.user.rol;
  const userId = req.user.sub;

  if (rol === 'admin') {
    const [v, p, f] = await Promise.all([
      queryOne("SELECT COUNT(*) c FROM viaticos_solicitudes WHERE estado='pendiente'"),
      queryOne("SELECT COUNT(*) c FROM proveedores WHERE estado='pendiente'"),
      queryOne("SELECT COUNT(*) c FROM facturas_proveedor WHERE estado='en_revision'"),
    ]);
    return res.json({
      cards: [
        { label: 'Viáticos por aprobar', value: v.c },
        { label: 'Proveedores por aprobar', value: p.c },
        { label: 'Facturas en revisión', value: f.c },
      ],
    });
  }

  if (rol === 'colaborador') {
    const [ult, activa] = await Promise.all([
      queryOne(
        "SELECT folio, estado FROM viaticos_solicitudes WHERE colaborador_id=? ORDER BY created_at DESC LIMIT 1",
        [userId]
      ),
      queryOne(
        `SELECT id, folio, estado, monto_total, monto_gastado, destino
         FROM viaticos_solicitudes
         WHERE colaborador_id=? AND estado IN ('pendiente','aprobado','pagado','en_proceso')
         ORDER BY
           CASE estado
             WHEN 'pagado' THEN 1
             WHEN 'en_proceso' THEN 1
             WHEN 'aprobado' THEN 2
             WHEN 'pendiente' THEN 3
             ELSE 4
           END ASC,
           created_at ASC
         LIMIT 1`,
        [userId]
      ),
    ]);
    const disp = activa ? Number(activa.monto_total) - Number(activa.monto_gastado) : 0;
    return res.json({
      cards: [
        {
          label: 'Viático activo',
          value: activa ? activa.folio : '—',
          sub: activa ? activa.destino : 'sin viático en curso',
          estado: activa ? activa.estado : null,
          link: activa ? `/viaticos/${activa.id}` : null,
          icon: 'briefcase',
          accent: 'violet',
        },
        {
          label: 'Última solicitud',
          value: ult ? ult.folio : '—',
          estado: ult ? ult.estado : null,
        },
        { label: 'Disponible', value: activa ? `$${disp.toFixed(2)}` : '—' },
        { label: 'Gastado', value: activa ? `$${Number(activa.monto_gastado).toFixed(2)}` : '—' },
      ],
    });
  }

  if (rol === 'proveedor') {
    const prov = await queryOne('SELECT id FROM proveedores WHERE user_id=?', [userId]);
    if (!prov) {
      return res.json({ cards: [{ label: 'Pendientes', value: 0 }, { label: 'Aprobadas', value: 0 }, { label: 'Rechazadas', value: 0 }] });
    }
    const [pen, apr, rec] = await Promise.all([
      queryOne("SELECT COUNT(*) c FROM facturas_proveedor WHERE proveedor_id=? AND estado='en_revision'", [prov.id]),
      queryOne("SELECT COUNT(*) c FROM facturas_proveedor WHERE proveedor_id=? AND estado IN ('aprobada','pagada')", [prov.id]),
      queryOne("SELECT COUNT(*) c FROM facturas_proveedor WHERE proveedor_id=? AND estado='rechazada'", [prov.id]),
    ]);
    return res.json({
      cards: [
        { label: 'Pendientes', value: pen.c },
        { label: 'Aprobadas / pagadas', value: apr.c },
        { label: 'Rechazadas', value: rec.c },
      ],
    });
  }

  if (rol === 'finanzas') {
    const [vPorPagar, fPorPagar, mes] = await Promise.all([
      queryOne(`
        SELECT (
          (SELECT COUNT(*) FROM viaticos_solicitudes WHERE estado='aprobado')
          + (SELECT COUNT(*) FROM viaticos_ajustes WHERE estado='aprobado')
        ) c
      `),
      queryOne("SELECT COUNT(*) c FROM facturas_proveedor WHERE estado='aprobada'"),
      queryOne("SELECT COALESCE(SUM(f.monto),0) total FROM facturas_proveedor f JOIN pagos p ON p.factura_id=f.id WHERE p.fecha_pago >= DATE_FORMAT(NOW(),'%Y-%m-01')"),
    ]);
    return res.json({
      cards: [
        { label: 'Viáticos por pagar', value: vPorPagar.c },
        { label: 'Facturas por pagar', value: fPorPagar.c },
        { label: 'Total facturas mes', value: `$${Number(mes.total).toFixed(2)}` },
      ],
    });
  }

  res.json({ cards: [] });
}));

module.exports = router;
