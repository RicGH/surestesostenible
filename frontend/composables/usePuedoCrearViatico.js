const ESTADO_LABEL = {
  pendiente: 'pendiente de aprobación',
  aprobado: 'aprobada, esperando pago de finanzas',
  pagado: 'pagada y lista para usar',
  en_proceso: 'en proceso (con gastos registrados)',
};

let _instancia = null;

export const usePuedoCrearViatico = () => {
  if (_instancia) return _instancia;

  const api = useApi();
  const auth = useAuth();

  const state = reactive({
    puede: true,
    activa: null,
    cargado: false,
  });

  Object.defineProperty(state, 'motivo', {
    enumerable: true,
    get() {
      if (!state.activa) return '';
      const label = ESTADO_LABEL[state.activa.estado] || state.activa.estado;
      return `Ya tienes una solicitud activa: ${state.activa.folio} (${label}). Puedes crear otra, pero no podrás registrar gastos en ella hasta cerrar la actual.`;
    },
  });

  state.refrescar = async () => {
    if (auth.rol !== 'colaborador') {
      state.puede = true;
      state.activa = null;
      state.cargado = true;
      return;
    }
    try {
      const r = await api.get('/viaticos/puedo-crear');
      state.puede = r.puede;
      state.activa = r.activa;
    } catch {
      state.puede = true;
      state.activa = null;
    } finally {
      state.cargado = true;
    }
  };

  state.reset = () => {
    state.puede = true;
    state.activa = null;
    state.cargado = false;
  };

  _instancia = state;
  return state;
};
