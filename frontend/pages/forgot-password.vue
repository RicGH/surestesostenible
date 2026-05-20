<template>
  <div class="w-full max-w-sm">
    <div class="mb-8">
      <NuxtLink to="/login" class="text-xs text-ink-500 hover:text-brand-600 inline-flex items-center gap-1 mb-4">
        ← Volver al login
      </NuxtLink>
      <h1 class="text-2xl font-semibold text-ink-900">Recuperar contraseña</h1>
      <p class="text-sm text-ink-500 mt-1">Te enviaremos un enlace a tu correo para restablecerla.</p>
    </div>

    <form v-if="!enviado" class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="block text-sm font-medium text-ink-700 mb-1.5">Correo</label>
        <input v-model="email" type="email" required class="input" autocomplete="email" placeholder="tu@correo.com" />
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? 'Enviando...' : 'Enviar enlace de recuperación' }}
      </button>
    </form>

    <div v-else class="space-y-4">
      <div class="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-sm">
        <div class="flex items-center gap-2 text-emerald-700 font-semibold">
          <Icon name="check" /> Revisa tu bandeja de entrada
        </div>
        <p class="text-xs text-emerald-700/80 mt-2">{{ mensaje }}</p>
        <p class="text-xs text-ink-500 mt-2">
          Si no llega en unos minutos, revisa la carpeta de spam o intenta de nuevo.
        </p>
      </div>
      <NuxtLink to="/login" class="btn-secondary w-full">Volver al login</NuxtLink>
      <button class="btn-ghost w-full text-xs" @click="enviado = false; email = ''">
        Reenviar a otro correo
      </button>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'auth' });

const api = useApi();
const toast = useToast();
const email = ref('');
const loading = ref(false);
const error = ref('');
const enviado = ref(false);
const mensaje = ref('');

async function onSubmit() {
  loading.value = true; error.value = '';
  try {
    const r = await api.post('/auth/forgot-password', { email: email.value });
    mensaje.value = r.message || 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';
    enviado.value = true;
    toast.success('Correo enviado', 'Revisa tu bandeja de entrada.');
  } catch (e) {
    error.value = e.message;
    toast.error('Error', e.message);
  } finally {
    loading.value = false;
  }
}
</script>
