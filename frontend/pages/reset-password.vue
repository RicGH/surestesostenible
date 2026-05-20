<template>
  <div class="w-full max-w-sm">
    <div class="mb-8">
      <h1 class="text-2xl font-semibold text-ink-900">Nueva contraseña</h1>
      <p v-if="emailValido" class="text-sm text-ink-500 mt-1">
        Para la cuenta <strong>{{ emailValido }}</strong>
      </p>
      <p v-else class="text-sm text-ink-500 mt-1">Crea una nueva contraseña para tu cuenta.</p>
    </div>

    <div v-if="validando" class="card-pad text-ink-500 text-sm">
      Validando enlace...
    </div>

    <div v-else-if="!tokenValido" class="space-y-4">
      <div class="rounded-lg bg-red-50 border border-red-200 p-4 text-sm">
        <div class="flex items-center gap-2 text-red-700 font-semibold">
          <Icon name="alert" /> Enlace inválido o expirado
        </div>
        <p class="text-xs text-red-700/80 mt-2">
          El enlace que usaste ya no es válido. Solicita uno nuevo desde la pantalla de recuperación.
        </p>
      </div>
      <NuxtLink to="/forgot-password" class="btn-primary w-full">Solicitar nuevo enlace</NuxtLink>
      <NuxtLink to="/login" class="btn-secondary w-full">Volver al login</NuxtLink>
    </div>

    <div v-else-if="completado" class="space-y-4">
      <div class="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm">
        <div class="flex items-center gap-2 text-emerald-700 font-semibold">
          <Icon name="check" /> Contraseña actualizada
        </div>
        <p class="text-xs text-emerald-700/80 mt-2">
          Tu contraseña fue cambiada exitosamente. Ya puedes iniciar sesión.
        </p>
      </div>
      <NuxtLink to="/login" class="btn-primary w-full">Iniciar sesión</NuxtLink>
    </div>

    <form v-else class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="block text-sm font-medium text-ink-700 mb-1.5">Nueva contraseña</label>
        <input v-model="password" type="password" required minlength="8" class="input" autocomplete="new-password" placeholder="Mínimo 8 caracteres" />
      </div>
      <div>
        <label class="block text-sm font-medium text-ink-700 mb-1.5">Confirmar contraseña</label>
        <input v-model="confirm" type="password" required minlength="8" class="input" autocomplete="new-password" placeholder="Repite tu nueva contraseña" />
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? 'Guardando...' : 'Restablecer contraseña' }}
      </button>
    </form>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'auth' });

const route = useRoute();
const api = useApi();
const toast = useToast();

const validando = ref(true);
const tokenValido = ref(false);
const emailValido = ref('');
const password = ref('');
const confirm = ref('');
const loading = ref(false);
const error = ref('');
const completado = ref(false);

const token = computed(() => route.query.token || '');

onMounted(async () => {
  if (!token.value) {
    validando.value = false;
    tokenValido.value = false;
    return;
  }
  try {
    const r = await api.get(`/auth/reset-password/validar?token=${encodeURIComponent(token.value)}`);
    tokenValido.value = !!r.valido;
    emailValido.value = r.email || '';
  } catch {
    tokenValido.value = false;
  } finally {
    validando.value = false;
  }
});

async function onSubmit() {
  error.value = '';
  if (password.value !== confirm.value) {
    error.value = 'Las contraseñas no coinciden';
    return;
  }
  if (password.value.length < 8) {
    error.value = 'La contraseña debe tener al menos 8 caracteres';
    return;
  }
  loading.value = true;
  try {
    await api.post('/auth/reset-password', { token: token.value, password: password.value });
    completado.value = true;
    toast.success('Contraseña actualizada', 'Ya puedes iniciar sesión con tu nueva contraseña.');
  } catch (e) {
    error.value = e.message;
    toast.error('Error', e.message);
  } finally {
    loading.value = false;
  }
}
</script>
