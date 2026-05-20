<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 grid place-items-center bg-ink-900/50 backdrop-blur-sm p-4" @click.self="$emit('close')">
      <div class="card w-full max-w-md">
        <div class="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
          <h3 class="font-semibold text-ink-900">{{ title }}</h3>
          <button class="text-ink-500 hover:text-ink-900" @click="$emit('close')"><Icon name="close" size="w-4 h-4" /></button>
        </div>
        <div class="p-5">
          <slot />
        </div>
        <div v-if="$slots.footer" class="px-5 py-4 border-t border-ink-100 flex gap-2 justify-end bg-ink-50/50 rounded-b-xl">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({ title: String });
defineEmits(['close']);
</script>
