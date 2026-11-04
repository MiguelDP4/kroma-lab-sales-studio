import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearAllApplicationCache } from '../src/js/modules/cache-cleaner.js';
import { ordersStore } from '../src/js/modules/orders-store.js';
import { dispatchStore } from '../src/js/modules/dispatch-store.js';
import { inventoryStore } from '../src/js/modules/inventory-store.js';
import { receivablesStore } from '../src/js/modules/receivables-store.js';
import { productionStore } from '../src/js/modules/production-store.js';
import { clientsStore } from '../src/js/modules/clients-store.js';
import { quotesStore } from '../src/js/modules/quotes-store.js';
import { usersStore } from '../src/js/modules/users-store.js';
import { cartStore } from '../src/js/modules/cart-store.js';
import { store } from '../src/js/store.js';
import { apiClient } from '../src/js/modules/api-client.js';
import { handleLogout } from '../src/js/components/user-profile-modal.js';

describe('CacheCleaner — Limpieza Exhaustiva de Caché y Almacenamiento Local', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('limpia la memoria y las claves de almacenamiento de todos los almacenes reactivos', () => {
    // 1. Inyectar datos en cada store y en localStorage
    ordersStore.orders = [{ id: 'ORD-101', totalMeters: 5 }];
    localStorage.setItem('kromalab_orders', JSON.stringify(ordersStore.orders));

    dispatchStore.dispatchNotes = [{ id: 'REM-101', orderId: 'ORD-101' }];
    localStorage.setItem('kromalab_dispatch_notes', JSON.stringify(dispatchStore.dispatchNotes));

    inventoryStore.items = [{ id: 'INV-1', name: 'Rollo Film' }];
    inventoryStore.kardex = [{ id: 'KARDEX-1', qty: 10 }];
    inventoryStore.deductedOrders.add('ORD-101');
    localStorage.setItem('kromalab_inventory', JSON.stringify(inventoryStore.items));
    localStorage.setItem('kromalab_inventory_kardex', JSON.stringify(inventoryStore.kardex));
    localStorage.setItem('kromalab_inventory_deducted_orders', JSON.stringify(['ORD-101']));

    receivablesStore.payments = [{ id: 'PAY-1', amount: 500 }];
    localStorage.setItem('kromalab_payments', JSON.stringify(receivablesStore.payments));

    productionStore.state = { orders: [{ id: 'ORD-PROD-1' }], roll: { currentMeters: 2 } };
    localStorage.setItem('kromalab_production_orders', JSON.stringify(productionStore.state.orders));
    localStorage.setItem('kromalab_production_roll', JSON.stringify(productionStore.state.roll));

    clientsStore.clients = [{ id: 'CLI-1', name: 'Cliente Test' }];
    localStorage.setItem('kromalab_clients', JSON.stringify(clientsStore.clients));

    quotesStore.quotes = [{ id: 'QT-1', totalMeters: 3 }];
    localStorage.setItem('kromalab_quotes', JSON.stringify(quotesStore.quotes));

    usersStore.users = [{ id: 'USR-1', email: 'test@kromalab.gt' }];
    localStorage.setItem('kromalab_users', JSON.stringify(usersStore.users));

    cartStore.items = [{ id: 'CART-1', title: 'Stickers' }];
    localStorage.setItem('kromalab_cart', JSON.stringify(cartStore.items));

    localStorage.setItem('kromalab_costs_config', JSON.stringify({ filmCostM2: 50 }));
    localStorage.setItem('kromalab_user_session', JSON.stringify({ name: 'Admin' }));
    localStorage.setItem('kromalab_jwt_token', 'jwt-token-123');
    localStorage.setItem('kromalab_remember_me', 'true');
    localStorage.setItem('kromalab_theme', 'light');

    sessionStorage.setItem('kromalab_jwt_token', 'jwt-token-session');

    store.setUser({ id: 'USR-1', name: 'Admin', role: 'ADMIN' }, 'jwt-token-123');
    apiClient.setToken('jwt-token-123');

    // 2. Ejecutar limpieza completa preservando tema
    clearAllApplicationCache({ preserveTheme: true });

    // 3. Verificar estado en memoria de los almacenes
    expect(ordersStore.getOrders()).toEqual([]);
    expect(dispatchStore.getDispatchNotes()).toEqual([]);
    expect(inventoryStore.getItems()).toEqual([]);
    expect(inventoryStore.kardex).toEqual([]);
    expect(inventoryStore.deductedOrders.size).toBe(0);
    expect(receivablesStore.getPayments()).toEqual([]);
    expect(productionStore.getState().orders).toEqual([]);
    expect(clientsStore.getClients()).toEqual([]);
    expect(quotesStore.getQuotes()).toEqual([]);
    expect(usersStore.getUsers()).toEqual([]);
    expect(cartStore.getItems()).toEqual([]);

    // 4. Verificar borrado de localStorage y preservación del tema
    expect(localStorage.getItem('kromalab_orders')).toBeNull();
    expect(localStorage.getItem('kromalab_dispatch_notes')).toBeNull();
    expect(localStorage.getItem('kromalab_inventory')).toBeNull();
    expect(localStorage.getItem('kromalab_inventory_kardex')).toBeNull();
    expect(localStorage.getItem('kromalab_inventory_deducted_orders')).toBeNull();
    expect(localStorage.getItem('kromalab_payments')).toBeNull();
    expect(localStorage.getItem('kromalab_production_orders')).toBeNull();
    expect(localStorage.getItem('kromalab_production_roll')).toBeNull();
    expect(localStorage.getItem('kromalab_clients')).toBeNull();
    expect(localStorage.getItem('kromalab_quotes')).toBeNull();
    expect(localStorage.getItem('kromalab_users')).toBeNull();
    expect(localStorage.getItem('kromalab_cart')).toBeNull();
    expect(localStorage.getItem('kromalab_costs_config')).toBeNull();
    expect(localStorage.getItem('kromalab_user_session')).toBeNull();
    expect(localStorage.getItem('kromalab_jwt_token')).toBeNull();
    expect(localStorage.getItem('kromalab_remember_me')).toBeNull();
    expect(localStorage.getItem('kromalab_theme')).toBe('light');

    // 5. Verificar sessionStorage
    expect(sessionStorage.getItem('kromalab_jwt_token')).toBeNull();

    // 6. Verificar store y apiClient
    expect(store.state.user).toBeNull();
    expect(store.state.token).toBeNull();
    expect(apiClient.token).toBeNull();
  });

  it('permite limpiar todo incluyendo el tema visual cuando preserveTheme es false', () => {
    localStorage.setItem('kromalab_theme', 'dark');
    clearAllApplicationCache({ preserveTheme: false });
    expect(localStorage.getItem('kromalab_theme')).toBeNull();
  });

  it('notifica a los listeners registrados cuando se limpia el caché individual de cada store', () => {
    const ordersSpy = vi.fn();
    const dispatchSpy = vi.fn();
    const inventorySpy = vi.fn();
    const receivablesSpy = vi.fn();
    const productionSpy = vi.fn();
    const clientsSpy = vi.fn();
    const quotesSpy = vi.fn();
    const usersSpy = vi.fn();

    const unsubOrders = ordersStore.subscribe(ordersSpy);
    const unsubDispatch = dispatchStore.subscribe(dispatchSpy);
    const unsubInventory = inventoryStore.subscribe(inventorySpy);
    const unsubReceivables = receivablesStore.subscribe(receivablesSpy);
    const unsubProduction = productionStore.subscribe(productionSpy);
    const unsubClients = clientsStore.subscribe(clientsSpy);
    const unsubQuotes = quotesStore.subscribe(quotesSpy);
    const unsubUsers = usersStore.subscribe(usersSpy);

    ordersStore.clearCache();
    dispatchStore.clearCache();
    inventoryStore.clearCache();
    receivablesStore.clearCache();
    productionStore.clearCache();
    clientsStore.clearCache();
    quotesStore.clearCache();
    usersStore.clearCache();
    cartStore.clearCache();

    expect(ordersSpy).toHaveBeenCalledWith([]);
    expect(dispatchSpy).toHaveBeenCalledWith([]);
    expect(inventorySpy).toHaveBeenCalled();
    expect(receivablesSpy).toHaveBeenCalled();
    expect(productionSpy).toHaveBeenCalled();
    expect(clientsSpy).toHaveBeenCalledWith([]);
    expect(quotesSpy).toHaveBeenCalledWith([]);
    expect(usersSpy).toHaveBeenCalledWith([]);

    unsubOrders();
    unsubDispatch();
    unsubInventory();
    unsubReceivables();
    unsubProduction();
    unsubClients();
    unsubQuotes();
    unsubUsers();
  });

  it('handleLogout ejecuta la limpieza completa y redirecciona al inicio si el usuario estaba en ruta protegida', async () => {
    document.body.innerHTML = `
      <div id="userProfileModal"></div>
      <div id="profileFeedback"></div>
    `;

    window.router = {
      navigate: vi.fn(),
    };

    delete window.location;
    window.location = { pathname: '/orders' };

    ordersStore.orders = [{ id: 'ORD-999' }];
    localStorage.setItem('kromalab_orders', JSON.stringify(ordersStore.orders));

    const apiLogoutSpy = vi.fn().mockResolvedValue({ success: true });
    apiClient.auth = { logout: apiLogoutSpy };

    await handleLogout();

    expect(ordersStore.getOrders()).toEqual([]);
    expect(localStorage.getItem('kromalab_orders')).toBeNull();
    expect(window.router.navigate).toHaveBeenCalledWith('/');
    expect(apiLogoutSpy).toHaveBeenCalled();
  });

  it('handleLogout no redirige si el usuario está en la página de inicio o ruta pública', async () => {
    document.body.innerHTML = `
      <div id="userProfileModal"></div>
      <div id="profileFeedback"></div>
    `;

    window.router = {
      navigate: vi.fn(),
    };

    delete window.location;
    window.location = { pathname: '/' };

    apiClient.auth = { logout: vi.fn().mockResolvedValue({ success: true }) };

    await handleLogout();

    expect(window.router.navigate).not.toHaveBeenCalled();
  });

  it('maneja de forma segura errores o ausencia de window/router al cerrar sesión', async () => {
    document.body.innerHTML = `
      <div id="userProfileModal"></div>
      <div id="profileFeedback"></div>
    `;

    window.router = null;
    delete window.location;
    window.location = { pathname: '/account' };

    apiClient.auth = { logout: vi.fn().mockRejectedValue(new Error('Network error')) };

    await expect(handleLogout()).resolves.toBeUndefined();
  });

  it('maneja excepciones en storage sin interrumpir la limpieza', () => {
    const clearSpy = vi.spyOn(Storage.prototype, 'clear').mockImplementation(() => {
      throw new Error('Storage quota error');
    });

    expect(() => clearAllApplicationCache()).not.toThrow();
    clearSpy.mockRestore();
  });
});
