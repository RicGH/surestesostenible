require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { notFound, errorHandler } = require('./middleware/error');
const { pool } = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'up' });
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/users.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/notificaciones', require('./routes/notificaciones.routes'));
app.use('/api/viaticos', require('./routes/viaticos.routes'));
app.use('/api/viaticos-ajustes', require('./routes/viaticos-ajustes.routes'));
app.use('/api/proveedores', require('./routes/proveedores.routes'));
app.use('/api/facturas', require('./routes/facturas.routes'));
app.use('/api/reportes', require('./routes/reportes.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/documentos', require('./routes/documentos.routes'));
app.use('/api/plantillas', require('./routes/plantillas.routes'));
app.use('/api/contratos', require('./routes/contratos.routes'));
app.use('/api/catalogos', require('./routes/catalogos.routes'));

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Backend escuchando en puerto ${port}`);
});
