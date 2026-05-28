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
const check = usePuedoCrearViatico();

onMounted(async () => {
  try {
    const data = await api.get('/dashboard/resumen');
    cards.value = data.cards || [];
  } catch (e) { console.error(e); }
  if (auth.rol === 'colaborador') check.refrescar();
});

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
      { titulo: 'Historial', descripcion: 'Ver mis viáticos anteriores', to: '/viaticos/historial', icon: 'history' },
      { titulo: 'Mis viáticos actuales', descripcion: 'Subir comprobantes y revisar gasto', to: '/viaticos/actual', icon: 'briefcase' },
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
