<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <p class="text-sm text-ink-500">{{ usuarios.length }} usuario(s)</p>
      <button class="btn-primary" @click="abrirCrear"><Icon name="plus" size="w-4 h-4" /> Nuevo usuario</button>
    </div>

    <div class="card-pad grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="md:col-span-2 relative">
        <Icon name="search" size="w-4 h-4" class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input v-model="filtros.q" placeholder="Buscar por nombre o correo" class="input pl-9" />
      </div>
      <select v-model="filtros.rol" class="input">
        <option value="">Todos los roles</option>
        <option value="admin">Admin</option>
        <option value="colaborador">Colaborador</option>
        <option value="proveedor">Proveedor</option>
        <option value="finanzas">Finanzas</option>
      </select>
      <select v-model="filtros.activo" class="input">
        <option value="">Todos</option>
        <option value="1">Activos</option>
        <option value="0">Inactivos</option>
      </select>
    </div>

    <div class="card overflow-hidden">
      <table class="table">
        <thead>
          <tr>
            <th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th>
            <th>Creado</th><th class="!text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in usuarios" :key="u.id">
            <td class="font-medium text-ink-800">{{ u.nombre }}</td>
            <td>{{ u.email }}</td>
            <td><span :class="rolClass(u.rol)">{{ u.rol }}</span></td>
            <td><EstadoBadge :estado="u.activo ? 'activo' : 'inactivo'" /></td>
            <td class="text-ink-500 text-xs">{{ u.created_at }}</td>
            <td>
              <div class="flex gap-1 justify-center">
                <IconButton
                  v-if="u.id !== auth.user?.id && u.rol !== 'admin' && u.activo"
                  icon="users"
                  tooltip="Entrar como este usuario"
                  variant="primary"
                  @click="impersonar(u)"
                />
                <IconButton icon="edit" tooltip="Editar usuario" variant="primary" @click="abrirEditar(u)" />
                <IconButton
                  :icon="u.activo ? 'ban' : 'power'"
                  :tooltip="u.activo ? 'Desactivar usuario' : 'Activar usuario'"
                  :variant="u.activo ? 'danger' : 'success'"
                  @click="toggleActivo(u)"
                />
                <IconButton icon="key" tooltip="Resetear contraseña" variant="warning" @click="abrirReset(u)" />
              </div>
            </td>
          </tr>
          <tr v-if="!usuarios.length"><td colspan="6" class="py-12 text-center text-ink-400">Sin usuarios</td></tr>
        </tbody>
      </table>
    </div>

    <Modal v-if="modalCrear.abierto" title="Nuevo usuario" @close="modalCrear.abierto = false">
      <form class="space-y-3" @submit.prevent="crear">
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Nombre</label>
          <input v-model="modalCrear.nombre" required class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Correo</label>
          <input v-model="modalCrear.email" type="email" required class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Rol</label>
          <select v-model="modalCrear.rol" required class="input">
            <option value="">Selecciona</option>
            <option value="admin">Admin</option>
            <option value="colaborador">Colaborador</option>
            <option value="proveedor">Proveedor</option>
            <option value="finanzas">Finanzas</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Contraseña</label>
          <input v-model="modalCrear.password" type="text" required minlength="8" class="input font-mono" />
        </div>
        <p v-if="modalCrear.error" class="text-sm text-red-600">{{ modalCrear.error }}</p>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="modalCrear.abierto = false">Cancelar</button>
        <button class="btn-primary" :disabled="modalCrear.loading" @click="crear">{{ modalCrear.loading ? 'Creando...' : 'Crear' }}</button>
      </template>
    </Modal>

    <Modal v-if="modalReset.abierto" :title="`Resetear contraseña de ${modalReset.email}`" @close="modalReset.abierto = false">
      <input v-model="modalReset.password" type="text" required minlength="8" class="input font-mono" placeholder="Nueva contraseña" />
      <p v-if="modalReset.error" class="text-sm text-red-600 mt-2">{{ modalReset.error }}</p>
      <template #footer>
        <button class="btn-secondary" @click="modalReset.abierto = false">Cancelar</button>
        <button class="btn-primary" @click="resetPassword">Guardar</button>
      </template>
    </Modal>

    <Modal v-if="modalImpersonar.abierto" title="Entrar como otro usuario" @close="modalImpersonar.abierto = false">
      <div class="space-y-3 text-sm">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 grid place-items-center shrink-0">
            <Icon name="users" />
          </div>
          <div class="min-w-0">
            <p class="text-ink-800">
              Vas a entrar a la cuenta de
              <strong class="text-ink-900">{{ modalImpersonar.nombre }}</strong>
              <span class="text-ink-500">({{ modalImpersonar.rol }}).</span>
            </p>
            <p class="text-xs text-ink-600 mt-1 break-all">{{ modalImpersonar.email }}</p>
          </div>
        </div>
        <div class="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2">
          <Icon name="alert" size="w-4 h-4" class="shrink-0 mt-0.5" />
          <p>
            Verás la app como ese usuario. Cualquier acción quedará registrada a su nombre.
            Usa el banner amarillo superior para volver a tu sesión cuando termines.
          </p>
        </div>
        <p v-if="modalImpersonar.error" class="text-sm text-red-600">{{ modalImpersonar.error }}</p>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalImpersonar.abierto = false">Cancelar</button>
        <button class="btn-primary" :disabled="modalImpersonar.cargando" @click="confirmarImpersonar">
          <Icon name="users" size="w-4 h-4" /> {{ modalImpersonar.cargando ? 'Entrando...' : 'Entrar como este usuario' }}
        </button>
      </template>
    </Modal>

    <Modal v-if="modalEditar.abierto" :title="`Editar usuario`" @close="modalEditar.abierto = false">
      <form class="space-y-3" @submit.prevent="guardarEdicion">
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Nombre</label>
          <input v-model="modalEditar.nombre" required class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Correo</label>
          <input v-model="modalEditar.email" type="email" required class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Rol</label>
          <select v-model="modalEditar.rol" required class="input" :disabled="modalEditar.esYoMismo">
            <option value="admin">Admin</option>
            <option value="colaborador">Colaborador</option>
            <option value="proveedor">Proveedor</option>
            <option value="finanzas">Finanzas</option>
          </select>
          <p v-if="modalEditar.esYoMismo" class="text-xs text-ink-500 mt-1">No puedes cambiar tu propio rol.</p>
        </div>
        <p v-if="modalEditar.error" class="text-sm text-red-600">{{ modalEditar.error }}</p>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="modalEditar.abierto = false">Cancelar</button>
        <button class="btn-primary" :disabled="modalEditar.guardando" @click="guardarEdicion">
          {{ modalEditar.guardando ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
const api = useApi();
const auth = useAuth();
const usuarios = ref([]);
const filtros = reactive({ q: '', rol: '', activo: '' });
const modalCrear = reactive({ abierto: false, nombre: '', email: '', rol: '', password: '', loading: false, error: '' });
const modalReset = reactive({ abierto: false, id: null, email: '', password: '', error: '' });
const modalEditar = reactive({ abierto: false, id: null, nombre: '', email: '', rol: '', esYoMismo: false, guardando: false, error: '' });

async function cargar() {
  const qs = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v)).toString();
  const r = await api.get(`/users${qs ? '?' + qs : ''}`);
  usuarios.value = r.data;
}
watch(filtros, cargar, { deep: true });
onMounted(cargar);

const toast = useToast();

function abrirCrear() { Object.assign(modalCrear, { abierto: true, nombre: '', email: '', rol: '', password: '', error: '' }); }
async function crear() {
  modalCrear.loading = true; modalCrear.error = '';
  try {
    await api.post('/users', { nombre: modalCrear.nombre, email: modalCrear.email, rol: modalCrear.rol, password: modalCrear.password });
    toast.success('Usuario creado', `${modalCrear.email} (${modalCrear.rol})`);
    modalCrear.abierto = false; cargar();
  } catch (e) {
    modalCrear.error = e.message;
    toast.error('No se pudo crear el usuario', e.message);
  }
  finally { modalCrear.loading = false; }
}

function abrirEditar(u) {
  Object.assign(modalEditar, {
    abierto: true,
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    esYoMismo: u.id === auth.user?.id,
    guardando: false,
    error: '',
  });
}

async function guardarEdicion() {
  modalEditar.guardando = true; modalEditar.error = '';
  try {
    await api.put(`/users/${modalEditar.id}`, {
      nombre: modalEditar.nombre,
      email: modalEditar.email,
      rol: modalEditar.rol,
    });
    toast.success('Usuario actualizado', modalEditar.email);
    modalEditar.abierto = false;
    cargar();
  } catch (e) {
    modalEditar.error = e.message;
    toast.error('No se pudo actualizar', e.message);
  }
  finally { modalEditar.guardando = false; }
}

async function toggleActivo(u) {
  try {
    await api.put(`/users/${u.id}/activo`, { activo: !u.activo });
    toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado', u.email);
    cargar();
  } catch (e) { toast.error('Error', e.message); }
}
function abrirReset(u) { Object.assign(modalReset, { abierto: true, id: u.id, email: u.email, password: '', error: '' }); }
async function resetPassword() {
  try {
    await api.put(`/users/${modalReset.id}/password`, { password: modalReset.password });
    toast.success('Contraseña restablecida', modalReset.email);
    modalReset.abierto = false;
  } catch (e) {
    modalReset.error = e.message;
    toast.error('No se pudo restablecer', e.message);
  }
}

function rolClass(rol) {
  const m = { admin: 'badge-violet', colaborador: 'badge-blue', proveedor: 'badge-amber', finanzas: 'badge-green' };
  return m[rol] || 'badge-gray';
}

const router = useRouter();
const modalImpersonar = reactive({ abierto: false, id: null, nombre: '', email: '', rol: '', cargando: false, error: '' });

function impersonar(u) {
  Object.assign(modalImpersonar, {
    abierto: true,
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol,
    cargando: false,
    error: '',
  });
}

async function confirmarImpersonar() {
  modalImpersonar.cargando = true; modalImpersonar.error = '';
  try {
    const r = await api.post(`/auth/impersonate/${modalImpersonar.id}`);
    auth.startImpersonation(r.token, r.user, r.impersonatedBy);
    toast.success('Sesión cambiada', `Ahora estás como ${modalImpersonar.nombre}`);
    modalImpersonar.abierto = false;
    await router.push('/');
  } catch (e) {
    modalImpersonar.error = e.message;
    toast.error('No se pudo entrar', e.message);
  } finally {
    modalImpersonar.cargando = false;
  }
}
</script>
