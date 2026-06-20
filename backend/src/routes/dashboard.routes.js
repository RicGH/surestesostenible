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
    const [ult, activos] = await Promise.all([
      queryOne(
        "SELECT folio, estado FROM viaticos_solicitudes WHERE colaborador_id=? ORDER BY created_at DESC LIMIT 1",
        [userId]
      ),
      query(
        `SELECT id, folio, estado, destino, monto_total, monto_gastado
         FROM viaticos_solicitudes
         WHERE colaborador_id=? AND estado IN ('aprobado','pagado','en_proceso')
         ORDER BY
           CASE estado
             WHEN 'pagado' THEN 1
             WHEN 'en_proceso' THEN 1
             WHEN 'aprobado' THEN 2
             ELSE 3
           END ASC,
           created_at ASC`,
        [userId]
      ),
    ]);

    const enUso = activos.filter((a) => a.estado === 'pagado' || a.estado === 'en_proceso').length;
    const dispTotal = activos.reduce((s, a) => s + (Number(a.monto_total) - Number(a.monto_gastado)), 0);
    const gastTotal = activos.reduce((s, a) => s + Number(a.monto_gastado), 0);

    return res.json({
      cards: [
        {
          label: 'Viáticos abiertos',
          value: `${enUso} / 3`,
          sub: enUso > 3 ? 'sobre el máximo' : 'en uso',
          icon: 'briefcase',
          accent: enUso > 3 ? 'red' : 'violet',
        },
        { label: 'Disponible', value: `$${dispTotal.toFixed(2)}`, sub: 'total', icon: 'wallet', accent: 'emerald' },
        { label: 'Gastado', value: `$${gastTotal.toFixed(2)}`, sub: 'total', icon: 'chart' },
        {
          label: 'Última solicitud',
          value: ult ? ult.folio : '—',
          estado: ult ? ult.estado : null,
        },
      ],
      activos: activos.map((a) => ({
        id: a.id,
        folio: a.folio,
        destino: a.destino,
        estado: a.estado,
        monto_total: Number(a.monto_total),
        monto_gastado: Number(a.monto_gastado),
        disponible: Number(a.monto_total) - Number(a.monto_gastado),
      })),
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
