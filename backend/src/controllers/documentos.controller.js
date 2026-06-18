const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { z } = require('zod');
const { HttpError } = require('../middleware/error');
const service = require('../services/documentos.service');
const proveedoresService = require('../services/proveedores.service');
const docusign = require('../services/docusign.service');
const pdfService = require('../services/pdf.service');
const pdfEstampa = require('../services/pdf-estampa.service');
const plantillasService = require('../services/plantillas.service');
const docxService = require('../services/docx.service');

const crearSchema = z.object({
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(2000).optional().nullable(),
});

const actualizarSchema = z.object({
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(2000).optional().nullable(),
  asunto_correo: z.string().max(200).optional().nullable(),
  mensaje_correo: z.string().max(2000).optional().nullable(),
});

const firmanteSchema = z.object({
  tipo: z.enum(['usuario', 'proveedor', 'externo']),
  referencia_id: z.number().int().positive().optional().nullable(),
  nombre: z.string().min(2).max(160),
  email: z.string().email(),
  orden: z.number().int().min(1).optional(),
  color: z.string().max(20).optional(),
});

const firmantesSchema = z.object({
  firmantes: z.array(firmanteSchema).min(1).max(20),
});

const tagSchema = z.object({
  firmante_id: z.number().int().positive(),
  tipo: z.enum(['firma', 'iniciales', 'fecha', 'texto']).optional(),
  pagina: z.number().int().min(1),
  x: z.number().min(0),
  y: z.number().min(0),
  ancho: z.number().min(10).optional(),
  alto: z.number().min(10).optional(),
  requerido: z.boolean().optional(),
});

const tagsSchema = z.object({
  tags: z.array(tagSchema).min(0).max(200),
});

const campoSchema = z.object({
  nombre: z.string().min(1).max(80),
  label: z.string().min(1).max(160),
  tipo: z.enum(['texto', 'numero', 'fecha', 'email', 'telefono']).optional(),
  valor: z.string().max(2000).optional().nullable(),
  requerido: z.boolean().optional(),
});

const crearHtmlSchema = z.object({
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(2000).optional().nullable(),
  contenido_html: z.string().min(1),
  plantilla_id: z.number().int().positive().optional().nullable(),
  campos: z.array(campoSchema).optional(),
});

const actualizarHtmlSchema = z.object({
  nombre: z.string().min(2).max(200),
  descripcion: z.string().max(2000).optional().nullable(),
  contenido_html: z.string().min(1),
  asunto_correo: z.string().max(200).optional().nullable(),
  mensaje_correo: z.string().max(2000).optional().nullable(),
  campos: z.array(campoSchema).optional(),
});

const valoresSchema = z.object({
  valores: z.record(z.string(), z.string().nullable()),
});

const anotacionSchema = z.object({
  tipo: z.enum(['texto', 'campo']),
  pagina: z.number().int().min(1),
  x: z.number().min(0),
  y: z.number().min(0),
  ancho: z.number().min(20).optional(),
  alto: z.number().min(10).optional(),
  contenido: z.string().max(5000).optional().nullable(),
  campo_nombre: z.string().max(80).optional().nullable(),
  font_size: z.number().min(6).max(72).optional(),
  color: z.string().max(20).optional(),
  bold: z.boolean().optional(),
});

const anotacionesSchema = z.object({
  anotaciones: z.array(anotacionSchema).min(0).max(500),
});

const camposImpSchema = z.object({
  campos: z.array(campoSchema).min(0).max(50),
});

async function listar(req, res) {
  res.json({ data: await service.listar(req.query) });
}

async function detalle(req, res) {
  const id = Number(req.params.id);
  const doc = await service.detalleCompleto(id);
  if (!doc) throw new HttpError(404, 'Documento no encontrado');
  res.json(doc);
}

async function subir(req, res) {
  if (!req.file) throw new HttpError(400, 'Debes adjuntar un archivo PDF');
  const data = crearSchema.parse({
    nombre: req.body.nombre,
    descripcion: req.body.descripcion,
  });
  const relPath = path.posix.join('uploads', 'documentos', req.file.filename);
  const id = await service.crear({
    nombre: data.nombre,
    descripcion: data.descripcion,
    archivo_path: relPath,
    creado_por: req.user.sub,
  });
  res.status(201).json({ id });
}

async function importarDocx(req, res) {
  if (!req.file) throw new HttpError(400, 'Debes adjuntar un archivo Word (.doc o .docx)');
  const nombre = (req.body.nombre || '').trim();
  if (!nombre || nombre.length < 2) throw new HttpError(400, 'El nombre debe tener al menos 2 caracteres');
  let html;
  try {
    const { html: convertido } = await docxService.convertirDocxAHtml(req.file.buffer);
    html = convertido;
  } catch (err) {
    console.error('Error convirtiendo DOCX:', err);
    throw new HttpError(400, 'No se pudo convertir el archivo Word. Si es un .doc antiguo, ábrelo en Word y guárdalo como .docx e intenta de nuevo.');
  }
  const id = await service.crearDesdeHtml({
    nombre,
    descripcion: req.body.descripcion || null,
    contenido_html: html,
    creado_por: req.user.sub,
    campos: [],
  });
  res.status(201).json({ id });
}

async function crearHtml(req, res) {
  const data = crearHtmlSchema.parse(req.body);
  if (data.plantilla_id) {
    const p = await plantillasService.findById(data.plantilla_id);
    if (!p) throw new HttpError(404, 'Plantilla no encontrada');
  }
  const id = await service.crearDesdeHtml({
    nombre: data.nombre,
    descripcion: data.descripcion,
    contenido_html: data.contenido_html,
    plantilla_id: data.plantilla_id,
    creado_por: req.user.sub,
    campos: data.campos || [],
  });
  res.status(201).json({ id });
}

async function actualizarHtml(req, res) {
  const id = Number(req.params.id);
  const doc = await service.findById(id);
  if (!doc) throw new HttpError(404, 'Documento no encontrado');
  if (doc.tipo !== 'creado') throw new HttpError(400, 'Este documento no es editable como HTML');
  if (doc.estado !== 'borrador') throw new HttpError(400, 'Solo se pueden editar documentos en borrador');
  const data = actualizarHtmlSchema.parse(req.body);
  await service.actualizarHtml(id, data);
  res.json({ ok: true });
}

async function guardarValoresCampos(req, res) {
  const id = Number(req.params.id);
  const doc = await service.findById(id);
  if (!doc) throw new HttpError(404, 'Documento no encontrado');
  if (doc.estado !== 'borrador') throw new HttpError(400, 'Solo en borrador');
  const { valores } = valoresSchema.parse(req.body);
  await service.actualizarValoresCampos(id, valores);
  res.json({ ok: true });
}

async function guardarAnotaciones(req, res) {
  const id = Number(req.params.id);
  const doc = await service.findById(id);
  if (!doc) throw new HttpError(404, 'Documento no encontrado');
  if (doc.estado !== 'borrador') throw new HttpError(400, 'Solo en borrador');
  const { anotaciones } = anotacionesSchema.parse(req.body);
  await service.reemplazarAnotaciones(id, anotaciones);
  res.json({ ok: true });
}

async function guardarCamposImportado(req, res) {
  const id = Number(req.params.id);
  const doc = await service.findById(id);
  if (!doc) throw new HttpError(404, 'Documento no encontrado');
  if (doc.estado !== 'borrador') throw new HttpError(400, 'Solo en borrador');
  if (doc.tipo !== 'importado' && doc.tipo !== 'contrato') throw new HttpError(400, 'Este endpoint es solo para PDFs importados');
  const { campos } = camposImpSchema.parse(req.body);
  await service.reemplazarCamposImportado(id, campos);
  res.json({ ok: true });
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const doc = await service.findById(id);
  if (!doc) throw new HttpError(404, 'Documento no encontrado');
  if (doc.estado !== 'borrador') {
    throw new HttpError(400, 'Solo se pueden editar documentos en borrador');
  }
  const data = actualizarSchema.parse(req.body);
  await service.actualizarDatos(id, data);
  res.json({ ok: true });
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const doc = await service.findById(id);
  if (!doc) throw new HttpError(404, 'Documento no encontrado');
  if (doc.estado !== 'borrador' && doc.estado !== 'cancelado' && doc.estado !== 'firmado' && doc.estado !== 'declinado') {
    throw new HttpError(400, 'No puedes eliminar un documento en proceso. Cancélalo primero.');
  }
  await service.eliminar(id);
  res.json({ ok: true });
}

async function descargarArchivo(req, res) {
  const id = Number(req.params.id);
  const doc = await service.findById(id);
  if (!doc) throw new HttpError(404, 'Documento no encontrado');
  const usarFirmado = req.query.firmado === '1' && doc.archivo_firmado_path;
  const relPath = usarFirmado ? doc.archivo_firmado_path : doc.archivo_path;
  const abs = path.resolve(__dirname, '..', '..', relPath);
  if (!fs.existsSync(abs)) throw new HttpError(404, 'Archivo no disponible');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${doc.nombre}.pdf"`);
  fs.createReadStream(abs).pipe(res);
}

async function guardarFirmantes(req, res) {
  const id = Number(req.params.id);
  const doc = await service.findById(id);
  if (!doc) throw new HttpError(404, 'Documento no encontrado');
  if (doc.estado !== 'borrador') {
    throw new HttpError(400, 'Solo se pueden modificar firmantes en borrador');
  }
  const data = firmantesSchema.parse(req.body);
  const ids = await service.reemplazarFirmantes(id, data.firmantes);
  const firmantes = await service.obtenerFirmantes(id);
  res.json({ ids, firmantes });
}

async function guardarTags(req, res) {
  const id = Number(req.params.id);
  const doc = await service.findById(id);
  if (!doc) throw new HttpError(404, 'Documento no encontrado');
  if (doc.estado !== 'borrador') {
    throw new HttpError(400, 'Solo se pueden modificar tags en borrador');
  }
  const data = tagsSchema.parse(req.body);
  await service.reemplazarTags(id, data.tags);
  res.json({ ok: true });
}

function reemplazarCamposEnHtml(html, campos) {
  if (!campos || !campos.length) return html;
  let out = html;
  for (const c of campos) {
    const valor = c.valor != null && c.valor !== '' ? String(c.valor) : `[${c.label || c.nombre}]`;
    const escaped = valor
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const regex = new RegExp(
      `<span[^>]*data-campo="${c.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>.*?</span>`,
      'g'
    );
    out = out.replace(regex, `<span class="ds-campo-valor">${escaped}</span>`);
  }
  return out;
}

const PT_PER_PX = 72 / 96;
const PAGINA_CSS_HEIGHT = { Letter: 11 * 96, A4: 11.69 * 96 };
function calcularTagsPorPagina(tagsHtml, opciones = {}) {
  const tamano = opciones.tamano || 'Letter';
  const margenMm = parseFloat(opciones.margen || '20');
  const margenPx = (margenMm / 25.4) * 96;
  const pageH = PAGINA_CSS_HEIGHT[tamano] || PAGINA_CSS_HEIGHT.Letter;
  const contenidoH = pageH - margenPx * 2;
  return tagsHtml.map((t) => {
    const yRel = t.yPx;
    const pagina = Math.floor(yRel / contenidoH) + 1;
    const yEnPagina = yRel - (pagina - 1) * contenidoH + margenPx;
    const xEnPagina = t.xPx + margenPx;
    return {
      tipo: t.tipo,
      firmante_id: t.firmanteId ? Number(t.firmanteId) : null,
      pagina,
      x: xEnPagina * PT_PER_PX,
      y: yEnPagina * PT_PER_PX,
      ancho: t.widthPx * PT_PER_PX,
      alto: t.heightPx * PT_PER_PX,
    };
  });
}

async function enviarADocusign(req, res) {
  const id = Number(req.params.id);
  const doc = await service.detalleCompleto(id);
  if (!doc) throw new HttpError(404, 'Documento no encontrado');
  if (doc.estado !== 'borrador') {
    throw new HttpError(400, 'El documento ya fue enviado');
  }
  if (!doc.firmantes.length) throw new HttpError(400, 'Agrega al menos un firmante');

  let tagsFinal = doc.tags;
  let documentoParaDocusign = doc;

  if ((doc.tipo === 'importado' || doc.tipo === 'contrato') && (doc.anotaciones || []).length > 0) {
    const camposFaltantes = (doc.campos || []).filter((c) => {
      const usado = (doc.anotaciones || []).some((a) => a.tipo === 'campo' && a.campo_nombre === c.nombre);
      return usado && c.requerido && (c.valor == null || c.valor === '');
    });
    if (camposFaltantes.length) {
      throw new HttpError(400, `Falta llenar los campos: ${camposFaltantes.map((c) => c.label).join(', ')}`);
    }
    try {
      const buf = await pdfEstampa.estamparYGuardar(doc.archivo_path, doc.anotaciones, doc.campos);
      const dir = path.resolve(__dirname, '..', '..', 'uploads', 'documentos');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filename = `${id}_estampado_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.pdf`;
      const abs = path.join(dir, filename);
      fs.writeFileSync(abs, buf);
      const relPath = path.posix.join('uploads', 'documentos', filename);
      documentoParaDocusign = { ...doc, archivo_path: relPath };
    } catch (err) {
      console.error('Error estampando PDF:', err);
      throw new HttpError(500, 'No se pudo estampar las anotaciones en el PDF');
    }
  }

  if (doc.tipo === 'creado') {
    const camposFaltantes = (doc.campos || []).filter((c) => c.requerido && (c.valor == null || c.valor === ''));
    if (camposFaltantes.length) {
      throw new HttpError(400, `Falta llenar los campos: ${camposFaltantes.map((c) => c.label).join(', ')}`);
    }
    const htmlConValores = reemplazarCamposEnHtml(doc.contenido_html || '', doc.campos || []);

    const { pdf, tags: tagsHtml } = await pdfService.htmlAPdfConTags(htmlConValores);
    const tagsCoord = calcularTagsPorPagina(tagsHtml);
    tagsFinal = tagsCoord.filter((t) => t.firmante_id);

    const dir = path.resolve(__dirname, '..', '..', 'uploads', 'documentos');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filename = `${id}_generado_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.pdf`;
    const abs = path.join(dir, filename);
    fs.writeFileSync(abs, Buffer.from(pdf));
    const relPath = path.posix.join('uploads', 'documentos', filename);
    await service.guardarArchivoPdf(id, relPath);
    documentoParaDocusign = { ...doc, archivo_path: relPath };
  }

  const firmantesConTag = new Set(tagsFinal.map((t) => t.firmante_id));
  const sinTag = doc.firmantes.filter((f) => !firmantesConTag.has(f.id));
  if (sinTag.length) {
    throw new HttpError(400, `Falta colocar al menos un tag para: ${sinTag.map((f) => f.nombre).join(', ')}`);
  }

  const tagsPorFirmante = {};
  for (const t of tagsFinal) {
    if (!tagsPorFirmante[t.firmante_id]) tagsPorFirmante[t.firmante_id] = [];
    tagsPorFirmante[t.firmante_id].push(t);
  }

  try {
    const { envelopeId, status } = await docusign.crearYEnviarEnvelope({
      documento: documentoParaDocusign,
      firmantes: doc.firmantes,
      tagsPorFirmante,
    });
    const estadoLocal = docusign.mapearEstadoDocusign(status);
    await service.marcarEnviado(id, envelopeId, estadoLocal);
    res.json({ envelopeId, estado: estadoLocal });
  } catch (err) {
    if (err.code === 'DOCUSIGN_CONSENT_REQUIRED') {
      throw new HttpError(412, err.message, { consentUrl: err.consentUrl });
    }
    throw err;
  }
}

async function urlFirma(req, res) {
  const id = Number(req.params.id);
  const firmanteId = Number(req.params.firmanteId);
  const doc = await service.findById(id);
  if (!doc) throw new HttpError(404, 'Documento no encontrado');
  if (!doc.envelope_id) throw new HttpError(400, 'El documento aún no se ha enviado a firma');
  if (!['enviado', 'parcial'].includes(doc.estado)) {
    throw new HttpError(400, 'El documento no está en proceso de firma');
  }
  const firmantes = await service.obtenerFirmantes(id);
  const firmante = firmantes.find((f) => f.id === firmanteId);
  if (!firmante) throw new HttpError(404, 'Firmante no encontrado');
  if (firmante.estado === 'firmado') throw new HttpError(400, 'Este firmante ya firmó');
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  const returnUrl = `${base}/admin/documentos?firma=ok`;
  try {
    const url = await docusign.obtenerUrlFirma({
      envelopeId: doc.envelope_id,
      firmante,
      returnUrl,
    });
    res.json({ url });
  } catch (err) {
    const body = (err.response && (err.response.data || err.response.body)) || {};
    if (body.errorCode === 'UNKNOWN_ENVELOPE_RECIPIENT') {
      throw new HttpError(
        409,
        'Este documento se envió antes de activar la firma en sitio, por lo que no admite firma embebida. Crea y envía un documento nuevo para usar "Firmar en sitio".'
      );
    }
    if (body.errorCode === 'RECIPIENT_NOT_IN_SEQUENCE') {
      throw new HttpError(409, 'Aún no es el turno de este firmante (debe firmar primero el anterior en el orden).');
    }
    throw err;
  }
}

async function misContratos(req, res) {
  const data = await service.listarContratosDeProveedor(req.user.sub);
  res.json({ data });
}

async function descargarContratoProveedor(req, res) {
  const id = Number(req.params.id);
  const doc = await service.findById(id);
  if (!doc) throw new HttpError(404, 'Contrato no encontrado');
  const prov = await proveedoresService.getByUserId(req.user.sub);
  if (!prov || doc.proveedor_id !== prov.id) {
    throw new HttpError(403, 'Este contrato no está asignado a tu cuenta');
  }
  const usarFirmado = req.query.firmado === '1' && doc.archivo_firmado_path;
  const relPath = usarFirmado ? doc.archivo_firmado_path : doc.archivo_path;
  const abs = path.resolve(__dirname, '..', '..', relPath);
  if (!fs.existsSync(abs)) throw new HttpError(404, 'Archivo no disponible');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${doc.nombre}.pdf"`);
  fs.createReadStream(abs).pipe(res);
}

async function firmarComoProveedor(req, res) {
  const id = Number(req.params.id);
  const doc = await service.findById(id);
  if (!doc) throw new HttpError(404, 'Contrato no encontrado');
  const prov = await proveedoresService.getByUserId(req.user.sub);
  if (!prov || doc.proveedor_id !== prov.id) {
    throw new HttpError(403, 'Este contrato no está asignado a tu cuenta');
  }
  if (!doc.envelope_id) throw new HttpError(400, 'El contrato aún no se ha enviado a firma');
  if (!['enviado', 'parcial'].includes(doc.estado)) {
    throw new HttpError(400, 'El contrato no está en proceso de firma');
  }
  const firmantes = await service.obtenerFirmantes(id);
  const firmante = firmantes.find((f) => f.tipo === 'proveedor' && f.referencia_id === prov.id);
  if (!firmante) throw new HttpError(404, 'No estás registrado como firmante de este contrato');
  if (firmante.estado === 'firmado') throw new HttpError(400, 'Ya firmaste este contrato');
  const base = process.env.APP_BASE_URL || 'http://localhost:3000';
  const returnUrl = `${base}/proveedores/contratos?firma=ok`;
  try {
    const url = await docusign.obtenerUrlFirma({ envelopeId: doc.envelope_id, firmante, returnUrl });
    res.json({ url });
  } catch (err) {
    const body = (err.response && (err.response.data || err.response.body)) || {};
    if (body.errorCode === 'RECIPIENT_NOT_IN_SEQUENCE') {
      throw new HttpError(409, 'Aún no es tu turno de firmar (debe firmar primero quien va antes en el orden).');
    }
    throw err;
  }
}

async function cancelar(req, res) {
  const id = Number(req.params.id);
  const doc = await service.findById(id);
  if (!doc) throw new HttpError(404, 'Documento no encontrado');
  if (!doc.envelope_id) {
    await service.actualizarEstado(id, 'cancelado');
    return res.json({ ok: true });
  }
  if (['firmado', 'cancelado', 'declinado'].includes(doc.estado)) {
    throw new HttpError(400, 'No se puede cancelar un documento ya finalizado');
  }
  await docusign.cancelarEnvelope(doc.envelope_id, req.body?.motivo);
  await service.actualizarEstado(id, 'cancelado');
  res.json({ ok: true });
}

async function refrescarEstado(req, res) {
  const id = Number(req.params.id);
  const doc = await service.findById(id);
  if (!doc) throw new HttpError(404, 'Documento no encontrado');
  if (!doc.envelope_id) throw new HttpError(400, 'El documento aún no se envía');
  const { status, completedDateTime, recipients } = await docusign.obtenerEstado(doc.envelope_id);
  const estadoLocal = docusign.mapearEstadoDocusign(status);
  await service.actualizarEstado(id, estadoLocal, estadoLocal === 'firmado' ? completedDateTime : null);
  for (const r of recipients || []) {
    if (r.status === 'completed') {
      await service.marcarFirmantePorEmail(id, r.email, 'firmado', r.signedDateTime);
    } else if (r.status === 'declined') {
      await service.marcarFirmantePorEmail(id, r.email, 'declinado', null);
    }
  }
  if (estadoLocal === 'firmado' && !doc.archivo_firmado_path) {
    await descargarYGuardarFirmado(doc);
  }
  res.json({ estado: estadoLocal });
}

async function descargarYGuardarFirmado(doc) {
  const buffer = await docusign.descargarPdfFirmado(doc.envelope_id);
  const dir = path.resolve(__dirname, '..', '..', 'uploads', 'documentos');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filename = `${doc.id}_firmado_${Date.now()}.pdf`;
  const abs = path.join(dir, filename);
  fs.writeFileSync(abs, Buffer.from(buffer));
  const relPath = path.posix.join('uploads', 'documentos', filename);
  await service.guardarPdfFirmado(doc.id, relPath);
}

async function webhookDocusign(req, res) {
  try {
    const evento = req.body;
    const envelopeId = evento?.data?.envelopeId || evento?.envelopeId;
    const estadoDS = evento?.event || evento?.data?.envelopeSummary?.status;
    if (!envelopeId) return res.status(200).json({ ok: true });

    const doc = await service.findByEnvelopeId(envelopeId);
    if (!doc) return res.status(200).json({ ok: true });

    const estadoLocal = docusign.mapearEstadoDocusign(estadoDS);
    const completado = estadoLocal === 'firmado' ? new Date() : null;
    await service.actualizarEstado(doc.id, estadoLocal, completado);

    const recipients = evento?.data?.envelopeSummary?.recipients?.signers || [];
    for (const r of recipients) {
      if (r.status === 'completed') {
        await service.marcarFirmantePorEmail(doc.id, r.email, 'firmado', r.signedDateTime || null);
      } else if (r.status === 'declined') {
        await service.marcarFirmantePorEmail(doc.id, r.email, 'declinado', null);
      }
    }

    if (estadoLocal === 'firmado' && !doc.archivo_firmado_path) {
      await descargarYGuardarFirmado(doc);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook DocuSign error:', err);
    res.status(200).json({ ok: true });
  }
}

module.exports = {
  listar,
  detalle,
  subir,
  importarDocx,
  crearHtml,
  actualizar,
  actualizarHtml,
  guardarValoresCampos,
  guardarAnotaciones,
  guardarCamposImportado,
  eliminar,
  descargarArchivo,
  guardarFirmantes,
  guardarTags,
  enviarADocusign,
  urlFirma,
  misContratos,
  descargarContratoProveedor,
  firmarComoProveedor,
  cancelar,
  refrescarEstado,
  webhookDocusign,
};
