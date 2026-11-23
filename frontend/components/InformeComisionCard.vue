<template>
  <section class="card overflow-hidden">
    <div class="px-5 py-4 border-b border-ink-100 flex items-center justify-between gap-4 flex-wrap">
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 grid place-items-center shrink-0"><Icon name="book" /></div>
        <div class="min-w-0">
          <h3 class="text-base font-semibold text-ink-900">Informe de comisión con gastos y bitácoras</h3>
          <p class="text-xs text-ink-500 mt-0.5">
            <span v-if="completo" class="text-emerald-600 font-medium">Completo</span>
            <span v-else class="text-amber-600 font-medium">Pendiente: {{ faltantes.join(', ') }}</span>
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0 flex-wrap">
        <button class="btn-secondary text-sm" @click="verPdf">
          <Icon name="eye" size="w-4 h-4" /> Ver informe
        </button>
        <button class="btn-secondary text-sm" :disabled="descargando" @click="descargarExcel">
          <Icon name="download" size="w-4 h-4" /> {{ descargando ? 'Descargando...' : 'Excel' }}
        </button>
        <button v-if="puedeEditar" class="btn-primary text-sm" @click="abrir">
          <Icon :name="inf ? 'edit' : 'plus'" size="w-4 h-4" /> {{ inf ? 'Editar' : 'Llenar informe' }}
        </button>
      </div>
    </div>

    <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
      <div>
        <p class="text-xs font-medium text-ink-500 uppercase tracking-wide">Objetivo de la salida</p>
        <p class="mt-1 text-ink-800 whitespace-pre-line">{{ sol.motivo || '—' }}</p>
      </div>
      <div>
        <p class="text-xs font-medium text-ink-500 uppercase tracking-wide">Fecha de presentación</p>
        <p class="mt-1 text-ink-800">{{ fechaLarga(inf?.fecha_presentacion) || '—' }}</p>
      </div>
      <div class="md:col-span-2">
        <p class="text-xs font-medium text-ink-500 uppercase tracking-wide">Resumen de la salida</p>
        <p class="mt-1 text-ink-800 whitespace-pre-line line-clamp-4">{{ inf?.resumen || '—' }}</p>
      </div>
      <div>
        <p class="text-xs font-medium text-ink-500 uppercase tracking-wide">Nota</p>
        <p class="mt-1 text-ink-800 whitespace-pre-line">{{ inf?.nota || '—' }}</p>
      </div>
      <div>
        <p class="text-xs font-medium text-ink-500 uppercase tracking-wide">Bitácora de kilometraje</p>
        <p v-if="inf?.usa_vehiculo" class="mt-1 text-ink-800">
          {{ [inf.vehiculo_marca, inf.vehiculo_submarca, inf.vehiculo_modelo].filter(Boolean).join(' ') || 'Vehículo' }}
          <span v-if="inf.vehiculo_placa" class="text-ink-500">· {{ inf.vehiculo_placa }}</span>
          <span class="block text-xs text-ink-500 mt-0.5">
            {{ totalKm(inf.kilometraje).toLocaleString('es-MX') }} km · {{ dinero(totalMontoKm(inf.kilometraje)) }} en combustible
          </span>
        </p>
        <p v-else class="mt-1 text-ink-400 italic">No aplica (sin vehículo)</p>
      </div>
      <div class="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-ink-100">
        <div>
          <p class="text-xs text-ink-500">Monto solicitado</p>
          <p class="font-semibold text-ink-900">{{ dinero(solicitado) }}</p>
        </div>
        <div>
          <p class="text-xs text-ink-500">Monto comprobado</p>
          <p class="font-semibold text-ink-900">{{ dinero(comprobado) }}</p>
        </div>
        <div>
          <p class="text-xs text-ink-500">Diferencia por depositar o pagar</p>
          <p class="font-semibold" :class="solicitado - comprobado < 0 ? 'text-red-600' : 'text-ink-900'">{{ dinero(solicitado - comprobado) }}</p>
        </div>
        <div>
          <p class="text-xs text-ink-500">Ret. ISR / Monto total</p>
          <p class="font-semibold text-ink-900">
            {{ inf?.ret_isr != null ? dinero(inf.ret_isr) : '—' }} / {{ inf?.monto_total != null ? dinero(inf.monto_total) : '—' }}
          </p>
          <p class="text-[11px] text-ink-400">Los llena administración</p>
        </div>
      </div>
    </div>

    <FileViewer
      v-if="visorAbierto"
      :path="`/viaticos/${sol.id}/informe/pdf`"
      title="Informe de comisión con gastos y bitácoras"
      :subtitle="sol.folio"
      :download-name="`informe-comision-${sol.folio}.pdf`"
      @close="visorAbierto = false"
    />

    <Modal v-if="modal.abierto" :title="`Informe de comisión · ${sol.folio}`" size="3xl" @close="cerrar">
      <form id="informe-comision-form" class="space-y-5" @submit.prevent="guardar">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="sm:col-span-2">
            <label class="block text-xs font-medium text-ink-600 mb-1">Objetivo de la salida</label>
            <textarea v-model="form.objetivo" rows="3" maxlength="5000" class="input" placeholder="¿Para qué fue la comisión?" />
            <p class="text-[11px] text-ink-400 mt-1">Es el mismo motivo del viático: si lo cambias aquí, también cambia el motivo.</p>
          </div>
          <div>
            <label class="block text-xs font-medium text-ink-600 mb-1">Fecha de presentación</label>
            <DateInput v-model="form.fecha_presentacion" />
            <p class="text-[11px] text-ink-400 mt-1">Fecha en que se presenta la comprobación</p>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium text-ink-600 mb-1">Resumen de la salida</label>
          <textarea v-model="form.resumen" rows="5" maxlength="10000" class="input" placeholder="Describe lo que se hizo durante la salida" />
        </div>

        <div>
          <label class="block text-xs font-medium text-ink-600 mb-1">Nota</label>
          <textarea v-model="form.nota" rows="2" maxlength="2000" class="input" placeholder="Notas específicas de la comprobación (opcional)" />
        </div>

        <div class="rounded-xl border border-ink-200">
          <label class="flex items-center gap-3 px-4 py-3 cursor-pointer select-none">
            <input v-model="form.usa_vehiculo" type="checkbox" class="w-4 h-4 accent-brand-600" />
            <span>
              <span class="block text-sm font-medium text-ink-900">Bitácora de kilometraje</span>
              <span class="block text-xs text-ink-500">Solo si en la salida se usó vehículo y se cargó gasolina</span>
            </span>
          </label>

          <div v-if="form.usa_vehiculo" class="px-4 pb-4 space-y-4 border-t border-ink-100 pt-4">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label class="block text-xs font-medium text-ink-600 mb-1">Marca</label>
                <input v-model="form.vehiculo_marca" maxlength="80" class="input" />
              </div>
              <div>
                <label class="block text-xs font-medium text-ink-600 mb-1">Submarca</label>
                <input v-model="form.vehiculo_submarca" maxlength="80" class="input" />
              </div>
              <div>
                <label class="block text-xs font-medium text-ink-600 mb-1">Modelo</label>
                <input v-model="form.vehiculo_modelo" maxlength="80" class="input" />
              </div>
              <div>
                <label class="block text-xs font-medium text-ink-600 mb-1">Placa</label>
                <input v-model="form.vehiculo_placa" maxlength="30" class="input uppercase" />
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-xs text-ink-500 text-left">
                    <th class="py-1 pr-2 font-medium">Comentarios</th>
                    <th class="py-1 px-1 font-medium w-24">Km inicial</th>
                    <th class="py-1 px-1 font-medium w-24">Km final</th>
                    <th class="py-1 px-1 font-medium w-20 text-right">Recorridos</th>
                    <th class="py-1 px-1 font-medium w-20">Litros</th>
                    <th class="py-1 px-1 font-medium w-28">Monto $</th>
                    <th class="w-8" />
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(r, i) in form.kilometraje" :key="i">
                    <td class="py-1 pr-2"><input v-model="r.comentarios" maxlength="300" class="input" placeholder="Ruta o motivo" /></td>
                    <td class="py-1 px-1"><input v-model="r.km_inicial" type="number" min="0" step="any" class="input" /></td>
                    <td class="py-1 px-1"><input v-model="r.km_final" type="number" min="0" step="any" class="input" /></td>
                    <td class="py-1 px-1 text-right text-ink-700 tabular-nums">{{ recorridos(r) ?? '—' }}</td>
                    <td class="py-1 px-1"><input v-model="r.litros" type="number" min="0" step="any" class="input" /></td>
                    <td class="py-1 px-1"><input v-model="r.monto" type="number" min="0" step="0.01" class="input" /></td>
                    <td class="py-1 pl-1">
                      <button type="button" class="text-ink-400 hover:text-red-600" title="Quitar fila" @click="form.kilometraje.splice(i, 1)">
                        <Icon name="trash" size="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="text-sm font-semibold text-ink-900 border-t border-ink-100">
                    <td class="pt-2">Total</td>
                    <td /><td />
                    <td class="pt-2 px-1 text-right tabular-nums">{{ totalKm(form.kilometraje).toLocaleString('es-MX') }}</td>
                    <td class="pt-2 px-1 tabular-nums">{{ totalLitros(form.kilometraje).toLocaleString('es-MX') }}</td>
                    <td class="pt-2 px-1 tabular-nums">{{ dinero(totalMontoKm(form.kilometraje)) }}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              <button type="button" class="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1" @click="agregarFila">
                <Icon name="plus" size="w-4 h-4" /> Agregar tramo
              </button>
            </div>
          </div>
        </div>

        <p v-if="modal.error" class="text-sm text-red-600">{{ modal.error }}</p>
      </form>
      <template #footer>
        <button class="btn-secondary" :disabled="modal.guardando" @click="cerrar">Cancelar</button>
        <button form="informe-comision-form" type="submit" class="btn-primary" :disabled="modal.guardando">
          {{ modal.guardando ? 'Guardando...' : 'Guardar informe' }}
        </button>
      </template>
    </Modal>
  </section>
</template>

<script setup>
// Tarjeta del "Informe de comisión con gastos y bitácoras" (formato 7.1) en el
// detalle del viático: resumen, edición de los datos que captura el
// colaborador y descarga del documento (PDF / Excel) que genera el backend.
const props = defineProps({
  sol: { type: Object, required: true },
  puedeEditar: { type: Boolean, default: false },
});
const emit = defineEmits(['actualizado']);

const api = useApi();
const toast = useToast();

const inf = computed(() => props.sol.informe || null);
const solicitado = computed(() => Number(props.sol.monto_total || 0));
const comprobado = computed(() => (props.sol.gastos || []).reduce((t, g) => t + Number(g.monto || 0), 0));

const faltantes = computed(() => {
  const f = [];
  if (!props.sol.motivo) f.push('objetivo');
  if (!inf.value?.fecha_presentacion) f.push('fecha de presentación');
  if (!inf.value?.resumen) f.push('resumen');
  return f;
});
const completo = computed(() => faltantes.value.length === 0);

const dinero = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const numero = (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));
function recorridos(r) {
  const ini = numero(r.km_inicial); const fin = numero(r.km_final);
  return ini !== null && fin !== null ? fin - ini : null;
}
const totalKm = (rows = []) => rows.reduce((t, r) => t + (recorridos(r) || 0), 0);
const totalLitros = (rows = []) => rows.reduce((t, r) => t + (numero(r.litros) || 0), 0);
const totalMontoKm = (rows = []) => rows.reduce((t, r) => t + (numero(r.monto) || 0), 0);

function fechaLarga(d) {
  if (!d) return '';
  const dt = new Date(`${String(d).slice(0, 10)}T12:00:00`);
  return isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}
function hoyIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const filaVacia = () => ({ comentarios: '', km_inicial: '', km_final: '', litros: '', monto: '' });

const form = reactive({
  objetivo: '', fecha_presentacion: '', nota: '', resumen: '', usa_vehiculo: false,
  vehiculo_marca: '', vehiculo_submarca: '', vehiculo_modelo: '', vehiculo_placa: '', kilometraje: [],
});
const modal = reactive({ abierto: false, guardando: false, error: '' });

function abrir() {
  const i = inf.value || {};
  Object.assign(form, {
    objetivo: props.sol.motivo || '',
    fecha_presentacion: i.fecha_presentacion ? String(i.fecha_presentacion).slice(0, 10) : hoyIso(),
    nota: i.nota || '',
    resumen: i.resumen || '',
    usa_vehiculo: !!i.usa_vehiculo,
    vehiculo_marca: i.vehiculo_marca || '',
    vehiculo_submarca: i.vehiculo_submarca || '',
    vehiculo_modelo: i.vehiculo_modelo || '',
    vehiculo_placa: i.vehiculo_placa || '',
    kilometraje: (i.kilometraje?.length ? i.kilometraje : [filaVacia()]).map((r) => ({ ...filaVacia(), ...r })),
  });
  Object.assign(modal, { abierto: true, guardando: false, error: '' });
}

function cerrar() {
  if (!modal.guardando) modal.abierto = false;
}

function agregarFila() {
  form.kilometraje.push(filaVacia());
}

async function guardar() {
  const filas = form.kilometraje.filter((r) => Object.values(r).some((v) => v !== '' && v !== null));
  const malas = filas.filter((r) => (recorridos(r) ?? 0) < 0);
  if (form.usa_vehiculo && malas.length) {
    modal.error = 'El kilometraje final no puede ser menor que el inicial.';
    return;
  }
  modal.guardando = true; modal.error = '';
  try {
    const informe = await api.put(`/viaticos/${props.sol.id}/informe`, {
      objetivo: form.objetivo.trim(),
      fecha_presentacion: form.fecha_presentacion || '',
      nota: form.nota.trim(),
      resumen: form.resumen.trim(),
      usa_vehiculo: form.usa_vehiculo,
      vehiculo_marca: form.usa_vehiculo ? form.vehiculo_marca.trim() : '',
      vehiculo_submarca: form.usa_vehiculo ? form.vehiculo_submarca.trim() : '',
      vehiculo_modelo: form.usa_vehiculo ? form.vehiculo_modelo.trim() : '',
      vehiculo_placa: form.usa_vehiculo ? form.vehiculo_placa.trim().toUpperCase() : '',
      kilometraje: form.usa_vehiculo
        ? filas.map((r) => ({
          comentarios: (r.comentarios || '').trim(),
          km_inicial: numero(r.km_inicial) ?? '',
          km_final: numero(r.km_final) ?? '',
          litros: numero(r.litros) ?? '',
          monto: numero(r.monto) ?? '',
        }))
        : [],
    });
    toast.success('Informe guardado', 'Los datos del informe de comisión se actualizaron.');
    modal.abierto = false;
    emit('actualizado', informe);
  } catch (e) {
    modal.error = e.message;
  } finally {
    modal.guardando = false;
  }
}

const visorAbierto = ref(false);
function verPdf() {
  visorAbierto.value = true;
}

const descargando = ref(false);
async function descargarExcel() {
  descargando.value = true;
  try {
    await api.download(`/viaticos/${props.sol.id}/informe/xlsx`, `informe-comision-${props.sol.folio}.xlsx`);
  } catch (e) {
    toast.error('No se pudo descargar', e.message);
  } finally {
    descargando.value = false;
  }
}
</script>
