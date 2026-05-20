<template>
  <div class="w-full max-w-sm">
    <div class="mb-8">
      <div class="flex items-center gap-2 mb-6 lg:hidden">
        <div class="w-9 h-9 rounded-lg bg-brand-600 grid place-items-center font-bold text-white">A</div>
        <span class="font-semibold tracking-tight">AdminProv</span>
      </div>
      <h1 class="text-2xl font-semibold text-ink-900">Bienvenido de vuelta</h1>
      <p class="text-sm text-ink-500 mt-1">Ingresa tus credenciales para continuar.</p>
    </div>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="block text-sm font-medium text-ink-700 mb-1.5">Correo</label>
        <input v-model="email" type="email" required class="input" autocomplete="email" placeholder="tu@correo.com" />
      </div>
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="block text-sm font-medium text-ink-700">Contraseña</label>
          <NuxtLink to="/forgot-password" class="text-xs text-brand-600 hover:text-brand-700 font-medium">¿Olvidaste tu contraseña?</NuxtLink>
        </div>
        <input v-model="password" type="password" required class="input" autocomplete="current-password" placeholder="••••••••" />
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? 'Validando...' : 'Iniciar sesión' }}
      </button>
    </form>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'auth' });

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const api = useApi();
const auth = useAuth();
const router = useRouter();
const toast = useToast();

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    const data = await api.post('/auth/login', { email: email.value, password: password.value });
    auth.setSession(data.token, data.user);
    toast.success('Bienvenido', `Sesión iniciada como ${data.user.nombre}`);
    router.push('/');
  } catch (e) {
    error.value = e.message;
    toast.error('No se pudo iniciar sesión', e.message);
  } finally {
    loading.value = false;
  }
}
</script>
