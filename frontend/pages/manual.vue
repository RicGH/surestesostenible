<template>
  <div class="space-y-8 pb-10">
    <!-- HERO -->
    <section class="relative overflow-hidden rounded-2xl text-white shadow-card ring-1 ring-white/10
                    bg-gradient-to-br from-ink-900 via-brand-800 to-brand-600">
      <div class="pointer-events-none absolute -top-20 -left-10 w-72 h-72 rounded-full bg-brand-400/25 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 right-1/4 w-64 h-64 rounded-full bg-brand-500/20 blur-3xl"></div>
      <img src="/brand/icon.png" alt="" aria-hidden="true"
           class="pointer-events-none select-none absolute -right-8 -bottom-12 w-52 opacity-[0.07] rotate-6" />
      <div class="relative p-6 sm:p-8">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 ring-1 ring-white/15
                     text-[11px] font-semibold uppercase tracking-wider text-brand-100">
          <Icon name="book" size="w-3.5 h-3.5" /> Manual de uso
        </span>
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight mt-3">Guía del sistema y flujos por rol</h1>
        <p class="text-sm text-brand-100/80 mt-2 max-w-2xl">
          Conoce cómo se mueve la información en <strong class="text-white font-medium">App Sureste Sostenible</strong>:
          el recorrido completo de viáticos, proveedores, facturas y pagos, y qué le toca hacer a cada rol.
        </p>
        <div class="flex items-center gap-2 mt-4 text-sm">
          <span class="text-brand-100/70">Tu rol:</span>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 ring-1 ring-white/20 font-medium capitalize">
            <Icon :name="rolMeta(auth.rol)?.icon || 'user'" size="w-4 h-4" /> {{ rolMeta(auth.rol)?.label || auth.rol }}
          </span>
        </div>
      </div>
    </section>

    <!-- SELECTOR DE ROL (solo admin puede ver todos los flujos) -->
    <section v-if="esAdmin">
      <p class="text-xs uppercase tracking-widest text-ink-500 font-semibold mb-3">Explora por rol</p>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          v-for="r in roles"
          :key="r.id"
          :class="['group text-left rounded-xl border p-4 transition-all',
                   rolActivo === r.id
                     ? 'border-brand-500 bg-brand-50/60 ring-1 ring-brand-200 shadow-soft'
                     : 'border-ink-200 hover:border-brand-300 hover:bg-ink-50']"
          @click="rolActivo = r.id"
        >
          <div :class="['w-10 h-10 rounded-lg grid place-items-center mb-3 transition-colors', r.iconBg]">
            <Icon :name="r.icon" size="w-5 h-5" />
          </div>
          <p class="font-semibold text-ink-900 flex items-center gap-2">
            {{ r.label }}
            <span v-if="auth.rol === r.id" class="text-[10px] font-semibold uppercase tracking-wide text-brand-600 bg-brand-50 ring-1 ring-brand-200 rounded px-1.5 py-0.5">Tú</span>
          </p>
          <p class="text-xs text-ink-500 mt-1 leading-relaxed">{{ r.desc }}</p>
        </button>
      </div>
    </section>

    <!-- FLUJOS DEL ROL -->
    <section :key="rolActivo" class="space-y-8">
      <div v-for="(flujoId, fi) in rolFlujos[rolActivo]" :key="flujoId" class="manual-reveal" :style="{ animationDelay: (fi * 80) + 'ms' }">
        <div class="flex items-center gap-3 mb-5">
          <div :class="['w-11 h-11 rounded-xl grid place-items-center', flujos[flujoId].iconBg]">
            <Icon :name="flujos[flujoId].icon" size="w-6 h-6" />
          </div>
          <div>
            <h2 class="text-lg font-semibold text-ink-900">{{ flujos[flujoId].titulo }}</h2>
            <p class="text-xs text-ink-500">{{ flujos[flujoId].desc }}</p>
          </div>
        </div>

        <!-- TIMELINE DE PASOS -->
        <div class="card-pad">
          <div
            v-for="(paso, i) in flujos[flujoId].pasos"
            :key="i"
            class="relative flex gap-4 pb-6 last:pb-0 manual-reveal"
            :style="{ animationDelay: (fi * 80 + i * 70) + 'ms' }"
          >
            <!-- columna número + línea -->
            <div class="flex flex-col items-center shrink-0">
              <div :class="['relative w-10 h-10 rounded-full grid place-items-center text-white font-semibold shadow-sm',
                            rolMeta(paso.rol).numBg,
                            esMiPaso(paso) ? 'ring-4 ring-brand-200' : '']">
                {{ paso.n }}
              </div>
              <div v-if="i < flujos[flujoId].pasos.length - 1" class="w-0.5 flex-1 bg-ink-200 mt-1.5 rounded-full"></div>
            </div>

            <!-- tarjeta del paso -->
            <div :class="['flex-1 rounded-xl border p-4 transition-colors',
                          esMiPaso(paso) ? 'border-brand-300 bg-brand-50/40 ring-1 ring-brand-100' : 'border-ink-200 bg-white']">
              <div class="flex items-start justify-between gap-3 flex-wrap">
                <div class="flex items-center gap-2.5 min-w-0">
                  <div :class="['w-9 h-9 rounded-lg grid place-items-center shrink-0', rolMeta(paso.rol).softBg]">
                    <Icon :name="paso.icon" size="w-4 h-4" />
                  </div>
                  <h3 class="font-semibold text-ink-900">{{ paso.titulo }}</h3>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                  <span v-if="esMiPaso(paso)" class="text-[10px] font-bold uppercase tracking-wide text-brand-700 bg-brand-100 rounded px-1.5 py-0.5">Tu paso</span>
                  <span :class="['inline-flex items-center gap-1 text-[11px] font-medium rounded-md px-2 py-0.5 ring-1', rolMeta(paso.rol).chip]">
                    <Icon :name="rolMeta(paso.rol).icon" size="w-3 h-3" /> {{ rolMeta(paso.rol).label }}
                  </span>
                </div>
              </div>
              <p class="text-sm text-ink-600 mt-2 leading-relaxed">{{ paso.desc }}</p>
              <div v-if="paso.estado" class="mt-2.5 flex items-center gap-1.5 text-xs text-ink-500">
                <Icon name="chevron-right" size="w-3.5 h-3.5" /> El estado pasa a
                <EstadoBadge :estado="paso.estado" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SECCIONES DEL SISTEMA -->
    <section :key="`sec-${rolActivo}`">
      <div class="flex items-center gap-2 mb-4">
        <Icon name="dashboard" size="w-5 h-5" class="text-brand-600" />
        <h2 class="text-lg font-semibold text-ink-900">Secciones que usas</h2>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <NuxtLink
          v-for="(s, i) in rolSecciones[rolActivo]"
          :key="s.titulo"
          :to="s.to"
          class="group card-pad hover:shadow-card hover:border-brand-200 transition-all manual-reveal"
          :style="{ animationDelay: (i * 50) + 'ms' }"
        >
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Icon :name="s.icon" size="w-5 h-5" />
            </div>
            <h3 class="font-semibold text-ink-900">{{ s.titulo }}</h3>
            <Icon name="chevron-right" size="w-4 h-4" class="ml-auto text-ink-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <p class="text-sm text-ink-600 mt-2 leading-relaxed">{{ s.desc }}</p>
        </NuxtLink>
      </div>
    </section>

    <!-- LEYENDA DE ESTADOS -->
    <section>
      <div class="flex items-center gap-2 mb-4">
        <Icon name="flag" size="w-5 h-5" class="text-brand-600" />
        <h2 class="text-lg font-semibold text-ink-900">Significado de los estados</h2>
      </div>
      <div class="card-pad grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
        <div v-for="e in estados" :key="e.estado" class="flex items-start gap-3 py-1.5">
          <EstadoBadge :estado="e.estado" class="shrink-0 mt-0.5" />
          <p class="text-sm text-ink-600">{{ e.desc }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
const auth = useAuth();

const roles = [
  { id: 'colaborador', label: 'Colaborador', icon: 'briefcase', iconBg: 'bg-brand-50 text-brand-600',   desc: 'Solicita viáticos para sus viajes y comprueba sus gastos.' },
  { id: 'proveedor',   label: 'Proveedor',   icon: 'building',  iconBg: 'bg-violet-50 text-violet-600', desc: 'Registra sus datos fiscales y sube sus facturas (CFDI).' },
  { id: 'finanzas',    label: 'Finanzas',    icon: 'wallet',    iconBg: 'bg-emerald-50 text-emerald-600', desc: 'Realiza los pagos de viáticos y facturas aprobados.' },
  { id: 'admin',       label: 'Administrador', icon: 'users',   iconBg: 'bg-blue-50 text-blue-700',     desc: 'Supervisa y aprueba todo el sistema. Ve el flujo completo.' },
];

const ROL_META = {
  colaborador: { label: 'Colaborador', icon: 'briefcase', numBg: 'bg-brand-600',   softBg: 'bg-brand-50 text-brand-600',     chip: 'bg-brand-50 text-brand-700 ring-brand-200' },
  proveedor:   { label: 'Proveedor',   icon: 'building',  numBg: 'bg-violet-600',  softBg: 'bg-violet-50 text-violet-600',   chip: 'bg-violet-50 text-violet-700 ring-violet-200' },
  finanzas:    { label: 'Finanzas',    icon: 'wallet',    numBg: 'bg-emerald-600', softBg: 'bg-emerald-50 text-emerald-600', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  admin:       { label: 'Administrador', icon: 'users',   numBg: 'bg-blue-700',    softBg: 'bg-blue-50 text-blue-700',       chip: 'bg-blue-50 text-blue-700 ring-blue-200' },
  sistema:     { label: 'Sistema',     icon: 'send',      numBg: 'bg-ink-400',     softBg: 'bg-ink-100 text-ink-600',        chip: 'bg-ink-100 text-ink-600 ring-ink-200' },
};
function rolMeta(rol) { return ROL_META[rol] || ROL_META.sistema; }

const flujos = {
  viaticos: {
    titulo: 'Flujo de viáticos', icon: 'plane', iconBg: 'bg-brand-50 text-brand-600',
    desc: 'Del viaje del colaborador al pago y la comprobación.',
    pasos: [
      { n: 1, rol: 'colaborador', icon: 'plane',   titulo: 'Solicitar viáticos', estado: 'pendiente',
        desc: 'El colaborador captura destino, fechas y motivo, distribuye el monto por categoría (vuelos, hospedaje, alimentos, transporte, otros) y adjunta el justificante de salida.' },
      { n: 2, rol: 'admin', icon: 'check', titulo: 'Revisión y aprobación', estado: 'aprobado',
        desc: 'El administrador revisa la solicitud y la aprueba o la rechaza con un motivo. Al rechazar puede permitir la corrección para que el colaborador la reenvíe.' },
      { n: 3, rol: 'finanzas', icon: 'wallet', titulo: 'Abono del viático', estado: 'pagado',
        desc: 'Finanzas registra el abono indicando la forma de pago (transferencia o tarjeta). Opcionalmente adjunta el comprobante y la referencia bancaria.' },
      { n: 4, rol: 'colaborador', icon: 'receipt', titulo: 'Comprobación de gastos', estado: 'en_proceso',
        desc: 'El colaborador sube los comprobantes de cada gasto. Cada uno descuenta del saldo disponible del viático.' },
      { n: 5, rol: 'colaborador', icon: 'plus', titulo: 'Ajuste si falta presupuesto',
        desc: 'Si el saldo se agota, el colaborador solicita un ajuste con su motivo. El ajuste vuelve a pasar por aprobación del admin y pago de finanzas, y se suma al monto total.' },
      { n: 6, rol: 'admin', icon: 'flag', titulo: 'Cierre del viático', estado: 'cerrado',
        desc: 'Cuando el viaje termina, el administrador o el propio colaborador cierra el viático. Ya no se aceptan más comprobantes ni ajustes.' },
    ],
  },
  facturas: {
    titulo: 'Flujo de proveedores y facturas', icon: 'building', iconBg: 'bg-violet-50 text-violet-600',
    desc: 'Del registro del proveedor al pago de su factura.',
    pasos: [
      { n: 1, rol: 'proveedor', icon: 'document', titulo: 'Registro fiscal', estado: 'pendiente',
        desc: 'El proveedor captura su RFC (validado para persona física o moral), razón social, datos bancarios (CLABE) y adjunta su constancia de situación fiscal.' },
      { n: 2, rol: 'admin', icon: 'check', titulo: 'Aprobación del registro', estado: 'aprobado',
        desc: 'El administrador revisa los datos y la constancia, y aprueba o rechaza el registro. El motivo del rechazo le llega al proveedor por la plataforma y por correo.' },
      { n: 3, rol: 'proveedor', icon: 'upload', titulo: 'Subir factura', estado: 'en_revision',
        desc: 'El proveedor carga el PDF y el XML (CFDI). El sistema lee el XML y extrae automáticamente el UUID, RFC, monto y fecha.' },
      { n: 4, rol: 'admin', icon: 'receipt', titulo: 'Revisión de la factura', estado: 'aprobada',
        desc: 'El administrador revisa la factura y la aprueba o la rechaza con un motivo.' },
      { n: 5, rol: 'finanzas', icon: 'wallet', titulo: 'Pago de la factura', estado: 'pagada',
        desc: 'Finanzas registra el pago con su referencia y comprobante. El proveedor puede descargar el comprobante de pago desde su historial.' },
    ],
  },
  documentos: {
    titulo: 'Flujo de documentos y firma', icon: 'fileText', iconBg: 'bg-blue-50 text-blue-700',
    desc: 'Creación, envío a firma electrónica y seguimiento.',
    pasos: [
      { n: 1, rol: 'admin', icon: 'document', titulo: 'Crear documento o plantilla',
        desc: 'Desde el editor del sistema o subiendo un PDF. Las plantillas se reutilizan para generar documentos nuevos.' },
      { n: 2, rol: 'admin', icon: 'edit', titulo: 'Definir firmantes y campos',
        desc: 'Se asignan los firmantes y se colocan las zonas de firma, iniciales o datos sobre el documento.' },
      { n: 3, rol: 'admin', icon: 'send', titulo: 'Enviar a firma', estado: 'enviado',
        desc: 'El documento se envía a los firmantes mediante DocuSign para su firma electrónica.' },
      { n: 4, rol: 'sistema', icon: 'check', titulo: 'Documento firmado', estado: 'firmado',
        desc: 'Cuando todos firman, el documento queda firmado y disponible para descarga.' },
    ],
  },
};

const rolFlujos = {
  colaborador: ['viaticos'],
  proveedor:   ['facturas'],
  finanzas:    ['viaticos', 'facturas'],
  admin:       ['viaticos', 'facturas', 'documentos'],
};

const rolSecciones = {
  colaborador: [
    { icon: 'plus',      titulo: 'Solicitar viáticos', to: '/viaticos/nueva',     desc: 'Crea una nueva solicitud con su desglose y justificante.' },
    { icon: 'briefcase', titulo: 'Mis viáticos actuales', to: '/viaticos/actual', desc: 'Sigue tus viáticos en curso y sube comprobantes.' },
    { icon: 'history',   titulo: 'Historial', to: '/viaticos/historial',          desc: 'Consulta tus solicitudes anteriores y duplícalas.' },
  ],
  proveedor: [
    { icon: 'document', titulo: 'Mi registro', to: '/proveedores/registro',  desc: 'Tus datos fiscales y bancarios, y el estado de tu registro.' },
    { icon: 'upload',   titulo: 'Subir factura', to: '/proveedores/facturas', desc: 'Carga tus facturas en PDF + XML (CFDI).' },
    { icon: 'history',  titulo: 'Historial', to: '/proveedores/historial',    desc: 'Tus facturas enviadas y sus pagos.' },
  ],
  finanzas: [
    { icon: 'plane',  titulo: 'Pagar viáticos', to: '/finanzas/viaticos',     desc: 'Viáticos y ajustes aprobados listos para abonar.' },
    { icon: 'inbox',  titulo: 'Pagar facturas', to: '/finanzas/pendientes',   desc: 'Facturas de proveedores aprobadas por pagar.' },
    { icon: 'wallet', titulo: 'Historial de pagos', to: '/finanzas/historial', desc: 'Pagos realizados, con detalle y comprobante.' },
    { icon: 'chart',  titulo: 'Reportes', to: '/reportes',                     desc: 'Dashboard y reportes en PDF/CSV.' },
  ],
  admin: [
    { icon: 'plane',    titulo: 'Viáticos', to: '/admin/viaticos',         desc: 'Aprueba, rechaza y da seguimiento a solicitudes y ajustes.' },
    { icon: 'building', titulo: 'Proveedores', to: '/admin/proveedores',   desc: 'Aprueba registros, edita datos y administra proveedores.' },
    { icon: 'receipt',  titulo: 'Facturas', to: '/admin/facturas',         desc: 'Revisa y aprueba las facturas de los proveedores.' },
    { icon: 'fileText', titulo: 'Documentos', to: '/admin/documentos',     desc: 'Crea documentos y envíalos a firma electrónica.' },
    { icon: 'document', titulo: 'Plantillas', to: '/admin/plantillas',     desc: 'Plantillas reutilizables para generar documentos.' },
    { icon: 'wallet',   titulo: 'Pagos', to: '/finanzas/viaticos',         desc: 'El admin también puede registrar pagos como finanzas.' },
    { icon: 'users',    titulo: 'Usuarios', to: '/admin/usuarios',         desc: 'Alta, edición, activación y roles de los usuarios.' },
    { icon: 'send',     titulo: 'Configuración', to: '/admin/configuracion', desc: 'Servidor de correo (SMTP) y ajustes del sistema.' },
    { icon: 'chart',    titulo: 'Reportes', to: '/reportes',               desc: 'Dashboard global y exportación de reportes.' },
  ],
};

const estados = [
  { estado: 'pendiente',  desc: 'Recién creado, esperando revisión del administrador.' },
  { estado: 'aprobado',   desc: 'Aprobado por el administrador; pasa al área correspondiente.' },
  { estado: 'pagado',     desc: 'Finanzas registró el abono. Listo para usar / comprobar.' },
  { estado: 'en_proceso', desc: 'Con comprobantes registrados; el viático está en uso.' },
  { estado: 'cerrado',    desc: 'Finalizado. No admite más movimientos.' },
  { estado: 'rechazado',  desc: 'No aprobado. Si se permitió, puede corregirse y reenviarse.' },
  { estado: 'en_revision', desc: 'Factura cargada, en espera de revisión del administrador.' },
  { estado: 'pagada',     desc: 'Factura pagada por finanzas.' },
  { estado: 'firmado',    desc: 'Documento firmado por todas las partes.' },
];

const esAdmin = computed(() => auth.rol === 'admin');
const rolActivo = ref(['colaborador', 'proveedor', 'finanzas', 'admin'].includes(auth.rol) ? auth.rol : 'admin');

function esMiPaso(paso) {
  if (rolActivo.value === 'admin') return false;
  return paso.rol === rolActivo.value;
}
</script>

<style scoped>
@keyframes manualReveal {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.manual-reveal {
  animation: manualReveal 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}
</style>
