<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-ink-900">Catálogos</h2>
        <p class="text-sm text-ink-500">Administra los valores que se usan en la contabilidad de los viáticos.</p>
      </div>
      <button class="btn-primary shrink-0" @click="abrirNuevo">
        <Icon name="plus" size="w-4 h-4" /> Agregar
      </button>
    </div>

    <div class="flex items-center gap-1 border-b border-ink-200 flex-wrap">
      <button
        v-for="t in TABS"
        :key="t.id"
        :class="['px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap',
                 tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800']"
        @click="cambiarTab(t.id)"
      >
        {{ t.label }}
      </button>
    </div>

    <div class="card overflow-hidden">
      <table class="table">
        <thead>
          <tr><th>Nombre</th><th>Estado</th><th class="!text-center">Acciones</th></tr>
        </thead>
        <tbody>
          <tr v-for="it in items" :key="it.id">
            <td class="font-medium text-ink-800">{{ it.nombre }}</td>
            <td><EstadoBadge :estado="it.activo ? 'activo' : 'inactivo'" /></td>
            <td>
              <div class="flex gap-1 justify-center">
                <IconButton icon="edit" tooltip="Renombrar" variant="primary" @click="abrirEdicion(it)" />
                <IconButton
                  :icon="it.activo ? 'ban' : 'check'"
                  :tooltip="it.activo ? 'Desactivar' : 'Activar'"
                  :variant="it.activo ? 'warning' : 'success'"
                  @click="toggleActivo(it)"
                />
                <IconButton icon="trash" tooltip="Eliminar" variant="danger" @click="eliminar(it)" />
              </div>
            </td>
          </tr>
          <tr v-if="!items.length"><td colspan="3" class="py-12 text-center text-ink-400">Sin registros en este catálogo.</td></tr>
        </tbody>
      </table>
    </div>

    <Modal v-if="modal.abierto" :title="`${modal.id ? 'Editar' : 'Agregar'} ${labelActual.toLowerCase()}`" size="md" @close="modal.abierto = false">
      <form @submit.prevent="guardar">
        <label class="block text-sm font-medium text-ink-700 mb-1.5">{{ campoLabel }}</label>
        <input
          ref="inputEl"
          v-model="modal.nombre"
          maxlength="160"
          class="input"
          :placeholder="campoLabel"
          @keyup.enter="guardar"
        />
      </form>
      <template #footer>
        <button class="btn-secondary" @click="modal.abierto = false">Cancelar</button>
        <button class="btn-primary" :disabled="!modal.nombre.trim() || modal.guardando" @click="guardar">
          {{ modal.guardando ? 'Guardando…' : (modal.id ? 'Guardar cambios' : 'Agregar') }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
definePageMeta({ middleware: ['admin'] });

const api = useApi();
const toast = useToast();

const TABS = [
  { id: 'proyecto', label: 'Proyecto' },
  { id: 'cuenta', label: 'Cuenta' },
  { id: 'partida', label: 'Partida' },
  { id: 'objetivo_estrategico', label: 'Objetivo estratégico' },
];

const CAMPO_LABEL = {
  proyecto: 'Nombre del proyecto',
  cuenta: 'Nombre de la cuenta',
  partida: 'Nombre de la partida',
  objetivo_estrategico: 'Nombre del objetivo estratégico',
};

const tab = ref('proyecto');
const items = ref([]);
const inputEl = ref(null);
const modal = reactive({ abierto: false, id: null, nombre: '', guardando: false });

const labelActual = computed(() => TABS.find((t) => t.id === tab.value)?.label || '');
const campoLabel = computed(() => CAMPO_LABEL[tab.value] || 'Nombre');

async function cargar() {
  try {
    const r = await api.get(`/catalogos?tipo=${tab.value}&todos=1`);
    items.value = r.data;
  } catch (e) {
    toast.error('No se pudo cargar', e.message);
  }
}
onMounted(cargar);

function cambiarTab(id) {
  tab.value = id;
  cargar();
}

async function focusInput() {
  await nextTick();
  inputEl.value?.focus();
}

function abrirNuevo() {
  Object.assign(modal, { abierto: true, id: null, nombre: '', guardando: false });
  focusInput();
}

function abrirEdicion(it) {
  Object.assign(modal, { abierto: true, id: it.id, nombre: it.nombre, guardando: false });
  focusInput();
}

async function guardar() {
  if (!modal.nombre.trim()) return;
  modal.guardando = true;
  try {
    if (modal.id) {
      await api.put(`/catalogos/${modal.id}`, { nombre: modal.nombre.trim() });
      toast.success('Actualizado');
    } else {
      await api.post('/catalogos', { tipo: tab.value, nombre: modal.nombre.trim() });
      toast.success('Agregado');
    }
    modal.abierto = false;
    cargar();
  } catch (e) {
    toast.error('No se pudo guardar', e.message);
  } finally {
    modal.guardando = false;
  }
}

async function toggleActivo(it) {
  try {
    await api.put(`/catalogos/${it.id}`, { activo: !it.activo });
    cargar();
  } catch (e) {
    toast.error('No se pudo cambiar el estado', e.message);
  }
}

async function eliminar(it) {
  if (!confirm(`¿Eliminar "${it.nombre}" del catálogo?`)) return;
  try {
    await api.del(`/catalogos/${it.id}`);
    toast.success('Eliminado');
    cargar();
  } catch (e) {
    toast.error('No se pudo eliminar', e.message);
  }
}
</script>
