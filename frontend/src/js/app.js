/**
 * Punto de entrada principal de la SPA Vanilla JS de Kroma Lab Sales Studio.
 */

import { store } from './store.js';
import { calculateQuote } from './modules/quoter-engine.js';

export function initApp() {
  // Inicializar botón de tema
  const themeToggle = document.getElementById('themeToggleBtn');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      store.toggleTheme();
    });
  }

  // Escuchar cambios de estado para actualizar ícono del botón de tema
  store.subscribe((state) => {
    updateThemeIcon(state.theme);
  });
  updateThemeIcon(store.state.theme);

  // Inicializar cotización de prueba por defecto (5x5 cm, 50 piezas)
  const defaultQuote = calculateQuote({ widthCm: 5, heightCm: 5, qty: 50, includeCutting: false });
  store.setActiveQuote(defaultQuote);
}

function updateThemeIcon(theme) {
  const icon = document.getElementById('themeToggleIcon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', initApp);
}
