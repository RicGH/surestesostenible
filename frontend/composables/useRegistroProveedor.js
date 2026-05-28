let _instancia = null;

export const useRegistroProveedor = () => {
  if (_instancia) return _instancia;

  const api = useApi();
  const auth = useAuth();

  const state = reactive({
    registrado: false,
    registro: null,
    cargado: false,
  });

  state.refrescar = async () => {
    if (auth.rol !== 'proveedor') {
      state.registrado = true;
      state.registro = null;
      state.cargado = true;
      return;
    }
    try {
      const r = await api.get('/proveedores/mio');
      state.registro = r.data || null;
      state.registrado = !!r.data;
    } catch {
      state.registro = null;
      state.registrado = true;
    } finally {
      state.cargado = true;
    }
  };

  state.reset = () => {
    state.registrado = false;
    state.registro = null;
    state.cargado = false;
  };

  _instancia = state;
  return state;
};
