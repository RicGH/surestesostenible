let _toasts = null;
let _id = 0;

export const useToast = () => {
  if (!_toasts) _toasts = ref([]);

  function add({ type = 'info', titulo, mensaje = '', duration = 5000, action = null }) {
    const id = ++_id;
    _toasts.value.push({ id, type, titulo, mensaje, action });
    if (duration > 0) setTimeout(() => remove(id), duration);
    return id;
  }

  function remove(id) {
    _toasts.value = _toasts.value.filter((t) => t.id !== id);
  }

  return {
    toasts: _toasts,
    success: (titulo, mensaje, opts) => add({ type: 'success', titulo, mensaje, ...opts }),
    warning: (titulo, mensaje, opts) => add({ type: 'warning', titulo, mensaje, ...opts }),
    info:    (titulo, mensaje, opts) => add({ type: 'info',    titulo, mensaje, ...opts }),
    error:   (titulo, mensaje, opts) => add({ type: 'error',   titulo, mensaje, duration: 7000, ...opts }),
    remove,
  };
};
