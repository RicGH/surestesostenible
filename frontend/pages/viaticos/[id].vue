<template>
  <div v-if="errorCarga" class="card-pad max-w-2xl border-red-200 bg-red-50/40">
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-lg bg-red-100 text-red-600 grid place-items-center shrink-0">
        <Icon name="alert" />
      </div>
      <div class="flex-1">
        <h3 class="font-semibold text-red-700">No se pudo cargar el viático</h3>
        <p class="text-sm text-ink-700 mt-1">{{ errorCarga }}</p>
        <button class="btn-secondary mt-3" @click="$router.back()">Volver</button>
      </div>
    </div>
  </div>

  <div v-else-if="!sol" class="card-pad text-ink-500">Cargando...</div>

  <div v-else class="space-y-6">
    <NuxtLink :to="breadcrumb.to" class="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 transition-colors">
      <Icon name="chevron-left" size="w-4 h-4" /> Volver a {{ breadcrumb.label }}
    </NuxtLink>

    <div v-if="puedeSubir && !bloqueadaPorUso && disponible <= 0" class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 flex items-start gap-3">
      <Icon name="alert" size="w-5 h-5" class="text-amber-600 mt-0.5 shrink-0" />
      <div class="flex-1">
        Sin saldo disponible.
        <button class="font-semibold underline" @click="abrirAjuste">Solicita un ajuste</button>
        para continuar.
      </div>
    </div>

    <div
      v-if="puedeCerrar || puedeSubir || puedeAprobar || puedeAbonar"
      class="sticky top-0 z-30 -mt-6 lg:-mt-8 -mx-6 lg:-mx-8 px-6 lg:px-8 py-3 bg-white/95 backdrop-blur-md border-b border-ink-200 flex items-center justify-between gap-3"
    >
      <div class="flex items-center gap-2 min-w-0 flex-wrap">
        <span class="font-mono text-xs text-ink-600">{{ sol.folio }}</span>
        <EstadoBadge :estado="sol.estado" />
        <span class="hidden sm:inline text-xs text-ink-500">·</span>
        <span class="hidden sm:inline text-xs text-ink-500 truncate">{{ sol.destino }}</span>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button v-if="puedeAprobar" class="btn-danger text-sm" :disabled="aprobando" @click="abrirRechazo">
          <Icon name="x" size="w-4 h-4" /> Rechazar
        </button>
        <button v-if="puedeAprobar" class="btn-success text-sm" :disabled="aprobando" @click="aprobar">
          <Icon name="check" size="w-4 h-4" /> {{ aprobando ? 'Aprobando...' : 'Aprobar' }}
        </button>
        <button v-if="puedeAbonar" class="btn-success text-sm" @click="abrirAbono">
          <Icon name="wallet" size="w-4 h-4" /> Registrar abono
        </button>
        <button v-if="puedeSubir" class="btn-primary text-sm" @click="abrirSubir">
          <Icon name="upload" size="w-4 h-4" /> Subir comprobante
        </button>
        <button v-if="puedeCerrar" class="btn-success text-sm" @click="abrirCerrar">
          <Icon name="check" size="w-4 h-4" /> Cerrar viáticos
        </button>
      </div>
    </div>

    <section class="card-pad bg-gradient-to-br from-ink-900 via-brand-900 to-brand-700 text-white border-transparent">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div class="space-y-1">
          <p class="text-xs uppercase tracking-widest text-brand-200/80">Folio</p>
          <h1 class="text-2xl font-semibold tracking-tight">{{ sol.folio }}</h1>
          <div class="flex items-center gap-2 text-sm text-brand-100/90 mt-2">
            <Icon name="plane" size="w-4 h-4" />
            <span class="font-medium">{{ sol.destino }}</span>
            <span class="text-brand-200/60">·</span>
            <span>{{ sol.fecha_inicio }} → {{ sol.fecha_fin }}</span>
          </div>
          <div v-if="sol.colaborador_nombre" class="flex items-center gap-2 text-sm text-brand-100/90 mt-1">
            <Icon name="user" size="w-4 h-4" />
            <span>Solicitado por <span class="font-medium text-white">{{ sol.colaborador_nombre }}</span></span>
          </div>
        </div>
        <EstadoBadge :estado="sol.estado" class="!bg-white/15 !text-white !ring-white/20" />
      </div>
    </section>

    <section v-if="sol.estado === 'aprobado'" class="card overflow-hidden">
      <div class="px-5 py-4 border-l-4 border-amber-400 bg-amber-50/50 flex items-start gap-3">
        <div class="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 grid place-items-center shrink-0">
          <Icon name="history" />
        </div>
        <div>
          <h3 class="font-semibold text-amber-800">Aprobado · esperando pago de finanzas</h3>
          <p class="text-sm text-ink-700 mt-0.5">El supervisor aprobó tu solicitud. Recibirás una notificación cuando finanzas abone el monto.</p>
        </div>
      </div>
    </section>

    <section v-if="sol.estado === 'rechazado'" class="card overflow-hidden">
      <div class="px-5 py-4 border-l-4 border-red-500 bg-red-50/40 flex items-start gap-3">
        <div class="w-9 h-9 rounded-lg bg-red-100 text-red-600 grid place-items-center shrink-0">
          <Icon name="alert" />
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-red-700">Solicitud rechazada</h3>
          <p class="text-sm text-ink-700 mt-0.5">{{ sol.motivo_rechazo }}</p>
          <button v-if="sol.permite_edicion" class="btn-primary mt-3" @click="abrirEdicion">
            <Icon name="edit" size="w-4 h-4" /> Corregir solicitud
          </button>
        </div>
      </div>
    </section>

    <section v-if="sol.pago" class="card-pad">
      <div class="flex items-center justify-between gap-4 flex-wrap">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center"><Icon name="wallet" /></div>
          <div>
            <p class="text-sm font-semibold text-ink-900 flex items-center gap-2 flex-wrap">
              Abono recibido
              <span v-if="sol.pago.metodo_pago" class="badge badge-blue">
                <Icon :name="sol.pago.metodo_pago === 'tarjeta' ? 'wallet' : 'send'" size="w-3 h-3" />
                {{ sol.pago.metodo_pago === 'tarjeta' ? 'Tarjeta' : 'Transferencia' }}
              </span>
            </p>
            <p class="text-xs text-ink-500 mt-0.5">
              ${{ Number(sol.pago.monto).toFixed(2) }} · {{ formatFecha(sol.pago.fecha_pago) }}
              <span v-if="sol.pago.referencia"> · ref. {{ sol.pago.referencia }}</span>
            </p>
          </div>
        </div>
        <button v-if="sol.pago.comprobante_path" class="btn-secondary text-sm" @click="abrirVisor({ path: `/viaticos/${sol.id}/comprobante-pago`, title: 'Comprobante de abono', subtitle: `${sol.folio} · $${Number(sol.pago.monto).toFixed(2)}`, downloadName: `pago-${sol.folio}` })">
          <Icon name="eye" size="w-4 h-4" /> Ver comprobante
        </button>
        <span v-else class="text-xs text-ink-400 italic">Sin comprobante</span>
      </div>
    </section>

    <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="card p-5">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-ink-500 uppercase tracking-wide">Total aprobado</p>
          <div class="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 grid place-items-center"><Icon name="wallet" size="w-4 h-4" /></div>
        </div>
        <p class="text-2xl font-semibold mt-3">${{ Number(sol.monto_total).toFixed(2) }}</p>
      </div>
      <div class="card p-5">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-ink-500 uppercase tracking-wide">Gastado</p>
          <div class="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 grid place-items-center"><Icon name="receipt" size="w-4 h-4" /></div>
        </div>
        <p class="text-2xl font-semibold mt-3">${{ Number(sol.monto_gastado).toFixed(2) }}</p>
        <div class="mt-3 h-1.5 rounded-full bg-ink-100 overflow-hidden">
          <div class="h-full transition-all" :class="pctGastado > 100 ? 'bg-red-500' : 'bg-amber-400'" :style="{ width: `${Math.min(100, pctGastado)}%` }" />
        </div>
      </div>
      <div class="card p-5">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-ink-500 uppercase tracking-wide">Saldo</p>
          <div class="w-8 h-8 rounded-lg" :class="disponible <= 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'">
            <div class="grid place-items-center w-full h-full"><Icon :name="disponible <= 0 ? 'alert' : 'check'" size="w-4 h-4" /></div>
          </div>
        </div>
        <p class="text-2xl font-semibold mt-3" :class="disponible < 0 ? 'text-red-600' : 'text-ink-900'">
          ${{ disponible.toFixed(2) }}
        </p>
        <button v-if="esColaborador && necesitaAjuste && estaActivo" class="text-xs text-brand-600 hover:text-brand-700 font-medium mt-2 inline-flex items-center gap-1" @click="abrirAjuste">
          <Icon name="plus" size="w-3 h-3" /> Solicitar ajuste
        </button>
      </div>
      <div class="card p-5">
        <div class="flex items-center justify-between">
          <p class="text-xs font-medium text-ink-500 uppercase tracking-wide">Comprobantes</p>
          <div class="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 grid place-items-center"><Icon name="document" size="w-4 h-4" /></div>
        </div>
        <p class="text-2xl font-semibold mt-3">{{ sol.gastos?.length || 0 }}</p>
      </div>
    </section>

    <section class="card-pad space-y-4">
      <h3 class="text-base font-semibold text-ink-900">Información de los viáticos</h3>
      <div>
        <dt class="text-xs text-ink-500 uppercase tracking-wide">Motivo</dt>
        <dd class="mt-1 text-ink-800">{{ sol.motivo }}</dd>
      </div>
      <dl class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div><dt class="text-xs text-ink-500 uppercase">Autoriza</dt><dd class="mt-1 text-ink-800">{{ sol.autoriza_nombre || '—' }}</dd></div>
        <div><dt class="text-xs text-ink-500 uppercase">Recibe el viático</dt><dd class="mt-1 text-ink-800">{{ sol.recibe_nombre || '—' }}</dd></div>
        <div><dt class="text-xs text-ink-500 uppercase">CLABE bancaria</dt><dd class="mt-1 text-ink-800">{{ sol.clabe_bancaria || '—' }}</dd></div>
        <div><dt class="text-xs text-ink-500 uppercase">Banco</dt><dd class="mt-1 text-ink-800">{{ sol.banco || '—' }}</dd></div>
      </dl>
      <dl class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div><dt class="text-xs text-ink-500 uppercase">Proyecto</dt><dd class="mt-1 text-ink-800">{{ sol.proyecto || '—' }}</dd></div>
        <div><dt class="text-xs text-ink-500 uppercase">Cuenta</dt><dd class="mt-1 text-ink-800">{{ sol.cuenta || '—' }}</dd></div>
        <div><dt class="text-xs text-ink-500 uppercase">Partida</dt><dd class="mt-1 text-ink-800">{{ sol.partida || '—' }}</dd></div>
        <div><dt class="text-xs text-ink-500 uppercase">Objetivo estratégico</dt><dd class="mt-1 text-ink-800">{{ sol.objetivo_estrategico || '—' }}</dd></div>
        <div><dt class="text-xs text-ink-500 uppercase">Resultado</dt><dd class="mt-1 text-ink-800">{{ sol.resultado || '—' }}</dd></div>
        <div><dt class="text-xs text-ink-500 uppercase">Donante</dt><dd class="mt-1 text-ink-800">{{ sol.donante || '—' }}</dd></div>
      </dl>
      <div class="pt-2 border-t border-ink-100">
        <dt class="text-xs text-ink-500 uppercase tracking-wide">Justificantes de salida</dt>
        <dd class="mt-1.5">
          <div v-if="(sol.justificantes || []).length" class="flex flex-wrap gap-2">
            <button
              v-for="(j, i) in sol.justificantes"
              :key="j.id ?? `legacy-${i}`"
              class="btn-secondary text-sm"
              @click="abrirVisor({
                path: j.id ? `/viaticos/${sol.id}/justificantes/${j.id}` : `/viaticos/${sol.id}/justificante`,
                title: j.nombre_original || 'Justificante de salida',
                subtitle: sol.folio,
                downloadName: j.nombre_original || `justificante-${sol.folio}-${i + 1}`,
              })"
            >
              <Icon name="eye" size="w-4 h-4" /> {{ j.nombre_original || `Justificante ${i + 1}` }}
            </button>
          </div>
          <span v-else class="text-sm text-ink-400 italic">Sin justificante adjunto</span>
        </dd>
      </div>
    </section>

    <section class="card-pad space-y-4">
      <h3 class="text-base font-semibold text-ink-900">Desglose de viáticos</h3>
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div v-for="cat in categorias" :key="cat.key" class="rounded-lg border border-ink-200 p-3">
          <div class="flex items-center gap-2 text-ink-500">
            <Icon :name="cat.icon" size="w-4 h-4" />
            <span class="text-xs font-medium uppercase tracking-wide">{{ cat.label }}</span>
          </div>
          <p class="text-lg font-semibold text-ink-900 mt-1">${{ Number(sol[cat.key] || 0).toFixed(2) }}</p>
        </div>
      </div>
    </section>

    <section v-if="sol.ajustes?.length" class="card overflow-hidden">
      <div class="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
        <h3 class="text-base font-semibold text-ink-900">Ajustes solicitados</h3>
        <button v-if="esColaborador && estaActivo" class="btn-secondary text-sm" @click="abrirAjuste">
          <Icon name="plus" size="w-4 h-4" /> Nuevo ajuste
        </button>
      </div>
      <table class="table">
        <thead><tr><th>Fecha</th><th>Motivo</th><th>Monto</th><th>Estado</th></tr></thead>
        <tbody>
          <tr v-for="a in sol.ajustes" :key="a.id">
            <td class="text-ink-500">{{ formatFecha(a.created_at) }}</td>
            <td class="font-medium text-ink-800">{{ a.motivo }}</td>
            <td>+${{ Number(a.monto_total).toFixed(2) }}</td>
            <td>
              <EstadoBadge :estado="a.estado" />
              <span v-if="a.estado === 'rechazado'" class="text-xs text-red-600 block mt-1">{{ a.motivo_rechazo }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="card overflow-hidden">
      <div v-if="estaActivo" class="px-5 pt-5">
        <div class="relative">
          <div class="absolute inset-0 flex items-center" aria-hidden="true">
            <div class="w-full border-t border-ink-200"></div>
          </div>
          <div class="relative flex justify-center">
            <span class="bg-white px-3 text-xs font-semibold uppercase tracking-wider text-ink-500">
              {{ comprobantesLabel }}
            </span>
          </div>
        </div>
      </div>
      <div class="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
        <h3 class="text-base font-semibold text-ink-900">Comprobantes</h3>
        <span class="text-sm text-ink-500">{{ sol.gastos?.length || 0 }} registro(s)</span>
      </div>
      <table class="table">
        <thead><tr><th>Comprobante</th><th>Fecha</th><th>Emisor</th><th>RFC</th><th>Concepto</th><th class="text-right">Monto</th></tr></thead>
        <tbody>
          <tr v-for="g in sol.gastos" :key="g.id">
            <td>
              <Thumbnail
                v-if="g.archivo"
                :path="`/viaticos/${sol.id}/gastos/${g.id}/archivo`"
                :filename="g.archivo"
                tooltip="Ver comprobante"
                @open="abrirVisor({ path: `/viaticos/${sol.id}/gastos/${g.id}/archivo`, title: 'Comprobante de gasto', subtitle: `${g.nombre_emisor || g.concepto || ''} · $${Number(g.monto).toFixed(2)}`, downloadName: `gasto-${g.id}` })"
              />
              <Thumbnail
                v-else-if="g.xml_path"
                :path="`/viaticos/${sol.id}/gastos/${g.id}/xml`"
                :filename="g.xml_path"
                tooltip="Ver XML (CFDI)"
                @open="abrirVisor({ path: `/viaticos/${sol.id}/gastos/${g.id}/xml`, title: 'XML del CFDI', subtitle: `${g.nombre_emisor || g.concepto || ''} · $${Number(g.monto).toFixed(2)}`, downloadName: `cfdi-gasto-${g.id}.xml` })"
              />
              <span v-else class="text-ink-300 text-xs">—</span>
            </td>
            <td>{{ g.fecha }}</td>
            <td class="font-medium text-ink-800">{{ g.nombre_emisor || '—' }}</td>
            <td class="font-mono text-xs">{{ g.rfc_emisor || '—' }}</td>
            <td>{{ g.concepto || '—' }}</td>
            <td class="text-right font-medium">${{ Number(g.monto).toFixed(2) }}</td>
          </tr>
          <tr v-if="!sol.gastos?.length"><td colspan="6" class="py-12 text-center text-ink-400">Sin comprobantes</td></tr>
        </tbody>
      </table>
    </section>

    <FileViewer
      v-if="visor.abierto"
      :path="visor.path"
      :title="visor.title"
      :subtitle="visor.subtitle"
      :download-name="visor.downloadName"
      @close="visor.abierto = false"
    />

    <Modal v-if="subirModal.abierto" :title="`Subir comprobante · ${sol.folio}`" @close="cerrarSubir">
      <div class="relative">
        <div v-if="subiendo" class="absolute inset-0 z-10 bg-white/85 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-4 p-6">
          <div class="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
          <div class="text-center space-y-1">
            <p class="font-semibold text-ink-900">Subiendo comprobante</p>
            <p class="text-xs text-ink-500">No cierres esta ventana</p>
          </div>
          <div class="w-72 max-w-full space-y-1.5">
            <div class="h-2 rounded-full bg-ink-100 overflow-hidden">
              <div class="h-full bg-brand-500 transition-all duration-150" :style="{ width: `${progreso}%` }" />
            </div>
            <p class="text-xs text-ink-600 text-center font-medium">{{ progreso }}%</p>
          </div>
        </div>

        <div class="flex items-center justify-between mb-4 pb-3 border-b border-ink-100">
          <p class="text-sm text-ink-600">Registra cada gasto con su archivo</p>
          <div class="text-right">
            <p class="text-xs text-ink-500">Saldo disponible</p>
            <p class="text-lg font-semibold" :class="disponible <= 0 ? 'text-red-600' : 'text-emerald-600'">${{ disponible.toFixed(2) }}</p>
          </div>
        </div>

        <div v-if="bloqueadaPorUso" class="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 mb-4 flex items-start gap-2">
          <Icon name="alert" size="w-4 h-4" class="text-amber-600 mt-0.5 shrink-0" />
          <div class="flex-1">
            Este viático está en cola: ya tienes {{ bloqueadaPorUso.limite }} viáticos abiertos en uso.
            Cierra alguno para registrar gastos aquí.
            <span class="block mt-1">
              <NuxtLink
                v-for="v in bloqueadaPorUso.abiertos"
                :key="v.id"
                :to="`/viaticos/${v.id}`"
                class="font-semibold underline mr-3"
              >{{ v.folio }}</NuxtLink>
            </span>
          </div>
        </div>

        <div v-else-if="disponible <= 0" class="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800 mb-4 flex items-start gap-2">
          <Icon name="alert" size="w-4 h-4" class="text-amber-600 mt-0.5 shrink-0" />
          <div class="flex-1">
            Sin saldo disponible.
            <button class="font-semibold underline" @click="subirModal.abierto = false; abrirAjuste()">Solicita un ajuste</button>
            para continuar.
          </div>
        </div>

        <form id="subir-comprobante-form" class="space-y-4" :class="(disponible <= 0 || bloqueadaPorUso) ? 'opacity-50 pointer-events-none' : ''" @submit.prevent="subirGasto">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-ink-600 mb-1">Monto <span class="text-red-500">*</span></label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 text-sm">$</span>
                <input v-model.number="gasto.monto" type="number" step="0.01" min="0" :max="disponible" required class="input pl-7" placeholder="0.00" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-ink-600 mb-1">Fecha <span class="text-red-500">*</span></label>
              <DateInput v-model="gasto.fecha" />
            </div>
            <div>
              <label class="block text-xs font-medium text-ink-600 mb-1">RFC emisor</label>
              <input v-model="gasto.rfc_emisor" class="input uppercase font-mono" placeholder="XAXX010101000" />
            </div>
            <div>
              <label class="block text-xs font-medium text-ink-600 mb-1">Emisor</label>
              <input v-model="gasto.nombre_emisor" class="input" placeholder="Nombre del emisor" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-xs font-medium text-ink-600 mb-1">Concepto</label>
              <input v-model="gasto.concepto" class="input" placeholder="Detalle del gasto" />
            </div>
          </div>

          <FileDrop
            v-model="archivoGasto"
            accept="image/*,.pdf"
            icon="receipt"
            label="Archivo del comprobante"
            hint="PDF, JPG o PNG · arrastra o haz clic para seleccionar"
          />

          <FileDrop
            v-model="xmlGasto"
            accept=".xml,text/xml,application/xml"
            icon="document"
            label="XML del CFDI (opcional)"
            hint="Sube el XML de la factura y se llenarán los datos automáticamente"
          />
          <p v-if="errorXml" class="text-sm text-red-600 -mt-2">{{ errorXml }}</p>
          <p v-else-if="xmlGasto" class="text-xs text-emerald-600 -mt-2">Datos cargados desde el XML. Revísalos antes de subir.</p>

          <p v-if="errorGasto" class="text-sm text-red-600">{{ errorGasto }}</p>
          <p v-else class="text-xs text-ink-500">Sube al menos el comprobante o el XML. El monto descontará del saldo disponible.</p>
        </form>
      </div>
      <template #footer>
        <button class="btn-secondary" :disabled="subiendo" @click="cerrarSubir">Cancelar</button>
        <button form="subir-comprobante-form" type="submit" class="btn-primary" :disabled="subiendo || (!archivoGasto && !xmlGasto) || disponible <= 0 || !!bloqueadaPorUso">
          <Icon name="upload" size="w-4 h-4" /> {{ subiendo ? `Subiendo... ${progreso}%` : 'Subir comprobante' }}
        </button>
      </template>
    </Modal>

    <Modal v-if="abonoModal.abierto" :title="`Registrar abono · ${sol.folio}`" @close="cerrarAbono">
      <div class="space-y-4">
        <div class="rounded-lg bg-ink-50 border border-ink-200 p-3 text-sm">
          <div class="flex justify-between"><span class="text-ink-500">Colaborador</span><span class="font-medium">{{ sol.colaborador_nombre }}</span></div>
          <div class="flex justify-between mt-1"><span class="text-ink-500">Destino</span><span class="font-medium">{{ sol.destino }}</span></div>
          <div class="flex justify-between mt-1">
            <span class="text-ink-500">Monto a abonar</span>
            <strong class="text-ink-900">${{ Number(sol.monto_total).toFixed(2) }}</strong>
          </div>
          <template v-if="sol.banco || sol.clabe_bancaria">
            <div class="border-t border-ink-200 mt-2 pt-2">
              <div v-if="sol.banco" class="flex justify-between"><span class="text-ink-500">Banco</span><span class="font-medium">{{ sol.banco }}</span></div>
              <div v-if="sol.clabe_bancaria" class="flex justify-between mt-1"><span class="text-ink-500">CLABE</span><span class="font-mono text-xs font-medium tracking-wide">{{ sol.clabe_bancaria }}</span></div>
            </div>
          </template>
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Forma de pago <span class="text-red-500">*</span></label>
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              :class="['flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                       abonoModal.metodo === 'transferencia' ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'border-ink-200 text-ink-600 hover:bg-ink-50']"
              @click="abonoModal.metodo = 'transferencia'"
            >
              <Icon name="send" size="w-4 h-4" /> Transferencia
            </button>
            <button
              type="button"
              :class="['flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-colors',
                       abonoModal.metodo === 'tarjeta' ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200' : 'border-ink-200 text-ink-600 hover:bg-ink-50']"
              @click="abonoModal.metodo = 'tarjeta'"
            >
              <Icon name="wallet" size="w-4 h-4" /> Tarjeta
            </button>
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Referencia <span class="text-ink-400 text-xs font-normal">(opcional)</span></label>
          <input v-model="abonoModal.referencia" placeholder="Folio bancario, SPEI, etc." class="input" />
        </div>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Comprobante de transferencia <span class="text-ink-400 text-xs font-normal">(opcional)</span></label>
          <FileDrop
            v-model="abonoModal.comprobante"
            accept=".pdf,image/*"
            icon="receipt"
            label="Subir comprobante"
            hint="PDF o imagen del recibo bancario · arrastra o haz clic"
          />
        </div>
        <p class="text-xs text-ink-500">Puedes registrar el abono sin comprobante ni referencia si aún no los tienes.</p>
        <p v-if="abonoModal.error" class="text-sm text-red-600">{{ abonoModal.error }}</p>
      </div>
      <template #footer>
        <button class="btn-secondary" :disabled="abonoModal.enviando" @click="cerrarAbono">Cancelar</button>
        <button class="btn-success" :disabled="abonoModal.enviando || !abonoModal.metodo" @click="confirmarAbono">
          {{ abonoModal.enviando ? 'Registrando...' : 'Confirmar abono' }}
        </button>
      </template>
    </Modal>

    <Modal v-if="rechazoModal.abierto" :title="`Rechazar ${sol.folio}`" @close="rechazoModal.abierto = false">
      <div class="space-y-3">
        <p class="text-sm text-ink-700">Indica el motivo del rechazo. El colaborador verá este mensaje.</p>
        <textarea v-model="rechazoModal.motivo" rows="3" required class="input" placeholder="Motivo del rechazo"></textarea>
        <label class="flex items-center gap-2 text-sm">
          <input v-model="rechazoModal.permiteEdicion" type="checkbox" class="rounded border-ink-300" />
          Permitir corrección al colaborador (puede editar y reenviar)
        </label>
        <p v-if="rechazoModal.error" class="text-sm text-red-600">{{ rechazoModal.error }}</p>
      </div>
      <template #footer>
        <button class="btn-secondary" :disabled="rechazoModal.enviando" @click="rechazoModal.abierto = false">Cancelar</button>
        <button class="btn-danger" :disabled="rechazoModal.enviando || !rechazoModal.motivo.trim()" @click="confirmarRechazo">
          {{ rechazoModal.enviando ? 'Enviando...' : 'Rechazar' }}
        </button>
      </template>
    </Modal>

    <Modal v-if="cerrarModal.abierto" :title="`Cerrar viáticos ${sol.folio}`" @close="cerrarModal.abierto = false">
      <div class="space-y-3 text-sm">
        <p class="text-ink-700">
          ¿Confirmas el cierre de estos viáticos? Una vez cerrados no se podrán agregar más comprobantes ni solicitar ajustes.
        </p>
        <div class="rounded-lg bg-ink-50 border border-ink-200 p-3 space-y-1">
          <div class="flex justify-between"><span class="text-ink-500">Total aprobado</span><strong>${{ Number(sol.monto_total).toFixed(2) }}</strong></div>
          <div class="flex justify-between"><span class="text-ink-500">Gastado</span><strong>${{ Number(sol.monto_gastado).toFixed(2) }}</strong></div>
          <div class="flex justify-between border-t border-ink-200 pt-1 mt-1">
            <span class="text-ink-500">Diferencia</span>
            <strong :class="disponible < 0 ? 'text-red-600' : 'text-emerald-600'">${{ disponible.toFixed(2) }}</strong>
          </div>
        </div>
        <p v-if="cerrarModal.error" class="text-red-600">{{ cerrarModal.error }}</p>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="cerrarModal.abierto = false">Cancelar</button>
        <button class="btn-success" :disabled="cerrarModal.cerrando" @click="confirmarCierre">
          {{ cerrarModal.cerrando ? 'Cerrando...' : 'Cerrar viáticos' }}
        </button>
      </template>
    </Modal>

    <Modal v-if="edicion.abierto" title="Corregir solicitud" @close="edicion.abierto = false">
      <form class="space-y-3" @submit.prevent="guardarEdicion">
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Destino</label>
          <input v-model="edicion.form.destino" required class="input" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm font-medium text-ink-700 mb-1.5">Inicio</label><DateInput v-model="edicion.form.fecha_inicio" /></div>
          <div><label class="block text-sm font-medium text-ink-700 mb-1.5">Fin</label><DateInput v-model="edicion.form.fecha_fin" :min-date="edicion.form.fecha_inicio || null" /></div>
        </div>
        <div><label class="block text-sm font-medium text-ink-700 mb-1.5">Motivo</label><textarea v-model="edicion.form.motivo" rows="2" required class="input"></textarea></div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm font-medium text-ink-700 mb-1.5">Autoriza</label><input v-model="edicion.form.autoriza_nombre" placeholder="Nombre de quien autoriza" class="input" /></div>
          <div><label class="block text-sm font-medium text-ink-700 mb-1.5">Recibe el viático</label><input v-model="edicion.form.recibe_nombre" placeholder="Nombre de quien recibe" class="input" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm font-medium text-ink-700 mb-1.5">CLABE bancaria</label><input v-model="edicion.form.clabe_bancaria" inputmode="numeric" maxlength="18" placeholder="18 dígitos" class="input" /></div>
          <div><label class="block text-sm font-medium text-ink-700 mb-1.5">Banco</label><input v-model="edicion.form.banco" placeholder="Nombre del banco" class="input" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-sm font-medium text-ink-700 mb-1.5">Resultado</label><input v-model="edicion.form.resultado" placeholder="Resultado" class="input" /></div>
          <div><label class="block text-sm font-medium text-ink-700 mb-1.5">Donante</label><input v-model="edicion.form.donante" placeholder="Donante" class="input" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <CategoriaInput v-model="edicion.form.monto_vuelos"     icon="plane"     label="Vuelos" />
          <CategoriaInput v-model="edicion.form.monto_hospedaje"  icon="building"  label="Hospedaje" />
          <CategoriaInput v-model="edicion.form.monto_alimentos"  icon="receipt"   label="Alimentos" />
          <CategoriaInput v-model="edicion.form.monto_transporte" icon="briefcase" label="Transporte" />
          <CategoriaInput v-model="edicion.form.monto_otros"      icon="document"  label="Otros" class="col-span-2" />
        </div>
        <div class="flex justify-between text-sm pt-2 border-t border-ink-100">
          <span class="text-ink-500">Total</span>
          <span class="font-semibold">${{ totalEdicion.toFixed(2) }}</span>
        </div>
        <p v-if="edicion.error" class="text-sm text-red-600">{{ edicion.error }}</p>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="edicion.abierto = false">Cancelar</button>
        <button class="btn-primary" :disabled="edicion.guardando" @click="guardarEdicion">
          {{ edicion.guardando ? 'Guardando...' : 'Reenviar' }}
        </button>
      </template>
    </Modal>

    <Modal v-if="ajuste.abierto" title="Solicitar ajuste de viático" @close="ajuste.abierto = false">
      <form class="space-y-3" @submit.prevent="guardarAjuste">
        <p class="text-sm text-ink-600">
          Si necesitas más presupuesto del aprobado, solicita un ajuste. Pasará por aprobación del supervisor y pago de finanzas. Al pagarse, se sumará a tu monto total.
        </p>
        <div>
          <label class="block text-sm font-medium text-ink-700 mb-1.5">Motivo del ajuste</label>
          <textarea v-model="ajuste.form.motivo" rows="3" required minlength="5" class="input" placeholder="Ej: gasto adicional en taxis no contemplado"></textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <CategoriaInput v-model="ajuste.form.monto_vuelos"     icon="plane"     label="Vuelos" />
          <CategoriaInput v-model="ajuste.form.monto_hospedaje"  icon="building"  label="Hospedaje" />
          <CategoriaInput v-model="ajuste.form.monto_alimentos"  icon="receipt"   label="Alimentos" />
          <CategoriaInput v-model="ajuste.form.monto_transporte" icon="briefcase" label="Transporte" />
          <CategoriaInput v-model="ajuste.form.monto_otros"      icon="document"  label="Otros" class="col-span-2" />
        </div>
        <div class="flex justify-between text-sm pt-2 border-t border-ink-100">
          <span class="text-ink-500">Monto del ajuste</span>
          <span class="font-semibold text-brand-600">+${{ totalAjuste.toFixed(2) }}</span>
        </div>
        <p v-if="ajuste.error" class="text-sm text-red-600">{{ ajuste.error }}</p>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="ajuste.abierto = false">Cancelar</button>
        <button class="btn-primary" :disabled="ajuste.guardando" @click="guardarAjuste">
          {{ ajuste.guardando ? 'Enviando...' : 'Enviar a aprobación' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
const route = useRoute();
const router = useRouter();
const api = useApi();
const auth = useAuth();
const toast = useToast();
const sol = ref(null);
const errorCarga = ref('');
const archivoGasto = ref(null);
const xmlGasto = ref(null);
const errorXml = ref('');
const gasto = reactive({ monto: 0, fecha: '', rfc_emisor: '', nombre_emisor: '', concepto: '' });
const subiendo = ref(false);
const progreso = ref(0);
const errorGasto = ref('');

const edicion = reactive({
  abierto: false, guardando: false, error: '',
  form: { destino: '', fecha_inicio: '', fecha_fin: '', motivo: '',
    autoriza_nombre: '', recibe_nombre: '', clabe_bancaria: '', banco: '',
    monto_vuelos: 0, monto_hospedaje: 0, monto_alimentos: 0, monto_transporte: 0, monto_otros: 0,
    proyecto: '', cuenta: '', partida: '', objetivo_estrategico: '', resultado: '', donante: '' },
});

const ajuste = reactive({
  abierto: false, guardando: false, error: '',
  form: { motivo: '', monto_vuelos: 0, monto_hospedaje: 0, monto_alimentos: 0, monto_transporte: 0, monto_otros: 0 },
});

const visor = reactive({ abierto: false, path: '', title: '', subtitle: '', downloadName: '' });

const cerrarModal = reactive({ abierto: false, cerrando: false, error: '' });
const subirModal = reactive({ abierto: false });
const rechazoModal = reactive({ abierto: false, motivo: '', permiteEdicion: false, enviando: false, error: '' });
const abonoModal = reactive({ abierto: false, metodo: '', referencia: '', comprobante: null, enviando: false, error: '' });
const aprobando = ref(false);

const BREADCRUMB_MAP = {
  admin:     { label: 'Viáticos', to: '/admin/viaticos' },
  finanzas:  { label: 'Pagos viáticos', to: '/finanzas/viaticos' },
  pendientes:{ label: 'Pagos pendientes', to: '/finanzas/pendientes' },
  historial: { label: 'Mis viáticos', to: '/viaticos/historial' },
  actual:    { label: 'Viático actual', to: '/viaticos/actual' },
  panel:     { label: 'Panel', to: '/panel' },
};

const breadcrumb = computed(() => {
  const from = route.query.from;
  if (from && BREADCRUMB_MAP[from]) return BREADCRUMB_MAP[from];
  if (esAdmin.value)    return BREADCRUMB_MAP.admin;
  if (auth.rol === 'finanzas') return BREADCRUMB_MAP.finanzas;
  return BREADCRUMB_MAP.historial;
});

function abrirCerrar() {
  Object.assign(cerrarModal, { abierto: true, cerrando: false, error: '' });
}

function abrirSubir() {
  errorGasto.value = '';
  subirModal.abierto = true;
}

function cerrarSubir() {
  if (subiendo.value) return;
  subirModal.abierto = false;
  Object.assign(gasto, { monto: 0, fecha: '', rfc_emisor: '', nombre_emisor: '', concepto: '' });
  archivoGasto.value = null;
  xmlGasto.value = null;
  errorXml.value = '';
}

function abrirRechazo() {
  Object.assign(rechazoModal, { abierto: true, motivo: '', permiteEdicion: false, enviando: false, error: '' });
}

async function aprobar() {
  if (aprobando.value) return;
  aprobando.value = true;
  try {
    await api.post(`/viaticos/${route.params.id}/aprobar`);
    toast.success('Solicitud aprobada', 'Pasa a finanzas para el pago.');
    await cargar();
  } catch (e) {
    toast.error('No se pudo aprobar', e.message);
  } finally {
    aprobando.value = false;
  }
}

function abrirAbono() {
  Object.assign(abonoModal, { abierto: true, metodo: '', referencia: '', comprobante: null, enviando: false, error: '' });
}

function cerrarAbono() {
  if (abonoModal.enviando) return;
  abonoModal.abierto = false;
}

async function confirmarAbono() {
  if (!abonoModal.metodo) {
    abonoModal.error = 'Selecciona la forma de pago (transferencia o tarjeta).';
    return;
  }
  abonoModal.enviando = true; abonoModal.error = '';
  try {
    const fd = new FormData();
    fd.append('metodo_pago', abonoModal.metodo);
    if (abonoModal.comprobante) fd.append('comprobante', abonoModal.comprobante);
    if (abonoModal.referencia.trim()) fd.append('referencia', abonoModal.referencia.trim());
    await api.upload(`/viaticos/${route.params.id}/pagar`, fd);
    toast.success('Abono registrado', `${sol.value.folio} · $${Number(sol.value.monto_total).toFixed(2)}`);
    abonoModal.abierto = false;
    await cargar();
  } catch (e) {
    abonoModal.error = e.message;
    toast.error('No se pudo registrar el abono', e.message);
  } finally {
    abonoModal.enviando = false;
  }
}

async function confirmarRechazo() {
  if (!rechazoModal.motivo.trim()) { rechazoModal.error = 'Indica un motivo'; return; }
  rechazoModal.enviando = true; rechazoModal.error = '';
  try {
    await api.post(`/viaticos/${route.params.id}/rechazar`, {
      motivo: rechazoModal.motivo.trim(),
      permite_edicion: rechazoModal.permiteEdicion,
    });
    toast.success('Solicitud rechazada', `${sol.value.folio} fue rechazada.`);
    rechazoModal.abierto = false;
    await cargar();
  } catch (e) {
    rechazoModal.error = e.message;
    toast.error('No se pudo rechazar', e.message);
  } finally {
    rechazoModal.enviando = false;
  }
}

async function confirmarCierre() {
  cerrarModal.cerrando = true; cerrarModal.error = '';
  try {
    await api.post(`/viaticos/${route.params.id}/cerrar`);
    toast.success('Viáticos cerrados', `${sol.value.folio} fue cerrado correctamente.`);
    cerrarModal.abierto = false;
    await cargar();
  } catch (e) {
    cerrarModal.error = e.message;
    toast.error('No se pudo cerrar', e.message);
  } finally {
    cerrarModal.cerrando = false;
  }
}

function abrirVisor({ path, title, subtitle, downloadName }) {
  Object.assign(visor, { abierto: true, path, title, subtitle: subtitle || '', downloadName: downloadName || '' });
}

const categorias = [
  { key: 'monto_vuelos',     label: 'Vuelos',     icon: 'plane' },
  { key: 'monto_hospedaje',  label: 'Hospedaje',  icon: 'building' },
  { key: 'monto_alimentos',  label: 'Alimentos',  icon: 'receipt' },
  { key: 'monto_transporte', label: 'Transporte', icon: 'briefcase' },
  { key: 'monto_otros',      label: 'Otros',      icon: 'document' },
];

const esColaborador = computed(() => auth.rol === 'colaborador');
const esAdmin = computed(() => auth.rol === 'admin');
const estaActivo = computed(() => sol.value && ['pagado', 'en_proceso'].includes(sol.value.estado));
const bloqueadaPorUso = computed(() => sol.value?.bloqueada_por_uso || null);
const puedeCerrar = computed(() => sol.value && ['aprobado', 'pagado', 'en_proceso'].includes(sol.value.estado) && (esColaborador.value || esAdmin.value) && !bloqueadaPorUso.value);
const puedeSubir = computed(() => estaActivo.value && (esColaborador.value || esAdmin.value));
const puedeAprobar = computed(() => sol.value?.estado === 'pendiente' && esAdmin.value);
const puedeAbonar = computed(() => sol.value?.estado === 'aprobado' && !sol.value?.pago && auth.rol === 'finanzas');
const disponible = computed(() => sol.value ? Number(sol.value.monto_total) - Number(sol.value.monto_gastado) : 0);
const necesitaAjuste = computed(() => disponible.value <= 0);
const comprobantesLabel = computed(() => {
  const gastos = sol.value?.gastos || [];
  if (!gastos.length) return 'Sin comprobantes registrados';
  const total = gastos.reduce((s, g) => s + Number(g.monto || 0), 0);
  return `${gastos.length} comprobante${gastos.length === 1 ? '' : 's'} · $${total.toFixed(2)} gastado`;
});
const pctGastado = computed(() => {
  if (!sol.value || !sol.value.monto_total) return 0;
  return Math.min(999, (Number(sol.value.monto_gastado) / Number(sol.value.monto_total)) * 100);
});

const totalEdicion = computed(() =>
  ['monto_vuelos','monto_hospedaje','monto_alimentos','monto_transporte','monto_otros']
    .reduce((s, k) => s + Number(edicion.form[k] || 0), 0)
);
const totalAjuste = computed(() =>
  ['monto_vuelos','monto_hospedaje','monto_alimentos','monto_transporte','monto_otros']
    .reduce((s, k) => s + Number(ajuste.form[k] || 0), 0)
);

function formatFecha(s) {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T'));
  return d.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

async function cargar() {
  errorCarga.value = '';
  try {
    sol.value = await api.get(`/viaticos/${route.params.id}`);
  } catch (e) {
    errorCarga.value = e.message || 'Error al cargar el viático';
  }
}

onMounted(async () => {
  await cargar();
  if (route.query.editar === '1' && sol.value?.estado === 'rechazado' && sol.value.permite_edicion) abrirEdicion();
});

function abrirEdicion() {
  if (!sol.value) return;
  Object.assign(edicion.form, {
    destino: sol.value.destino,
    fecha_inicio: (sol.value.fecha_inicio || '').slice(0, 10),
    fecha_fin: (sol.value.fecha_fin || '').slice(0, 10),
    motivo: sol.value.motivo,
    autoriza_nombre: sol.value.autoriza_nombre || '',
    recibe_nombre: sol.value.recibe_nombre || '',
    clabe_bancaria: sol.value.clabe_bancaria || '',
    banco: sol.value.banco || '',
    monto_vuelos: Number(sol.value.monto_vuelos) || 0,
    monto_hospedaje: Number(sol.value.monto_hospedaje) || 0,
    monto_alimentos: Number(sol.value.monto_alimentos) || 0,
    monto_transporte: Number(sol.value.monto_transporte) || 0,
    monto_otros: Number(sol.value.monto_otros) || 0,
    proyecto: sol.value.proyecto || '',
    cuenta: sol.value.cuenta || '',
    partida: sol.value.partida || '',
    objetivo_estrategico: sol.value.objetivo_estrategico || '',
    resultado: sol.value.resultado || '',
    donante: sol.value.donante || '',
  });
  edicion.error = '';
  edicion.abierto = true;
}

async function guardarEdicion() {
  edicion.guardando = true; edicion.error = '';
  try {
    await api.put(`/viaticos/${route.params.id}`, edicion.form);
    toast.success('Solicitud reenviada', 'Vuelve a estar pendiente de aprobación.');
    edicion.abierto = false;
    if (route.query.editar) router.replace({ query: {} });
    await cargar();
  } catch (e) {
    edicion.error = e.message;
    toast.error('No se pudo guardar', e.message);
  }
  finally { edicion.guardando = false; }
}

function abrirAjuste() {
  Object.assign(ajuste.form, { motivo: '', monto_vuelos: 0, monto_hospedaje: 0, monto_alimentos: 0, monto_transporte: 0, monto_otros: 0 });
  ajuste.error = '';
  ajuste.abierto = true;
}

async function guardarAjuste() {
  if (totalAjuste.value <= 0) { ajuste.error = 'Asigna al menos un monto'; return; }
  ajuste.guardando = true; ajuste.error = '';
  try {
    await api.post(`/viaticos/${route.params.id}/ajustes`, ajuste.form);
    toast.success('Ajuste enviado', 'En espera de aprobación.');
    ajuste.abierto = false;
    await cargar();
  } catch (e) {
    ajuste.error = e.message;
    toast.error('No se pudo enviar el ajuste', e.message);
  }
  finally { ajuste.guardando = false; }
}

const MAX_BYTES = 25 * 1024 * 1024;

function leerAtributo(el, nombres) {
  if (!el) return '';
  for (const n of nombres) {
    const v = el.getAttribute(n);
    if (v) return v;
  }
  return '';
}

function hijoPorNombre(el, nombre) {
  if (!el) return null;
  return [...el.children].find((c) => c.localName?.toLowerCase() === nombre) || null;
}

function parsearCfdi(texto) {
  const doc = new DOMParser().parseFromString(texto, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('El archivo no es un XML válido');
  const comp = doc.documentElement;
  if (comp.localName?.toLowerCase() !== 'comprobante') {
    throw new Error('El XML no es un CFDI (comprobante fiscal)');
  }
  const emisor = hijoPorNombre(comp, 'emisor');
  const conceptosNode = hijoPorNombre(comp, 'conceptos');
  let concepto = '';
  if (conceptosNode) {
    concepto = [...conceptosNode.children]
      .filter((c) => c.localName?.toLowerCase() === 'concepto')
      .map((c) => leerAtributo(c, ['Descripcion', 'descripcion']))
      .filter(Boolean)
      .join(', ');
  }
  return {
    total: leerAtributo(comp, ['Total', 'total']),
    fecha: leerAtributo(comp, ['Fecha', 'fecha']),
    rfc: leerAtributo(emisor, ['Rfc', 'rfc']),
    nombre: leerAtributo(emisor, ['Nombre', 'nombre']),
    concepto,
  };
}

watch(xmlGasto, async (file) => {
  errorXml.value = '';
  if (!file) return;
  try {
    const texto = await file.text();
    const cfdi = parsearCfdi(texto);
    if (cfdi.total) gasto.monto = Number(cfdi.total);
    if (cfdi.fecha) gasto.fecha = cfdi.fecha.slice(0, 10);
    if (cfdi.rfc) gasto.rfc_emisor = cfdi.rfc.toUpperCase();
    if (cfdi.nombre) gasto.nombre_emisor = cfdi.nombre;
    if (cfdi.concepto) gasto.concepto = cfdi.concepto;
    toast.success('XML leído', 'Se llenaron los datos del comprobante');
  } catch (e) {
    errorXml.value = e.message;
    xmlGasto.value = null;
    toast.error('No se pudo leer el XML', e.message);
  }
});

async function descargarXml(g) {
  try {
    await api.download(`/viaticos/${route.params.id}/gastos/${g.id}/xml`, `cfdi-gasto-${g.id}.xml`);
  } catch (e) {
    toast.error('No se pudo descargar el XML', e.message);
  }
}

async function subirGasto() {
  if (!archivoGasto.value && !xmlGasto.value) return;
  const grande = [archivoGasto.value, xmlGasto.value].find((f) => f && f.size > MAX_BYTES);
  if (grande) {
    const mb = (grande.size / (1024 * 1024)).toFixed(1);
    errorGasto.value = `El archivo pesa ${mb} MB. El máximo permitido es 25 MB.`;
    toast.error('Archivo muy grande', errorGasto.value);
    return;
  }
  subiendo.value = true; errorGasto.value = ''; progreso.value = 0;
  try {
    const fd = new FormData();
    if (archivoGasto.value) fd.append('archivo', archivoGasto.value);
    if (xmlGasto.value) fd.append('xml', xmlGasto.value);
    fd.append('monto', String(gasto.monto));
    fd.append('fecha', gasto.fecha);
    if (gasto.rfc_emisor) fd.append('rfc_emisor', gasto.rfc_emisor);
    if (gasto.nombre_emisor) fd.append('nombre_emisor', gasto.nombre_emisor);
    if (gasto.concepto) fd.append('concepto', gasto.concepto);
    await api.uploadWithProgress(`/viaticos/${route.params.id}/gastos`, fd, (p) => { progreso.value = p; });
    toast.success('Comprobante subido', `Monto $${Number(gasto.monto).toFixed(2)}`);
    Object.assign(gasto, { monto: 0, fecha: '', rfc_emisor: '', nombre_emisor: '', concepto: '' });
    archivoGasto.value = null;
    xmlGasto.value = null;
    errorXml.value = '';
    subirModal.abierto = false;
    await cargar();
  } catch (e) {
    errorGasto.value = e.message;
    toast.error('No se pudo subir el comprobante', e.message);
  }
  finally { subiendo.value = false; progreso.value = 0; }
}
</script>
