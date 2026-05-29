<template>
  <aside :class="[
    'fixed lg:relative inset-y-0 left-0 z-40 w-64 flex-shrink-0 bg-ink-900 text-ink-100',
    'flex flex-col h-screen transition-transform duration-200',
    open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
  ]">
    <div class="h-16 flex items-center justify-between px-5 border-b border-white/5">
      <NuxtLink to="/" class="flex items-center gap-2">
        <img src="/brand/icon.png" alt="Sureste Sostenible" class="w-8 h-8 object-contain" />
        <span class="font-semibold tracking-tight">App Sureste Sostenible</span>
      </NuxtLink>
      <button class="lg:hidden text-ink-400 hover:text-white" @click="$emit('close')">
        <Icon name="close" />
      </button>
    </div>

    <div v-if="ctaPrincipal" class="px-3 pt-4">
      <NuxtLink
        v-if="!ctaPrincipal.disabled"
        :to="ctaPrincipal.to"
        class="flex items-center gap-2 w-full justify-center px-3 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium shadow-sm transition-colors"
        @click="$emit('close')"
      >
        <Icon :name="ctaPrincipal.icon" size="w-4 h-4" />
        <span>{{ ctaPrincipal.label }}</span>
      </NuxtLink>
      <div
        v-else
        class="flex items-center gap-2 w-full justify-center px-3 py-2.5 rounded-lg bg-white/5 text-ink-400 text-sm font-medium ring-1 ring-white/5 cursor-not-allowed"
        :title="ctaPrincipal.disabledMotivo"
      >
        <Icon :name="ctaPrincipal.icon" size="w-4 h-4" />
        <span>{{ ctaPrincipal.label }}</span>
        <Icon name="alert" size="w-3 h-3" class="text-amber-300/70" />
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto px-3 py-4">
      <template v-for="(group, gi) in items" :key="gi">
        <p v-if="group.label" class="sidebar-section">{{ group.label }}</p>
        <template v-for="link in group.links" :key="link.to">
          <NuxtLink
            v-if="!isLinkDisabled(link)"
            :to="link.to"
            :class="['sidebar-link', isActive(link.to) && 'sidebar-link-active']"
            @click="$emit('close')"
          >
            <Icon :name="link.icon" size="w-4 h-4" />
            <span>{{ link.label }}</span>
          </NuxtLink>
          <div
            v-else
            class="sidebar-link opacity-40 cursor-not-allowed"
            :title="motivoDeshabilitado(link)"
          >
            <Icon :name="link.icon" size="w-4 h-4" />
            <span>{{ link.label }}</span>
            <Icon name="alert" size="w-3 h-3" class="ml-auto text-amber-300/70" />
          </div>
        </template>
      </template>
    </nav>

    <div class="p-3 border-t border-white/5">
      <div class="flex items-center gap-3 p-2">
        <div class="w-9 h-9 rounded-full bg-brand-600/30 ring-1 ring-brand-400/40 grid place-items-center text-sm font-semibold text-white">
          {{ initials }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-white truncate">{{ auth.user?.nombre }}</p>
          <p class="text-xs text-ink-400 capitalize">{{ auth.rol }}</p>
        </div>
        <button class="text-ink-400 hover:text-white" title="Cerrar sesión" @click="logout">
          <Icon name="logout" size="w-4 h-4" />
        </button>
      </div>
    </div>
  </aside>

  <div v-if="open" class="lg:hidden fixed inset-0 bg-black/50 z-30" @click="$emit('close')" />
</template>

<script setup>
defineProps({ open: Boolean });
defineEmits(['close']);

const auth = useAuth();
const route = useRoute();
const router = useRouter();
const check = usePuedoCrearViatico();

onMounted(() => {
  if (auth.rol === 'colaborador') check.refrescar();
});

watch(() => auth.rol, (rol) => {
  if (rol === 'colaborador') check.refrescar();
  else check.reset();
});

const initials = computed(() => {
  const n = auth.user?.nombre || '';
  return n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '·';
});

function isActive(to) {
  if (to === '/') return route.path === '/';
  return route.path === to || route.path.startsWith(to + '/');
}

function logout() {
  auth.logout();
  router.push('/login');
}

function isLinkDisabled() { return false; }
function motivoDeshabilitado() { return ''; }

const ctaPrincipal = computed(() => {
  if (auth.rol === 'colaborador') {
    return {
      to: '/viaticos/nueva',
      label: 'Solicitar viáticos',
      icon: 'plus',
      disabled: false,
    };
  }
  if (auth.rol === 'admin') {
    return { to: '/viaticos/nueva', label: 'Crear viático', icon: 'plus', disabled: false };
  }
  if (auth.rol === 'proveedor') {
    return { to: '/proveedores/facturas', label: 'Subir factura', icon: 'upload', disabled: false };
  }
  return null;
});

const MENUS = {
  admin: [
    { label: 'General', links: [{ to: '/', label: 'Panel', icon: 'dashboard' }, { to: '/manual', label: 'Manual', icon: 'book' }] },
    { label: 'Operación', links: [
      { to: '/admin/viaticos', label: 'Viáticos', icon: 'plane' },
      { to: '/admin/proveedores', label: 'Proveedores', icon: 'building' },
      { to: '/admin/facturas', label: 'Facturas', icon: 'receipt' },
    ]},
    { label: 'Pagos', links: [
      { to: '/finanzas/viaticos', label: 'Pagar viáticos', icon: 'wallet' },
      { to: '/finanzas/pendientes', label: 'Pagar facturas', icon: 'inbox' },
    ]},
    { label: 'Documentos', links: [
      { to: '/admin/documentos', label: 'Contratos', icon: 'fileText' },
      // { to: '/admin/plantillas', label: 'Plantillas', icon: 'document' },
      { to: '/admin/contratos', label: 'Plantilla de contratos', icon: 'document' },
    ]},
    { label: 'Administración', links: [
      { to: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
      { to: '/admin/configuracion', label: 'Configuración', icon: 'send' },
      { to: '/reportes', label: 'Reportes', icon: 'chart' },
    ]},
  ],
  colaborador: [
    { label: 'General', links: [{ to: '/', label: 'Panel', icon: 'dashboard' }, { to: '/manual', label: 'Manual', icon: 'book' }] },
    { label: 'Viáticos', links: [
      { to: '/viaticos/actual', label: 'Mis viáticos actuales', icon: 'briefcase' },
      { to: '/viaticos/historial', label: 'Historial', icon: 'history' },
    ]},
  ],
  proveedor: [
    { label: 'General', links: [{ to: '/', label: 'Panel', icon: 'dashboard' }, { to: '/manual', label: 'Manual', icon: 'book' }] },
    { label: 'Facturación', links: [
      { to: '/proveedores/registro', label: 'Mi registro', icon: 'document' },
      { to: '/proveedores/facturas', label: 'Subir factura', icon: 'upload' },
      { to: '/proveedores/historial', label: 'Historial', icon: 'history' },
    ]},
  ],
  finanzas: [
    { label: 'General', links: [{ to: '/', label: 'Panel', icon: 'dashboard' }, { to: '/manual', label: 'Manual', icon: 'book' }] },
    { label: 'Viáticos', links: [
      { to: '/finanzas/viaticos', label: 'Por pagar', icon: 'plane' },
    ]},
    { label: 'Facturas', links: [
      { to: '/finanzas/pendientes', label: 'Pendientes', icon: 'inbox' },
      { to: '/finanzas/historial', label: 'Historial', icon: 'wallet' },
    ]},
    { label: 'Análisis', links: [{ to: '/reportes', label: 'Reportes', icon: 'chart' }] },
  ],
};

const items = computed(() => MENUS[auth.rol] || []);
</script>
