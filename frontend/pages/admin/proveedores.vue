<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-1 border-b border-ink-200 overflow-x-auto overflow-y-hidden flex-1">
        <button
          v-for="t in tabs"
          :key="t.id"
          :class="['px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
                   tab === t.id
                     ? 'border-brand-600 text-brand-700'
                     : 'border-transparent text-ink-500 hover:text-ink-800']"
          @click="tab = t.id"
        >
          {{ t.label }}
          <span :class="['ml-2 text-xs px-1.5 py-0.5 rounded-full',
                         tab === t.id ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-600']">
            {{ counts[t.id] || 0 }}
          </span>
        </button>
      </div>
      <button class="btn-primary shrink-0" @click="nuevoModal.abierto = true">
        <Icon name="plus" size="w-4 h-4" /> Nuevo proveedor
      </button>
    </div>

    <section v-if="tab === 'pendientes'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead>
            <tr><th>RFC</th><th>Razón social</th><th>Email</th><th>Estado</th><th class="text-right">Acciones</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in pendientes" :key="p.id">
              <td class="font-mono">{{ p.rfc }}</td>
              <td class="font-medium text-ink-800">{{ p.razon_social }}</td>
              <td>{{ p.email }}</td>
              <td><EstadoBadge :estado="p.estado" /></td>
              <td>
                <div class="flex gap-1 justify-end">
                  <IconButton icon="check" tooltip="Aprobar" variant="success" @click="aprobar(p.id)" />
                  <IconButton icon="x" tooltip="Rechazar" variant="danger" @click="abrirRechazo(p)" />
                </div>
              </td>
            </tr>
            <tr v-if="!pendientes.length"><td colspan="5" class="py-12 text-center text-ink-400">Sin proveedores pendientes</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="tab === 'todos'" class="space-y-4">
      <div class="card-pad grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="md:col-span-2 relative">
          <Icon name="search" size="w-4 h-4" class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input v-model="filtros.q" placeholder="Buscar por RFC o razón social" class="input pl-9" />
        </div>
        <select v-model="filtros.activo" class="input">
          <option value="">Todos</option>
          <option value="1">Activos</option>
          <option value="0">Inactivos</option>
        </select>
      </div>
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>RFC</th><th>Razón social</th><th>Estado</th><th>Activo</th></tr></thead>
          <tbody>
            <tr v-for="p in todosFiltrados" :key="p.id">
              <td class="font-mono">{{ p.rfc }}</td>
              <td class="font-medium text-ink-800">{{ p.razon_social }}</td>
              <td><EstadoBadge :estado="p.estado" /></td>
              <td><EstadoBadge :estado="p.activo ? 'activo' : 'inactivo'" /></td>
            </tr>
            <tr v-if="!todosFiltrados.length"><td colspan="4" class="py-12 text-center text-ink-400">{{ todos.length ? 'Sin coincidencias con los filtros' : 'Sin registros' }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <Modal v-if="modal.abierto" :title="`Rechazar ${modal.rfc}`" @close="modal.abierto = false">
      <textarea v-model="modal.motivo" rows="3" class="input" placeholder="Motivo del rechazo"></textarea>
      <template #footer>
        <button class="btn-secondary" @click="modal.abierto = false">Cancelar</button>
        <button class="btn-danger" @click="rechazar">Rechazar</button>
      </template>
    </Modal>

    <Modal v-if="nuevoModal.abierto" title="Nuevo proveedor" @close="nuevoModal.abierto = false">
      <form class="space-y-3" @submit.prevent="crearNuevo">
        <p class="text-xs text-ink-500">Crea el usuario del proveedor y su registro fiscal en un solo paso.</p>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Nombre</label>
            <input v-model="nuevoModal.form.nombre" required class="input" placeholder="Contacto" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Correo</label>
            <input v-model="nuevoModal.form.email" type="email" required class="input" placeholder="proveedor@empresa.com" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Contraseña</label>
            <input v-model="nuevoModal.form.password" type="text" required minlength="6" class="input" placeholder="Mínimo 6 caracteres" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">RFC</label>
            <input v-model="nuevoModal.form.rfc" required maxlength="13" class="input uppercase font-mono" placeholder="XAXX010101000" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Razón social</label>
          <input v-model="nuevoModal.form.razon_social" required class="input" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Banco</label>
            <input v-model="nuevoModal.form.banco" class="input" />
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">CLABE</label>
            <input v-model="nuevoModal.form.cuenta_clabe" maxlength="18" class="input font-mono" placeholder="18 dígitos" />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Dirección</label>
          <input v-model="nuevoModal.form.direccion" class="input" />
        </div>
        <label class="flex items-center gap-2 text-sm text-ink-700 cursor-pointer w-fit">
          <input v-model="nuevoModal.form.aprobar" type="checkbox" class="w-4 h-4 rounded" />
          Aprobar inmediatamente (puede subir facturas sin esperar)
        </label>
        <p v-if="nuevoModal.error" class="text-sm text-red-600">{{ nuevoModal.error }}</p>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="nuevoModal.abierto = false">Cancelar</button>
        <button class="btn-primary" :disabled="nuevoModal.guardando" @click="crearNuevo">
          {{ nuevoModal.guardando ? 'Creando...' : 'Crear proveedor' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
const api = useApi();
const tab = ref('pendientes');
const tabs = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'todos',      label: 'Todos' },
];

const pendientes = ref([]);
const todos = ref([]);
const filtros = reactive({ activo: '', q: '' });
const modal = reactive({ abierto: false, id: null, rfc: '', motivo: '' });

const counts = computed(() => ({
  pendientes: pendientes.value.length,
  todos: todos.value.length,
}));

const todosFiltrados = computed(() => {
  if (!filtros.q) return todos.value;
  const q = filtros.q.toLowerCase();
  return todos.value.filter((p) =>
    String(p.rfc || '').toLowerCase().includes(q)
    || String(p.razon_social || '').toLowerCase().includes(q)
  );
});

async function cargar() {
  const [a, b] = await Promise.all([
    api.get('/proveedores/pendientes'),
    api.get('/proveedores' + (filtros.activo ? `?activo=${filtros.activo}` : '')),
  ]);
  pendientes.value = a.data; todos.value = b.data;
}
watch(() => filtros.activo, cargar);
onMounted(cargar);

const toast = useToast();

async function aprobar(id) {
  try {
    await api.post(`/proveedores/${id}/aprobar`);
    toast.success('Proveedor aprobado', 'Ya puede subir facturas.');
    cargar();
  } catch (e) { toast.error('No se pudo aprobar', e.message); }
}
function abrirRechazo(p) { Object.assign(modal, { abierto: true, id: p.id, rfc: p.rfc, motivo: '' }); }
async function rechazar() {
  try {
    await api.post(`/proveedores/${modal.id}/rechazar`, { motivo: modal.motivo });
    toast.success('Proveedor rechazado');
    modal.abierto = false; cargar();
  } catch (e) { toast.error('No se pudo rechazar', e.message); }
}

const nuevoModal = reactive({
  abierto: false, guardando: false, error: '',
  form: { nombre: '', email: '', password: '', rfc: '', razon_social: '', direccion: '', banco: '', cuenta_clabe: '', aprobar: false },
});

async function crearNuevo() {
  nuevoModal.guardando = true; nuevoModal.error = '';
  try {
    await api.post('/proveedores/admin-crear', nuevoModal.form);
    toast.success('Proveedor creado', `${nuevoModal.form.razon_social} (${nuevoModal.form.rfc})`);
    Object.assign(nuevoModal.form, { nombre: '', email: '', password: '', rfc: '', razon_social: '', direccion: '', banco: '', cuenta_clabe: '', aprobar: false });
    nuevoModal.abierto = false;
    cargar();
  } catch (e) {
    nuevoModal.error = e.message;
    toast.error('No se pudo crear', e.message);
  }
  finally { nuevoModal.guardando = false; }
}
</script>
