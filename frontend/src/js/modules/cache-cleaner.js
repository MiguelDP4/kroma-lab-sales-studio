/**
 * Módulo Centralizado de Limpieza de Caché y Almacenamiento Local (CacheCleaner)
 * 
 * Garantiza el borrado exhaustivo de caché en memoria y persistencia en localStorage/sessionStorage
 * al momento del cierre de sesión (o reseteo forzoso).
 * 
 * Evita la fuga o solapamiento de datos entre sesiones de distintos roles (ej. Cliente vs Admin)
 * en pedidos, despachos, inventarios, cobros, producción, cotizaciones, clientes, usuarios y carritos.
 */

import { ordersStore } from './orders-store.js';
import { dispatchStore } from './dispatch-store.js';
import { inventoryStore } from './inventory-store.js';
import { receivablesStore } from './receivables-store.js';
import { productionStore } from './production-store.js';
import { clientsStore } from './clients-store.js';
import { quotesStore } from './quotes-store.js';
import { usersStore } from './users-store.js';
import { cartStore } from './cart-store.js';
import { resetCostsConfig } from './profitability-engine.js';
import { store } from '../store.js';
import { apiClient } from './api-client.js';

/**
 * Borra de raíz todo el caché en memoria de las tablas/almacenes y limpia el almacenamiento del navegador.
 * @param {object} options
 * @param {boolean} [options.preserveTheme=true] Si debe preservar la preferencia de tema visual (dark/light)
 */
export function clearAllApplicationCache({ preserveTheme = true } = {}) {
  // 1. Limpieza de memoria y caché específico en cada almacén reactivo
  if (ordersStore?.clearOrdersCache) {
    ordersStore.clearOrdersCache();
  }
  if (dispatchStore?.clearDispatchCache) {
    dispatchStore.clearDispatchCache();
  }
  if (inventoryStore?.clearInventoryCache) {
    inventoryStore.clearInventoryCache();
  }
  if (receivablesStore?.clearReceivablesCache) {
    receivablesStore.clearReceivablesCache();
  }
  if (productionStore?.clearProductionCache) {
    productionStore.clearProductionCache();
  }
  if (clientsStore?.clearClientsCache) {
    clientsStore.clearClientsCache();
  }
  if (quotesStore?.clearQuotesCache) {
    quotesStore.clearQuotesCache();
  }
  if (usersStore?.clearUsersCache) {
    usersStore.clearUsersCache();
  }
  if (cartStore?.clearCache) {
    cartStore.clearCache();
  }
  if (typeof resetCostsConfig === 'function') {
    resetCostsConfig();
  }

  // 2. Limpieza exhaustiva de localStorage
  try {
    if (typeof localStorage !== 'undefined') {
      const savedTheme = preserveTheme ? localStorage.getItem('kromalab_theme') : null;
      localStorage.clear();
      if (savedTheme) {
        localStorage.setItem('kromalab_theme', savedTheme);
      }
    }
  } catch (_) {}

  // 3. Limpieza de sessionStorage
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  } catch (_) {}

  // 4. Limpieza de sesión en store y apiClient
  if (store?.clearUser) {
    store.clearUser();
  }
  if (apiClient?.clearToken) {
    apiClient.clearToken();
  }
}
