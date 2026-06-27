let _state = null;

export const useConfirm = () => {
  if (!_state) {
    _state = reactive({
      visible: false,
      titulo: '',
      mensaje: '',
      accion: 'Confirmar',
      icono: 'trash',
      variante: 'danger',
      resolve: null,
    });
  }

  function abrir(mensaje, { titulo = 'Confirmar', accion = 'Confirmar', icono = 'trash', variante = 'danger' } = {}) {
    return new Promise((resolve) => {
      Object.assign(_state, { visible: true, mensaje, titulo, accion, icono, variante, resolve });
    });
  }

  function aceptar() {
    _state.visible = false;
    _state.resolve?.(true);
  }

  function cancelar() {
    _state.visible = false;
    _state.resolve?.(false);
  }

  return { state: _state, abrir, aceptar, cancelar };
};
