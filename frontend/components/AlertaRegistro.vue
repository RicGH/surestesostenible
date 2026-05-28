<template>
  <Transition name="alerta-reg" appear>
    <div
      class="relative overflow-hidden rounded-2xl text-white shadow-card ring-1 ring-white/10
             bg-gradient-to-br from-ink-900 via-brand-800 to-brand-600"
    >
      <!-- glows institucionales -->
      <div class="pointer-events-none absolute -top-16 -left-12 w-56 h-56 rounded-full bg-brand-400/30 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 left-1/3 w-52 h-52 rounded-full bg-brand-500/20 blur-3xl"></div>
      <!-- isotipo de marca como textura -->
      <img
        src="/brand/icon.png" alt="" aria-hidden="true"
        class="pointer-events-none select-none absolute -right-6 -bottom-12 w-44 opacity-[0.07] rotate-6"
      />

      <div class="relative flex flex-col gap-5 p-5 sm:p-6 sm:flex-row sm:items-center">
        <!-- icono con pulso -->
        <div class="shrink-0">
          <div class="relative w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/20 grid place-items-center backdrop-blur-sm">
            <Icon name="alert" size="w-7 h-7" class="text-white" />
            <span class="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span class="absolute inline-flex h-full w-full rounded-full bg-brand-300 opacity-75 animate-ping"></span>
              <span class="relative inline-flex h-3.5 w-3.5 rounded-full bg-brand-400 ring-2 ring-ink-900"></span>
            </span>
          </div>
        </div>

        <!-- texto -->
        <div class="min-w-0 flex-1">
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 mb-2 rounded-full bg-white/10 ring-1 ring-white/15
                       text-[11px] font-semibold uppercase tracking-wider text-brand-100">
            <span class="w-1.5 h-1.5 rounded-full bg-brand-300 animate-pulse"></span>
            Acción requerida
          </span>
          <h3 class="text-lg font-semibold tracking-tight leading-snug">Completa tu registro</h3>
          <p class="text-sm text-brand-100/80 mt-1 max-w-xl">
            Para subir facturas primero debes registrar tus
            <strong class="font-medium text-white">datos fiscales y bancarios</strong>.
          </p>
        </div>

        <!-- acción -->
        <div class="shrink-0 sm:self-center">
          <NuxtLink
            :to="to"
            class="group inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-ink-900
                   text-sm font-semibold shadow-sm hover:bg-brand-50 hover:shadow-md transition-all"
          >
            Registrar mis datos
            <Icon name="chevron-right" size="w-4 h-4" class="transition-transform group-hover:translate-x-0.5" />
          </NuxtLink>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
defineProps({ to: { type: String, default: '/proveedores/registro' } });
</script>

<style scoped>
.alerta-reg-enter-active { transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
.alerta-reg-enter-from { opacity: 0; transform: translateY(-12px) scale(0.98); }
</style>
