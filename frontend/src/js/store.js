/**
 * Almacén reactivo de estado global para la aplicación Vanilla JS.
 * Gestiona el tema visual (light/dark), la sesión de usuario persistente y la cotización activa.
 */

class StateStore {
  constructor() {
    const savedSession = this.getInitialSession();
    this.state = {
      theme: this.getInitialTheme(),
      user: savedSession?.user || null,
      token: savedSession?.token || null,
      permissions: savedSession?.permissions || [],
      activeQuote: null,
    };
    this.listeners = new Set();
    this.applyTheme(this.state.theme);
  }

  getInitialSession() {
    try {
      // 1. Revisar sessionStorage (pestaña activa del navegador)
      let raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('kromalab_user_session') : null;
      let token = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('kromalab_jwt_token') : null;

      // 2. Si no hay en sessionStorage, revisar localStorage (recordar sesión)
      if (!raw && typeof localStorage !== 'undefined') {
        raw = localStorage.getItem('kromalab_user_session');
        token = localStorage.getItem('kromalab_jwt_token');
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.user) {
          return {
            user: parsed.user,
            token: token || parsed.token || null,
            permissions: parsed.permissions || [],
          };
        }
      }
    } catch (_) {}
    return null;
  }

  getInitialTheme() {
    try {
      const stored = localStorage.getItem('kromalab_theme');
      if (stored === 'light' || stored === 'dark') return stored;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch (_) {}
    return 'dark'; // Dark mode por defecto
  }

  toggleTheme() {
    const nextTheme = this.state.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(nextTheme);
  }

  setTheme(theme) {
    this.state.theme = theme;
    this.applyTheme(theme);
    try {
      localStorage.setItem('kromalab_theme', theme);
    } catch (_) {}
    this.notify();
  }

  applyTheme(theme) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  setUser(user, token, permissions = [], rememberMe = false) {
    this.state.user = user;
    this.state.token = token;
    this.state.permissions = permissions;

    try {
      const payload = JSON.stringify({ user, permissions });
      if (rememberMe) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('kromalab_user_session', payload);
          if (token) localStorage.setItem('kromalab_jwt_token', token);
          localStorage.setItem('kromalab_remember_me', 'true');
        }
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('kromalab_user_session');
          sessionStorage.removeItem('kromalab_jwt_token');
          sessionStorage.removeItem('kromalab_remember_me');
        }
      } else {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('kromalab_user_session', payload);
          if (token) sessionStorage.setItem('kromalab_jwt_token', token);
          sessionStorage.setItem('kromalab_remember_me', 'false');
        }
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('kromalab_user_session');
          localStorage.removeItem('kromalab_jwt_token');
          localStorage.removeItem('kromalab_remember_me');
        }
      }
    } catch (_) {}

    this.notify();
  }

  clearUser() {
    this.state.user = null;
    this.state.token = null;
    this.state.permissions = [];

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('kromalab_user_session');
        localStorage.removeItem('kromalab_jwt_token');
        localStorage.removeItem('kromalab_remember_me');
      }
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('kromalab_user_session');
        sessionStorage.removeItem('kromalab_jwt_token');
        sessionStorage.removeItem('kromalab_remember_me');
      }
    } catch (_) {}

    this.notify();
  }

  setActiveQuote(quote) {
    this.state.activeQuote = quote;
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

export const store = new StateStore();
