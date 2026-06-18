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
    abiertos: [],
    enUso: 0,
    limite: 3,
    cargado: false,
  });

  Object.defineProperty(state, 'lleno', {
    enumerable: true,
    get() { return state.enUso >= state.limite; },
  });

  Object.defineProperty(state, 'motivo', {
    enumerable: true,
    get() {
      if (state.lleno) {
        return `Ya tienes ${state.enUso} viáticos abiertos en uso (máximo ${state.limite}). Puedes crear otro, pero quedará en cola y no podrás registrar gastos en él hasta cerrar alguno de los abiertos.`;
      }
      if (state.enUso > 0) {
        return `Tienes ${state.enUso} de ${state.limite} viáticos abiertos en uso. Puedes crear y usar hasta ${state.limite} a la vez.`;
      }
      if (!state.activa) return '';
      const label = ESTADO_LABEL[state.activa.estado] || state.activa.estado;
      return `Tienes una solicitud activa: ${state.activa.folio} (${label}).`;
    },
  });

  state.refrescar = async () => {
    if (auth.rol !== 'colaborador') {
      state.puede = true;
      state.activa = null;
      state.abiertos = [];
      state.enUso = 0;
      state.cargado = true;
      return;
    }
    try {
      const r = await api.get('/viaticos/puedo-crear');
      state.puede = r.puede;
      state.activa = r.activa;
      state.abiertos = r.abiertos || [];
      state.enUso = r.enUso || 0;
      if (r.limite) state.limite = r.limite;
    } catch {
      state.puede = true;
      state.activa = null;
      state.abiertos = [];
      state.enUso = 0;
    } finally {
      state.cargado = true;
    }
  };

  state.reset = () => {
    state.puede = true;
    state.activa = null;
    state.abiertos = [];
    state.enUso = 0;
    state.cargado = false;
  };

  _instancia = state;
  return state;
};
