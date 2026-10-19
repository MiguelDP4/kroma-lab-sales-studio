import { describe, it, expect, beforeEach } from 'vitest';
import { initApp } from '../src/js/app.js';
import { store } from '../src/js/store.js';

describe('App — Inicialización y DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="themeToggleBtn">
        <span id="themeToggleIcon">☀️</span>
      </button>
    `;
    store.setTheme('dark');
  });

  it('enlaza el botón de cambio de tema y actualiza el icono y estado al hacer clic', () => {
    initApp();

    const button = document.getElementById('themeToggleBtn');
    const icon = document.getElementById('themeToggleIcon');

    expect(store.state.theme).toBe('dark');
    expect(icon.textContent).toBe('☀️');

    button.click();

    expect(store.state.theme).toBe('light');
    expect(icon.textContent).toBe('🌙');
  });

  it('inicializa la cotización activa por defecto en el store', () => {
    initApp();
    expect(store.state.activeQuote).not.toBeNull();
    expect(store.state.activeQuote.totalPriceQ).toBeGreaterThan(0);
  });
});
