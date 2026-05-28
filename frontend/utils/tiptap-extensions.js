import { Node, mergeAttributes } from '@tiptap/core';

export const TagFirmaNode = Node.create({
  name: 'tagFirma',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      tipo: { default: 'firma' },
      firmanteId: { default: null, parseHTML: (el) => el.getAttribute('data-ds-firmante'), renderHTML: (a) => ({ 'data-ds-firmante': a.firmanteId }) },
      color: { default: '#2563eb', parseHTML: (el) => el.getAttribute('data-ds-color') || '#2563eb', renderHTML: (a) => ({ 'data-ds-color': a.color }) },
      nombre: { default: '', parseHTML: (el) => el.getAttribute('data-ds-nombre') || '', renderHTML: (a) => ({ 'data-ds-nombre': a.nombre }) },
      tagId: { default: null, parseHTML: (el) => el.getAttribute('data-ds-id'), renderHTML: (a) => ({ 'data-ds-id': a.tagId || `t_${Math.random().toString(36).slice(2, 9)}` }) },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-ds-tag]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const tipo = node.attrs.tipo;
    const labels = { firma: 'Firma', iniciales: 'Iniciales', fecha: 'Fecha' };
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-ds-tag': tipo,
        class: `ds-tag-${tipo}`,
        style: `display:inline-block;min-width:140px;min-height:28px;padding:4px 10px;background:${node.attrs.color}22;border:1.5px dashed ${node.attrs.color};color:${node.attrs.color};font-size:11px;font-weight:600;border-radius:4px;vertical-align:middle;margin:0 2px;`,
        contenteditable: 'false',
      }),
      `${labels[tipo] || 'Firma'}${node.attrs.nombre ? ' · ' + node.attrs.nombre : ''}`,
    ];
  },
});

export const CampoDinamicoNode = Node.create({
  name: 'campoDinamico',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      nombre: { default: '', parseHTML: (el) => el.getAttribute('data-campo') || '', renderHTML: (a) => ({ 'data-campo': a.nombre }) },
      label: { default: '', parseHTML: (el) => el.getAttribute('data-label') || '', renderHTML: (a) => ({ 'data-label': a.label }) },
      tipo: { default: 'texto', parseHTML: (el) => el.getAttribute('data-tipo') || 'texto', renderHTML: (a) => ({ 'data-tipo': a.tipo }) },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-campo]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'ds-campo',
        style: 'display:inline-block;padding:2px 10px;background:#fef3c7;border:1px solid #fbbf24;color:#92400e;font-weight:600;border-radius:4px;font-size:0.95em;margin:0 1px;',
        contenteditable: 'false',
      }),
      `{${node.attrs.label || node.attrs.nombre}}`,
    ];
  },
});
