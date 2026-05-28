<template>
  <div class="w-full max-w-sm">
    <div class="mb-8">
      <div class="mb-6 lg:hidden">
        <img src="/brand/logo.png" alt="Sureste Sostenible" class="h-10 w-auto" />
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
        <div class="relative">
          <input v-model="password" :type="mostrarPassword ? 'text' : 'password'" required class="input pr-10" autocomplete="current-password" placeholder="••••••••" />
          <button
            type="button"
            tabindex="-1"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700 transition-colors"
            :aria-label="mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
            @click="mostrarPassword = !mostrarPassword"
          >
            <Icon :name="mostrarPassword ? 'eye-off' : 'eye'" size="w-4 h-4" />
          </button>
        </div>
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
const mostrarPassword = ref(false);
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
