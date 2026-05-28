const puppeteer = require('puppeteer-core');

let _browser = null;

async function getBrowser() {
  if (_browser && _browser.connected) return _browser;
  _browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });
  return _browser;
}

function envolverEnHtml(contenidoHtml, opciones = {}) {
  const css = `
    @page { size: ${opciones.tamano || 'Letter'}; margin: ${opciones.margen || '20mm'}; }
    body { font-family: 'Inter', 'Helvetica', 'Arial', sans-serif; color: #111; font-size: 12pt; line-height: 1.5; }
    h1 { font-size: 22pt; margin: 0 0 12px; }
    h2 { font-size: 17pt; margin: 16px 0 10px; }
    h3 { font-size: 14pt; margin: 14px 0 8px; }
    p { margin: 8px 0; }
    ul, ol { padding-left: 22px; }
    table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    table td, table th { border: 1px solid #999; padding: 6px 8px; vertical-align: top; }
    img { max-width: 100%; }
    .ds-tag-firma, .ds-tag-iniciales, .ds-tag-fecha { display: inline-block; min-width: 140px; min-height: 28px; padding: 4px 8px; border: 1px dashed #888; color: transparent; font-size: 8pt; }
    .ds-campo { font-weight: 500; }
  `;
  return `<!DOCTYPE html>
<html><head>
  <meta charset="utf-8">
  <style>${css}</style>
</head><body>${contenidoHtml}</body></html>`;
}

async function htmlAPdf(contenidoHtml, opciones = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const html = envolverEnHtml(contenidoHtml, opciones);
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: opciones.tamano || 'Letter',
      margin: {
        top: opciones.margen || '20mm',
        bottom: opciones.margen || '20mm',
        left: opciones.margen || '20mm',
        right: opciones.margen || '20mm',
      },
      printBackground: true,
    });
    return pdf;
  } finally {
    await page.close();
  }
}

async function htmlAPdfConTags(contenidoHtml, opciones = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const html = envolverEnHtml(contenidoHtml, opciones);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const tags = await page.evaluate(() => {
      const PT_PER_PX = 72 / 96;
      const nodes = Array.from(document.querySelectorAll('[data-ds-tag]'));
      return nodes.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          id: el.getAttribute('data-ds-id') || '',
          tipo: el.getAttribute('data-ds-tag') || 'firma',
          firmanteId: el.getAttribute('data-ds-firmante') || null,
          xPx: r.left + window.scrollX,
          yPx: r.top + window.scrollY,
          widthPx: r.width,
          heightPx: r.height,
        };
      });
    });

    const pdf = await page.pdf({
      format: opciones.tamano || 'Letter',
      margin: {
        top: opciones.margen || '20mm',
        bottom: opciones.margen || '20mm',
        left: opciones.margen || '20mm',
        right: opciones.margen || '20mm',
      },
      printBackground: true,
    });

    return { pdf, tags };
  } finally {
    await page.close();
  }
}

async function cerrar() {
  if (_browser) {
    try { await _browser.close(); } catch {}
    _browser = null;
  }
}

module.exports = { htmlAPdf, htmlAPdfConTags, cerrar };
