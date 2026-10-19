import { describe, it, expect, beforeEach, vi } from 'vitest';
import { store } from '../src/js/store.js';

describe('Store — Manejo Reactivo de Estado Global', () => {
  beforeEach(() => {
    localStorage.clear();
    store.clearUser();
  });

  it('inicializa con tema dark o el valor almacenado en localStorage', () => {
    localStorage.setItem('kromalab_theme', 'light');
    const initial = store.getInitialTheme();
    expect(initial).toBe('light');
  });

  it('detecta prefers-color-scheme light si no hay nada en localStorage', () => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query.includes('light'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }));

    const initial = store.getInitialTheme();
    expect(initial).toBe('light');
  });

  it('permite alternar el tema visual entre dark y light', () => {
    store.setTheme('dark');
    expect(store.state.theme).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    store.toggleTheme();
    expect(store.state.theme).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(localStorage.getItem('kromalab_theme')).toBe('light');
  });

  it('administra la sesión de usuario, token y permisos', () => {
    const mockUser = { id: 'USR_001', name: 'Miguel', role: 'ADMIN' };
    const mockToken = 'jwt-fake-token';
    const mockPerms = ['MANAGE_ORDERS', 'VIEW_METRICS'];

    store.setUser(mockUser, mockToken, mockPerms);

    expect(store.state.user).toEqual(mockUser);
    expect(store.state.token).toBe(mockToken);
    expect(store.state.permissions).toEqual(mockPerms);

    store.clearUser();
    expect(store.state.user).toBeNull();
    expect(store.state.token).toBeNull();
    expect(store.state.permissions).toEqual([]);
  });

  it('notifica a los suscriptores cuando el estado cambia', () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setActiveQuote({ totalPriceQ: 140.0 });
    expect(listener).toHaveBeenCalledWith(store.state);
    expect(store.state.activeQuote.totalPriceQ).toBe(140.0);

    unsubscribe();
    store.setActiveQuote({ totalPriceQ: 280.0 });
    expect(listener).toHaveBeenCalledTimes(1); // No vuelve a llamarse tras desuscribir
  });
});
