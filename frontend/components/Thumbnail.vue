<template>
  <button
    type="button"
    class="group/thumb relative w-14 h-14 rounded-lg overflow-hidden bg-ink-100 border border-ink-200 hover:border-brand-400 hover:shadow-soft transition-all"
    :title="tooltip || 'Ver comprobante'"
    @click="$emit('open')"
  >
    <img v-if="esImagen && url" :src="url" alt="" class="w-full h-full object-cover" />
    <div v-else-if="esPdf" class="w-full h-full grid place-items-center bg-red-50 text-red-600 text-[10px] font-bold">
      <div class="text-center">
        <Icon name="fileText" size="w-6 h-6" class="mx-auto" />
        <span class="block leading-none mt-0.5">PDF</span>
      </div>
    </div>
    <div v-else-if="esXml" class="w-full h-full grid place-items-center bg-emerald-50 text-emerald-600 text-[10px] font-bold">
      <div class="text-center">
        <Icon name="fileText" size="w-6 h-6" class="mx-auto" />
        <span class="block leading-none mt-0.5">XML</span>
      </div>
    </div>
    <div v-else-if="cargando" class="w-full h-full grid place-items-center text-ink-400">
      <Icon name="document" size="w-6 h-6" />
    </div>
    <div v-else class="w-full h-full grid place-items-center text-ink-400">
      <Icon name="document" size="w-6 h-6" />
    </div>
    <div class="absolute inset-0 bg-ink-900/0 group-hover/thumb:bg-ink-900/30 transition-colors grid place-items-center">
      <Icon name="eye" size="w-5 h-5" class="text-white opacity-0 group-hover/thumb:opacity-100 transition-opacity" />
    </div>
  </button>
</template>

<script setup>
const props = defineProps({
  path: { type: String, required: true },
  filename: String,
  tooltip: String,
});
defineEmits(['open']);

const api = useApi();
const url = ref('');
const cargando = ref(false);

const ext = computed(() => {
  const name = (props.filename || props.path || '').toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.xml')) return 'xml';
  if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/.test(name)) return 'image';
  return 'other';
});
const esImagen = computed(() => ext.value === 'image');
const esPdf = computed(() => ext.value === 'pdf');
const esXml = computed(() => ext.value === 'xml');

onMounted(async () => {
  if (!esImagen.value) return;
  cargando.value = true;
  try {
    const r = await api.viewBlob(props.path);
    url.value = r.url;
  } catch {}
  finally { cargando.value = false; }
});

onBeforeUnmount(() => {
  if (url.value) URL.revokeObjectURL(url.value);
});
</script>
