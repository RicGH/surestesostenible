<template>
  <Modal v-if="state.visible" :title="state.titulo" size="sm" @close="cancelar">
    <div class="flex items-start gap-3">
      <div class="w-10 h-10 rounded-lg bg-red-50 text-red-600 grid place-items-center shrink-0">
        <Icon :name="state.icono" size="w-5 h-5" />
      </div>
      <p class="text-sm text-ink-700 leading-relaxed pt-2">{{ state.mensaje }}</p>
    </div>
    <template #footer>
      <button class="btn-secondary" @click="cancelar">Cancelar</button>
      <button :class="state.variante === 'danger' ? 'btn-danger' : 'btn-primary'" @click="aceptar">
        {{ state.accion }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
const { state, aceptar, cancelar } = useConfirm();
</script>
