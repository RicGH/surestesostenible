<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[200] space-y-2 max-w-sm w-[calc(100%-2rem)]">
      <TransitionGroup
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-x-4"
        enter-to-class="opacity-100 translate-x-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-x-0"
        leave-to-class="opacity-0 translate-x-4"
      >
        <div
          v-for="t in toast.toasts.value"
          :key="t.id"
          class="flex items-start gap-3 bg-white rounded-xl border shadow-card pr-3 pl-3 py-3"
          :class="borderClass(t.type)"
        >
          <div :class="['w-9 h-9 rounded-lg grid place-items-center shrink-0', iconBg(t.type)]">
            <Icon :name="iconName(t.type)" size="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <p :class="['font-semibold text-sm', titleColor(t.type)]">{{ t.titulo }}</p>
            <p v-if="t.mensaje" class="text-xs text-ink-600 mt-0.5">{{ t.mensaje }}</p>
            <NuxtLink
              v-if="t.action"
              :to="t.action.to"
              :class="['inline-flex items-center gap-1 mt-2 text-xs font-semibold hover:underline', titleColor(t.type)]"
              @click="toast.remove(t.id)"
            >
              {{ t.action.label }}
              <Icon name="chevron-right" size="w-3.5 h-3.5" />
            </NuxtLink>
          </div>
          <button class="text-ink-400 hover:text-ink-700 shrink-0" @click="toast.remove(t.id)">
            <Icon name="close" size="w-4 h-4" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
const toast = useToast();

const VARIANTS = {
  success: { border: 'border-emerald-200', bg: 'bg-emerald-100 text-emerald-600', title: 'text-emerald-700', icon: 'check' },
  warning: { border: 'border-amber-200',   bg: 'bg-amber-100 text-amber-600',     title: 'text-amber-700',   icon: 'alert' },
  info:    { border: 'border-brand-200',   bg: 'bg-brand-100 text-brand-600',     title: 'text-brand-700',   icon: 'alert' },
  error:   { border: 'border-red-200',     bg: 'bg-red-100 text-red-600',         title: 'text-red-700',     icon: 'x' },
};

function borderClass(t) { return VARIANTS[t]?.border || VARIANTS.info.border; }
function iconBg(t)      { return VARIANTS[t]?.bg     || VARIANTS.info.bg; }
function iconName(t)    { return VARIANTS[t]?.icon   || 'alert'; }
function titleColor(t)  { return VARIANTS[t]?.title  || VARIANTS.info.title; }
</script>
