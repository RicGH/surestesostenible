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
            <tr><th>RFC</th><th>Razón social</th><th>Contacto</th><th>Email</th><th>Estado</th><th class="!text-center">Acciones</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in pendientes" :key="p.id">
              <td class="font-mono">{{ p.rfc }}</td>
              <td class="font-medium text-ink-800">{{ p.razon_social }}</td>
              <td class="text-ink-700">{{ p.nombre || '—' }}</td>
              <td>{{ p.email }}</td>
              <td><EstadoBadge :estado="p.estado" /></td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver detalle" variant="primary" @click="abrirDetalle(p)" />
                  <IconButton icon="check" tooltip="Aprobar" variant="success" @click="aprobar(p.id)" />
                  <IconButton icon="x" tooltip="Rechazar" variant="danger" @click="abrirRechazo(p)" />
                </div>
              </td>
            </tr>
            <tr v-if="!pendientes.length"><td colspan="6" class="py-12 text-center text-ink-400">Sin proveedores pendientes</td></tr>
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
          <thead><tr><th>RFC</th><th>Razón social</th><th>Contacto</th><th>Email</th><th>Estado</th><th>Activo</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="p in todosFiltrados" :key="p.id">
              <td class="font-mono">{{ p.rfc }}</td>
              <td class="font-medium text-ink-800">{{ p.razon_social }}</td>
              <td class="text-ink-700">{{ p.nombre || '—' }}</td>
              <td>{{ p.email }}</td>
              <td><EstadoBadge :estado="p.estado" /></td>
              <td><EstadoBadge :estado="p.activo ? 'activo' : 'inactivo'" /></td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver detalle" variant="primary" @click="abrirDetalle(p)" />
                  <IconButton icon="edit" tooltip="Editar" variant="primary" @click="abrirEdicion(p)" />
                  <IconButton icon="send" tooltip="Enviar contrato" variant="primary" @click="abrirContrato(p)" />
                </div>
              </td>
            </tr>
            <tr v-if="!todosFiltrados.length"><td colspan="7" class="py-12 text-center text-ink-400">{{ todos.length ? 'Sin coincidencias con los filtros' : 'Sin registros' }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <Modal v-if="modal.abierto" title="Rechazar registro de proveedor" @close="modal.abierto = false">
      <div class="space-y-4">
        <div v-if="modal.prov" class="rounded-lg bg-ink-50 border border-ink-200 p-3 text-sm space-y-1.5">
          <div class="flex justify-between gap-3">
            <span class="text-ink-500 shrink-0">Razón social</span>
            <span class="font-medium text-ink-900 text-right">{{ modal.prov.razon_social }}</span>
          </div>
          <div class="flex justify-between gap-3">
            <span class="text-ink-500 shrink-0">RFC</span>
            <span class="font-mono text-ink-900">{{ modal.prov.rfc }}</span>
          </div>
          <div v-if="modal.prov.nombre" class="flex justify-between gap-3">
            <span class="text-ink-500 shrink-0">Contacto</span>
            <span class="text-ink-900 text-right">{{ modal.prov.nombre }}</span>
          </div>
          <div class="flex justify-between gap-3">
            <span class="text-ink-500 shrink-0">Email</span>
            <span class="text-ink-900 text-right break-all">{{ modal.prov.email }}</span>
          </div>
          <div v-if="modal.prov.direccion" class="flex justify-between gap-3">
            <span class="text-ink-500 shrink-0">Dirección</span>
            <span class="text-ink-900 text-right">{{ modal.prov.direccion }}</span>
          </div>
          <div v-if="modal.prov.banco" class="flex justify-between gap-3">
            <span class="text-ink-500 shrink-0">Banco</span>
            <span class="text-ink-900 text-right">{{ modal.prov.banco }}</span>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Motivo del rechazo <span class="text-red-500">*</span></label>
          <textarea v-model="modal.motivo" rows="3" required class="input" placeholder="Explica por qué se rechaza el registro"></textarea>
          <p class="text-xs text-ink-500 mt-1.5">El proveedor recibirá este motivo en la plataforma y por correo.</p>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modal.abierto = false">Cancelar</button>
        <button class="btn-danger" :disabled="!modal.motivo.trim()" @click="rechazar">Rechazar</button>
      </template>
    </Modal>

    <Modal v-if="detalleModal.abierto" title="Detalle del proveedor" @close="detalleModal.abierto = false">
      <div v-if="detalleModal.cargando" class="py-8 text-center text-ink-500">Cargando...</div>
      <div v-else-if="detalleModal.data" class="space-y-4">
        <div class="flex items-center gap-2 flex-wrap">
          <EstadoBadge :estado="detalleModal.data.estado" />
          <EstadoBadge :estado="detalleModal.data.activo ? 'activo' : 'inactivo'" />
        </div>
        <dl class="rounded-lg bg-ink-50 border border-ink-200 divide-y divide-ink-200 text-sm">
          <div class="flex justify-between gap-3 px-3 py-2"><dt class="text-ink-500 shrink-0">Razón social</dt><dd class="font-medium text-ink-900 text-right">{{ detalleModal.data.razon_social }}</dd></div>
          <div class="flex justify-between gap-3 px-3 py-2"><dt class="text-ink-500 shrink-0">RFC</dt><dd class="font-mono text-ink-900">{{ detalleModal.data.rfc }}</dd></div>
          <div class="flex justify-between gap-3 px-3 py-2"><dt class="text-ink-500 shrink-0">Contacto</dt><dd class="text-ink-900 text-right">{{ detalleModal.data.nombre || '—' }}</dd></div>
          <div class="flex justify-between gap-3 px-3 py-2"><dt class="text-ink-500 shrink-0">Email</dt><dd class="text-ink-900 text-right break-all">{{ detalleModal.data.email }}</dd></div>
          <div class="flex justify-between gap-3 px-3 py-2"><dt class="text-ink-500 shrink-0">Dirección</dt><dd class="text-ink-900 text-right">{{ detalleModal.data.direccion || '—' }}</dd></div>
          <div class="flex justify-between gap-3 px-3 py-2"><dt class="text-ink-500 shrink-0">CP</dt><dd class="font-mono text-ink-900 text-right">{{ detalleModal.data.codigo_postal || '—' }}</dd></div>
          <div class="flex justify-between gap-3 px-3 py-2"><dt class="text-ink-500 shrink-0">Municipio</dt><dd class="text-ink-900 text-right">{{ detalleModal.data.municipio || '—' }}</dd></div>
          <div class="flex justify-between gap-3 px-3 py-2"><dt class="text-ink-500 shrink-0">Estado</dt><dd class="text-ink-900 text-right">{{ detalleModal.data.estado_republica || '—' }}</dd></div>
        </dl>

        <p class="text-xs font-semibold text-ink-500 uppercase tracking-wide">Datos bancarios</p>
        <dl class="rounded-lg bg-ink-50 border border-ink-200 divide-y divide-ink-200 text-sm">
          <div class="flex justify-between gap-3 px-3 py-2"><dt class="text-ink-500 shrink-0">Banco</dt><dd class="text-ink-900 text-right">{{ detalleModal.data.banco || '—' }}</dd></div>
          <div class="flex justify-between gap-3 px-3 py-2"><dt class="text-ink-500 shrink-0">Sucursal</dt><dd class="text-ink-900 text-right">{{ detalleModal.data.sucursal_banco || '—' }}</dd></div>
          <div class="flex justify-between gap-3 px-3 py-2"><dt class="text-ink-500 shrink-0">CLABE</dt><dd class="font-mono text-ink-900 text-right">{{ detalleModal.data.cuenta_clabe || '—' }}</dd></div>
        </dl>

        <p class="text-xs font-semibold text-ink-500 uppercase tracking-wide">Datos personales (para contratos)</p>
        <dl class="rounded-lg bg-ink-50 border border-ink-200 divide-y divide-ink-200 text-sm">
          <div class="flex justify-between gap-3 px-3 py-2"><dt class="text-ink-500 shrink-0">Fecha de nacimiento</dt><dd class="text-ink-900 text-right">{{ fmtFecha(detalleModal.data.fecha_nacimiento) }}</dd></div>
          <div class="flex justify-between gap-3 px-3 py-2"><dt class="text-ink-500 shrink-0">Estado civil</dt><dd class="text-ink-900 text-right">{{ detalleModal.data.estado_civil || '—' }}</dd></div>
          <div class="flex justify-between gap-3 px-3 py-2"><dt class="text-ink-500 shrink-0">Nacionalidad</dt><dd class="text-ink-900 text-right">{{ detalleModal.data.nacionalidad || '—' }}</dd></div>
        </dl>
        <div class="flex items-center justify-between gap-3">
          <span class="text-sm text-ink-500">Constancia fiscal</span>
          <button v-if="detalleModal.data.documentacion" class="btn-secondary text-sm" @click="verDocumentacion">
            <Icon name="eye" size="w-4 h-4" /> Ver constancia
          </button>
          <span v-else class="text-sm text-ink-400 italic">No adjuntada</span>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="detalleModal.abierto = false">Cerrar</button>
        <button v-if="detalleModal.data" class="btn-secondary" @click="abrirContrato(detalleModal.data); detalleModal.abierto = false">
          <Icon name="send" size="w-4 h-4" /> Enviar contrato
        </button>
        <button v-if="detalleModal.data" class="btn-primary" @click="abrirEdicion(detalleModal.data); detalleModal.abierto = false">
          <Icon name="edit" size="w-4 h-4" /> Editar
        </button>
      </template>
    </Modal>

    <Modal v-if="edicionModal.abierto" title="Editar proveedor" size="2xl" @close="edicionModal.abierto = false">
      <form class="space-y-5" @submit.prevent="guardarEdicion">

        <!-- Datos fiscales -->
        <div class="space-y-3">
          <p class="text-xs font-semibold text-ink-500 uppercase tracking-wide border-b border-ink-100 pb-1">Datos fiscales</p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">RFC</label>
              <input v-model="edicionModal.form.rfc" required maxlength="13" class="input uppercase font-mono" placeholder="XAXX010101000" />
            </div>
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Razón social</label>
              <input v-model="edicionModal.form.razon_social" required class="input" />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-ink-700 mb-1.5">Dirección completa</label>
            <input v-model="edicionModal.form.direccion" class="input" />
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">CP</label>
              <input v-model="edicionModal.form.codigo_postal" maxlength="10" class="input font-mono" placeholder="00000" />
            </div>
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Municipio</label>
              <input v-model="edicionModal.form.municipio" class="input" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Estado (República)</label>
              <input v-model="edicionModal.form.estado_republica" class="input" placeholder="Ej: Chiapas" />
            </div>
          </div>
        </div>

        <!-- Datos bancarios -->
        <div class="space-y-3">
          <p class="text-xs font-semibold text-ink-500 uppercase tracking-wide border-b border-ink-100 pb-1">Datos bancarios</p>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Banco</label>
              <input v-model="edicionModal.form.banco" class="input" />
            </div>
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Sucursal</label>
              <input v-model="edicionModal.form.sucursal_banco" class="input" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">CLABE interbancaria</label>
              <input v-model="edicionModal.form.cuenta_clabe" maxlength="18" class="input font-mono" placeholder="18 dígitos" />
            </div>
          </div>
        </div>

        <!-- Datos personales -->
        <div class="space-y-3">
          <p class="text-xs font-semibold text-ink-500 uppercase tracking-wide border-b border-ink-100 pb-1">Datos personales (para contratos)</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Fecha de nacimiento</label>
              <input v-model="edicionModal.form.fecha_nacimiento" type="date" class="input" />
            </div>
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Estado civil</label>
              <select v-model="edicionModal.form.estado_civil" class="input">
                <option value="">— Seleccionar —</option>
                <option>Soltero/a</option>
                <option>Casado/a</option>
                <option>Divorciado/a</option>
                <option>Viudo/a</option>
                <option>Unión libre</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Nacionalidad</label>
              <input v-model="edicionModal.form.nacionalidad" class="input" placeholder="Mexicana" />
            </div>
          </div>
        </div>

        <!-- Toggle activo -->
        <div class="flex items-center justify-between gap-3 pt-3 border-t border-ink-100">
          <div>
            <p class="text-sm font-medium text-ink-700">Estado del proveedor</p>
            <p class="text-xs text-ink-500">{{ edicionModal.form.activo ? 'Activo · puede iniciar sesión y operar' : 'Inactivo · no puede acceder' }}</p>
          </div>
          <button
            type="button"
            role="switch"
            :aria-checked="edicionModal.form.activo"
            :class="['relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0',
                     edicionModal.form.activo ? 'bg-emerald-500' : 'bg-ink-300']"
            @click="edicionModal.form.activo = !edicionModal.form.activo"
          >
            <span :class="['inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                           edicionModal.form.activo ? 'translate-x-5' : 'translate-x-0.5']" />
          </button>
        </div>

        <p v-if="edicionModal.error" class="text-sm text-red-600">{{ edicionModal.error }}</p>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="edicionModal.abierto = false">Cancelar</button>
        <button class="btn-primary" :disabled="edicionModal.guardando" @click="guardarEdicion">
          {{ edicionModal.guardando ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </template>
    </Modal>

    <FileViewer
      v-if="visor.abierto"
      :path="visor.path"
      :title="visor.title"
      :subtitle="visor.subtitle"
      :download-name="visor.downloadName"
      @close="visor.abierto = false"
    />

    <!-- Modal enviar contrato -->
    <Modal
      v-if="contratoModal.abierto"
      :title="contratoModal.paso === 1 ? 'Enviar contrato' : 'Datos del contrato'"
      size="3xl"
      @close="cerrarContrato"
    >
      <!-- PASO 1: seleccionar plantilla -->
      <div v-if="contratoModal.paso === 1" class="space-y-3">
        <!-- Info del proveedor -->
        <div class="flex items-center gap-2 rounded-lg bg-ink-50 border border-ink-200 px-3 py-2 text-sm">
          <Icon name="building" size="w-4 h-4 text-ink-400 shrink-0" />
          <span class="font-medium text-ink-800">{{ contratoModal.proveedor?.razon_social }}</span>
          <span class="text-ink-400 font-mono text-xs ml-auto">{{ contratoModal.proveedor?.rfc }}</span>
        </div>
        <p class="text-xs font-semibold text-ink-500 uppercase tracking-wide">Selecciona una plantilla</p>
        <div v-if="contratoModal.cargandoPlantillas" class="py-6 text-center text-ink-500 text-sm">Cargando...</div>
        <div v-else-if="!contratoModal.plantillas.length" class="py-6 text-center text-ink-400 text-sm">
          No hay plantillas.
          <NuxtLink to="/admin/contratos" class="text-brand-600 hover:underline ml-1">Subir una</NuxtLink>
        </div>
        <div v-else class="space-y-2 max-h-72 overflow-auto pr-0.5">
          <button
            v-for="p in contratoModal.plantillas"
            :key="p.id"
            :class="['w-full text-left px-3 py-2.5 rounded-lg border transition-all flex items-center gap-3',
                     contratoModal.plantillaId === p.id
                       ? 'border-brand-500 bg-brand-50'
                       : 'border-ink-200 hover:border-brand-300 hover:bg-ink-50']"
            @click="seleccionarPlantilla(p)"
          >
            <div class="flex-1 min-w-0">
              <p class="font-medium text-ink-800 text-sm">{{ p.nombre }}</p>
              <p v-if="p.descripcion" class="text-xs text-ink-500 truncate">{{ p.descripcion }}</p>
            </div>
            <div class="flex gap-2 text-xs shrink-0">
              <span class="text-emerald-600 font-medium">{{ p.etiquetas_json?.filter((e) => e.mapa).length || 0 }} auto</span>
              <span v-if="p.etiquetas_json?.filter((e) => !e.mapa).length" class="text-amber-600 font-medium">
                {{ p.etiquetas_json.filter((e) => !e.mapa).length }} manual
              </span>
            </div>
            <Icon v-if="contratoModal.plantillaId === p.id" name="check" size="w-4 h-4 text-brand-600 shrink-0" />
          </button>
        </div>
      </div>

      <!-- PASO 2: revisar y completar campos -->
      <div v-else-if="contratoModal.paso === 2" class="space-y-4">

        <!-- Campos automáticos: lista compacta -->
        <div v-if="contratoModal.camposAuto.length">
          <p class="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
            Automáticos — tomados del proveedor
          </p>
          <dl class="rounded-lg bg-emerald-50 border border-emerald-200 divide-y divide-emerald-100">
            <div
              v-for="c in contratoModal.camposAuto"
              :key="c.etiqueta"
              class="flex items-center justify-between gap-4 px-3 py-1.5"
            >
              <dt class="text-xs text-emerald-700 font-mono shrink-0">«{{ c.etiqueta }}»</dt>
              <dd class="text-xs font-semibold text-ink-800 text-right truncate max-w-[220px]" :title="c.valor">{{ c.valor || '—' }}</dd>
            </div>
          </dl>
        </div>

        <!-- Campos manuales: grid 2 columnas -->
        <div v-if="contratoModal.camposManuales.length">
          <p class="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
            Completar manualmente
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div v-for="c in contratoModal.camposManuales" :key="c.etiqueta">
              <label class="block text-xs font-medium text-ink-700 mb-1 truncate" :title="c.label">
                {{ c.label }}
              </label>
              <input
                v-model="contratoModal.valoresExtra[c.etiqueta]"
                class="input text-sm"
                :placeholder="c.label"
              />
            </div>
          </div>
        </div>

        <p v-if="contratoModal.error" class="text-sm text-red-600">{{ contratoModal.error }}</p>
      </div>

      <template #footer>
        <button class="btn-secondary" @click="cerrarContrato">Cancelar</button>
        <button
          v-if="contratoModal.paso === 1"
          class="btn-primary"
          :disabled="!contratoModal.plantillaId"
          @click="contratoModal.paso = 2"
        >
          Siguiente
        </button>
        <button
          v-else
          class="btn-primary"
          :disabled="contratoModal.generando"
          @click="generarContrato"
        >
          {{ contratoModal.generando ? 'Generando PDF...' : 'Generar y abrir editor' }}
        </button>
      </template>
    </Modal>

    <Modal v-if="nuevoModal.abierto" title="Nuevo proveedor" size="2xl" @close="nuevoModal.abierto = false">
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

        <div class="pt-1 border-t border-ink-100">
          <p class="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3">Datos personales <span class="font-normal normal-case">(para contratos, opcional)</span></p>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Fecha de nacimiento</label>
              <input v-model="nuevoModal.form.fecha_nacimiento" type="date" class="input" />
            </div>
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Estado civil</label>
              <select v-model="nuevoModal.form.estado_civil" class="input">
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
              <input v-model="nuevoModal.form.nacionalidad" class="input" placeholder="Mexicana" />
            </div>
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Código postal</label>
              <input v-model="nuevoModal.form.codigo_postal" maxlength="5" class="input font-mono" placeholder="00000" />
            </div>
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Municipio</label>
              <input v-model="nuevoModal.form.municipio" class="input" placeholder="Ciudad / Municipio" />
            </div>
            <div>
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Estado</label>
              <input v-model="nuevoModal.form.estado_republica" class="input" placeholder="Tabasco" />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-ink-700 mb-1.5">Sucursal bancaria</label>
              <input v-model="nuevoModal.form.sucursal_banco" class="input" placeholder="Sucursal donde se realizarán los depósitos" />
            </div>
          </div>
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
const modal = reactive({ abierto: false, prov: null, motivo: '' });

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
    || String(p.nombre || '').toLowerCase().includes(q)
    || String(p.email || '').toLowerCase().includes(q)
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
function abrirRechazo(p) { Object.assign(modal, { abierto: true, prov: p, motivo: '' }); }
async function rechazar() {
  if (!modal.motivo.trim()) {
    toast.warning('Falta el motivo', 'Indica por qué se rechaza el registro.');
    return;
  }
  try {
    await api.post(`/proveedores/${modal.prov.id}/rechazar`, { motivo: modal.motivo.trim() });
    toast.success('Proveedor rechazado', 'Se notificó al proveedor con el motivo.');
    modal.abierto = false; cargar();
  } catch (e) { toast.error('No se pudo rechazar', e.message); }
}

const detalleModal = reactive({ abierto: false, cargando: false, data: null });
const edicionModal = reactive({
  abierto: false, guardando: false, error: '', id: null,
  form: {
    rfc: '', razon_social: '', direccion: '', banco: '', cuenta_clabe: '', activo: true,
    codigo_postal: '', municipio: '', estado_republica: '', sucursal_banco: '',
    fecha_nacimiento: '', estado_civil: '', nacionalidad: '',
  },
});
const visor = reactive({ abierto: false, path: '', title: '', subtitle: '', downloadName: '' });

function fmtFecha(f) {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function abrirDetalle(p) {
  Object.assign(detalleModal, { abierto: true, cargando: true, data: null });
  try {
    detalleModal.data = await api.get(`/proveedores/${p.id}`);
  } catch (e) {
    toast.error('No se pudo cargar el detalle', e.message);
    detalleModal.abierto = false;
  } finally {
    detalleModal.cargando = false;
  }
}

async function abrirEdicion(p) {
  Object.assign(edicionModal, { abierto: true, guardando: false, error: '', id: p.id });
  try {
    const d = await api.get(`/proveedores/${p.id}`);
    Object.assign(edicionModal.form, {
      rfc: d.rfc || '',
      razon_social: d.razon_social || '',
      direccion: d.direccion || '',
      banco: d.banco || '',
      cuenta_clabe: d.cuenta_clabe || '',
      activo: !!d.activo,
      codigo_postal: d.codigo_postal || '',
      municipio: d.municipio || '',
      estado_republica: d.estado_republica || '',
      sucursal_banco: d.sucursal_banco || '',
      fecha_nacimiento: d.fecha_nacimiento ? d.fecha_nacimiento.slice(0, 10) : '',
      estado_civil: d.estado_civil || '',
      nacionalidad: d.nacionalidad || 'Mexicana',
    });
  } catch (e) {
    toast.error('No se pudo cargar el proveedor', e.message);
    edicionModal.abierto = false;
  }
}

async function guardarEdicion() {
  edicionModal.guardando = true; edicionModal.error = '';
  try {
    await api.put(`/proveedores/${edicionModal.id}`, edicionModal.form);
    toast.success('Proveedor actualizado', 'Los datos fiscales se guardaron.');
    edicionModal.abierto = false;
    cargar();
  } catch (e) {
    edicionModal.error = e.message;
    toast.error('No se pudo actualizar', e.message);
  } finally {
    edicionModal.guardando = false;
  }
}

function verDocumentacion() {
  Object.assign(visor, {
    abierto: true,
    path: `/proveedores/${detalleModal.data.id}/documentacion`,
    title: 'Constancia fiscal',
    subtitle: detalleModal.data.razon_social,
    downloadName: `constancia-${detalleModal.data.rfc}`,
  });
}

const nuevoModal = reactive({
  abierto: false, guardando: false, error: '',
  form: { nombre: '', email: '', password: '', rfc: '', razon_social: '', direccion: '', banco: '', cuenta_clabe: '', aprobar: false, fecha_nacimiento: '', estado_civil: '', nacionalidad: '', codigo_postal: '', municipio: '', estado_republica: '', sucursal_banco: '' },
});

const nuevoFormVacio = () => ({ nombre: '', email: '', password: '', rfc: '', razon_social: '', direccion: '', banco: '', cuenta_clabe: '', aprobar: false, fecha_nacimiento: '', estado_civil: '', nacionalidad: '', codigo_postal: '', municipio: '', estado_republica: '', sucursal_banco: '' });

async function crearNuevo() {
  nuevoModal.guardando = true; nuevoModal.error = '';
  try {
    await api.post('/proveedores/admin-crear', nuevoModal.form);
    toast.success('Proveedor creado', `${nuevoModal.form.razon_social} (${nuevoModal.form.rfc})`);
    Object.assign(nuevoModal.form, nuevoFormVacio());
    nuevoModal.abierto = false;
    cargar();
  } catch (e) {
    nuevoModal.error = e.message;
    toast.error('No se pudo crear', e.message);
  }
  finally { nuevoModal.guardando = false; }
}

// — Enviar contrato —
const router = useRouter();

const contratoModal = reactive({
  abierto: false,
  paso: 1,
  proveedor: null,
  proveedorData: null,
  plantillas: [],
  cargandoPlantillas: false,
  plantillaId: null,
  plantillaSeleccionada: null,
  camposAuto: [],
  camposManuales: [],
  valoresExtra: {},
  generando: false,
  error: '',
});

async function abrirContrato(p) {
  Object.assign(contratoModal, {
    abierto: true, paso: 1, proveedor: p, proveedorData: null,
    plantillas: [], cargandoPlantillas: true,
    plantillaId: null, plantillaSeleccionada: null,
    camposAuto: [], camposManuales: [], valoresExtra: {}, error: '',
  });
  try {
    const [pData, pls] = await Promise.all([
      api.get(`/proveedores/${p.id}`),
      api.get('/contratos/plantillas'),
    ]);
    contratoModal.proveedorData = pData;
    contratoModal.plantillas = pls.data || [];
  } catch (e) {
    toast.error('No se pudieron cargar los datos', e.message);
    contratoModal.abierto = false;
  } finally {
    contratoModal.cargandoPlantillas = false;
  }
}

function seleccionarPlantilla(p) {
  contratoModal.plantillaId = p.id;
  contratoModal.plantillaSeleccionada = p;
}

watch(() => contratoModal.paso, (paso) => {
  if (paso !== 2 || !contratoModal.plantillaSeleccionada) return;
  const prov = contratoModal.proveedorData;
  const mapeoCampos = {
    razon_social: prov?.razon_social, rfc: prov?.rfc, direccion: prov?.direccion,
    banco: prov?.banco, cuenta_clabe: prov?.cuenta_clabe,
    nombre: prov?.nombre, email: prov?.email,
    fecha_nacimiento: prov?.fecha_nacimiento, estado_civil: prov?.estado_civil,
    nacionalidad: prov?.nacionalidad, codigo_postal: prov?.codigo_postal,
    municipio: prov?.municipio, estado_republica: prov?.estado_republica,
    sucursal_banco: prov?.sucursal_banco,
  };
  const auto = [];
  const manual = [];
  for (const e of contratoModal.plantillaSeleccionada.etiquetas_json || []) {
    if (e.mapa === '__fecha__') {
      auto.push({ ...e, valor: new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) });
    } else if (e.mapa === '__ciudad_y_estado__') {
      const partes = [prov?.municipio, prov?.estado_republica].filter(Boolean);
      if (partes.length) auto.push({ ...e, valor: partes.join(', ') });
      else manual.push(e);
    } else if (e.mapa && mapeoCampos[e.mapa] != null && mapeoCampos[e.mapa] !== '') {
      const valor = e.mapa === 'fecha_nacimiento' ? fmtFecha(mapeoCampos[e.mapa]) : mapeoCampos[e.mapa];
      auto.push({ ...e, valor });
    } else {
      manual.push(e);
    }
  }
  contratoModal.camposAuto = auto;
  contratoModal.camposManuales = manual;
  contratoModal.valoresExtra = Object.fromEntries(manual.map((m) => [m.etiqueta, '']));
});

async function generarContrato() {
  contratoModal.generando = true; contratoModal.error = '';
  try {
    const r = await api.post('/contratos/generar', {
      plantilla_id: contratoModal.plantillaId,
      proveedor_id: contratoModal.proveedor.id,
      valores_extra: contratoModal.valoresExtra,
    });
    toast.success('Contrato generado', r.nombre);
    cerrarContrato();
    router.push(`/admin/documentos/${r.documento_id}/editor`);
  } catch (e) {
    contratoModal.error = e.message;
    toast.error('No se pudo generar el contrato', e.message);
  } finally {
    contratoModal.generando = false;
  }
}

function cerrarContrato() {
  Object.assign(contratoModal, {
    abierto: false, paso: 1, proveedor: null, proveedorData: null,
    plantillaId: null, plantillaSeleccionada: null,
    camposAuto: [], camposManuales: [], valoresExtra: {}, error: '',
  });
}
</script>
