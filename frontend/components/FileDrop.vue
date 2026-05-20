<template>
  <label
    :class="[
      'block relative rounded-xl border-2 border-dashed cursor-pointer transition-colors',
      file ? 'border-emerald-300 bg-emerald-50/40' : 'border-ink-200 hover:border-brand-400 hover:bg-brand-50/30',
      dragging && 'border-brand-500 bg-brand-50',
    ]"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
  >
    <input
      :ref="(el) => (input = el)"
      type="file"
      :accept="accept"
      class="sr-only"
      @change="onChange"
    />
    <div class="p-5 flex items-start gap-3">
      <div :class="['w-10 h-10 rounded-lg grid place-items-center shrink-0',
                   file ? 'bg-emerald-100 text-emerald-600' : 'bg-brand-50 text-brand-600']">
        <Icon :name="file ? 'check' : icon" />
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-ink-900 text-sm">{{ label }}</p>
        <p v-if="file" class="text-xs text-ink-700 mt-0.5 truncate">{{ file.name }} · {{ tamano }}</p>
        <p v-else class="text-xs text-ink-500 mt-0.5">{{ hint || 'Arrastra el archivo o haz clic' }}</p>
      </div>
      <button
        v-if="file"
        type="button"
        class="text-ink-400 hover:text-red-600 shrink-0"
        @click.prevent="quitar"
        :title="'Quitar archivo'"
      >
        <Icon name="x" size="w-4 h-4" />
      </button>
    </div>
  </label>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: [File, null], default: null },
  accept: { type: String, default: '*' },
  label: { type: String, required: true },
  hint: String,
  icon: { type: String, default: 'upload' },
});
const emit = defineEmits(['update:modelValue']);

const input = ref(null);
const dragging = ref(false);
const file = computed(() => props.modelValue);

const tamano = computed(() => {
  if (!file.value) return '';
  const kb = file.value.size / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
});

function onChange(e) {
  const f = e.target.files?.[0];
  if (f) emit('update:modelValue', f);
}

function onDrop(e) {
  dragging.value = false;
  const f = e.dataTransfer?.files?.[0];
  if (f) emit('update:modelValue', f);
}

function quitar() {
  emit('update:modelValue', null);
  if (input.value) input.value.value = '';
}
</script>
