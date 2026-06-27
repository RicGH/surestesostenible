/**
 * Convierte el docx con MERGEFIELD al formato {tag} de Docxtemplater.
 * Ejecutar UNA SOLA VEZ: node src/db/migrate-proveedores-template.js
 */
const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');

const SRC  = path.join(__dirname, '..', 'templates', 'oficio-proveedores.docx');
const DEST = path.join(__dirname, '..', 'templates', 'oficio-proveedores.docx');

// Mapa: nombre MERGEFIELD → etiqueta Docxtemplater
const MAP = {
  'FOLIO':                  'folio',
  'Fecha_':                 'fecha',
  'Proveedor':              'proveedor',
  'RFC':                    'rfc',
  'Clabe_Interbancaria':    'clabe',
  'Tarjeta':                'tarjeta',
  'Cantidad':               'cantidad',
  'Banco':                  'banco',
  'Proyecto':               'proyecto',
  'Cuenta_Contable':        'cuenta_contable',
  'Partida':                'partida',
  'Objetivo_O_Resultado':   'objetivo_resultado',
  'Solicita':               'solicita',
  'Autoriza':               'autoriza',
  'Anexo':                  'anexo',
  'CampoAutoComb':          '',  // ignorar
};

// Captura y reemplaza: OBJETIVOS_ESTRAT... (puede tener encoding raro)
const OBJETIVO_REGEX = /MERGEFIELD\s+OBJETIVOS_ESTRAT[^"'\s<]*/i;

function procesarXml(xml) {
  // Reemplazar campos con encoding roto de objetivo_estrategico primero
  xml = xml.replace(OBJETIVO_REGEX, 'MERGEFIELD __objetivo_estrategico__');
  MAP['__objetivo_estrategico__'] = 'objetivo_estrategico';

  // Patrón: todo lo que hay entre fldChar begin y fldChar end
  // Incluye múltiples runs (rsidR diferentes, etc.)
  const FIELD_RE = /<w:r[^>]*>(?:<w:rPr>[\s\S]*?<\/w:rPr>)?<w:fldChar w:fldCharType="begin"[^/]*/g;

  // Estrategia: reemplazar el bloque completo begin→end por un solo <w:r><w:t>{tag}</w:t></w:r>
  // El bloque puede contener múltiples <w:r>
  // Usamos un approach de string scanning

  let result = '';
  let i = 0;

  const BEGIN_MARKER  = 'fldCharType="begin"';
  const END_MARKER    = 'fldCharType="end"';
  const INSTR_OPEN    = '<w:instrText';
  const INSTR_CLOSE   = '</w:instrText>';

  while (i < xml.length) {
    const beginIdx = xml.indexOf(BEGIN_MARKER, i);
    if (beginIdx === -1) {
      result += xml.slice(i);
      break;
    }

    // Encontrar el inicio del <w:r> que contiene el begin
    const runStart = xml.lastIndexOf('<w:r', beginIdx);
    result += xml.slice(i, runStart);

    // Encontrar el cierre del campo (fldCharType="end" ... </w:r>)
    const endIdx = xml.indexOf(END_MARKER, beginIdx);
    const runEnd = xml.indexOf('</w:r>', endIdx) + '</w:r>'.length;

    const fieldBlock = xml.slice(runStart, runEnd);

    // Extraer el nombre del MERGEFIELD
    const instrMatch = fieldBlock.match(/<w:instrText[^>]*>\s*MERGEFIELD\s+(\S+)\s*/i);
    if (instrMatch) {
      const fieldName = instrMatch[1];
      const tag = MAP[fieldName];
      if (tag === undefined) {
        // Campo desconocido: dejar el bloque tal cual
        result += fieldBlock;
      } else if (tag === '') {
        // Ignorar
      } else {
        // Extraer el rPr del primer run para conservar el estilo
        const rPrMatch = fieldBlock.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
        const rPr = rPrMatch ? rPrMatch[0] : '';
        result += `<w:r>${rPr}<w:t>{${tag}}</w:t></w:r>`;
      }
    } else {
      // No es un MERGEFIELD, dejar tal cual
      result += fieldBlock;
    }

    i = runEnd;
  }

  return result;
}

function main() {
  const buf = fs.readFileSync(SRC);
  const zip = new PizZip(buf);

  const docXml = zip.file('word/document.xml').asText();
  const processed = procesarXml(docXml);
  zip.file('word/document.xml', processed);

  const out = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(DEST, out);
  console.log('Template generado:', DEST);

  // Verificar tags insertados
  const checks = ['folio', 'fecha', 'proveedor', 'rfc', 'clabe', 'cantidad', 'banco', 'proyecto'];
  checks.forEach(t => {
    const found = processed.includes(`{${t}}`);
    console.log(`  {${t}}: ${found ? 'OK' : 'NO ENCONTRADO'}`);
  });
}

main();
