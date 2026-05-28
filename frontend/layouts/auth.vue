<template>
  <div class="min-h-screen grid lg:grid-cols-2">
    <div class="flex items-center justify-center p-6 lg:p-12 bg-white">
      <slot />
    </div>
    <div class="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-ink-900 via-brand-900 to-brand-700 text-white">
      <div class="flex items-center gap-3">
        <img src="/brand/icon.png" alt="Sureste Sostenible" class="w-10 h-10 object-contain" />
        <span class="text-lg font-semibold tracking-tight">AdminProv</span>
      </div>
      <div class="space-y-4 max-w-md">
        <h2 class="text-3xl font-semibold leading-tight">Plataforma de Administración</h2>
        <p class="text-brand-100/80">
          Gestiona viáticos, proveedores y pagos en un solo lugar. Aprueba, factura y reporta sin fricción.
        </p>
        <ul class="space-y-2 text-sm text-brand-100/70">
          <li class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-brand-300" /> Solicitudes de viáticos con flujo de aprobación</li>
          <li class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-brand-300" /> Facturación CFDI con auto-llenado de XML</li>
          <li class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full bg-brand-300" /> Reportes y control de pagos</li>
        </ul>
      </div>
      <p class="text-xs text-brand-200/50">© {{ new Date().getFullYear() }} AdminProv</p>
    </div>
    <ToastContainer />
  </div>
</template>
