<template>
  <div class="space-y-8">
    <section :class="['grid grid-cols-1 sm:grid-cols-2 gap-4', cards.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3']">
      <component
        :is="card.link ? 'NuxtLink' : 'div'"
        v-for="(card, i) in cards"
        :key="i"
        :to="card.link || undefined"
        :class="['stat-card', card.link ? 'hover:border-brand-300 hover:shadow-card transition-all cursor-pointer' : '']"
      >
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium text-ink-500 uppercase tracking-wide">{{ card.label }}</p>
          <p class="text-2xl font-semibold text-ink-900 mt-2 truncate">{{ card.value }}</p>
          <div v-if="card.sub || card.estado" class="flex items-center gap-2 mt-1.5 flex-wrap">
            <span v-if="card.sub" class="text-xs text-ink-500 truncate">{{ card.sub }}</span>
            <EstadoBadge v-if="card.estado" :estado="card.estado" />
          </div>
        </div>
        <div :class="['w-10 h-10 rounded-lg grid place-items-center shrink-0', accentClasses(card, i)]">
          <Icon :name="card.icon || cardIcon(i)" />
        </div>
      </component>
    </section>

    <section v-if="activos.length">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold text-ink-900">Mis viáticos abiertos</h2>
        <NuxtLink to="/viaticos/historial" class="text-sm text-brand-600 hover:text-brand-700 font-medium">Ver todos</NuxtLink>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink
          v-for="v in activos"
          :key="v.id"
          :to="`/viaticos/${v.id}`"
          class="card p-4 block hover:border-brand-300 hover:shadow-card transition-all"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold text-ink-900 font-mono text-sm truncate">{{ v.folio }}</p>
              <p class="text-xs text-ink-500 truncate mt-0.5">{{ v.destino || 'Sin destino' }}</p>
            </div>
            <EstadoBadge :estado="v.estado" />
          </div>
          <div class="mt-4">
            <div class="h-2 rounded-full bg-ink-100 overflow-hidden">
              <div class="h-full rounded-full transition-all" :class="barColor(v)" :style="{ width: pct(v) + '%' }"></div>
            </div>
            <div class="flex items-center justify-between mt-2 text-xs">
              <span class="text-ink-500">${{ v.monto_gastado.toFixed(2) }} <span class="text-ink-400">/ ${{ v.monto_total.toFixed(2) }}</span></span>
              <span class="font-medium text-emerald-600">${{ v.disponible.toFixed(2) }} disp.</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-semibold text-ink-900">Accesos rápidos</h2>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink
          v-for="m in modulos"
          :key="m.to"
          :to="m.to"
          :title="m.disabled ? m.disabledMotivo : ''"
          :class="[
            'card p-5 group transition-all block',
            m.disabled
              ? 'opacity-60 cursor-not-allowed pointer-events-none select-none'
              : 'hover:border-brand-300 hover:shadow-card cursor-pointer',
          ]"
          @click="onModuloClick($event, m)"
        >
          <div class="flex items-start gap-3">
            <div :class="[
              'w-10 h-10 rounded-lg grid place-items-center transition-colors',
              m.disabled
                ? 'bg-ink-100 text-ink-400'
                : 'bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white',
            ]">
              <Icon :name="m.icon" />
            </div>
            <div class="flex-1">
              <h3 class="font-semibold text-ink-900">{{ m.titulo }}</h3>
              <p class="text-sm text-ink-500 mt-0.5">{{ m.disabled ? m.disabledMotivo : m.descripcion }}</p>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup>
const auth = useAuth();
const api = useApi();
const cards = ref([]);
const activos = ref([]);
const check = usePuedoCrearViatico();

onMounted(async () => {
  try {
    const data = await api.get('/dashboard/resumen');
    cards.value = data.cards || [];
    activos.value = data.activos || [];
  } catch (e) { console.error(e); }
  if (auth.rol === 'colaborador') check.refrescar();
});

function pct(v) {
  if (!v.monto_total) return 0;
  return Math.min(100, (v.monto_gastado / v.monto_total) * 100);
}
function barColor(v) {
  const p = pct(v);
  if (p >= 100) return 'bg-red-500';
  if (p >= 80) return 'bg-amber-500';
  return 'bg-brand-500';
}

function onModuloClick(e, m) {
  if (m.disabled) {
    e.preventDefault();
    e.stopPropagation();
  }
}

const ACCENTS = ['bg-brand-50 text-brand-600', 'bg-amber-50 text-amber-600', 'bg-emerald-50 text-emerald-600'];
const ACCENT_NAMES = {
  brand: 'bg-brand-50 text-brand-600',
  amber: 'bg-amber-50 text-amber-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  red: 'bg-red-50 text-red-600',
};
const ICONS_BY_INDEX = ['inbox', 'wallet', 'chart'];
function cardAccent(i) { return ACCENTS[i % ACCENTS.length]; }
function cardIcon(i) { return ICONS_BY_INDEX[i % ICONS_BY_INDEX.length]; }
function accentClasses(card, i) {
  if (card.accent && ACCENT_NAMES[card.accent]) return ACCENT_NAMES[card.accent];
  return cardAccent(i);
}

const modulos = computed(() => {
  if (auth.rol === 'admin') {
    return [
      { titulo: 'Viáticos', descripcion: 'Revisar y aprobar solicitudes', to: '/admin/viaticos', icon: 'plane' },
      { titulo: 'Proveedores', descripcion: 'Aprobar registros nuevos', to: '/admin/proveedores', icon: 'building' },
      { titulo: 'Facturas', descripcion: 'Aprobar facturas en revisión', to: '/admin/facturas', icon: 'receipt' },
      { titulo: 'Usuarios', descripcion: 'Gestión de cuentas', to: '/admin/usuarios', icon: 'users' },
      { titulo: 'Documentos', descripcion: 'Firmas electrónicas con DocuSign', to: '/admin/documentos', icon: 'document' },
      { titulo: 'Plantillas', descripcion: 'Documentos reutilizables', to: '/admin/plantillas', icon: 'document' },
      { titulo: 'Configuración', descripcion: 'Servidor de correo y ajustes', to: '/admin/configuracion', icon: 'send' },
      { titulo: 'Reportes', descripcion: 'Generar reportes PDF', to: '/reportes', icon: 'chart' },
    ];
  }
  if (auth.rol === 'colaborador') {
    return [
      {
        titulo: 'Solicitar viáticos',
        descripcion: 'Crear una nueva solicitud',
        to: '/viaticos/nueva',
        icon: 'plus',
      },
      { titulo: 'Listado de viáticos', descripcion: 'Ver todas mis solicitudes', to: '/viaticos/historial', icon: 'history' },
    ];
  }
  if (auth.rol === 'proveedor') {
    return [
      { titulo: 'Mi registro', descripcion: 'Datos fiscales y bancarios', to: '/proveedores/registro', icon: 'document' },
      { titulo: 'Subir factura', descripcion: 'Cargar PDF + XML CFDI', to: '/proveedores/facturas', icon: 'upload' },
      { titulo: 'Historial', descripcion: 'Ver facturas y pagos', to: '/proveedores/historial', icon: 'history' },
    ];
  }
  return [
    { titulo: 'Viáticos por pagar', descripcion: 'Solicitudes y ajustes aprobados', to: '/finanzas/viaticos', icon: 'plane' },
    { titulo: 'Facturas pendientes', descripcion: 'Facturas aprobadas listas para pagar', to: '/finanzas/pendientes', icon: 'inbox' },
    { titulo: 'Historial', descripcion: 'Pagos realizados', to: '/finanzas/historial', icon: 'wallet' },
    { titulo: 'Reportes', descripcion: 'Generar reportes PDF', to: '/reportes', icon: 'chart' },
  ];
});
</script>
