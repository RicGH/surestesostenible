<template>
  <div class="space-y-3">
    <label
      :class="[
        'block relative rounded-xl border-2 border-dashed cursor-pointer transition-colors',
        dragging ? 'border-brand-500 bg-brand-50' : 'border-ink-200 hover:border-brand-400 hover:bg-brand-50/30',
      ]"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <input
        :ref="(el) => (input = el)"
        type="file"
        :accept="accept"
        multiple
        class="sr-only"
        @change="onChange"
      />
      <div class="p-5 flex items-start gap-3">
        <div class="w-10 h-10 rounded-lg grid place-items-center shrink-0 bg-brand-50 text-brand-600">
          <Icon :name="icon" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="font-semibold text-ink-900 text-sm">{{ label }}</p>
          <p class="text-xs text-ink-500 mt-0.5">{{ hint || 'Arrastra los archivos o haz clic · puedes seleccionar varios' }}</p>
        </div>
      </div>
    </label>

    <ul v-if="files.length" class="space-y-2">
      <li
        v-for="(f, i) in files"
        :key="i"
        class="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2"
      >
        <div class="w-8 h-8 rounded-lg grid place-items-center shrink-0 bg-emerald-100 text-emerald-600">
          <Icon name="check" size="w-4 h-4" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm text-ink-800 truncate">{{ f.name }}</p>
          <p class="text-xs text-ink-500">{{ tamano(f) }}</p>
        </div>
        <button type="button" class="text-ink-400 hover:text-red-600 shrink-0" title="Quitar archivo" @click.prevent="quitar(i)">
          <Icon name="x" size="w-4 h-4" />
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  accept: { type: String, default: '*' },
  label: { type: String, required: true },
  hint: String,
  icon: { type: String, default: 'upload' },
});
const emit = defineEmits(['update:modelValue']);

const input = ref(null);
const dragging = ref(false);
const files = computed(() => props.modelValue);

function tamano(f) {
  const kb = f.size / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

function agregar(nuevos) {
  if (!nuevos.length) return;
  // Evita duplicados por nombre+tamaño.
  const clave = (f) => `${f.name}_${f.size}`;
  const existentes = new Set(files.value.map(clave));
  const combinados = [...files.value, ...nuevos.filter((f) => !existentes.has(clave(f)))];
  emit('update:modelValue', combinados);
}

function onChange(e) {
  agregar(Array.from(e.target.files || []));
  if (input.value) input.value.value = '';
}

function onDrop(e) {
  dragging.value = false;
  agregar(Array.from(e.dataTransfer?.files || []));
}

function quitar(i) {
  const copia = files.value.slice();
  copia.splice(i, 1);
  emit('update:modelValue', copia);
}
</script>
