/**
 * Almacén reactivo de estado global para la aplicación Vanilla JS.
 * Gestiona el tema visual (light/dark), la sesión de usuario y la cotización activa.
 */

class StateStore {
  constructor() {
    this.state = {
      theme: this.getInitialTheme(),
      user: null,
      token: null,
      permissions: [],
      activeQuote: null,
    };
    this.listeners = new Set();
    this.applyTheme(this.state.theme);
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

  setUser(user, token, permissions = []) {
    this.state.user = user;
    this.state.token = token;
    this.state.permissions = permissions;
    this.notify();
  }

  clearUser() {
    this.state.user = null;
    this.state.token = null;
    this.state.permissions = [];
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
