let _toasts = null;
let _id = 0;

export const useToast = () => {
  if (!_toasts) _toasts = ref([]);

  function add({ type = 'info', titulo, mensaje = '', duration = 5000 }) {
    const id = ++_id;
    _toasts.value.push({ id, type, titulo, mensaje });
    if (duration > 0) setTimeout(() => remove(id), duration);
    return id;
  }

  function remove(id) {
    _toasts.value = _toasts.value.filter((t) => t.id !== id);
  }

  return {
    toasts: _toasts,
    success: (titulo, mensaje) => add({ type: 'success', titulo, mensaje }),
    warning: (titulo, mensaje) => add({ type: 'warning', titulo, mensaje }),
    info:    (titulo, mensaje) => add({ type: 'info',    titulo, mensaje }),
    error:   (titulo, mensaje) => add({ type: 'error',   titulo, mensaje, duration: 7000 }),
    remove,
  };
};
