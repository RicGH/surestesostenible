const mammoth = require('mammoth');
const { execFile } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const execFileAsync = promisify(execFile);

const STYLE_MAP = [
  "p[style-name='Title'] => h1",
  "p[style-name='Subtitle'] => h2",
  "p[style-name='Heading 1'] => h1",
  "p[style-name='Heading 2'] => h2",
  "p[style-name='Heading 3'] => h3",
  "p[style-name='Heading 4'] => h4",
  "p[style-name='Quote'] => blockquote",
  "r[style-name='Strong'] => strong",
  "r[style-name='Emphasis'] => em",
];

// DOCX files are ZIP archives and start with the PK signature
function esDocx(buffer) {
  return buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

const IMG_MAX_W = 400; // px — máximo razonable para imágenes en el editor

function normalizarHtmlLibreOffice(html) {
  // 1. Procesar cada <img>: escalar si supera IMG_MAX_W y garantizar responsividad
  html = html.replace(/<img(\s[^>]*?)(\s*\/?>)/gi, (match, attrs, close) => {
    // Extraer width/height numéricos del atributo HTML (pueden ser px o sin unidad)
    const wMatch = attrs.match(/\bwidth\s*=\s*["']?\s*(\d+)/i);
    const hMatch = attrs.match(/\bheight\s*=\s*["']?\s*(\d+)/i);
    let w = wMatch ? parseInt(wMatch[1], 10) : null;
    let h = hMatch ? parseInt(hMatch[1], 10) : null;

    if (w && w > IMG_MAX_W) {
      if (h) h = Math.round(h * IMG_MAX_W / w);
      w = IMG_MAX_W;
    }

    // Quitar atributos width/height originales (los reemplazamos vía style)
    attrs = attrs.replace(/\s+width\s*=\s*["']?[^"'\s>]+["']?/gi, '');
    attrs = attrs.replace(/\s+height\s*=\s*["']?[^"'\s>]+["']?/gi, '');

    // Quitar width/height del style inline si los hay
    attrs = attrs.replace(/style\s*=\s*"([^"]*)"/i, (_, s) => {
      s = s.replace(/\b(width|height)\s*:[^;]+;?\s*/gi, '').trim();
      return s ? `style="${s}"` : '';
    });

    const dimStyle = w ? `width:${w}px;${h ? `height:${h}px;` : 'height:auto;'}` : 'max-width:100%;height:auto;';
    return `<img${attrs} style="${dimStyle}"${close}`;
  });

  // 2. Quitar los divs de página de LibreOffice que tienen dimensiones fijas en pulgadas/cm
  //    Ej: <div style="...width:8.5in..."> → conservar contenido, quitar el wrapper
  html = html.replace(/<div([^>]*style="[^"]*(?:\d+\.?\d*in|\d+\.?\d*cm)[^"]*")[^>]*>/gi, '<div>');

  return html;
}

// For .doc files: LibreOffice exports directly to HTML preserving images and layout
async function docAHtml(buffer) {
  const tmpDir = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  fs.mkdirSync(tmpDir);
  const docPath = path.join(tmpDir, 'input.doc');

  try {
    fs.writeFileSync(docPath, buffer);
    await execFileAsync(
      'libreoffice',
      ['--headless', '--norestore', '--convert-to', 'html', '--outdir', tmpDir, docPath],
      { timeout: 30000, env: { ...process.env, HOME: tmpDir } }
    );

    const htmlPath = path.join(tmpDir, 'input.html');
    if (!fs.existsSync(htmlPath)) {
      throw new Error('LibreOffice no generó el archivo HTML de salida.');
    }

    let html = fs.readFileSync(htmlPath, 'utf8');

    // Embed referenced local images as base64 data URIs
    const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', svg: 'image/svg+xml', bmp: 'image/bmp' };
    html = html.replace(/src="([^"#?]+)"/gi, (match, src) => {
      if (/^(data:|https?:\/\/)/.test(src)) return match;
      const imgPath = path.resolve(tmpDir, src);
      if (!fs.existsSync(imgPath)) return match;
      const ext = path.extname(imgPath).toLowerCase().slice(1);
      const mime = MIME[ext] || 'image/png';
      const data = fs.readFileSync(imgPath).toString('base64');
      return `src="data:${mime};base64,${data}"`;
    });

    // Return only the body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const body = bodyMatch ? bodyMatch[1].trim() : html;
    return { html: normalizarHtmlLibreOffice(body), messages: [] };

  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error('LibreOffice no está instalado en el servidor. Convierte el archivo a .docx manualmente e intenta de nuevo.');
    }
    throw err;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// For .docx files: mammoth produces clean semantic HTML
async function docxAHtml(buffer) {
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: STYLE_MAP,
      convertImage: mammoth.images.imgElement((image) =>
        image.read('base64').then((data) => ({ src: `data:${image.contentType};base64,${data}` }))
      ),
    }
  );
  return { html: result.value || '<p></p>', messages: result.messages || [] };
}

async function convertirDocxAHtml(buffer) {
  return esDocx(buffer) ? docxAHtml(buffer) : docAHtml(buffer);
}

module.exports = { convertirDocxAHtml };
