<template>
  <div class="space-y-6">
    <section class="card-pad bg-gradient-to-br from-ink-900 via-brand-900 to-brand-700 text-white border-transparent">
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div class="space-y-1">
          <p class="text-xs uppercase tracking-widest text-brand-200/80">Análisis</p>
          <h1 class="text-2xl font-semibold tracking-tight">Reportes y métricas</h1>
          <p class="text-sm text-brand-100/80">
            Indicadores de viáticos y facturas en el rango seleccionado.
          </p>
        </div>
        <div class="flex items-end gap-3 flex-wrap">
          <div>
            <label class="block text-xs uppercase tracking-wide text-brand-200/80 mb-1">Desde</label>
            <DateInput v-model="filtros.desde" class="!bg-white/10 !border-white/20 !text-white" />
          </div>
          <div>
            <label class="block text-xs uppercase tracking-wide text-brand-200/80 mb-1">Hasta</label>
            <DateInput v-model="filtros.hasta" :min-date="filtros.desde || null" class="!bg-white/10 !border-white/20 !text-white" />
          </div>
          <button class="btn-primary !bg-white !text-brand-700 hover:!bg-brand-50" :disabled="cargando" @click="cargar">
            <Icon name="search" size="w-4 h-4" /> {{ cargando ? 'Cargando...' : 'Aplicar' }}
          </button>
          <button class="btn-primary !bg-white/15 !text-white !border !border-white/25 hover:!bg-white/25" :disabled="descargandoPdf" @click="descargarDashboardPdf">
            <Icon name="download" size="w-4 h-4" /> {{ descargandoPdf ? 'Generando...' : 'Descargar PDF' }}
          </button>
          <button class="btn-primary !bg-white/15 !text-white !border !border-white/25 hover:!bg-white/25" :disabled="descargandoCsv" @click="descargarDashboardCsv">
            <Icon name="download" size="w-4 h-4" /> {{ descargandoCsv ? 'Generando...' : 'CSV' }}
          </button>
        </div>
      </div>
    </section>

    <div class="flex items-center gap-1 border-b border-ink-200">
      <button
        v-for="t in tabs"
        :key="t.key"
        class="px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2"
        :class="tab === t.key ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800'"
        @click="tab = t.key"
      >
        <Icon :name="t.icon" size="w-4 h-4" /> {{ t.label }}
      </button>
    </div>

    <div v-if="cargando && !data" class="card-pad text-ink-500">Cargando dashboard...</div>

    <template v-else-if="data">
      <section v-if="tab === 'viaticos'" class="space-y-6">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Solicitudes" :value="v.kpis.total" icon="briefcase" color="brand" :sub="`${v.kpis.pendientes} pendientes`" />
          <KpiCard label="Monto total" :value="fmtMoney(v.kpis.monto_total)" icon="wallet" color="violet" :sub="`Ticket prom. ${fmtMoney(v.kpis.ticket_promedio)}`" />
          <KpiCard label="Por pagar" :value="fmtMoney(v.kpis.monto_por_pagar)" icon="history" color="amber" :sub="`${v.kpis.aprobados} aprobados`" />
          <KpiCard label="Gastado" :value="fmtMoney(v.kpis.monto_gastado)" icon="receipt" color="emerald" :sub="`${v.kpis.cerrados} cerrados`" />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="card-pad lg:col-span-2 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-ink-900">Evolución mensual</h3>
                <p class="text-xs text-ink-500">Solicitudes y monto total por mes</p>
              </div>
              <span class="text-xs text-ink-500">{{ v.por_mes.length }} mes(es)</span>
            </div>
            <BarChart v-if="v.por_mes.length" :series="v.por_mes" label-key="mes" value-key="monto" count-key="count" />
            <div v-else class="text-sm text-ink-400 py-12 text-center">Sin datos en el rango</div>
          </div>

          <div class="card-pad space-y-4">
            <div>
              <h3 class="font-semibold text-ink-900">Por estado</h3>
              <p class="text-xs text-ink-500">Distribución de solicitudes</p>
            </div>
            <DonutChart v-if="v.por_estado.length" :series="v.por_estado" label-key="estado" value-key="count" :colors="ESTADO_COLORS" />
            <div v-else class="text-sm text-ink-400 py-12 text-center">Sin datos</div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopList title="Top destinos" subtitle="Por monto solicitado" icon="plane" :items="v.top_destinos" name-key="destino" />
          <TopList title="Top colaboradores" subtitle="Por monto solicitado" icon="users" :items="v.top_colaboradores" name-key="colaborador" />
        </div>
      </section>

      <section v-if="tab === 'facturas'" class="space-y-6">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Facturas" :value="f.kpis.total" icon="document" color="brand" :sub="`${f.kpis.pendientes} pendientes`" />
          <KpiCard label="Monto total" :value="fmtMoney(f.kpis.monto_total)" icon="wallet" color="violet" />
          <KpiCard label="Por pagar" :value="fmtMoney(f.kpis.monto_por_pagar)" icon="history" color="amber" :sub="`${f.kpis.aprobadas} aprobadas`" />
          <KpiCard label="Pagadas" :value="fmtMoney(f.kpis.monto_pagado)" icon="check" color="emerald" :sub="`${f.kpis.pagadas} facturas`" />
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="card-pad lg:col-span-2 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-ink-900">Evolución mensual</h3>
                <p class="text-xs text-ink-500">Facturas emitidas por mes</p>
              </div>
              <span class="text-xs text-ink-500">{{ f.por_mes.length }} mes(es)</span>
            </div>
            <BarChart v-if="f.por_mes.length" :series="f.por_mes" label-key="mes" value-key="monto" count-key="count" />
            <div v-else class="text-sm text-ink-400 py-12 text-center">Sin datos en el rango</div>
          </div>

          <div class="card-pad space-y-4">
            <div>
              <h3 class="font-semibold text-ink-900">Por estado</h3>
              <p class="text-xs text-ink-500">Distribución de facturas</p>
            </div>
            <DonutChart v-if="f.por_estado.length" :series="f.por_estado" label-key="estado" value-key="count" :colors="ESTADO_COLORS" />
            <div v-else class="text-sm text-ink-400 py-12 text-center">Sin datos</div>
          </div>
        </div>

        <TopList title="Top proveedores" subtitle="Por monto facturado" icon="building" :items="f.top_proveedores" name-key="proveedor" />
      </section>
    </template>

    <section class="card-pad space-y-5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Icon name="download" /></div>
        <div>
          <h3 class="font-semibold text-ink-900">Exportar a PDF</h3>
          <p class="text-xs text-ink-500">Genera un reporte detallado con los registros del módulo</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Módulo</label>
          <select v-model="pdf.modulo" class="input">
            <option value="viaticos">Viáticos</option>
            <option value="proveedores">Proveedores / Facturas</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Estado (opcional)</label>
          <input v-model="pdf.estado" placeholder="ej. aprobado, pagada..." class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Desde</label>
          <DateInput v-model="pdf.desde" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Hasta</label>
          <DateInput v-model="pdf.hasta" :min-date="pdf.desde || null" />
        </div>
      </div>

      <div class="flex items-center justify-between border-t border-ink-100 pt-4">
        <p class="text-xs text-ink-500">El PDF incluye folio, montos, fechas y estado de cada registro.</p>
        <button class="btn-primary" :disabled="generandoPdf" @click="generarPdf">
          <Icon name="download" size="w-4 h-4" /> {{ generandoPdf ? 'Generando...' : 'Descargar PDF' }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
const api = useApi();
const toast = useToast();

const hoy = new Date();
const seisMesesAtras = new Date(hoy.getFullYear(), hoy.getMonth() - 5, 1);

const filtros = reactive({
  desde: seisMesesAtras.toISOString().slice(0, 10),
  hasta: hoy.toISOString().slice(0, 10),
});

const data = ref(null);
const cargando = ref(false);
const tab = ref('viaticos');

const tabs = [
  { key: 'viaticos', label: 'Viáticos', icon: 'briefcase' },
  { key: 'facturas', label: 'Facturas', icon: 'document' },
];

const ESTADO_COLORS = {
  pendiente: '#f59e0b',
  aprobado: '#1b347d',
  aprobada: '#1b347d',
  pagado: '#67ae3e',
  pagada: '#67ae3e',
  en_proceso: '#8b5cf6',
  cerrado: '#64748b',
  rechazado: '#ef4444',
  rechazada: '#ef4444',
  cancelado: '#94a3b8',
};

const v = computed(() => data.value?.viaticos || { kpis: {}, por_estado: [], por_mes: [], top_destinos: [], top_colaboradores: [] });
const f = computed(() => data.value?.facturas || { kpis: {}, por_estado: [], por_mes: [], top_proveedores: [] });

function fmtMoney(n) {
  const v = Number(n || 0);
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

async function cargar() {
  cargando.value = true;
  try {
    const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
    data.value = await api.get(`/reportes/dashboard${qs ? '?' + qs : ''}`);
  } catch (e) {
    toast.error('No se pudo cargar', e.message);
  } finally { cargando.value = false; }
}

onMounted(cargar);

const pdf = reactive({ modulo: 'viaticos', estado: '', desde: '', hasta: '' });
const generandoPdf = ref(false);
const descargandoPdf = ref(false);
const descargandoCsv = ref(false);

async function generarPdf() {
  generandoPdf.value = true;
  toast.info('Generando reporte', 'Preparando archivo PDF...');
  try {
    const qs = new URLSearchParams(Object.entries(pdf).filter(([, v]) => v)).toString();
    await api.download(`/reportes?${qs}`, `reporte-${pdf.modulo}.pdf`);
    toast.success('Reporte descargado', 'Tu archivo se descargó correctamente');
  } catch (e) { toast.error('No se pudo generar el reporte', e.message); }
  finally { generandoPdf.value = false; }
}

async function descargarDashboardPdf() {
  descargandoPdf.value = true;
  toast.info('Generando dashboard', 'Preparando PDF con KPIs y gráficas...');
  try {
    const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
    await api.download(`/reportes/dashboard.pdf${qs ? '?' + qs : ''}`, `dashboard-${filtros.desde}-${filtros.hasta}.pdf`);
    toast.success('Dashboard descargado', 'Tu archivo se descargó correctamente');
  } catch (e) { toast.error('No se pudo generar', e.message); }
  finally { descargandoPdf.value = false; }
}

async function descargarDashboardCsv() {
  descargandoCsv.value = true;
  try {
    const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
    if (tab.value === 'viaticos') {
      await api.download(`/reportes/viaticos.csv${qs ? '?' + qs : ''}`, 'REPORTE VIATICOS.csv');
    } else {
      await api.download(`/reportes/dashboard.csv${qs ? '?' + qs : ''}`, `dashboard-${filtros.desde}-${filtros.hasta}.csv`);
    }
    toast.success('CSV descargado', 'Reporte exportado correctamente');
  } catch (e) { toast.error('No se pudo generar', e.message); }
  finally { descargandoCsv.value = false; }
}
</script>
