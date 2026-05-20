<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <form class="lg:col-span-2 space-y-6" @submit.prevent="guardar">
      <section class="card-pad space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Icon name="send" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Servidor SMTP</h3>
            <p class="text-xs text-ink-500">Configura el servidor de correo saliente</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Host</label>
            <input v-model="form.host" required class="input" placeholder="smtp.gmail.com" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Puerto</label>
            <input v-model.number="form.port" type="number" min="1" max="65535" required class="input" placeholder="587" />
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input v-model="form.secure" type="checkbox" class="w-4 h-4" />
          <span>Conexión segura (SSL/TLS) — generalmente puerto 465</span>
        </label>
        <label class="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input v-model="form.allow_self_signed" type="checkbox" class="w-4 h-4" />
          <span>Permitir certificados auto-firmados (uso interno)</span>
        </label>
      </section>

      <section class="card-pad space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 grid place-items-center"><Icon name="key" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Autenticación</h3>
            <p class="text-xs text-ink-500">Credenciales del servidor SMTP (opcional)</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Usuario</label>
            <input v-model="form.user" autocomplete="off" class="input" placeholder="usuario@dominio.com" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">
              Contraseña
              <span v-if="passwordYaConfigurada && !nuevoPassword" class="text-xs text-emerald-600 font-normal">(guardada · dejar vacío para mantener)</span>
            </label>
            <input
              v-model="form.password"
              :type="passwordYaConfigurada && !nuevoPassword ? 'text' : 'password'"
              :placeholder="passwordYaConfigurada ? '••••••••' : ''"
              autocomplete="new-password"
              class="input font-mono"
              @focus="nuevoPassword = true"
            />
          </div>
        </div>
      </section>

      <section class="card-pad space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 grid place-items-center"><Icon name="users" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Remitente</h3>
            <p class="text-xs text-ink-500">Nombre y correo que verán los destinatarios</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Nombre</label>
            <input v-model="form.from_name" class="input" placeholder="AdminProv" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Correo</label>
            <input v-model="form.from_email" type="email" required class="input" placeholder="no-reply@miempresa.com" />
          </div>
        </div>

        <label class="flex items-center gap-2 text-sm cursor-pointer select-none pt-2 border-t border-ink-100">
          <input v-model="form.activo" type="checkbox" class="w-4 h-4" />
          <span class="font-medium">Envío de correos activado</span>
        </label>
      </section>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
      <p v-if="ok" class="text-sm text-emerald-700">{{ ok }}</p>
    </form>

    <aside class="lg:col-span-1">
      <div class="card-pad lg:sticky lg:top-6 space-y-5">
        <div>
          <p class="text-xs uppercase tracking-widest text-ink-500 font-semibold">Estado</p>
          <p v-if="!cargado" class="text-lg font-semibold mt-2 text-ink-400">Cargando...</p>
          <p v-else-if="!yaConfigurado" class="text-lg font-semibold mt-2 text-amber-700">Sin configurar</p>
          <p v-else-if="!form.activo" class="text-lg font-semibold mt-2 text-ink-700">Inactivo</p>
          <p v-else class="text-lg font-semibold mt-2 text-emerald-700">Activo</p>
        </div>

        <div class="border-t border-ink-100 pt-4 space-y-2 text-xs text-ink-600">
          <p>Cuando está <strong>activo</strong>, todas las notificaciones del sistema se envían también por correo al destinatario.</p>
        </div>

        <div class="space-y-2">
          <button class="btn-primary w-full" :disabled="guardando" @click.prevent="guardar">
            <Icon name="check" size="w-4 h-4" /> {{ guardando ? 'Guardando...' : 'Guardar configuración' }}
          </button>
          <button class="btn-secondary w-full" :disabled="probando || !yaConfigurado" @click.prevent="probar">
            <Icon name="send" size="w-4 h-4" /> {{ probando ? 'Enviando...' : 'Enviar correo de prueba' }}
          </button>
          <button v-if="yaConfigurado" class="btn-ghost w-full text-red-600 hover:bg-red-50" @click.prevent="confirmarBorrar = true">
            <Icon name="ban" size="w-4 h-4" /> Eliminar configuración
          </button>
        </div>

        <div v-if="resultadoPrueba" :class="['rounded-lg p-3 text-sm', resultadoPrueba.exito ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-red-50 border border-red-200 text-red-800']">
          <p class="font-semibold">{{ resultadoPrueba.exito ? 'Correo enviado' : 'Error en la prueba' }}</p>
          <p class="text-xs mt-0.5">{{ resultadoPrueba.mensaje }}</p>
        </div>

        <div class="border-t border-ink-100 pt-3 text-xs text-ink-500 leading-relaxed">
          <p class="font-semibold text-ink-700 mb-1">Configuraciones comunes</p>
          <p><strong>Gmail:</strong> smtp.gmail.com · 587 · TLS · App password</p>
          <p><strong>Office 365:</strong> smtp.office365.com · 587 · TLS</p>
          <p><strong>SendGrid:</strong> smtp.sendgrid.net · 587 · usuario "apikey"</p>
        </div>
      </div>
    </aside>

    <Modal v-if="confirmarBorrar" title="Eliminar configuración SMTP" @close="confirmarBorrar = false">
      <p class="text-sm text-ink-700">¿Confirmas eliminar la configuración? Las notificaciones dejarán de enviarse por correo, pero seguirán apareciendo en la plataforma.</p>
      <template #footer>
        <button class="btn-secondary" @click="confirmarBorrar = false">Cancelar</button>
        <button class="btn-danger" @click="borrar">Eliminar</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
const api = useApi();
const cargado = ref(false);
const yaConfigurado = ref(false);
const passwordYaConfigurada = ref(false);
const nuevoPassword = ref(false);
const guardando = ref(false);
const probando = ref(false);
const error = ref('');
const ok = ref('');
const resultadoPrueba = ref(null);
const confirmarBorrar = ref(false);

const form = reactive({
  host: '', port: 587, secure: false, allow_self_signed: false,
  user: '', password: '', from_name: '', from_email: '', activo: true,
});

onMounted(cargar);

async function cargar() {
  try {
    const r = await api.get('/settings/email');
    if (r.data) {
      yaConfigurado.value = true;
      passwordYaConfigurada.value = !!r.data.password_set;
      Object.assign(form, {
        host: r.data.host || '',
        port: r.data.port || 587,
        secure: !!r.data.secure,
        allow_self_signed: !!r.data.allow_self_signed,
        user: r.data.user || '',
        password: '',
        from_name: r.data.from_name || '',
        from_email: r.data.from_email || '',
        activo: r.data.activo !== false,
      });
    }
  } catch (e) {
    error.value = e.message;
  } finally {
    cargado.value = true;
  }
}

const toast = useToast();

async function guardar() {
  guardando.value = true; error.value = ''; ok.value = ''; resultadoPrueba.value = null;
  try {
    const payload = { ...form };
    if (!nuevoPassword.value && passwordYaConfigurada.value) delete payload.password;
    await api.put('/settings/email', payload);
    ok.value = 'Configuración guardada';
    toast.success('Configuración guardada', form.activo ? 'El envío de correos está activo.' : 'El envío de correos está desactivado.');
    nuevoPassword.value = false;
    await cargar();
  } catch (e) {
    error.value = e.message;
    toast.error('No se pudo guardar', e.message);
  }
  finally { guardando.value = false; }
}

async function probar() {
  probando.value = true; resultadoPrueba.value = null; error.value = '';
  try {
    const r = await api.post('/settings/email/probar', {});
    resultadoPrueba.value = { exito: true, mensaje: `Enviado a ${r.destino}` };
    toast.success('Correo de prueba enviado', `Destino: ${r.destino}`);
  } catch (e) {
    resultadoPrueba.value = { exito: false, mensaje: e.message };
    toast.error('Falló el envío de prueba', e.message);
  } finally { probando.value = false; }
}

async function borrar() {
  try {
    await api.del('/settings/email');
    confirmarBorrar.value = false;
    yaConfigurado.value = false;
    passwordYaConfigurada.value = false;
    Object.assign(form, { host: '', port: 587, secure: false, allow_self_signed: false, user: '', password: '', from_name: '', from_email: '', activo: true });
    ok.value = 'Configuración eliminada';
    toast.warning('Configuración eliminada', 'Las notificaciones dejarán de enviarse por correo.');
  } catch (e) {
    error.value = e.message;
    toast.error('Error al eliminar', e.message);
  }
}
</script>
