import { defineStore } from 'pinia';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null,
    impersonator: null,
    originalToken: null,
    originalUser: null,
  }),
  getters: {
    isAuthenticated: (s) => !!s.token,
    rol: (s) => s.user?.rol,
    isImpersonating: (s) => !!s.impersonator,
  },
  actions: {
    hydrate() {
      if (process.client) {
        const t = localStorage.getItem('token');
        const u = localStorage.getItem('user');
        if (t) this.token = t;
        if (u) {
          try { this.user = JSON.parse(u); } catch {}
        }
        const imp = localStorage.getItem('impersonator');
        const origT = localStorage.getItem('originalToken');
        const origU = localStorage.getItem('originalUser');
        if (imp && origT && origU) {
          try {
            this.impersonator = JSON.parse(imp);
            this.originalToken = origT;
            this.originalUser = JSON.parse(origU);
          } catch {}
        }
      }
    },
    setSession(token, user) {
      this.token = token;
      this.user = user;
      if (process.client) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      }
    },
    startImpersonation(token, user, impersonator) {
      if (process.client) {
        localStorage.setItem('originalToken', this.token);
        localStorage.setItem('originalUser', JSON.stringify(this.user));
        localStorage.setItem('impersonator', JSON.stringify(impersonator));
      }
      this.originalToken = this.token;
      this.originalUser = this.user;
      this.impersonator = impersonator;
      this.setSession(token, user);
      try { usePuedoCrearViatico().reset(); } catch {}
    },
    stopImpersonation() {
      if (!this.originalToken) return;
      const t = this.originalToken;
      const u = this.originalUser;
      this.impersonator = null;
      this.originalToken = null;
      this.originalUser = null;
      if (process.client) {
        localStorage.removeItem('impersonator');
        localStorage.removeItem('originalToken');
        localStorage.removeItem('originalUser');
      }
      this.setSession(t, u);
      try { usePuedoCrearViatico().reset(); } catch {}
    },
    logout() {
      this.token = null;
      this.user = null;
      this.impersonator = null;
      this.originalToken = null;
      this.originalUser = null;
      if (process.client) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('impersonator');
        localStorage.removeItem('originalToken');
        localStorage.removeItem('originalUser');
      }
      try { usePuedoCrearViatico().reset(); } catch {}
    },
  },
});
