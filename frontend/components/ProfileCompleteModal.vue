<template>
  <Modal v-if="visible" title="Completa tu perfil" size="sm" @close="cerrar">
    <!-- Intro -->
    <div class="flex items-center gap-3 mb-5">
      <div class="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 grid place-items-center shrink-0 ring-1 ring-brand-100">
        <Icon name="user" size="w-6 h-6" />
      </div>
      <div>
        <p class="text-sm font-semibold text-ink-900">¡Hola, {{ nombre }}!</p>
        <p class="text-xs text-ink-500 mt-0.5 leading-relaxed">
          Algunos datos de tu perfil están incompletos.<br>Agrégalos para agilizar tus viáticos.
        </p>
      </div>
    </div>

    <!-- Status rows -->
    <div class="space-y-2">
      <!-- RFC -->
      <div :class="['flex items-center gap-3 rounded-xl border p-3', tieneRFC ? 'border-emerald-200 bg-emerald-50/60' : 'border-ink-200 bg-ink-50/60']">
        <div :class="['w-9 h-9 rounded-lg grid place-items-center shrink-0', tieneRFC ? 'bg-emerald-100 text-emerald-600' : 'bg-ink-100 text-ink-400']">
          <Icon :name="tieneRFC ? 'check' : 'hash'" size="w-4 h-4" />
        </div>
        <div class="flex-1 min-w-0">
          <p :class="['text-sm font-semibold', tieneRFC ? 'text-emerald-800' : 'text-ink-500']">RFC fiscal</p>
          <p :class="['text-xs mt-0.5', tieneRFC ? 'text-emerald-600' : 'text-ink-400']">
            {{ tieneRFC ? 'Registrado correctamente' : 'Necesario para comprobantes fiscales' }}
          </p>
        </div>
        <span :class="['text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0', tieneRFC ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500']">
          {{ tieneRFC ? 'Listo' : 'Pendiente' }}
        </span>
      </div>

      <!-- Cuenta bancaria -->
      <div :class="['flex items-center gap-3 rounded-xl border p-3', tieneCuenta ? 'border-emerald-200 bg-emerald-50/60' : 'border-ink-200 bg-ink-50/60']">
        <div :class="['w-9 h-9 rounded-lg grid place-items-center shrink-0', tieneCuenta ? 'bg-emerald-100 text-emerald-600' : 'bg-ink-100 text-ink-400']">
          <Icon :name="tieneCuenta ? 'check' : 'credit-card'" size="w-4 h-4" />
        </div>
        <div class="flex-1 min-w-0">
          <p :class="['text-sm font-semibold', tieneCuenta ? 'text-emerald-800' : 'text-ink-500']">Cuenta bancaria</p>
          <p :class="['text-xs mt-0.5', tieneCuenta ? 'text-emerald-600' : 'text-ink-400']">
            {{ tieneCuenta ? `${cuentas.length} cuenta(s) registrada(s)` : 'Para recibir depósitos de viáticos' }}
          </p>
        </div>
        <span :class="['text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0', tieneCuenta ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-500']">
          {{ tieneCuenta ? 'Listo' : 'Pendiente' }}
        </span>
      </div>
    </div>

    <!-- "Ya no molestar" como leyenda con checkbox debajo de las filas -->
    <label
      v-if="mostrarNoMolestar"
      class="mt-4 flex items-center gap-2 cursor-pointer select-none w-fit"
    >
      <input
        v-model="nagChecked"
        type="checkbox"
        class="w-3.5 h-3.5 rounded accent-ink-400 cursor-pointer"
        :disabled="ignorando"
      />
      <span class="text-xs text-ink-400">Ya no molestar</span>
    </label>

    <template #footer>
      <button type="button" class="btn-secondary" @click="cerrar">Ahora no</button>
      <NuxtLink to="/perfil" class="btn-primary" @click="visible = false">
        <Icon name="user" size="w-4 h-4" /> Completar perfil
      </NuxtLink>
    </template>
  </Modal>
</template>

<script setup>
const auth = useAuth();
const api = useApi();

const visible = ref(false);
const ignorando = ref(false);
const nagChecked = ref(false);
const nombre = ref('');
const rfc = ref('');
const cuentas = ref([]);

const tieneRFC = computed(() => !!rfc.value?.trim());
const tieneCuenta = computed(() => cuentas.value.length > 0);
const mostrarNoMolestar = computed(() => tieneRFC.value && !tieneCuenta.value);

watch(nagChecked, async (val) => {
  if (!val) return;
  ignorando.value = true;
  try {
    await api.post('/auth/nag-perfil/ignorar', {});
  } catch {}
  ignorando.value = false;
  visible.value = false;
});

function cerrar() {
  visible.value = false;
}

onMounted(async () => {
  if (!auth.user) return;
  try {
    const [perfilRes, cuentasRes] = await Promise.all([
      api.get('/auth/me').catch(() => null),
      api.get('/auth/cuentas-bancarias').catch(() => ({ data: [] })),
    ]);
    if (!perfilRes) return;

    const user = perfilRes.user;
    nombre.value = user.nombre?.split(' ')[0] || 'usuario';
    rfc.value = user.rfc || '';
    cuentas.value = cuentasRes.data || [];

    if (tieneRFC.value && tieneCuenta.value) return;
    if (user.nag_perfil_ignorado && tieneRFC.value) return;

    setTimeout(() => { visible.value = true; }, 800);
  } catch {}
});
</script>
