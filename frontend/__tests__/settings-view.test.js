import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { settingsView } from '../src/js/views/settings-view.js';
import { apiClient } from '../src/js/modules/api-client.js';
import { BUSINESS_CONFIG } from '../src/shared/business-config.js';
import {
  currentShippingThresholds,
  loadDynamicShippingSettings,
  sendWhatsAppQuote,
} from '../src/js/app.js';

describe('Settings View & Dynamic Shipping Settings', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'app';
    document.body.appendChild(container);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  describe('Metadatos y Renderizado de Vista', () => {
    it('tiene ruta /settings y requiere rol ADMIN', () => {
      expect(settingsView.path).toBe('/settings');
      expect(settingsView.name).toBe('settings');
      expect(settingsView.allowedRoles).toEqual(['ADMIN']);
    });

    it('renderiza la interfaz completa de configuración con botones y contenedores', () => {
      const html = settingsView.render();
      expect(html).toContain('Configuración del Sistema');
      expect(html).toContain('Tabla de Parámetros (SystemSetting)');
      expect(html).toContain('btnSaveSettings');
      expect(html).toContain('btnRefreshSettings');
      expect(html).toContain('settingsListContainer');
      expect(html).toContain('settingsCountBadge');
    });
  });

  describe('Ciclo de Vida mount() y Gestión de Parámetros', () => {
    it('carga y renderiza la lista de configuraciones desde el API', async () => {
      const mockSettings = [
        { key: 'FREE_SHIPPING_THRESHOLD', value: '575', updatedAt: '2026-11-06T20:00:00Z' },
        { key: 'FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL', value: '1000', updatedAt: '2026-11-06T20:00:00Z' },
      ];

      vi.spyOn(apiClient.settings, 'getAll').mockResolvedValue({
        success: true,
        settings: mockSettings,
      });

      container.innerHTML = settingsView.render();
      const cleanup = settingsView.mount();

      // Permitir que resuelvan las promesas de carga
      await new Promise((r) => setTimeout(r, 10));

      const badge = document.getElementById('settingsCountBadge');
      expect(badge.textContent).toContain('2 Parámetros Activos');

      const inputCapital = document.getElementById('setting_input_FREE_SHIPPING_THRESHOLD');
      const inputInterior = document.getElementById('setting_input_FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL');

      expect(inputCapital).not.toBeNull();
      expect(inputCapital.value).toBe('575');
      expect(inputInterior).not.toBeNull();
      expect(inputInterior.value).toBe('1000');

      if (typeof cleanup === 'function') cleanup();
    });

    it('muestra mensaje amigable cuando no hay parámetros en la BD', async () => {
      vi.spyOn(apiClient.settings, 'getAll').mockResolvedValue({
        success: true,
        settings: [],
      });

      container.innerHTML = settingsView.render();
      const cleanup = settingsView.mount();
      await new Promise((r) => setTimeout(r, 10));

      const listContainer = document.getElementById('settingsListContainer');
      expect(listContainer.textContent).toContain('No hay parámetros configurados actualmente');

      if (typeof cleanup === 'function') cleanup();
    });

    it('muestra alerta de error si la petición al API falla al cargar', async () => {
      vi.spyOn(apiClient.settings, 'getAll').mockRejectedValue(new Error('Fallo de red simulado'));

      container.innerHTML = settingsView.render();
      const cleanup = settingsView.mount();
      await new Promise((r) => setTimeout(r, 10));

      const listContainer = document.getElementById('settingsListContainer');
      expect(listContainer.textContent).toContain('Error al cargar parámetros');

      if (typeof cleanup === 'function') cleanup();
    });

    it('maneja respuesta sin success al obtener configuraciones', async () => {
      vi.spyOn(apiClient.settings, 'getAll').mockResolvedValue({
        success: false,
        message: 'No autorizado para ver configuraciones',
      });

      container.innerHTML = settingsView.render();
      const cleanup = settingsView.mount();
      await new Promise((r) => setTimeout(r, 10));

      const listContainer = document.getElementById('settingsListContainer');
      expect(listContainer.textContent).toContain('No autorizado para ver configuraciones');

      if (typeof cleanup === 'function') cleanup();
    });

    it('guarda exitosamente los parámetros modificados y actualiza memoria global', async () => {
      const mockSettings = [
        { key: 'FREE_SHIPPING_THRESHOLD', value: '575', updatedAt: '2026-11-06T20:00:00Z' },
        { key: 'FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL', value: '1000', updatedAt: '2026-11-06T20:00:00Z' },
      ];

      vi.spyOn(apiClient.settings, 'getAll').mockResolvedValue({
        success: true,
        settings: mockSettings,
      });

      const updateSpy = vi.spyOn(apiClient.settings, 'update').mockResolvedValue({
        success: true,
        settings: [
          { key: 'FREE_SHIPPING_THRESHOLD', value: '625', updatedAt: '2026-11-06T20:05:00Z' },
          { key: 'FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL', value: '1150', updatedAt: '2026-11-06T20:05:00Z' },
        ],
      });

      container.innerHTML = settingsView.render();
      const cleanup = settingsView.mount();
      await new Promise((r) => setTimeout(r, 10));

      const inputCapital = document.getElementById('setting_input_FREE_SHIPPING_THRESHOLD');
      inputCapital.value = '625';
      const inputInterior = document.getElementById('setting_input_FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL');
      inputInterior.value = '1150';

      const btnSave = document.getElementById('btnSaveSettings');
      btnSave.click();

      await new Promise((r) => setTimeout(r, 10));

      expect(updateSpy).toHaveBeenCalledWith([
        { key: 'FREE_SHIPPING_THRESHOLD', value: '625' },
        { key: 'FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL', value: '1150' },
      ]);

      const alertBox = document.getElementById('settingsAlert');
      expect(alertBox.style.display).toBe('block');
      expect(alertBox.textContent).toContain('guardadas y sincronizadas exitosamente');

      expect(BUSINESS_CONFIG.freeShippingThresholds.capital).toBe(625);
      expect(BUSINESS_CONFIG.freeShippingThresholds.interior).toBe(1150);

      if (typeof cleanup === 'function') cleanup();
    });

    it('rechaza y alerta si algún campo tiene valor vacío al intentar guardar', async () => {
      const mockSettings = [
        { key: 'FREE_SHIPPING_THRESHOLD', value: '575', updatedAt: '2026-11-06T20:00:00Z' },
      ];

      vi.spyOn(apiClient.settings, 'getAll').mockResolvedValue({
        success: true,
        settings: mockSettings,
      });

      const updateSpy = vi.spyOn(apiClient.settings, 'update');

      container.innerHTML = settingsView.render();
      const cleanup = settingsView.mount();
      await new Promise((r) => setTimeout(r, 10));

      const inputCapital = document.getElementById('setting_input_FREE_SHIPPING_THRESHOLD');
      inputCapital.value = '';

      const btnSave = document.getElementById('btnSaveSettings');
      btnSave.click();

      await new Promise((r) => setTimeout(r, 10));

      expect(updateSpy).not.toHaveBeenCalled();
      const alertBox = document.getElementById('settingsAlert');
      expect(alertBox.textContent).toContain('deben tener una clave y un valor válidos');

      if (typeof cleanup === 'function') cleanup();
    });

    it('muestra error si la llamada de actualización PUT falla en el servidor', async () => {
      vi.spyOn(apiClient.settings, 'getAll').mockResolvedValue({
        success: true,
        settings: [{ key: 'FREE_SHIPPING_THRESHOLD', value: '575' }],
      });

      vi.spyOn(apiClient.settings, 'update').mockRejectedValue(new Error('Error de validación 400'));

      container.innerHTML = settingsView.render();
      const cleanup = settingsView.mount();
      await new Promise((r) => setTimeout(r, 10));

      const btnSave = document.getElementById('btnSaveSettings');
      btnSave.click();

      await new Promise((r) => setTimeout(r, 10));

      const alertBox = document.getElementById('settingsAlert');
      expect(alertBox.textContent).toContain('Error de validación 400');

      if (typeof cleanup === 'function') cleanup();
    });

    it('muestra error si el servidor retorna success: false al actualizar', async () => {
      vi.spyOn(apiClient.settings, 'getAll').mockResolvedValue({
        success: true,
        settings: [{ key: 'FREE_SHIPPING_THRESHOLD', value: '575' }],
      });

      vi.spyOn(apiClient.settings, 'update').mockResolvedValue({
        success: false,
        message: 'No tiene permisos para modificar',
      });

      container.innerHTML = settingsView.render();
      const cleanup = settingsView.mount();
      await new Promise((r) => setTimeout(r, 10));

      const btnSave = document.getElementById('btnSaveSettings');
      btnSave.click();

      await new Promise((r) => setTimeout(r, 10));

      const alertBox = document.getElementById('settingsAlert');
      expect(alertBox.textContent).toContain('No tiene permisos para modificar');

      if (typeof cleanup === 'function') cleanup();
    });

    it('el botón de recargar vuelve a invocar getAll', async () => {
      vi.useFakeTimers();
      const getSpy = vi.spyOn(apiClient.settings, 'getAll').mockResolvedValue({
        success: true,
        settings: [{ key: 'FREE_SHIPPING_THRESHOLD', value: '575' }],
      });

      container.innerHTML = settingsView.render();
      const cleanup = settingsView.mount();
      await vi.advanceTimersByTimeAsync(10);

      expect(getSpy).toHaveBeenCalledTimes(1);

      const btnRefresh = document.getElementById('btnRefreshSettings');
      btnRefresh.click();
      await vi.advanceTimersByTimeAsync(10);

      expect(getSpy).toHaveBeenCalledTimes(2);

      // Avanzar timer del alertBox para cubrir el timeout
      vi.advanceTimersByTime(5500);

      if (typeof cleanup === 'function') cleanup();
      vi.useRealTimers();
    });

    it('renderiza parámetros personalizados no estándar con metadatos por defecto', async () => {
      vi.spyOn(apiClient.settings, 'getAll').mockResolvedValue({
        success: true,
        settings: [{ key: 'CUSTOM_TAX_RATE', value: '0.12', updatedAt: null }],
      });

      container.innerHTML = settingsView.render();
      const cleanup = settingsView.mount();
      await new Promise((r) => setTimeout(r, 10));

      const inputCustom = document.getElementById('setting_input_CUSTOM_TAX_RATE');
      expect(inputCustom).not.toBeNull();
      expect(inputCustom.value).toBe('0.12');

      const card = inputCustom.closest('.setting-item-card');
      expect(card.textContent).toContain('Sin registro');

      // Prueba de envío mediante evento submit del formulario
      const form = document.getElementById('settingsForm');
      const updateSpy = vi.spyOn(apiClient.settings, 'update').mockResolvedValue({
        success: true,
        settings: [{ key: 'CUSTOM_TAX_RATE', value: '0.12' }],
      });

      form.dispatchEvent(new Event('submit'));
      await new Promise((r) => setTimeout(r, 10));

      expect(updateSpy).toHaveBeenCalledWith([{ key: 'CUSTOM_TAX_RATE', value: '0.12' }]);

      if (typeof cleanup === 'function') cleanup();
    });
  });

  describe('Sincronización Dinámica con el Cotizador y WhatsApp', () => {
    it('loadDynamicShippingSettings actualiza los umbrales dinámicos', async () => {
      vi.spyOn(apiClient.settings, 'getShippingSettings').mockResolvedValue({
        success: true,
        shipping: {
          capital: 575,
          interior: 1000,
        },
      });

      const res = await loadDynamicShippingSettings();
      expect(res.capital).toBe(575);
      expect(res.interior).toBe(1000);
      expect(currentShippingThresholds.capital).toBe(575);
      expect(currentShippingThresholds.interior).toBe(1000);
    });

    it('loadDynamicShippingSettings maneja errores de red conservando valores de contingencia', async () => {
      vi.spyOn(apiClient.settings, 'getShippingSettings').mockRejectedValue(new Error('Network error'));
      const res = await loadDynamicShippingSettings();
      expect(res.capital).toBeDefined();
      expect(res.interior).toBeDefined();
    });

    it('ApiClient settings invoca los endpoints REST correctos', async () => {
      const reqSpy = vi.spyOn(apiClient, '_request').mockResolvedValue({ success: true });

      await apiClient.settings.getShippingSettings();
      expect(reqSpy).toHaveBeenCalledWith('/settings/shipping');

      await apiClient.settings.getAll();
      expect(reqSpy).toHaveBeenCalledWith('/settings');

      await apiClient.settings.update([{ key: 'A', value: 'B' }]);
      expect(reqSpy).toHaveBeenCalledWith('/settings', {
        method: 'PUT',
        body: JSON.stringify([{ key: 'A', value: 'B' }]),
      });
    });

    it('sendWhatsAppQuote genera el texto comercial con los umbrales configurados', () => {
      currentShippingThresholds.capital = 575;
      currentShippingThresholds.interior = 1000;

      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

      const dummyQuote = {
        widthCm: 5,
        heightCm: 5,
        qty: 100,
        stickersPerRow: 5,
        billableMeters: 1.2,
        tierRate: 150,
        totalPriceQ: 180,
        includeCutting: false,
      };

      sendWhatsAppQuote(dummyQuote);

      expect(openSpy).toHaveBeenCalled();
      const calledUrl = openSpy.mock.calls[0][0];
      const decodedText = decodeURIComponent(calledUrl);

      expect(decodedText).toContain('Envío gratis desde Q575 en Capital y Q1000 en Departamentos');
    });
  });
});
