<template>
  <Modal :title="`Cerrar viáticos ${viatico.folio}`" size="lg" @close="cerrar">
    <div v-if="cargando" class="py-8 text-center">
      <div class="mx-auto w-10 h-10 rounded-full border-[3px] border-brand-100 border-t-brand-600 animate-spin"></div>
      <p class="mt-3 text-sm text-ink-500">Cargando…</p>
    </div>

    <div v-else-if="cerrando" class="py-8 text-center">
      <div class="mx-auto w-12 h-12 rounded-full border-[3px] border-brand-100 border-t-brand-600 animate-spin"></div>
      <p class="mt-4 font-semibold text-ink-800">Cerrando y enviando a firma…</p>
      <p class="text-sm text-ink-500 mt-1">Se generan el oficio y el informe de comisión. Puede tardar unos segundos.</p>
    </div>

    <form v-else id="form-cerrar-viatico" class="space-y-4 text-sm" @submit.prevent="confirmar">
      <p class="text-ink-700">
        ¿Confirmas el cierre de estos viáticos? Una vez cerrados no se podrán agregar más comprobantes ni solicitar ajustes.
      </p>

      <div class="rounded-lg bg-ink-50 border border-ink-200 p-3 space-y-1">
        <div class="flex justify-between"><span class="text-ink-500">Total aprobado</span><strong>{{ dinero(total) }}</strong></div>
        <div class="flex justify-between"><span class="text-ink-500">Gastado (monto comprobado)</span><strong>{{ dinero(gastado) }}</strong></div>
        <div class="flex justify-between border-t border-ink-200 pt-1 mt-1">
          <span class="text-ink-500">Diferencia</span>
          <strong :class="total - gastado < 0 ? 'text-red-600' : 'text-emerald-600'">{{ dinero(total - gastado) }}</strong>
        </div>
      </div>

      <div>
        <p class="font-medium text-ink-900 mb-2">Datos del informe de comisión</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-ink-600 mb-1">Ret ISR <span class="text-red-500">*</span></label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">$</span>
              <input v-model="form.ret_isr" type="number" step="0.01" min="0" required class="input pl-7" placeholder="0.00" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-ink-600 mb-1">Monto total <span class="text-red-500">*</span></label>
            <div class="relative">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">$</span>
              <input v-model="form.monto_total" type="number" step="0.01" min="0" required class="input pl-7" placeholder="0.00" />
            </div>
          </div>
        </div>
      </div>

      <div v-if="!yaFirmado" class="rounded-lg border border-brand-100 bg-brand-50/40 p-3 space-y-3">
        <div class="flex items-start gap-2">
          <Icon name="send" size="w-4 h-4" class="text-brand-600 mt-0.5 shrink-0" />
          <div>
            <p class="font-medium text-ink-900">Al cerrar se enviarán a firma, en un solo enlace:</p>
            <ul class="mt-1 text-ink-600 list-disc pl-5 space-y-0.5">
              <li>Oficio de comisión</li>
              <li>Informe de comisión con gastos y bitácoras</li>
            </ul>
            <p class="mt-1 text-xs text-ink-500">Firma primero quien autoriza y, cuando firma, se notifica a quien recibe.</p>
          </div>
        </div>
        <div v-for="f in FIRMANTES" :key="f.key">
          <label class="block text-xs font-medium text-ink-600 mb-1">
            {{ f.label }}: <span class="text-ink-900">{{ sugeridos[f.key].nombre || 'Sin asignar' }}</span>
          </label>
          <input v-model.trim="form.correos[f.key]" type="email" required class="input" placeholder="correo@ejemplo.com" />
          <p v-if="!sugeridos[f.key].email" class="text-xs text-amber-600 mt-1">No es un usuario con correo registrado: captúralo.</p>
        </div>
        <p v-if="!sugeridos.autoriza.nombre" class="text-red-600">
          Este viático no tiene asignado quién autoriza. Edítalo y elige "Autorizado por" antes de cerrarlo.
        </p>
      </div>
      <div v-else class="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-700 flex items-center gap-2">
        <Icon name="check" size="w-4 h-4" /> Los documentos de este viático ya están firmados; no se reenviarán.
      </div>

      <p v-if="error" class="text-red-600">{{ error }}</p>
    </form>

    <template v-if="!cargando && !cerrando" #footer>
      <button class="btn-secondary" @click="cerrar">Cancelar</button>
      <button
        type="submit"
        form="form-cerrar-viatico"
        class="btn-success"
        :disabled="!yaFirmado && !sugeridos.autoriza.nombre"
      >
        {{ yaFirmado ? 'Cerrar viáticos' : 'Cerrar y enviar a firma' }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
// Cierre del viático (administración o finanzas): pide Ret ISR y Monto total del
// informe de comisión y los correos de los firmantes; al confirmar, el backend
// cierra el viático y envía el oficio + el informe a firma en un solo enlace.
const props = defineProps({
  // { id, folio, monto_total, monto_gastado, informe? }
  viatico: { type: Object, required: true },
});
const emit = defineEmits(['close', 'cerrado']);

const api = useApi();
const toast = useToast();

const FIRMANTES = [
  { key: 'autoriza', label: '1. Autoriza' },
  { key: 'recibe', label: '2. Recibe' },
];

const total = computed(() => Number(props.viatico.monto_total || 0));
const gastado = computed(() => Number(props.viatico.monto_gastado || 0));
const dinero = (n) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const cargando = ref(true);
const cerrando = ref(false);
const error = ref('');
const yaFirmado = ref(false);
const sugeridos = reactive({ autoriza: { nombre: '', email: '' }, recibe: { nombre: '', email: '' } });
const form = reactive({
  ret_isr: props.viatico.informe?.ret_isr ?? '',
  monto_total: props.viatico.informe?.monto_total ?? '',
  correos: { autoriza: '', recibe: '' },
});

onMounted(async () => {
  try {
    const data = await api.get(`/viaticos/${props.viatico.id}/oficio/firma`);
    Object.assign(sugeridos, data.sugeridos);
    yaFirmado.value = data.documento?.estado === 'firmado';
    // Se proponen los correos del envío anterior, si lo hubo
    const previo = (rol) => data.documento?.firmantes?.find((f) => f.rol === rol)?.email;
    form.correos.autoriza = previo('autoriza') || data.sugeridos.autoriza.email || '';
    form.correos.recibe = previo('recibe') || data.sugeridos.recibe.email || '';
  } catch (e) {
    error.value = e.message;
  } finally {
    cargando.value = false;
  }
});

function cerrar() {
  if (!cerrando.value) emit('close');
}

async function confirmar() {
  error.value = '';
  cerrando.value = true;
  try {
    const res = await api.post(`/viaticos/${props.viatico.id}/cerrar`, {
      ret_isr: form.ret_isr,
      monto_total: form.monto_total,
      autoriza_email: form.correos.autoriza,
      recibe_email: form.correos.recibe,
    });
    if (res.firma?.enviado && res.firma.correo_error) {
      toast.warning(
        'Viáticos cerrados; el correo de firma no se envió',
        'Los documentos quedaron listos para firmar. Copia el enlace desde "Documentos de viáticos" y compártelo.',
        { duration: 10000 },
      );
    } else if (res.firma?.enviado) {
      toast.success(
        'Viáticos cerrados y enviados a firma',
        `Se envió el oficio y el informe de ${props.viatico.folio} a ${res.firma.autoriza} (autoriza).`,
      );
    } else if (res.firma?.error) {
      toast.warning(
        'Viáticos cerrados, pero no se enviaron a firma',
        `${res.firma.error} Reintenta desde "Documentos de viáticos".`,
        { duration: 10000 },
      );
    } else {
      toast.success('Viáticos cerrados', `${props.viatico.folio} se cerró correctamente.`);
    }
    emit('cerrado', res);
  } catch (e) {
    error.value = e.message;
  } finally {
    cerrando.value = false;
  }
}
</script>
