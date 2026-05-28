<template>
  <div class="h-screen flex bg-ink-50 overflow-hidden">
    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />

    <div class="flex-1 flex flex-col min-w-0">
      <div v-if="auth.isImpersonating" class="shrink-0 bg-amber-500 text-white px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <div class="flex items-center gap-2 min-w-0">
          <Icon name="alert" size="w-4 h-4" />
          <span class="truncate">
            Impersonando a <strong>{{ auth.user?.nombre }}</strong>
            <span class="opacity-80">({{ auth.user?.rol }})</span>
            <span class="opacity-80 hidden sm:inline"> · sesión original: {{ auth.impersonator?.nombre }}</span>
          </span>
        </div>
        <button class="px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 font-medium shrink-0" @click="volverAdmin">
          <Icon name="logout" size="w-3 h-3" /> Volver
        </button>
      </div>
      <AppHeader :title="title" :subtitle="subtitle" class="shrink-0" @toggle-sidebar="sidebarOpen = !sidebarOpen" />
      <main class="flex-1 overflow-y-auto">
        <div class="p-6 lg:p-8 space-y-6">
          <AlertaRegistro v-if="mostrarAlertaRegistro" />
          <slot />
        </div>
      </main>
    </div>
    <ToastContainer />
  </div>
</template>

<script setup>
const sidebarOpen = ref(false);
const route = useRoute();
const auth = useAuth();

const TITLES = {
  '/': { title: 'Panel', subtitle: 'Resumen general' },
  '/admin/viaticos': { title: 'Viáticos', subtitle: 'Bandeja de aprobación' },
  '/admin/proveedores': { title: 'Proveedores', subtitle: 'Bandeja de aprobación' },
  '/admin/facturas': { title: 'Facturas', subtitle: 'Revisión y aprobación' },
  '/admin/usuarios': { title: 'Usuarios', subtitle: 'Gestión del sistema' },
  '/admin/configuracion': { title: 'Configuración', subtitle: 'Servidor de correo y ajustes del sistema' },
  '/viaticos/nueva': { title: 'Solicitar viáticos', subtitle: 'Crear una nueva solicitud' },
  '/viaticos/historial': { title: 'Historial', subtitle: 'Mis solicitudes anteriores' },
  '/viaticos/actual': { title: 'Mis viáticos actuales', subtitle: 'Comprobantes y gasto' },
  '/proveedores/registro': { title: 'Mi registro', subtitle: 'Datos fiscales y bancarios' },
  '/proveedores/facturas': { title: 'Subir factura', subtitle: 'PDF + XML CFDI' },
  '/proveedores/historial': { title: 'Historial', subtitle: 'Mis facturas y pagos' },
  '/finanzas/viaticos': { title: 'Viáticos por pagar', subtitle: 'Solicitudes y ajustes aprobados' },
  '/finanzas/pendientes': { title: 'Facturas pendientes', subtitle: 'Facturas de proveedores por pagar' },
  '/finanzas/historial': { title: 'Historial', subtitle: 'Pagos de facturas realizados' },
  '/reportes': { title: 'Reportes', subtitle: 'Generar PDF' },
};

const matched = computed(() => {
  if (TITLES[route.path]) return TITLES[route.path];
  if (route.path.startsWith('/viaticos/')) return { title: 'Detalle de los viáticos', subtitle: 'Información y gastos' };
  return { title: 'App Sureste Sostenible', subtitle: '' };
});
const title = computed(() => matched.value.title);
const subtitle = computed(() => matched.value.subtitle || `Hola, ${auth.user?.nombre || ''}`);

const router = useRouter();
const toast = useToast();

async function volverAdmin() {
  auth.stopImpersonation();
  toast.success('Sesión restaurada', 'Volviste a tu cuenta de administrador.');
  await router.push('/');
}

const reg = useRegistroProveedor();

const mostrarAlertaRegistro = computed(() =>
  auth.rol === 'proveedor' &&
  reg.cargado &&
  !reg.registrado &&
  route.path !== '/proveedores/registro'
);

onMounted(async () => {
  if (auth.rol === 'proveedor') await reg.refrescar();
});

watch(() => route.path, async () => {
  if (auth.rol === 'proveedor' && !reg.cargado) await reg.refrescar();
});
</script>
