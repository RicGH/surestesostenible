<template>
  <div class="space-y-6">
    <div class="flex items-center gap-1 border-b border-ink-200 overflow-x-auto overflow-y-hidden">
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

    <div class="card-pad grid grid-cols-1 gap-3" :class="tab === 'todos' ? 'md:grid-cols-5' : 'md:grid-cols-4'">
      <div class="md:col-span-2 relative">
        <Icon name="search" size="w-4 h-4" class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input v-model="filtros.q" :placeholder="placeholderBusqueda" class="input pl-9" />
      </div>
      <DateInput v-model="filtros.desde" placeholder="Desde" />
      <DateInput v-model="filtros.hasta" placeholder="Hasta" :min-date="filtros.desde || null" />
      <select v-if="tab === 'todos'" v-model="filtros.estado" class="input">
        <option value="">Todos los estados</option>
        <option value="pendiente">Pendiente</option>
        <option value="aprobado">Aprobado</option>
        <option value="pagado">Pagado</option>
        <option value="en_proceso">En proceso</option>
        <option value="rechazado">Rechazado</option>
        <option value="cerrado">Cerrado</option>
        <option value="cancelado">Cancelado</option>
      </select>
      <div v-if="hayFiltros" class="md:col-span-full flex items-center gap-2 text-xs text-ink-500">
        <span>{{ resultadosFiltrados }} resultado(s)</span>
        <button class="text-brand-600 hover:text-brand-700 font-medium" @click="limpiarFiltros">
          Limpiar filtros
        </button>
      </div>
    </div>

    <section v-if="tab === 'pendientes'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Folio</th><th>Colaborador</th><th>Destino</th><th>Fechas</th><th>Avance</th><th>Firmas</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="s in pendientesFiltrados" :key="s.id">
              <td class="font-mono text-xs">{{ s.folio }}</td>
              <td class="font-medium text-ink-800">{{ s.colaborador_nombre }}</td>
              <td>{{ s.destino }}</td>
              <td class="text-ink-600">{{ s.fecha_inicio }} → {{ s.fecha_fin }}</td>
              <td><AvanceCelda :total="s.monto_total" :gastado="s.monto_gastado" /></td>
              <td><FirmasOficioCelda :fila="s" @click="abrirFirmaOficio(s)" /></td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver detalle" variant="primary" @click="$router.push(`/viaticos/${s.id}?from=admin`)" />
                  <IconButton icon="edit" tooltip="Editar solicitud" variant="warning" @click="$router.push(`/viaticos/nueva?editar=${s.id}&from=admin`)" />
                  <IconButton icon="fileText" tooltip="Oficio de comisión: firmas" @click="abrirFirmaOficio(s)" />
                  <IconButton icon="check" tooltip="Aprobar" variant="success" @click="aprobar(s.id)" />
                  <IconButton icon="x" tooltip="Rechazar" variant="danger" @click="abrirRechazo(s)" />
                  <IconButton v-if="esAdmin" icon="trash" tooltip="Eliminar viático" variant="danger" @click="abrirEliminar(s)" />
                </div>
              </td>
            </tr>
            <tr v-if="!pendientesFiltrados.length"><td colspan="7" class="py-12 text-center text-ink-400">{{ pendientes.length ? 'Sin coincidencias con los filtros' : 'Sin solicitudes pendientes' }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="tab === 'ajustes'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Folio viaje</th><th>Colaborador</th><th>Motivo</th><th>Monto</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="a in ajustesFiltrados" :key="a.id">
              <td class="font-mono text-xs">{{ a.solicitud_folio }}</td>
              <td class="font-medium text-ink-800">{{ a.colaborador_nombre }}</td>
              <td>{{ a.motivo }}</td>
              <td class="font-medium">+${{ Number(a.monto_total).toFixed(2) }}</td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver viaje" variant="primary" @click="$router.push(`/viaticos/${a.solicitud_id}?from=admin`)" />
                  <IconButton icon="fileText" tooltip="Oficio de comisión: firmas" @click="abrirFirmaOficio({id: a.solicitud_id, folio: a.solicitud_folio})" />
                  <IconButton icon="check" tooltip="Aprobar ajuste" variant="success" @click="aprobarAjuste(a.id)" />
                  <IconButton icon="x" tooltip="Rechazar ajuste" variant="danger" @click="abrirRechazoAjuste(a)" />
                  <IconButton v-if="esAdmin" icon="trash" tooltip="Eliminar ajuste" variant="danger" @click="abrirEliminarAjuste(a)" />
                </div>
              </td>
            </tr>
            <tr v-if="!ajustesFiltrados.length"><td colspan="5" class="py-12 text-center text-ink-400">{{ ajustes.length ? 'Sin coincidencias con los filtros' : 'Sin ajustes pendientes' }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="tab === 'activos'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Folio</th><th>Colaborador</th><th>Destino</th><th>Avance</th><th>Comprobantes</th><th>Estado</th><th>Firmas</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="s in activosFiltrados" :key="s.id">
              <td class="font-mono text-xs">{{ s.folio }}</td>
              <td class="font-medium text-ink-800">{{ s.colaborador_nombre }}</td>
              <td>{{ s.destino }}</td>
              <td><AvanceCelda :total="s.monto_total" :gastado="s.monto_gastado" /></td>
              <td><span class="badge-blue">{{ s.gastos_count }}</span></td>
              <td><EstadoBadge :estado="s.estado" /></td>
              <td><FirmasOficioCelda :fila="s" @click="abrirFirmaOficio(s)" /></td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver comprobantes" variant="primary" @click="$router.push(`/viaticos/${s.id}?from=admin`)" />
                  <IconButton icon="edit" tooltip="Editar solicitud" variant="warning" @click="$router.push(`/viaticos/nueva?editar=${s.id}&from=admin`)" />
                  <IconButton icon="fileText" tooltip="Oficio de comisión: firmas" @click="abrirFirmaOficio(s)" />
                  <IconButton icon="check" tooltip="Cerrar viáticos" variant="success" @click="abrirCerrar(s)" />
                  <IconButton v-if="esAdmin" icon="trash" tooltip="Eliminar viático" variant="danger" @click="abrirEliminar(s)" />
                </div>
              </td>
            </tr>
            <tr v-if="!activosFiltrados.length"><td colspan="8" class="py-12 text-center text-ink-400">{{ activos.length ? 'Sin coincidencias con los filtros' : 'Sin viáticos activos' }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="tab === 'rechazados'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Folio</th><th>Colaborador</th><th>Destino</th><th>Avance</th><th>Motivo</th><th>Edición</th><th>Firmas</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="s in rechazadosFiltrados" :key="s.id">
              <td class="font-mono text-xs">{{ s.folio }}</td>
              <td class="font-medium text-ink-800">{{ s.colaborador_nombre }}</td>
              <td>{{ s.destino }}</td>
              <td><AvanceCelda :total="s.monto_total" :gastado="s.monto_gastado" /></td>
              <td class="text-sm text-ink-600 max-w-md">{{ s.motivo_rechazo || '—' }}</td>
              <td>
                <span v-if="s.permite_edicion" class="badge-blue">Permitida</span>
                <span v-else class="badge-gray">Bloqueada</span>
              </td>
              <td><FirmasOficioCelda :fila="s" @click="abrirFirmaOficio(s)" /></td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver detalle" variant="primary" @click="$router.push(`/viaticos/${s.id}?from=admin`)" />
                  <IconButton icon="edit" tooltip="Editar solicitud" variant="warning" @click="$router.push(`/viaticos/nueva?editar=${s.id}&from=admin`)" />
                  <IconButton icon="fileText" tooltip="Oficio de comisión: firmas" @click="abrirFirmaOficio(s)" />
                  <IconButton v-if="esAdmin" icon="trash" tooltip="Eliminar viático" variant="danger" @click="abrirEliminar(s)" />
                </div>
              </td>
            </tr>
            <tr v-if="!rechazadosFiltrados.length"><td colspan="8" class="py-12 text-center text-ink-400">{{ rechazados.length ? 'Sin coincidencias con los filtros' : 'Sin viajes rechazados' }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="tab === 'cerrados'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Folio</th><th>Colaborador</th><th>Destino</th><th>Avance</th><th>Firmas</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="s in cerradosFiltrados" :key="s.id">
              <td class="font-mono text-xs">{{ s.folio }}</td>
              <td class="font-medium text-ink-800">{{ s.colaborador_nombre }}</td>
              <td>{{ s.destino }}</td>
              <td><AvanceCelda :total="s.monto_total" :gastado="s.monto_gastado" /></td>
              <td><FirmasOficioCelda :fila="s" @click="abrirFirmaOficio(s)" /></td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver detalle" variant="primary" @click="$router.push(`/viaticos/${s.id}?from=admin`)" />
                  <IconButton icon="edit" tooltip="Editar solicitud" variant="warning" @click="$router.push(`/viaticos/nueva?editar=${s.id}&from=admin`)" />
                  <IconButton icon="fileText" tooltip="Oficio de comisión: firmas" @click="abrirFirmaOficio(s)" />
                  <IconButton v-if="esAdmin" icon="trash" tooltip="Eliminar viático" variant="danger" @click="abrirEliminar(s)" />
                </div>
              </td>
            </tr>
            <tr v-if="!cerradosFiltrados.length"><td colspan="6" class="py-12 text-center text-ink-400">{{ cerrados.length ? 'Sin coincidencias con los filtros' : 'Sin viajes cerrados' }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-if="tab === 'todos'">
      <div class="card overflow-hidden">
        <table class="table">
          <thead><tr><th>Folio</th><th>Colaborador</th><th>Destino</th><th>Fechas</th><th>Avance</th><th>Estado</th><th>Firmas</th><th class="!text-center">Acciones</th></tr></thead>
          <tbody>
            <tr v-for="s in todosFiltrados" :key="s.id">
              <td class="font-mono text-xs">{{ s.folio }}</td>
              <td class="font-medium text-ink-800">{{ s.colaborador_nombre }}</td>
              <td>{{ s.destino }}</td>
              <td class="text-ink-600 text-xs">{{ s.fecha_inicio }} → {{ s.fecha_fin }}</td>
              <td><AvanceCelda :total="s.monto_total" :gastado="s.monto_gastado" /></td>
              <td><EstadoBadge :estado="s.estado" /></td>
              <td><FirmasOficioCelda :fila="s" @click="abrirFirmaOficio(s)" /></td>
              <td>
                <div class="flex gap-1 justify-center">
                  <IconButton icon="eye" tooltip="Ver detalle" variant="primary" @click="$router.push(`/viaticos/${s.id}?from=admin`)" />
                  <IconButton icon="edit" tooltip="Editar solicitud" variant="warning" @click="$router.push(`/viaticos/nueva?editar=${s.id}&from=admin`)" />
                  <IconButton icon="fileText" tooltip="Oficio de comisión: firmas" @click="abrirFirmaOficio(s)" />
                  <IconButton v-if="esAdmin" icon="trash" tooltip="Eliminar viático" variant="danger" @click="abrirEliminar(s)" />
                </div>
              </td>
            </tr>
            <tr v-if="!todosFiltrados.length"><td colspan="8" class="py-12 text-center text-ink-400">{{ todos.length ? 'Sin coincidencias con los filtros' : 'Sin resultados' }}</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <Modal
      v-if="esAdmin && modalEliminar.abierto"
      :title="modalEliminar.tipo === 'ajuste' ? 'Eliminar ajuste' : 'Eliminar viático'"
      @close="modalEliminar.abierto = false"
    >
      <div class="space-y-4 text-sm">
        <div class="flex items-start gap-3">
          <div class="w-10 h-10 rounded-lg bg-red-50 text-red-600 grid place-items-center shrink-0">
            <Icon name="trash" />
          </div>
          <div class="min-w-0">
            <p class="text-ink-800">
              {{ modalEliminar.tipo === 'ajuste' ? '¿Eliminar el ajuste del viático' : '¿Eliminar el viático' }}
              <strong class="text-ink-900 font-mono">{{ modalEliminar.folio }}</strong>?
            </p>
            <p class="text-xs text-ink-500 mt-0.5 break-all">{{ modalEliminar.detalle }}</p>
          </div>
        </div>

        <div class="rounded-lg border border-ink-200 p-3 space-y-3">
          <label class="flex items-start gap-3 cursor-pointer select-none">
            <span
              :class="[
                'relative inline-flex shrink-0 mt-0.5 h-6 w-11 rounded-full transition-colors',
                modalEliminar.fisico ? 'bg-red-600' : 'bg-ink-300',
              ]"
            >
              <input v-model="modalEliminar.fisico" type="checkbox" class="sr-only" />
              <span
                :class="[
                  'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  modalEliminar.fisico ? 'translate-x-5' : 'translate-x-0',
                ]"
              ></span>
            </span>
            <span class="min-w-0">
              <span class="block font-medium text-ink-800">
                {{ modalEliminar.fisico ? 'Eliminación física' : 'Eliminación lógica' }}
              </span>
              <span class="block text-xs text-ink-500 mt-0.5">
                Actívalo solo si necesitas borrar el registro por completo de la base de datos.
              </span>
            </span>
          </label>
        </div>

        <div
          v-if="modalEliminar.fisico"
          class="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800 flex items-start gap-2"
        >
          <Icon name="alert" size="w-4 h-4" class="shrink-0 mt-0.5" />
          <p v-if="modalEliminar.tipo === 'ajuste'">
            El ajuste y su pago asociado se borrarán del servidor de forma
            <strong>permanente e irreversible</strong>.
          </p>
          <p v-else>
            El viático, sus comprobantes de gasto, ajustes, pagos y archivos se borrarán del servidor de
            forma <strong>permanente e irreversible</strong>.
          </p>
        </div>
        <div
          v-else
          class="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-start gap-2"
        >
          <Icon name="alert" size="w-4 h-4" class="shrink-0 mt-0.5" />
          <p>
            {{ modalEliminar.tipo === 'ajuste' ? 'El ajuste' : 'El viático' }} dejará de aparecer en listados
            y reportes, pero se conserva en la base de datos.
          </p>
        </div>

        <p v-if="modalEliminar.error" class="text-sm text-red-600">{{ modalEliminar.error }}</p>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalEliminar.abierto = false">Cancelar</button>
        <button class="btn-danger" :disabled="modalEliminar.cargando" @click="confirmarEliminar">
          {{ modalEliminar.cargando ? 'Eliminando...' : (modalEliminar.fisico ? 'Eliminar permanentemente' : 'Eliminar') }}
        </button>
      </template>
    </Modal>

    <Modal v-if="modal.abierto" :title="`Rechazar ${modal.folio}`" @close="modal.abierto = false">
      <textarea v-model="modal.motivo" rows="3" class="input" placeholder="Motivo del rechazo"></textarea>
      <label class="flex items-center gap-2 text-sm mt-3">
        <input v-model="modal.permiteEdicion" type="checkbox" />
        Permitir corrección por precio alto
      </label>
      <template #footer>
        <button class="btn-secondary" @click="modal.abierto = false">Cancelar</button>
        <button class="btn-danger" @click="rechazar">Confirmar</button>
      </template>
    </Modal>

    <Modal v-if="modalAjuste.abierto" title="Rechazar ajuste" @close="modalAjuste.abierto = false">
      <textarea v-model="modalAjuste.motivo" rows="3" class="input" placeholder="Motivo"></textarea>
      <template #footer>
        <button class="btn-secondary" @click="modalAjuste.abierto = false">Cancelar</button>
        <button class="btn-danger" @click="rechazarAjuste">Confirmar</button>
      </template>
    </Modal>

    <Modal v-if="cerrarModal.abierto" :title="`Cerrar viáticos ${cerrarModal.folio}`" @close="cerrarModal.abierto = false">
      <div class="space-y-3 text-sm">
        <p class="text-ink-700">¿Confirmas el cierre? Una vez cerrado no se podrán agregar más comprobantes.</p>
        <div class="rounded-lg bg-ink-50 border border-ink-200 p-3 text-xs space-y-1">
          <p><span class="text-ink-500">Total:</span> <strong>${{ Number(cerrarModal.total).toFixed(2) }}</strong></p>
          <p><span class="text-ink-500">Gastado:</span> <strong>${{ Number(cerrarModal.gastado).toFixed(2) }}</strong></p>
          <p><span class="text-ink-500">Diferencia:</span>
            <strong :class="cerrarModal.total - cerrarModal.gastado < 0 ? 'text-red-600' : 'text-emerald-600'">
              ${{ (cerrarModal.total - cerrarModal.gastado).toFixed(2) }}
            </strong>
          </p>
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="cerrarModal.abierto = false">Cancelar</button>
        <button class="btn-success" @click="confirmarCierre">Cerrar viáticos</button>
      </template>
    </Modal>

    <Modal v-if="firmaModal.abierto" :title="`Oficio de comisión · ${firmaModal.folio}`" size="md" @close="firmaModal.abierto = false">
      <!-- Cargando / enviando -->
      <div v-if="firmaModal.cargando" class="py-8 text-center">
        <div class="mx-auto w-12 h-12 rounded-full border-[3px] border-brand-100 border-t-brand-600 animate-spin"></div>
        <p class="mt-4 font-semibold text-ink-800">{{ firmaModal.enviando ? 'Enviando a firma…' : 'Cargando…' }}</p>
        <p v-if="firmaModal.enviando" class="text-sm text-ink-500 mt-1">Generando el oficio y notificando a quien autoriza.</p>
      </div>

      <div v-else-if="firmaModal.errorCarga" class="py-6 text-center">
        <div class="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-600 grid place-items-center"><Icon name="alert" /></div>
        <p class="mt-4 font-semibold text-ink-800">No se pudo cargar</p>
        <p class="text-sm text-red-600 mt-1">{{ firmaModal.errorCarga }}</p>
      </div>

      <!-- Ya enviado: seguimiento de firmas -->
      <div v-else-if="firmaModal.documento && !firmaModal.reenviar" class="space-y-4">
        <div v-if="firmaModal.documento.estado === 'firmado'" class="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700 flex items-center gap-2">
          <Icon name="check" size="w-4 h-4" /> Oficio firmado por ambas partes.
        </div>
        <p v-else class="text-sm text-ink-500">
          Se firma en orden: primero quien autoriza y, en cuanto firma, se envía automáticamente el correo a quien recibe.
        </p>

        <ol class="space-y-2">
          <li v-for="f in firmaModal.documento.firmantes" :key="f.orden" class="flex items-center gap-3 rounded-lg border border-ink-100 px-3 py-2.5">
            <span class="w-7 h-7 shrink-0 rounded-full grid place-items-center text-xs font-semibold"
                  :class="f.estado === 'firmado' ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-600'">
              <Icon v-if="f.estado === 'firmado'" name="check" size="w-4 h-4" />
              <template v-else>{{ f.orden }}</template>
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-xs uppercase tracking-wide text-ink-400">{{ f.rol === 'autoriza' ? 'Autoriza' : 'Recibe' }}</p>
              <p class="font-medium text-ink-800 truncate">{{ f.nombre }}</p>
              <p class="text-xs text-ink-500 truncate">{{ f.email }}</p>
            </div>
            <span class="text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap" :class="claseEstadoFirmante(f)">
              {{ textoEstadoFirmante(f) }}
            </span>
          </li>
        </ol>
      </div>

      <!-- Sin enviar (o reenvío): capturar correos -->
      <form v-else id="form-firma-oficio" class="space-y-4" @submit.prevent="enviarFirmaOficio">
        <p class="text-sm text-ink-500">
          El oficio se enviará a firma en este orden: <strong class="text-ink-700">1. Autoriza</strong> y, cuando firme,
          automáticamente a <strong class="text-ink-700">2. Recibe</strong>.
        </p>
        <div v-if="firmaModal.reenviar" class="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
          Se generará un oficio nuevo y se anularán los enlaces de firma enviados antes (las firmas previas se descartan).
        </div>
        <div v-for="f in FIRMANTES_OFICIO" :key="f.key" class="rounded-lg border border-ink-100 p-3">
          <p class="text-xs uppercase tracking-wide text-ink-400">{{ f.label }}</p>
          <p class="font-medium text-ink-800 mb-2">{{ firmaModal.sugeridos[f.key].nombre || 'Sin asignar' }}</p>
          <label class="block text-sm font-medium text-ink-700 mb-1">Correo</label>
          <input v-model.trim="firmaModal.correos[f.key]" type="email" required class="input" placeholder="correo@ejemplo.com" />
          <p v-if="!firmaModal.sugeridos[f.key].email" class="text-xs text-amber-600 mt-1">No es un usuario con correo registrado: captúralo.</p>
        </div>
        <p v-if="!firmaModal.sugeridos.autoriza.nombre" class="text-sm text-red-600">
          Este viático no tiene asignado quién autoriza. Edítalo y elige "Autorizado por".
        </p>
        <p v-if="firmaModal.error" class="text-sm text-red-600">{{ firmaModal.error }}</p>
      </form>

      <template v-if="!firmaModal.cargando && !firmaModal.errorCarga" #footer>
        <template v-if="firmaModal.documento && !firmaModal.reenviar">
          <button v-if="firmaModal.documento.estado !== 'firmado'" class="btn-secondary mr-auto" @click="firmaModal.reenviar = true">
            <Icon name="refresh" size="w-4 h-4" /> Reenviar
          </button>
          <button class="btn-primary" @click="verOficioFirmado">
            <Icon name="eye" size="w-4 h-4" /> {{ firmaModal.documento.estado === 'firmado' ? 'Ver oficio firmado' : 'Ver oficio' }}
          </button>
        </template>
        <template v-else>
          <button class="btn-secondary mr-auto" @click="verOficio({ id: firmaModal.id, folio: firmaModal.folio })">
            <Icon name="eye" size="w-4 h-4" /> Vista previa
          </button>
          <button v-if="firmaModal.reenviar" class="btn-secondary" @click="firmaModal.reenviar = false">Cancelar</button>
          <button type="submit" form="form-firma-oficio" class="btn-primary" :disabled="!firmaModal.sugeridos.autoriza.nombre">
            <Icon name="send" size="w-4 h-4" /> Enviar a firma
          </button>
        </template>
      </template>
    </Modal>

    <Modal v-if="oficioModal.abierto" title="Oficio de comisión" size="sm" @close="oficioModal.abierto = false">
      <div class="py-4 text-center">
        <template v-if="oficioModal.estado === 'generando'">
          <div class="mx-auto w-12 h-12 rounded-full border-[3px] border-brand-100 border-t-brand-600 animate-spin"></div>
          <p class="mt-4 font-semibold text-ink-800">Generando documento…</p>
          <p class="text-sm text-ink-500 mt-1">Preparando el oficio de <span class="font-mono">{{ oficioModal.folio }}</span>. Esto puede tardar unos segundos.</p>
        </template>

        <template v-else-if="oficioModal.estado === 'listo'">
          <div class="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 grid place-items-center"><Icon name="check" /></div>
          <p class="mt-4 font-semibold text-ink-800">Documento listo</p>
          <p class="text-sm text-ink-500 mt-1">Tu navegador bloqueó la pestaña automática. Ábrelo manualmente.</p>
          <a :href="oficioModal.url" target="_blank" class="btn-primary mt-4 inline-flex" @click="oficioModal.abierto = false">
            <Icon name="eye" size="w-4 h-4" /> Abrir documento
          </a>
        </template>

        <template v-else>
          <div class="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-600 grid place-items-center"><Icon name="alert" /></div>
          <p class="mt-4 font-semibold text-ink-800">No se pudo generar</p>
          <p class="text-sm text-red-600 mt-1">{{ oficioModal.error }}</p>
        </template>
      </div>
    </Modal>
  </div>
</template>

<script setup>
const api = useApi();
const auth = useAuth();
const esAdmin = computed(() => auth.rol === 'admin');
const tab = ref('pendientes');
const tabs = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'ajustes',    label: 'Ajustes' },
  { id: 'activos',    label: 'Activos' },
  { id: 'rechazados', label: 'Rechazados' },
  { id: 'cerrados',   label: 'Cerrados' },
  { id: 'todos',      label: 'Todos' },
];

const pendientes = ref([]);
const ajustes = ref([]);
const activos = ref([]);
const rechazados = ref([]);
const cerrados = ref([]);
const todos = ref([]);

const filtros = reactive({ q: '', desde: '', hasta: '', estado: '' });

const placeholderBusqueda = computed(() => {
  if (tab.value === 'ajustes') return 'Buscar por folio, colaborador o motivo';
  return 'Buscar por folio, colaborador o destino';
});

const hayFiltros = computed(() => !!filtros.q || !!filtros.desde || !!filtros.hasta || !!filtros.estado);

function limpiarFiltros() {
  filtros.q = ''; filtros.desde = ''; filtros.hasta = ''; filtros.estado = '';
}

function coincideTexto(s, campos) {
  if (!filtros.q) return true;
  const q = filtros.q.toLowerCase();
  return campos.some((c) => String(s[c] || '').toLowerCase().includes(q));
}

function dentroDeRango(s) {
  const ini = s.fecha_inicio || s.created_at;
  const fin = s.fecha_fin || s.created_at;
  if (filtros.desde && (ini || '').slice(0, 10) < filtros.desde) return false;
  if (filtros.hasta && (fin || '').slice(0, 10) > filtros.hasta) return false;
  return true;
}

function filtrarSolicitudes(arr) {
  return arr.filter((s) => coincideTexto(s, ['folio', 'colaborador_nombre', 'destino']) && dentroDeRango(s));
}

const pendientesFiltrados = computed(() => filtrarSolicitudes(pendientes.value));
const activosFiltrados    = computed(() => filtrarSolicitudes(activos.value));
const rechazadosFiltrados = computed(() => filtrarSolicitudes(rechazados.value));
const cerradosFiltrados   = computed(() => filtrarSolicitudes(cerrados.value));
const todosFiltrados = computed(() => filtrarSolicitudes(todos.value).filter((s) => !filtros.estado || s.estado === filtros.estado));

const ajustesFiltrados = computed(() => ajustes.value.filter((a) => {
  if (!coincideTexto(a, ['solicitud_folio', 'colaborador_nombre', 'motivo'])) return false;
  if (filtros.desde && (a.created_at || '').slice(0, 10) < filtros.desde) return false;
  if (filtros.hasta && (a.created_at || '').slice(0, 10) > filtros.hasta) return false;
  return true;
}));

const tabFiltrado = computed(() => ({
  pendientes: pendientesFiltrados.value,
  ajustes: ajustesFiltrados.value,
  activos: activosFiltrados.value,
  rechazados: rechazadosFiltrados.value,
  cerrados: cerradosFiltrados.value,
  todos: todosFiltrados.value,
}));

const resultadosFiltrados = computed(() => (tabFiltrado.value[tab.value] || []).length);

const counts = computed(() => ({
  pendientes: pendientes.value.length,
  ajustes: ajustes.value.length,
  activos: activos.value.length,
  rechazados: rechazados.value.length,
  cerrados: cerrados.value.length,
  todos: todos.value.length,
}));

const modal = reactive({ abierto: false, id: null, folio: '', motivo: '', permiteEdicion: false });
const modalAjuste = reactive({ abierto: false, id: null, motivo: '' });
const cerrarModal = reactive({ abierto: false, id: null, folio: '', total: 0, gastado: 0 });

function pct(s) {
  if (!s.monto_total) return 0;
  return Math.round((Number(s.monto_gastado) / Number(s.monto_total)) * 100);
}

async function cargar() {
  const [a, b, c, d, e, f] = await Promise.all([
    api.get('/viaticos/pendientes'),
    api.get('/viaticos-ajustes/pendientes'),
    api.get('/viaticos/activos'),
    api.get('/viaticos/rechazados'),
    api.get('/viaticos/cerrados'),
    api.get('/viaticos/todos'),
  ]);
  pendientes.value = a.data; ajustes.value = b.data;
  activos.value = c.data; rechazados.value = d.data; cerrados.value = e.data;
  todos.value = f.data;
}

onMounted(cargar);

const toast = useToast();

async function aprobar(id) {
  try {
    await api.post(`/viaticos/${id}/aprobar`);
    toast.success('Solicitud aprobada', 'Pasa a finanzas para el pago.');
    cargar();
  } catch (e) { toast.error('No se pudo aprobar', e.message); }
}
function abrirRechazo(s) { Object.assign(modal, { abierto: true, id: s.id, folio: s.folio, motivo: '', permiteEdicion: false }); }
async function rechazar() {
  try {
    await api.post(`/viaticos/${modal.id}/rechazar`, { motivo: modal.motivo, permite_edicion: modal.permiteEdicion });
    toast.success('Solicitud rechazada', `${modal.folio} fue rechazada.`);
    modal.abierto = false; cargar();
  } catch (e) { toast.error('No se pudo rechazar', e.message); }
}

async function aprobarAjuste(id) {
  try {
    await api.post(`/viaticos-ajustes/${id}/aprobar`);
    toast.success('Ajuste aprobado', 'Pasa a finanzas para el pago.');
    cargar();
  } catch (e) { toast.error('No se pudo aprobar el ajuste', e.message); }
}
function abrirRechazoAjuste(a) { Object.assign(modalAjuste, { abierto: true, id: a.id, motivo: '' }); }
async function rechazarAjuste() {
  try {
    await api.post(`/viaticos-ajustes/${modalAjuste.id}/rechazar`, { motivo: modalAjuste.motivo });
    toast.success('Ajuste rechazado');
    modalAjuste.abierto = false; cargar();
  } catch (e) { toast.error('No se pudo rechazar', e.message); }
}

function abrirCerrar(s) {
  Object.assign(cerrarModal, { abierto: true, id: s.id, folio: s.folio, total: s.monto_total, gastado: s.monto_gastado });
}
async function confirmarCierre() {
  try {
    await api.post(`/viaticos/${cerrarModal.id}/cerrar`);
    toast.success('Viáticos cerrados', `${cerrarModal.folio} se cerró correctamente.`);
    cerrarModal.abierto = false; cargar();
  } catch (e) { toast.error('No se pudo cerrar', e.message); }
}

// Eliminar viático o ajuste: el mismo modal sirve para ambos, con un switch que
// decide entre borrado lógico (se oculta) y físico (se borra de la base y el disco).
const modalEliminar = reactive({
  abierto: false, tipo: 'viatico', id: null, folio: '', detalle: '',
  fisico: false, cargando: false, error: '',
});

function abrirEliminar(s) {
  if (!esAdmin.value) return;
  Object.assign(modalEliminar, {
    abierto: true, tipo: 'viatico', id: s.id, folio: s.folio,
    detalle: `${s.colaborador_nombre} · ${s.destino} · $${Number(s.monto_total || 0).toFixed(2)}`,
    fisico: false, cargando: false, error: '',
  });
}

function abrirEliminarAjuste(a) {
  if (!esAdmin.value) return;
  Object.assign(modalEliminar, {
    abierto: true, tipo: 'ajuste', id: a.id, folio: a.solicitud_folio,
    detalle: `${a.colaborador_nombre} · ${a.motivo} · +$${Number(a.monto_total || 0).toFixed(2)}`,
    fisico: false, cargando: false, error: '',
  });
}

async function confirmarEliminar() {
  modalEliminar.cargando = true;
  modalEliminar.error = '';
  const modo = modalEliminar.fisico ? 'fisico' : 'logico';
  const base = modalEliminar.tipo === 'ajuste' ? '/viaticos-ajustes' : '/viaticos';
  const que = modalEliminar.tipo === 'ajuste' ? 'Ajuste' : 'Viático';
  try {
    await api.del(`${base}/${modalEliminar.id}?modo=${modo}`);
    toast.success(
      modo === 'fisico' ? `${que} eliminado permanentemente` : `${que} eliminado`,
      modalEliminar.folio,
    );
    modalEliminar.abierto = false;
    cargar();
  } catch (e) {
    modalEliminar.error = e.message;
    toast.error('No se pudo eliminar', e.message);
  } finally {
    modalEliminar.cargando = false;
  }
}

// Genera el oficio de comisión mostrando un modal con loading; al terminar abre
// el PDF en una pestaña nueva (con respaldo manual si el navegador la bloquea).
const oficioModal = reactive({ abierto: false, estado: 'generando', url: null, folio: '', error: '' });

async function verOficio(s) {
  Object.assign(oficioModal, { abierto: true, estado: 'generando', url: null, folio: s.folio, error: '' });
  try {
    const { url } = await api.viewBlob(`/viaticos/${s.id}/oficio`);
    oficioModal.url = url;
    oficioModal.estado = 'listo';
    const win = window.open(url, '_blank');
    if (win) oficioModal.abierto = false; // se abrió la pestaña, cerramos el modal
  } catch (e) {
    oficioModal.estado = 'error';
    oficioModal.error = e.message;
  }
}
// --- Firma del oficio de comisión: Autoriza (1) -> Recibe (2) ---
const FIRMANTES_OFICIO = [{ key: 'autoriza', label: '1. Autoriza' }, { key: 'recibe', label: '2. Recibe' }];
const firmaModal = reactive({
  abierto: false, cargando: false, enviando: false, id: null, folio: '',
  documento: null, reenviar: false, error: '', errorCarga: '',
  sugeridos: { autoriza: { nombre: '', email: '' }, recibe: { nombre: '', email: '' } },
  correos: { autoriza: '', recibe: '' },
});

function aplicarEstadoFirma(data) {
  firmaModal.documento = data.documento;
  firmaModal.sugeridos = data.sugeridos;
  // En un reenvío se proponen los correos usados en el envío anterior
  const previo = (rol) => data.documento?.firmantes?.find((f) => f.rol === rol)?.email;
  firmaModal.correos.autoriza = previo('autoriza') || data.sugeridos.autoriza.email || '';
  firmaModal.correos.recibe = previo('recibe') || data.sugeridos.recibe.email || '';
}

async function abrirFirmaOficio(s) {
  Object.assign(firmaModal, { abierto: true, cargando: true, enviando: false, id: s.id, folio: s.folio, documento: null, reenviar: false, error: '', errorCarga: '' });
  try {
    aplicarEstadoFirma(await api.get(`/viaticos/${s.id}/oficio/firma`));
  } catch (e) {
    firmaModal.errorCarga = e.message;
  } finally {
    firmaModal.cargando = false;
  }
}

async function enviarFirmaOficio() {
  firmaModal.error = '';
  firmaModal.cargando = true;
  firmaModal.enviando = true;
  try {
    const data = await api.post(`/viaticos/${firmaModal.id}/oficio/firma`, {
      autoriza_email: firmaModal.correos.autoriza,
      recibe_email: firmaModal.correos.recibe,
    });
    aplicarEstadoFirma(data);
    firmaModal.reenviar = false;
    cargar();
    toast.success('Oficio enviado a firma', `Se notificó a ${firmaModal.sugeridos.autoriza.nombre} (autoriza).`);
  } catch (e) {
    firmaModal.error = e.message;
  } finally {
    firmaModal.cargando = false;
    firmaModal.enviando = false;
  }
}

function textoEstadoFirmante(f) {
  if (f.estado === 'firmado') return f.firmado_at ? `Firmó ${String(f.firmado_at).slice(0, 10)}` : 'Firmado';
  const anterior = firmaModal.documento?.firmantes?.find((x) => x.orden < f.orden && x.estado !== 'firmado');
  return anterior ? 'En espera' : 'Pendiente de firma';
}

function claseEstadoFirmante(f) {
  if (f.estado === 'firmado') return 'bg-emerald-50 text-emerald-700';
  return textoEstadoFirmante(f) === 'En espera' ? 'bg-ink-100 text-ink-500' : 'bg-amber-50 text-amber-700';
}

async function verOficioFirmado() {
  try {
    const { url } = await api.viewBlob(`/viaticos/${firmaModal.id}/oficio/firmado`);
    window.open(url, '_blank');
  } catch (e) {
    toast.error('No se pudo abrir el oficio', e.message);
  }
}
</script>
