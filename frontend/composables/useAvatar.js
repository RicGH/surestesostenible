let _instancia = null;

// Singleton: mantiene el object URL de la foto de perfil del usuario actual,
// compartido entre el sidebar y la página de perfil.
export const useAvatar = () => {
  if (_instancia) return _instancia;

  const api = useApi();

  const state = reactive({
    url: null,
    cargado: false,
  });

  function setBlob(blob) {
    if (state.url) URL.revokeObjectURL(state.url);
    state.url = blob ? URL.createObjectURL(blob) : null;
  }

  // Carga la foto desde /auth/me (para saber si existe) y /auth/avatar (el binario).
  state.refrescar = async () => {
    try {
      const { user } = await api.get('/auth/me');
      if (user?.avatar_path) {
        const { blob } = await api.viewBlob('/auth/avatar');
        setBlob(blob);
      } else {
        setBlob(null);
      }
    } catch {
      setBlob(null);
    } finally {
      state.cargado = true;
    }
  };

  // Actualización local inmediata tras subir/eliminar (evita un round-trip).
  state.setDesdeBlob = (blob) => setBlob(blob);
  state.limpiar = () => setBlob(null);

  state.reset = () => {
    setBlob(null);
    state.cargado = false;
  };

  _instancia = state;
  return state;
};
