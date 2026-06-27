<template>
  <div class="max-w-5xl mx-auto">
    <div class="grid grid-cols-1 md:grid-cols-[210px_1fr] gap-6">
      <!-- Navegación lateral -->
      <aside class="card p-2 h-fit">
        <button
          v-for="t in tabs"
          :key="t.id"
          :class="['relative w-full text-left rounded-lg pl-4 pr-3 py-2.5 flex items-center gap-2.5 text-sm font-medium transition-colors',
                   tab === t.id ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50']"
          @click="tab = t.id"
        >
          <span v-if="tab === t.id" class="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-brand-500"></span>
          <Icon :name="t.icon" size="w-4 h-4" />
          {{ t.label }}
        </button>
      </aside>

      <!-- ============ DATOS DEL PERFIL ============ -->
      <section v-if="tab === 'perfil'" class="card-pad sm:p-7">
        <!-- Avatar -->
        <div class="flex flex-col sm:flex-row sm:items-center gap-5">
          <div class="relative shrink-0">
            <div class="w-24 h-24 rounded-full overflow-hidden ring-4 ring-ink-100 bg-gradient-to-br from-brand-100 to-brand-50 grid place-items-center">
              <img v-if="avatar.url" :src="avatar.url" alt="Foto de perfil" class="w-full h-full object-cover" />
              <span v-else class="text-2xl font-bold text-brand-700">{{ iniciales }}</span>
            </div>
            <button
              type="button"
              class="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand-600 hover:bg-brand-700 text-white grid place-items-center ring-4 ring-white shadow-sm transition-colors"
              title="Cambiar foto"
              @click="elegirFoto"
            >
              <Icon name="edit" size="w-3.5 h-3.5" />
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-2.5">
            <button type="button" class="btn-primary" :disabled="subiendoAvatar" @click="elegirFoto">
              <Icon name="upload" size="w-4 h-4" /> {{ subiendoAvatar ? 'Subiendo…' : 'Subir foto' }}
            </button>
            <button
              v-if="avatar.url"
              type="button"
              class="btn-secondary text-red-600 hover:bg-red-50 hover:border-red-200"
              @click="eliminarFoto"
            >
              <Icon name="trash" size="w-4 h-4" /> Eliminar
            </button>
            <p class="w-full text-xs text-ink-400">JPG, PNG o WEBP · máx. 5 MB</p>
          </div>
          <input ref="fileInput" type="file" accept="image/*" class="sr-only" @change="onFoto" />
        </div>

        <hr class="my-7 border-ink-100" />

        <form class="space-y-6" @submit.prevent="guardarPerfil">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label class="lbl">Nombre completo <span class="text-red-500">*</span></label>
              <input v-model="perfil.nombre" required class="input" placeholder="Tu nombre completo" />
            </div>
            <div>
              <label class="lbl">Correo</label>
              <div class="relative">
                <input :value="auth.user?.email" disabled class="input pr-24 bg-ink-50 text-ink-500 cursor-not-allowed" />
                <span class="absolute right-2.5 top-1/2 -translate-y-1/2 badge-gray text-[11px]">
                  <Icon name="lock" size="w-3 h-3" /> Solo lectura
                </span>
              </div>
            </div>
            <div>
              <label class="lbl">RFC</label>
              <input v-model="perfil.rfc" maxlength="20" class="input uppercase tracking-wide" placeholder="RFC" />
            </div>
          </div>

          <div>
            <div class="flex items-start justify-between gap-3 mb-3">
              <div>
                <h3 class="text-sm font-semibold text-ink-900">Cuentas bancarias</h3>
                <p class="text-xs text-ink-500 mt-0.5">CLABE y banco para depositar tus viáticos. Puedes tener varias.</p>
              </div>
              <div class="flex flex-col items-end gap-2 shrink-0">
                <span class="badge-green"><Icon name="sparkles" size="w-3 h-3" /> Autollenado en viáticos</span>
                <button type="button" class="btn-secondary py-1 px-2.5 text-xs" @click="modalCuenta = true">
                  <Icon name="plus" size="w-3 h-3" /> Nueva cuenta bancaria
                </button>
              </div>
            </div>

            <div v-if="cuentasBancarias.length" class="card overflow-hidden">
              <div class="overflow-y-auto max-h-[176px]">
                <table class="table text-sm">
                  <thead class="sticky top-0 bg-white z-10">
                    <tr>
                      <th>CLABE bancaria</th>
                      <th>Banco</th>
                      <th class="!text-center w-16">Eliminar</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="c in cuentasBancarias" :key="c.id">
                      <td class="font-mono tracking-wider">{{ c.clabe_bancaria }}</td>
                      <td>{{ c.banco || '—' }}</td>
                      <td>
                        <div class="flex justify-center">
                          <IconButton icon="trash" tooltip="Eliminar cuenta" variant="danger" @click="eliminarCuenta(c.id)" />
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p v-else class="text-sm text-ink-400">Sin cuentas bancarias guardadas.</p>
          </div>

          <!-- Modal nueva cuenta bancaria -->
          <Modal v-if="modalCuenta" title="Nueva cuenta bancaria" size="sm" @close="cerrarModalCuenta">
            <div class="space-y-4">
              <div>
                <label class="lbl">CLABE bancaria</label>
                <input v-model="nuevaCuenta.clabe" inputmode="numeric" maxlength="18" class="input tracking-wider" placeholder="18 dígitos" />
              </div>
              <div>
                <label class="lbl">Banco</label>
                <select v-model="nuevaCuenta.banco" class="input">
                  <option value="">Selecciona banco</option>
                  <option v-for="b in bancosOpciones" :key="b" :value="b">{{ b }}</option>
                </select>
              </div>
            </div>
            <template #footer>
              <button type="button" class="btn-secondary" @click="cerrarModalCuenta">Cancelar</button>
              <button
                type="button"
                class="btn-primary"
                :disabled="!nuevaCuenta.clabe.trim() || agregandoCuenta"
                @click="agregarCuenta"
              >
                <Icon name="plus" size="w-4 h-4" /> {{ agregandoCuenta ? 'Agregando…' : 'Agregar' }}
              </button>
            </template>
          </Modal>

          <div class="flex items-center gap-3 pt-2">
            <button class="btn-primary" :disabled="guardando">
              <Icon name="check" size="w-4 h-4" /> {{ guardando ? 'Guardando…' : 'Guardar cambios' }}
            </button>
            <transition name="fade">
              <span v-if="guardadoOk" class="text-sm text-emerald-600 font-medium inline-flex items-center gap-1">
                <Icon name="check" size="w-4 h-4" /> Guardado
              </span>
            </transition>
          </div>
        </form>
      </section>

      <!-- ============ CONTRASEÑA ============ -->
      <section v-else class="card-pad sm:p-7 space-y-6">
        <div class="flex items-start gap-3">
          <span class="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100 grid place-items-center shrink-0"><Icon name="shield" size="w-5 h-5" /></span>
          <div>
            <h3 class="font-semibold text-ink-900">Cambiar contraseña</h3>
            <p class="text-xs text-ink-500 mt-0.5">Usa al menos 8 caracteres. Combina letras, números y símbolos.</p>
          </div>
        </div>

        <form class="space-y-5 max-w-md" @submit.prevent="cambiarPassword">
          <div>
            <label class="lbl">Contraseña actual <span class="text-red-500">*</span></label>
            <div class="relative">
              <input v-model="pwd.actual" :type="ver.actual ? 'text' : 'password'" required class="input pr-10" placeholder="••••••••" />
              <button type="button" class="pwd-toggle" @click="ver.actual = !ver.actual">
                <Icon :name="ver.actual ? 'eye-off' : 'eye'" size="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label class="lbl">Nueva contraseña <span class="text-red-500">*</span></label>
            <div class="relative">
              <input v-model="pwd.nueva" :type="ver.nueva ? 'text' : 'password'" required minlength="8" class="input pr-10" placeholder="••••••••" />
              <button type="button" class="pwd-toggle" @click="ver.nueva = !ver.nueva">
                <Icon :name="ver.nueva ? 'eye-off' : 'eye'" size="w-4 h-4" />
              </button>
            </div>
            <div v-if="pwd.nueva" class="mt-2">
              <div class="flex gap-1">
                <span v-for="i in 4" :key="i" :class="['h-1.5 flex-1 rounded-full transition-colors', i <= fuerza.nivel ? fuerza.color : 'bg-ink-200']"></span>
              </div>
              <p :class="['text-[11px] mt-1 font-medium', fuerza.textColor]">{{ fuerza.label }}</p>
            </div>
          </div>

          <div>
            <label class="lbl">Confirmar nueva contraseña <span class="text-red-500">*</span></label>
            <div class="relative">
              <input v-model="pwd.confirmar" :type="ver.confirmar ? 'text' : 'password'" required class="input pr-10" placeholder="••••••••" />
              <button type="button" class="pwd-toggle" @click="ver.confirmar = !ver.confirmar">
                <Icon :name="ver.confirmar ? 'eye-off' : 'eye'" size="w-4 h-4" />
              </button>
            </div>
            <p v-if="pwd.confirmar && pwd.confirmar !== pwd.nueva" class="text-[11px] text-red-500 mt-1">Las contraseñas no coinciden.</p>
          </div>

          <div class="pt-1">
            <button class="btn-primary" :disabled="cambiando">
              <Icon name="check" size="w-4 h-4" /> {{ cambiando ? 'Guardando…' : 'Cambiar contraseña' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup>
const api = useApi();
const auth = useAuth();
const toast = useToast();

const tabs = [
  { id: 'perfil', label: 'Datos del perfil', icon: 'user' },
  { id: 'password', label: 'Contraseña', icon: 'shield' },
];

const tab = ref('perfil');
const guardando = ref(false);
const guardadoOk = ref(false);
const cambiando = ref(false);

const perfil = reactive({ nombre: '', rfc: '' });
const bancosOpciones = ref([]);
const cuentasBancarias = ref([]);
const nuevaCuenta = reactive({ clabe: '', banco: '' });
const agregandoCuenta = ref(false);
const modalCuenta = ref(false);
const { abrir: confirmar } = useConfirm();
const pwd = reactive({ actual: '', nueva: '', confirmar: '' });
const ver = reactive({ actual: false, nueva: false, confirmar: false });

const avatar = useAvatar();
const fileInput = ref(null);
const subiendoAvatar = ref(false);

const iniciales = computed(() => {
  const n = auth.user?.nombre || '';
  return n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '·';
});

const fuerza = computed(() => {
  const p = pwd.nueva;
  let n = 0;
  if (p.length >= 8) n++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++;
  if (/\d/.test(p)) n++;
  if (/[^A-Za-z0-9]/.test(p)) n++;
  const escala = [
    { label: '', color: 'bg-ink-200', textColor: 'text-ink-400' },
    { label: 'Débil', color: 'bg-red-500', textColor: 'text-red-500' },
    { label: 'Aceptable', color: 'bg-amber-500', textColor: 'text-amber-600' },
    { label: 'Buena', color: 'bg-brand-500', textColor: 'text-brand-600' },
    { label: 'Fuerte', color: 'bg-emerald-500', textColor: 'text-emerald-600' },
  ];
  return { nivel: n, ...escala[n] };
});

async function cargar() {
  try {
    const [{ user }, bancosRes, cuentasRes] = await Promise.all([
      api.get('/auth/me'),
      api.get('/catalogos?tipo=banco').catch(() => ({ data: [] })),
      api.get('/auth/cuentas-bancarias').catch(() => ({ data: [] })),
    ]);
    Object.assign(perfil, { nombre: user.nombre || '', rfc: user.rfc || '' });
    bancosOpciones.value = (bancosRes.data || []).map((b) => b.nombre);
    cuentasBancarias.value = cuentasRes.data || [];
    if (user.avatar_path && !avatar.url) {
      const { blob } = await api.viewBlob('/auth/avatar');
      avatar.setDesdeBlob(blob);
    } else if (!user.avatar_path) {
      avatar.limpiar();
    }
  } catch (e) {
    toast.error('No se pudo cargar tu perfil', e.message);
  }
}

function cerrarModalCuenta() {
  modalCuenta.value = false;
  nuevaCuenta.clabe = '';
  nuevaCuenta.banco = '';
}

async function agregarCuenta() {
  if (!nuevaCuenta.clabe.trim()) return;
  agregandoCuenta.value = true;
  try {
    await api.post('/auth/cuentas-bancarias', {
      clabe_bancaria: nuevaCuenta.clabe.trim(),
      banco: nuevaCuenta.banco,
    });
    const r = await api.get('/auth/cuentas-bancarias');
    cuentasBancarias.value = r.data || [];
    toast.success('Cuenta agregada');
    cerrarModalCuenta();
  } catch (e) {
    toast.error('No se pudo agregar', e.message);
  } finally {
    agregandoCuenta.value = false;
  }
}

async function eliminarCuenta(id) {
  if (!await confirmar('¿Eliminar esta cuenta bancaria? Esta acción no se puede deshacer.', { titulo: 'Eliminar cuenta', accion: 'Eliminar' })) return;
  try {
    await api.del(`/auth/cuentas-bancarias/${id}`);
    const r = await api.get('/auth/cuentas-bancarias');
    cuentasBancarias.value = r.data || [];
    toast.success('Cuenta eliminada');
  } catch (e) {
    toast.error('No se pudo eliminar', e.message);
  }
}

function elegirFoto() {
  fileInput.value?.click();
}

async function onFoto(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    toast.warning('Imagen muy grande', 'La foto debe pesar menos de 5 MB.');
    e.target.value = '';
    return;
  }
  subiendoAvatar.value = true;
  try {
    const fd = new FormData();
    fd.append('avatar', file);
    await api.upload('/auth/avatar', fd);
    avatar.setDesdeBlob(file);
    toast.success('Foto actualizada', 'Tu foto de perfil se guardó correctamente.');
  } catch (err) {
    toast.error('No se pudo subir', err.message);
  } finally {
    subiendoAvatar.value = false;
    e.target.value = '';
  }
}

async function eliminarFoto() {
  try {
    await api.del('/auth/avatar');
    avatar.limpiar();
    toast.success('Foto eliminada', 'Volviste a tus iniciales.');
  } catch (e) {
    toast.error('No se pudo eliminar', e.message);
  }
}

async function guardarPerfil() {
  guardando.value = true;
  try {
    const { user } = await api.put('/auth/perfil', {
      nombre: perfil.nombre.trim(),
      rfc: perfil.rfc.trim(),
    });
    auth.updateUser({ nombre: user.nombre });
    toast.success('Perfil actualizado', 'Tus datos se guardaron correctamente.');
    guardadoOk.value = true;
    setTimeout(() => (guardadoOk.value = false), 2500);
  } catch (e) {
    toast.error('No se pudo guardar', e.message);
  } finally {
    guardando.value = false;
  }
}

async function cambiarPassword() {
  if (pwd.nueva !== pwd.confirmar) {
    toast.warning('No coincide', 'La confirmación no coincide con la nueva contraseña.');
    return;
  }
  cambiando.value = true;
  try {
    await api.put('/auth/password', { actual: pwd.actual, nueva: pwd.nueva });
    Object.assign(pwd, { actual: '', nueva: '', confirmar: '' });
    toast.success('Contraseña actualizada', 'Tu contraseña se cambió correctamente.');
  } catch (e) {
    toast.error('No se pudo cambiar', e.message);
  } finally {
    cambiando.value = false;
  }
}

onMounted(cargar);
</script>

<style scoped>
.lbl {
  @apply block text-sm font-medium text-ink-700 mb-1.5;
}
.pwd-toggle {
  @apply absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600 transition-colors;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
