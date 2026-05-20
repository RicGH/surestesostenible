<template>
  <header class="h-16 flex items-center gap-4 px-4 lg:px-8 bg-white border-b border-ink-200">
    <button class="lg:hidden text-ink-600 hover:text-ink-900" @click="$emit('toggle-sidebar')">
      <Icon name="menu" />
    </button>

    <div class="flex-1">
      <h1 class="text-lg font-semibold text-ink-900">{{ title }}</h1>
      <p v-if="subtitle" class="text-xs text-ink-500">{{ subtitle }}</p>
    </div>

    <div class="relative">
      <button class="relative w-9 h-9 grid place-items-center text-ink-600 hover:text-ink-900 hover:bg-ink-100 rounded-lg" @click.stop="toggleNotifs">
        <Icon name="bell" />
        <span v-if="noLeidas > 0" class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-none grid place-items-center font-semibold ring-2 ring-white pointer-events-none">
          {{ noLeidas > 99 ? '99+' : noLeidas }}
        </span>
      </button>

      <div v-if="notifsAbierto" class="absolute right-0 top-12 w-80 card overflow-hidden z-50">
        <div class="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
          <span class="text-sm font-semibold">Notificaciones</span>
          <span class="text-xs text-ink-500">{{ noLeidas }} sin leer</span>
        </div>
        <div class="max-h-96 overflow-y-auto">
          <div v-if="!notifs.length" class="p-6 text-center text-sm text-ink-500">Sin notificaciones</div>
          <button
            v-for="n in notifs"
            :key="n.id"
            class="w-full text-left px-4 py-3 border-b border-ink-100 hover:bg-ink-50 transition-colors"
            :class="!n.leida && 'bg-brand-50/40'"
            @click="abrirNotif(n)"
          >
            <div class="flex items-start gap-2">
              <span v-if="!n.leida" class="w-1.5 h-1.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-ink-800">{{ n.titulo }}</p>
                <p class="text-xs text-ink-600 mt-0.5">{{ n.mensaje }}</p>
                <p class="text-xs text-ink-400 mt-1">{{ formatFecha(n.created_at) }}</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
defineProps({ title: String, subtitle: String });
defineEmits(['toggle-sidebar']);

const api = useApi();
const router = useRouter();
const notifs = ref([]);
const notifsAbierto = ref(false);

const noLeidas = computed(() => notifs.value.filter((n) => !n.leida).length);

async function cargar() {
  try {
    const r = await api.get('/notificaciones');
    notifs.value = r.data;
  } catch {}
}

function toggleNotifs() {
  notifsAbierto.value = !notifsAbierto.value;
  if (notifsAbierto.value) cargar();
}

async function abrirNotif(n) {
  if (!n.leida) {
    try { await api.post(`/notificaciones/${n.id}/leer`); n.leida = 1; } catch {}
  }
  if (n.url) router.push(n.url);
  notifsAbierto.value = false;
}

function formatFecha(s) {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T'));
  return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

function clickFuera(e) {
  if (notifsAbierto.value && !e.target.closest('.relative')) notifsAbierto.value = false;
}

onMounted(() => {
  cargar();
  document.addEventListener('click', clickFuera);
});
onBeforeUnmount(() => document.removeEventListener('click', clickFuera));
</script>
