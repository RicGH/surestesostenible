const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Convierte un documento de Office (docx, xlsx...) a PDF con LibreOffice.
 * @param {Buffer} buffer contenido del documento
 * @param {string} ext extensión del documento de entrada ('docx', 'xlsx')
 */
async function convertirAPdf(buffer, ext) {
  const tmpDir = path.join(os.tmpdir(), crypto.randomBytes(8).toString('hex'));
  fs.mkdirSync(tmpDir);
  const entrada = path.join(tmpDir, `documento.${ext}`);
  try {
    fs.writeFileSync(entrada, buffer);
    await execFileAsync(
      'libreoffice',
      ['--headless', '--norestore', '--convert-to', 'pdf', '--outdir', tmpDir, entrada],
      { timeout: 60000, env: { ...process.env, HOME: tmpDir } }
    );
    const pdfPath = path.join(tmpDir, 'documento.pdf');
    if (!fs.existsSync(pdfPath)) throw new Error('LibreOffice no generó el PDF');
    return fs.readFileSync(pdfPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

module.exports = { convertirAPdf };
