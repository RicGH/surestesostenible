<template>
  <div class="space-y-2">
    <div v-if="editor" class="card overflow-hidden">
      <div class="px-2 py-1.5 border-b border-ink-200 bg-ink-50 flex flex-wrap items-center gap-1 text-sm">
        <select class="input !py-1 !px-2 text-xs h-7 w-24" @change="setHeading($event.target.value)">
          <option value="">Texto</option>
          <option value="1">Título 1</option>
          <option value="2">Título 2</option>
          <option value="3">Título 3</option>
        </select>
        <span class="w-px h-5 bg-ink-300 mx-0.5" />
        <button type="button" class="tb-btn" :class="{ 'tb-active': editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()" title="Negrita (Ctrl+B)"><b>B</b></button>
        <button type="button" class="tb-btn italic" :class="{ 'tb-active': editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()" title="Itálica"><i>I</i></button>
        <button type="button" class="tb-btn underline" :class="{ 'tb-active': editor.isActive('underline') }" @click="editor.chain().focus().toggleUnderline().run()" title="Subrayado">U</button>
        <button type="button" class="tb-btn line-through" :class="{ 'tb-active': editor.isActive('strike') }" @click="editor.chain().focus().toggleStrike().run()" title="Tachado">S</button>
        <span class="w-px h-5 bg-ink-300 mx-0.5" />
        <button type="button" class="tb-btn" :class="{ 'tb-active': editor.isActive({ textAlign: 'left' }) }" @click="editor.chain().focus().setTextAlign('left').run()" title="Izquierda">⇤</button>
        <button type="button" class="tb-btn" :class="{ 'tb-active': editor.isActive({ textAlign: 'center' }) }" @click="editor.chain().focus().setTextAlign('center').run()" title="Centrar">⇔</button>
        <button type="button" class="tb-btn" :class="{ 'tb-active': editor.isActive({ textAlign: 'right' }) }" @click="editor.chain().focus().setTextAlign('right').run()" title="Derecha">⇥</button>
        <button type="button" class="tb-btn" :class="{ 'tb-active': editor.isActive({ textAlign: 'justify' }) }" @click="editor.chain().focus().setTextAlign('justify').run()" title="Justificar">≡</button>
        <span class="w-px h-5 bg-ink-300 mx-0.5" />
        <button type="button" class="tb-btn" :class="{ 'tb-active': editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()" title="Lista">•</button>
        <button type="button" class="tb-btn" :class="{ 'tb-active': editor.isActive('orderedList') }" @click="editor.chain().focus().toggleOrderedList().run()" title="Lista numerada">1.</button>
        <button type="button" class="tb-btn" :class="{ 'tb-active': editor.isActive('blockquote') }" @click="editor.chain().focus().toggleBlockquote().run()" title="Cita">"</button>
        <span class="w-px h-5 bg-ink-300 mx-0.5" />
        <button type="button" class="tb-btn" @click="agregarLink" title="Agregar enlace">🔗</button>
        <button type="button" class="tb-btn" @click="agregarImagen" title="Insertar imagen">🖼</button>
        <button type="button" class="tb-btn" @click="agregarTabla" title="Insertar tabla">▦</button>
        <span class="w-px h-5 bg-ink-300 mx-0.5" />
        <input type="color" class="w-7 h-7 rounded cursor-pointer border border-ink-300" :value="colorActual" @input="setColor($event.target.value)" title="Color de texto" />
        <span class="w-px h-5 bg-ink-300 mx-0.5" />
        <button type="button" class="tb-btn" @click="editor.chain().focus().undo().run()" title="Deshacer (Ctrl+Z)">↶</button>
        <button type="button" class="tb-btn" @click="editor.chain().focus().redo().run()" title="Rehacer">↷</button>
        <span class="ml-auto flex gap-1">
          <button type="button" class="btn-secondary !py-1 !px-2 text-xs" @click="$emit('insertar-tag')">+ Tag firma</button>
          <button type="button" class="btn-secondary !py-1 !px-2 text-xs" @click="$emit('insertar-campo')">+ Campo</button>
        </span>
      </div>

      <div class="bg-white">
        <EditorContent :editor="editor" class="prose max-w-none p-6 min-h-[600px] focus:outline-none" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { Editor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Color } from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import { TagFirmaNode, CampoDinamicoNode } from '~/utils/tiptap-extensions';

const props = defineProps({
  modelValue: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
});
const emit = defineEmits(['update:modelValue', 'insertar-tag', 'insertar-campo']);

const editor = ref(null);
const colorActual = ref('#111111');

onMounted(() => {
  editor.value = new Editor({
    content: props.modelValue || '<p></p>',
    editable: !props.readonly,
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-brand-600 underline' } }),
      Image.configure({ inline: true, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TextStyle,
      Color,
      TagFirmaNode,
      CampoDinamicoNode,
    ],
    onUpdate: ({ editor: e }) => emit('update:modelValue', e.getHTML()),
  });
});

watch(() => props.modelValue, (v) => {
  if (editor.value && v !== editor.value.getHTML()) editor.value.commands.setContent(v || '<p></p>', false);
});

watch(() => props.readonly, (v) => {
  if (editor.value) editor.value.setEditable(!v);
});

onBeforeUnmount(() => { editor.value?.destroy(); });

function setHeading(level) {
  if (!editor.value) return;
  if (!level) editor.value.chain().focus().setParagraph().run();
  else editor.value.chain().focus().toggleHeading({ level: Number(level) }).run();
}

function setColor(c) {
  colorActual.value = c;
  editor.value?.chain().focus().setColor(c).run();
}

function agregarLink() {
  const url = prompt('URL del enlace:');
  if (!url) return;
  editor.value?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
}

function agregarImagen() {
  const url = prompt('URL de la imagen:');
  if (!url) return;
  editor.value?.chain().focus().setImage({ src: url }).run();
}

function agregarTabla() {
  editor.value?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
}

function insertarTag({ tipo, firmanteId, color, nombre }) {
  editor.value?.chain().focus().insertContent({
    type: 'tagFirma',
    attrs: { tipo, firmanteId: String(firmanteId), color, nombre, tagId: `t_${Math.random().toString(36).slice(2, 9)}` },
  }).run();
}

function insertarCampo({ nombre, label, tipo }) {
  editor.value?.chain().focus().insertContent({
    type: 'campoDinamico',
    attrs: { nombre, label, tipo: tipo || 'texto' },
  }).run();
}

defineExpose({ insertarTag, insertarCampo, editor });
</script>

<style>
.tb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border-radius: 4px;
  color: #475569;
  font-size: 13px;
  cursor: pointer;
}
.tb-btn:hover { background: #e2e8f0; color: #0f172a; }
.tb-active { background: #0a6571; color: white; }
.tb-active:hover { background: #057d8c; color: white; }

.ProseMirror { outline: none; min-height: 500px; }
.ProseMirror p.is-editor-empty:first-child::before {
  content: 'Empieza a escribir tu documento...';
  color: #94a3b8;
  pointer-events: none;
  height: 0;
  float: left;
}
.ProseMirror table { border-collapse: collapse; margin: 8px 0; width: 100%; }
.ProseMirror table td, .ProseMirror table th { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top; }
.ProseMirror table th { background: #f1f5f9; font-weight: 600; }
.ProseMirror blockquote { border-left: 3px solid #cbd5e1; padding-left: 12px; color: #475569; }
.ProseMirror ul, .ProseMirror ol { padding-left: 22px; }
</style>
