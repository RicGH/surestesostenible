const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
});

function parseCfdi(xmlPath) {
  const xml = fs.readFileSync(xmlPath, 'utf8');
  const json = parser.parse(xml);
  const comprobante = json.Comprobante || json['cfdi:Comprobante'];
  if (!comprobante) throw new Error('XML no es un CFDI válido');

  const emisor = comprobante.Emisor || comprobante['cfdi:Emisor'] || {};
  // Complemento puede venir repetido (arreglo); el timbre está en alguno de ellos
  const complementos = [].concat(comprobante.Complemento || comprobante['cfdi:Complemento'] || []);
  const tfd = complementos
    .map((c) => c?.TimbreFiscalDigital || c?.['tfd:TimbreFiscalDigital'])
    .find(Boolean) || {};

  return {
    uuid: tfd['@_UUID'] || null,
    fecha_emision: (comprobante['@_Fecha'] || '').slice(0, 10),
    rfc_emisor: emisor['@_Rfc'] || null,
    nombre_emisor: emisor['@_Nombre'] || null,
    monto: Number(comprobante['@_Total'] || 0),
    moneda: comprobante['@_Moneda'] || 'MXN',
  };
}

module.exports = { parseCfdi };
