<template>
  <div class="w-full max-w-sm">
    <div class="mb-8">
      <h1 class="text-2xl font-semibold text-ink-900">Crear cuenta de proveedor</h1>
      <p class="text-sm text-ink-500 mt-1">Después podrás registrar tus datos fiscales.</p>
    </div>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div>
        <label class="block text-sm font-medium text-ink-700 mb-1.5">Nombre</label>
        <input v-model="form.nombre" required class="input" />
      </div>
      <div>
        <label class="block text-sm font-medium text-ink-700 mb-1.5">Correo</label>
        <input v-model="form.email" type="email" required class="input" />
      </div>
      <div>
        <label class="block text-sm font-medium text-ink-700 mb-1.5">Contraseña</label>
        <input v-model="form.password" type="password" minlength="8" required class="input" placeholder="Mínimo 8 caracteres" />
      </div>
      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="ok" class="text-sm text-emerald-700">Cuenta creada. Ya puedes iniciar sesión.</p>
      <button type="submit" class="btn-primary w-full" :disabled="loading">
        {{ loading ? 'Creando...' : 'Crear cuenta' }}
      </button>
    </form>

    <p class="text-sm text-center mt-6 text-ink-500">
      ¿Ya tienes cuenta?
      <NuxtLink to="/login" class="text-brand-600 hover:text-brand-700 font-medium">Inicia sesión</NuxtLink>
    </p>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'auth' });

const form = reactive({ nombre: '', email: '', password: '' });
const loading = ref(false);
const error = ref('');
const ok = ref(false);
const api = useApi();
const toast = useToast();

async function onSubmit() {
  error.value = ''; ok.value = false; loading.value = true;
  try {
    await api.post('/auth/register-proveedor', form);
    ok.value = true;
    toast.success('Cuenta creada', 'Ya puedes iniciar sesión.');
    Object.assign(form, { nombre: '', email: '', password: '' });
  } catch (e) {
    error.value = e.message;
    toast.error('No se pudo crear la cuenta', e.message);
  }
  finally { loading.value = false; }
}
</script>
