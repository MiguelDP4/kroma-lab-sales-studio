/**
 * Componente Reutilizable: Alerta visual cuando el servidor API no responde
 * Kroma Lab Sales Studio
 */
import { apiClient } from '../modules/api-client.js';

export function renderApiOfflineAlert(message = 'No se pudieron sincronizar los datos actualizados desde el backend.') {
  const url = apiClient?.baseUrl || 'http://localhost:4000/api';
  return `
    <div class="api-offline-inline-alert" role="alert" style="animation: fadeInOffline 0.2s ease-out;">
      <div class="api-offline-inline-content">
        <span style="font-size: 1.6rem; flex-shrink: 0;" aria-hidden="true">⚠️</span>
        <div>
          <strong style="color: #dc2626; font-size: 0.95rem; margin-bottom: 0.2rem; display: block;">
            El servidor API no responde
          </strong>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-primary); line-height: 1.4;">
            ${message} Asegúrate de que el backend esté ejecutándose en <code>${url}</code> (ejecuta <code>npm run dev</code> en la carpeta <code>backend</code>).
          </p>
        </div>
      </div>
      <button type="button" class="btn btn-secondary btn-sm" onclick="window.location.reload()" style="min-height: 42px; padding: 0.4rem 0.9rem; font-weight: 700; white-space: nowrap;">
        🔄 Reintentar
      </button>
    </div>
  `;
}
