import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initOfflineBanner } from '../src/js/app.js';
import { apiClient } from '../src/js/modules/api-client.js';
import { renderApiOfflineAlert } from '../src/js/components/api-offline-alert.js';

describe('Offline Banner & API Disconnection Feedback', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="backendOfflineBanner" class="backend-offline-banner" style="display: none;" role="alert">
        <div class="backend-offline-container">
          <span class="backend-offline-icon">⚠️</span>
          <div>
            <strong class="backend-offline-title">El servidor API no responde</strong>
            <p class="backend-offline-desc">
              No se pudo establecer conexión con el backend en <code id="backendOfflineUrl">http://localhost:4000/api</code>.
            </p>
          </div>
          <button type="button" id="btnRetryBackendConnect" class="btn-retry-backend">
            🔄 Reintentar conexión
          </button>
        </div>
      </div>
    `;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renderApiOfflineAlert genera la estructura HTML con mensaje personalizado y URL del backend', () => {
    const html = renderApiOfflineAlert('Error al cargar pedidos.');
    expect(html).toContain('El servidor API no responde');
    expect(html).toContain('Error al cargar pedidos.');
    expect(html).toContain(apiClient.baseUrl);
    expect(html).toContain('role="alert"');
  });

  it('initOfflineBanner muestra el banner cuando apiClient notifica isOnline: false', () => {
    initOfflineBanner();
    const banner = document.getElementById('backendOfflineBanner');

    apiClient._notifyConnectionStatus(false, 'Failed to fetch');
    expect(banner.style.display).toBe('block');
  });

  it('initOfflineBanner oculta el banner cuando apiClient notifica isOnline: true', () => {
    initOfflineBanner();
    const banner = document.getElementById('backendOfflineBanner');

    apiClient._notifyConnectionStatus(false, 'Network error');
    expect(banner.style.display).toBe('block');

    apiClient._notifyConnectionStatus(true);
    expect(banner.style.display).toBe('none');
  });

  it('btnRetryBackendConnect ejecuta checkHealth al pulsarlo', async () => {
    const checkSpy = vi.spyOn(apiClient, 'checkHealth').mockResolvedValue({ status: 'ok' });
    initOfflineBanner();

    const retryBtn = document.getElementById('btnRetryBackendConnect');
    expect(retryBtn).not.toBeNull();

    retryBtn.click();
    expect(checkSpy).toHaveBeenCalled();
  });
});
