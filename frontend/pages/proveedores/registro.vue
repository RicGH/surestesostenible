<template>
  <div v-if="cargando" class="card-pad text-ink-500">Cargando...</div>

  <div v-else-if="registro" class="space-y-6">
    <section class="card-pad bg-gradient-to-br from-ink-900 via-brand-900 to-brand-700 text-white border-transparent">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="space-y-1">
          <p class="text-xs uppercase tracking-widest text-brand-200/80">Razón social</p>
          <h1 class="text-2xl font-semibold tracking-tight">{{ registro.razon_social }}</h1>
          <div class="flex items-center gap-2 text-sm text-brand-100/90 mt-2">
            <Icon name="document" size="w-4 h-4" />
            <span class="font-mono">{{ registro.rfc }}</span>
          </div>
        </div>
        <EstadoBadge :estado="registro.estado" class="!bg-white/15 !text-white !ring-white/20" />
      </div>
    </section>

    <section v-if="registro.estado === 'pendiente'" class="card overflow-hidden">
      <div class="px-5 py-4 border-l-4 border-amber-400 bg-amber-50/50 flex items-start gap-3">
        <div class="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0">
          <Icon name="history" />
        </div>
        <div>
          <h3 class="font-semibold text-amber-800">Registro en revisión</h3>
          <p class="text-sm text-ink-700 mt-0.5">El administrador revisará tus datos. Recibirás una notificación con la decisión.</p>
        </div>
      </div>
    </section>

    <section v-if="registro.estado === 'rechazado'" class="card overflow-hidden">
      <div class="px-5 py-4 border-l-4 border-red-500 bg-red-50/40 flex items-start gap-3">
        <div class="w-9 h-9 rounded-lg bg-red-100 text-red-600 grid place-items-center shrink-0">
          <Icon name="alert" />
        </div>
        <div>
          <h3 class="font-semibold text-red-700">Registro rechazado</h3>
          <p class="text-sm text-ink-700 mt-0.5">{{ registro.motivo_rechazo }}</p>
        </div>
      </div>
    </section>

    <section v-if="registro.estado === 'aprobado'" class="card overflow-hidden">
      <div class="px-5 py-4 border-l-4 border-emerald-500 bg-emerald-50/40 flex items-start gap-3">
        <div class="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 grid place-items-center shrink-0">
          <Icon name="check" />
        </div>
        <div>
          <h3 class="font-semibold text-emerald-700">Registro aprobado</h3>
          <p class="text-sm text-ink-700 mt-0.5">Ya puedes subir facturas. Tu información queda fija — para cambios solicita al administrador.</p>
        </div>
      </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section class="card-pad space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Icon name="document" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Datos fiscales</h3>
            <p class="text-xs text-ink-500">Información tributaria</p>
          </div>
        </div>
        <dl class="space-y-3 text-sm">
          <div class="flex items-center justify-between gap-3 py-2 border-b border-ink-100">
            <dt class="text-ink-500">RFC</dt>
            <dd class="font-mono font-medium text-ink-900">{{ registro.rfc }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-2 border-b border-ink-100">
            <dt class="text-ink-500">Razón social</dt>
            <dd class="font-medium text-ink-900 text-right">{{ registro.razon_social }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3 py-2">
            <dt class="text-ink-500">Dirección</dt>
            <dd class="font-medium text-ink-900 text-right">{{ registro.direccion || '—' }}</dd>
          </div>
        </dl>
      </section>

      <section class="card-pad space-y-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center"><Icon name="wallet" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Datos bancarios</h3>
            <p class="text-xs text-ink-500">Cuenta para recibir pagos</p>
          </div>
        </div>
        <dl class="space-y-3 text-sm">
          <div class="flex items-center justify-between gap-3 py-2 border-b border-ink-100">
            <dt class="text-ink-500">Banco</dt>
            <dd class="font-medium text-ink-900">{{ registro.banco || '—' }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-2 border-b border-ink-100">
            <dt class="text-ink-500">CLABE</dt>
            <dd class="font-mono font-medium text-ink-900">{{ registro.cuenta_clabe || '—' }}</dd>
          </div>
          <div class="flex items-center justify-between gap-3 py-2">
            <dt class="text-ink-500">Documentación</dt>
            <dd class="font-medium text-ink-900">
              <span v-if="registro.documentacion" class="inline-flex items-center gap-1 text-emerald-700">
                <Icon name="check" size="w-4 h-4" /> Cargada
              </span>
              <span v-else class="text-ink-400">No adjuntada</span>
            </dd>
          </div>
        </dl>
      </section>
    </div>

    <section v-if="registro.estado === 'aprobado'" class="card-pad bg-brand-50/40 border-brand-100">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-brand-600 text-white grid place-items-center"><Icon name="upload" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">¿Listo para facturar?</h3>
            <p class="text-sm text-ink-600">Sube tus facturas en formato PDF + XML CFDI.</p>
          </div>
        </div>
        <NuxtLink to="/proveedores/facturas" class="btn-primary">
          <Icon name="upload" size="w-4 h-4" /> Subir factura
        </NuxtLink>
      </div>
    </section>
  </div>

  <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <form class="lg:col-span-2 space-y-6" @submit.prevent="enviar">
      <section class="card-pad space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Icon name="document" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Datos fiscales</h3>
            <p class="text-xs text-ink-500">Información tributaria de tu empresa</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">RFC</label>
            <input v-model="form.rfc" required minlength="12" maxlength="13" class="input uppercase font-mono" placeholder="XAXX010101000" />
            <p v-if="rfcTipo" class="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
              <Icon name="check" size="w-3.5 h-3.5" /> {{ rfcTipo }} · {{ rfcUpper.length }} caracteres
            </p>
            <p v-else-if="form.rfc" class="mt-1.5 text-xs text-amber-600">
              RFC incompleto o inválido (12 caracteres = moral · 13 = física)
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Razón social</label>
            <input v-model="form.razon_social" required class="input" placeholder="Mi Empresa SA de CV" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Dirección fiscal</label>
            <input v-model="form.direccion" class="input" placeholder="Calle, número, colonia, CP, ciudad" />
          </div>
        </div>
      </section>

      <section class="card-pad space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center"><Icon name="wallet" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Datos bancarios</h3>
            <p class="text-xs text-ink-500">Cuenta donde recibirás los pagos</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Banco</label>
            <input v-model="form.banco" class="input" placeholder="BBVA, Santander, etc." />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">CLABE (18 dígitos)</label>
            <input v-model="form.cuenta_clabe" maxlength="18" class="input font-mono" placeholder="012345678901234567" />
          </div>
        </div>
      </section>

      <section class="card-pad space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 grid place-items-center"><Icon name="users" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Datos personales</h3>
            <p class="text-xs text-ink-500">Información para generación de contratos (opcional)</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Fecha de nacimiento</label>
            <input v-model="form.fecha_nacimiento" type="date" class="input" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Estado civil</label>
            <select v-model="form.estado_civil" class="input">
              <option value="">Selecciona</option>
              <option>Soltero(a)</option>
              <option>Casado(a)</option>
              <option>Divorciado(a)</option>
              <option>Viudo(a)</option>
              <option>Unión libre</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Nacionalidad</label>
            <input v-model="form.nacionalidad" class="input" placeholder="Mexicana" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Código postal</label>
            <input v-model="form.codigo_postal" maxlength="5" class="input font-mono" placeholder="00000" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Municipio</label>
            <input v-model="form.municipio" class="input" placeholder="Ciudad / Municipio" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Estado</label>
            <input v-model="form.estado_republica" class="input" placeholder="Tabasco" />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Sucursal bancaria</label>
            <input v-model="form.sucursal_banco" class="input" placeholder="Sucursal donde se realizarán los depósitos" />
          </div>
        </div>
      </section>

      <section class="card-pad space-y-5">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 grid place-items-center"><Icon name="upload" /></div>
          <div>
            <h3 class="font-semibold text-ink-900">Documentación</h3>
            <p class="text-xs text-ink-500">Constancia fiscal o documento de respaldo (PDF / imagen)</p>
          </div>
        </div>
        <FileDrop
          v-model="documentacion"
          accept=".pdf,image/*"
          icon="upload"
          label="Constancia fiscal"
          hint="Arrastra el archivo o haz clic · PDF o imagen"
        />
      </section>

      <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    </form>

    <aside class="lg:col-span-1">
      <div class="card-pad lg:sticky lg:top-6 space-y-5">
        <div>
          <p class="text-xs uppercase tracking-widest text-ink-500 font-semibold">Estado</p>
          <p class="text-lg font-semibold mt-2 text-ink-900">Sin enviar</p>
          <p class="text-xs text-ink-500 mt-1">Completa el formulario para registrarte</p>
        </div>

        <div class="border-t border-ink-100 pt-4 space-y-3 text-sm">
          <div class="flex items-center gap-2">
            <Icon name="check" size="w-4 h-4" :class="rfcValido ? 'text-emerald-500' : 'text-ink-300'" />
            <span :class="rfcValido ? 'text-ink-700' : 'text-ink-400'">RFC</span>
          </div>
          <div class="flex items-center gap-2">
            <Icon name="check" size="w-4 h-4" :class="form.razon_social ? 'text-emerald-500' : 'text-ink-300'" />
            <span :class="form.razon_social ? 'text-ink-700' : 'text-ink-400'">Razón social</span>
          </div>
          <div class="flex items-center gap-2">
            <Icon name="check" size="w-4 h-4" :class="form.banco ? 'text-emerald-500' : 'text-ink-300'" />
            <span :class="form.banco ? 'text-ink-700' : 'text-ink-400'">Banco</span>
          </div>
          <div class="flex items-center gap-2">
            <Icon name="check" size="w-4 h-4" :class="form.cuenta_clabe?.length === 18 ? 'text-emerald-500' : 'text-ink-300'" />
            <span :class="form.cuenta_clabe?.length === 18 ? 'text-ink-700' : 'text-ink-400'">CLABE (18 dígitos)</span>
          </div>
        </div>

        <button class="btn-primary w-full" :disabled="loading" @click.prevent="enviar">
          <Icon name="send" size="w-4 h-4" /> {{ loading ? 'Enviando...' : 'Enviar registro' }}
        </button>

        <p class="text-xs text-ink-500 leading-relaxed pt-2 border-t border-ink-100">
          Tu información será revisada por el administrador. Una vez aprobada no podrás modificarla — para cambios contacta al administrador.
        </p>
      </div>
    </aside>
  </div>
</template>

<script setup>
const api = useApi();
const cargando = ref(true);
const registro = ref(null);
const documentacion = ref(null);
const loading = ref(false);
const error = ref('');
const form = reactive({
  rfc: '', razon_social: '', direccion: '', banco: '', cuenta_clabe: '',
  fecha_nacimiento: '', estado_civil: '', nacionalidad: '',
  codigo_postal: '', municipio: '', estado_republica: '', sucursal_banco: '',
});

const RFC_RE = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;
const rfcUpper = computed(() => (form.rfc || '').trim().toUpperCase());
const rfcValido = computed(() => RFC_RE.test(rfcUpper.value));
const rfcTipo = computed(() => {
  if (!rfcValido.value) return null;
  return rfcUpper.value.length === 13 ? 'Persona física' : 'Persona moral';
});

async function cargar() {
  try {
    const r = await api.get('/proveedores/mio');
    registro.value = r.data;
  } finally { cargando.value = false; }
}
onMounted(cargar);

const toast = useToast();

async function enviar() {
  error.value = '';
  if (!rfcValido.value) {
    error.value = 'RFC inválido: usa 12 caracteres para persona moral o 13 para física.';
    toast.error('RFC inválido', error.value);
    return;
  }
  form.rfc = rfcUpper.value;
  loading.value = true;
  try {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
    if (documentacion.value) fd.append('documentacion', documentacion.value);
    await api.upload('/proveedores', fd);
    toast.success('Registro enviado', 'En espera de aprobación del administrador.');
    await cargar();
    try { await useRegistroProveedor().refrescar(); } catch {}
  } catch (e) {
    error.value = e.message;
    toast.error('No se pudo enviar el registro', e.message);
  }
  finally { loading.value = false; }
}
</script>
