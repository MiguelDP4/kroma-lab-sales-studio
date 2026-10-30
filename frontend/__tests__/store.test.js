import { describe, it, expect, beforeEach, vi } from 'vitest';
import { store } from '../src/js/store.js';

describe('Store — Manejo Reactivo de Estado Global', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
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

  it('persiste en localStorage cuando rememberMe es true', () => {
    const mockUser = { id: 'USR_REMEMBER', name: 'Miguel Dubois', role: 'ADMIN' };
    const mockToken = 'token-remember-true';
    const mockPerms = ['*'];

    store.setUser(mockUser, mockToken, mockPerms, true);

    expect(localStorage.getItem('kromalab_jwt_token')).toBe(mockToken);
    expect(localStorage.getItem('kromalab_remember_me')).toBe('true');
    const saved = JSON.parse(localStorage.getItem('kromalab_user_session'));
    expect(saved.user).toEqual(mockUser);
    expect(saved.permissions).toEqual(mockPerms);
    expect(sessionStorage.getItem('kromalab_jwt_token')).toBeNull();
  });

  it('persiste en sessionStorage cuando rememberMe es false', () => {
    const mockUser = { id: 'USR_SESSION_ONLY', name: 'Cliente Temporal', role: 'CUSTOMER' };
    const mockToken = 'token-remember-false';
    const mockPerms = ['ORDERS'];

    store.setUser(mockUser, mockToken, mockPerms, false);

    expect(sessionStorage.getItem('kromalab_jwt_token')).toBe(mockToken);
    const saved = JSON.parse(sessionStorage.getItem('kromalab_user_session'));
    expect(saved.user).toEqual(mockUser);
    expect(saved.permissions).toEqual(mockPerms);
    expect(localStorage.getItem('kromalab_jwt_token')).toBeNull();
    expect(localStorage.getItem('kromalab_remember_me')).toBeNull();
  });

  it('clearUser limpia tanto localStorage como sessionStorage', () => {
    localStorage.setItem('kromalab_jwt_token', 'token-local');
    localStorage.setItem('kromalab_user_session', JSON.stringify({ user: { name: 'User' }, permissions: [] }));
    sessionStorage.setItem('kromalab_jwt_token', 'token-session');
    sessionStorage.setItem('kromalab_user_session', JSON.stringify({ user: { name: 'User' }, permissions: [] }));

    store.clearUser();

    expect(localStorage.getItem('kromalab_jwt_token')).toBeNull();
    expect(localStorage.getItem('kromalab_user_session')).toBeNull();
    expect(sessionStorage.getItem('kromalab_jwt_token')).toBeNull();
    expect(sessionStorage.getItem('kromalab_user_session')).toBeNull();
  });

  it('getInitialSession recupera la sesión desde localStorage o sessionStorage', () => {
    const mockUser = { id: 'USR_RECOVER', name: 'Lesly', role: 'CUSTOMER' };
    localStorage.setItem('kromalab_jwt_token', 'token-recover');
    localStorage.setItem('kromalab_user_session', JSON.stringify({ user: mockUser, permissions: ['ORDERS'] }));

    const session = store.getInitialSession();
    expect(session.token).toBe('token-recover');
    expect(session.user).toEqual(mockUser);
    expect(session.permissions).toEqual(['ORDERS']);
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
  it('cubre toggleTheme desde light hacia dark y manejo seguro de excepciones en storage', () => {
    store.setTheme('light');
    store.toggleTheme();
    expect(store.state.theme).toBe('dark');

    // Excepciones en Storage
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });

    store.setTheme('light');
    store.setUser({ id: '1' }, 'tok', [], true);
    store.setUser({ id: '2' }, 'tok', [], false);
    spy.mockRestore();

    const spyRemove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('Storage error');
    });
    store.clearUser();
    spyRemove.mockRestore();
  });
});