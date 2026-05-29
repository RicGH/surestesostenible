<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 backdrop-blur-sm p-2 sm:p-4 md:p-6" @click.self="$emit('close')">
      <div
        :class="['card w-full flex flex-col', sizeClass, 'max-h-[calc(100vh-2rem)] min-h-0']"
      >
        <!-- Header fijo -->
        <div class="px-5 py-4 border-b border-ink-100 flex items-center justify-between shrink-0">
          <h3 class="font-semibold text-ink-900">{{ title }}</h3>
          <button class="text-ink-500 hover:text-ink-900" @click="$emit('close')">
            <Icon name="close" size="w-4 h-4" />
          </button>
        </div>

        <!-- Cuerpo con scroll -->
        <div class="p-5 overflow-y-auto flex-1 min-h-0">
          <slot />
        </div>

        <!-- Footer fijo -->
        <div v-if="$slots.footer" class="px-5 py-4 border-t border-ink-100 flex gap-2 justify-end bg-ink-50/50 rounded-b-xl shrink-0">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  title: String,
  size: { type: String, default: 'md' },
});
defineEmits(['close']);

const sizeClass = computed(() => ({
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  full: 'max-w-full',
}[props.size] || 'max-w-md'));
</script>
