<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[80] grid place-items-center bg-ink-900/70 backdrop-blur-sm p-4" @click.self="$emit('close')">
      <div
        class="card flex flex-col overflow-hidden"
        :style="{ width: 'min(95vw, 1100px)', height: 'min(90vh, 850px)' }"
      >
        <div class="px-5 py-4 border-b border-ink-100 flex items-center justify-between shrink-0">
          <div class="min-w-0">
            <h3 class="font-semibold text-ink-900 truncate">{{ title || 'Visualizar archivo' }}</h3>
            <p v-if="subtitle" class="text-xs text-ink-500 truncate">{{ subtitle }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button v-if="downloadName" class="btn-secondary text-sm" @click="descargar">
              <Icon name="download" size="w-4 h-4" /> Descargar
            </button>
            <button class="text-ink-500 hover:text-ink-900 w-8 h-8 grid place-items-center rounded-lg hover:bg-ink-100" @click="$emit('close')">
              <Icon name="close" />
            </button>
          </div>
        </div>
        <div class="flex-1 min-h-0 bg-ink-100 grid place-items-center overflow-hidden">
          <div v-if="cargando" class="text-ink-500 text-sm">Cargando...</div>
          <div v-else-if="error" class="text-red-600 text-sm">{{ error }}</div>
          <div v-else-if="esImagen" class="w-full h-full overflow-auto p-4 grid place-items-center">
            <img :src="url" alt="comprobante" class="max-w-full max-h-full object-contain bg-white rounded shadow" />
          </div>
          <iframe
            v-else-if="esPdf"
            :src="`${url}#view=FitH&toolbar=1`"
            class="w-full h-full bg-white border-0"
            frameborder="0"
          />
          <div v-else-if="esXml" class="w-full h-full overflow-auto bg-white">
            <pre class="text-xs text-ink-800 p-4 whitespace-pre font-mono leading-relaxed">{{ texto }}</pre>
          </div>
          <div v-else class="text-center p-6 text-ink-600">
            <p class="font-medium">No se puede previsualizar este archivo</p>
            <button v-if="downloadName" class="btn-primary mt-3" @click="descargar">
              <Icon name="download" size="w-4 h-4" /> Descargar
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  path: { type: String, required: true },
  title: String,
  subtitle: String,
  downloadName: String,
});
const emit = defineEmits(['close']);

const api = useApi();
const url = ref('');
const mime = ref('');
const texto = ref('');
const cargando = ref(true);
const error = ref('');

const esImagen = computed(() => mime.value.startsWith('image/'));
const esPdf = computed(() => mime.value === 'application/pdf' || (props.path || '').toLowerCase().endsWith('.pdf'));
const esXml = computed(() => mime.value.includes('xml') || (props.path || '').toLowerCase().endsWith('.xml'));

function formatearXml(xml) {
  try {
    const sinSaltos = xml.replace(/>\s+</g, '><').trim();
    let formateado = '';
    let nivel = 0;
    sinSaltos.split(/(?=<)/).forEach((nodo) => {
      if (/^<\/.+>/.test(nodo)) nivel = Math.max(nivel - 1, 0);
      formateado += '  '.repeat(nivel) + nodo + '\n';
      if (/^<[^!?/][^>]*[^/]>$/.test(nodo) && !/<\/.+>/.test(nodo)) nivel++;
    });
    return formateado.trim();
  } catch {
    return xml;
  }
}

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    const r = await api.viewBlob(props.path);
    url.value = r.url;
    mime.value = r.mime || '';
    if (esXml.value && r.blob) {
      texto.value = formatearXml(await r.blob.text());
    }
  } catch (e) {
    error.value = e.message || 'No se pudo cargar el archivo';
  } finally {
    cargando.value = false;
  }
}

function descargar() {
  if (!url.value) return;
  const a = document.createElement('a');
  a.href = url.value;
  a.download = props.downloadName || 'archivo';
  a.click();
}

onMounted(cargar);
onBeforeUnmount(() => {
  if (url.value) URL.revokeObjectURL(url.value);
});
</script>
