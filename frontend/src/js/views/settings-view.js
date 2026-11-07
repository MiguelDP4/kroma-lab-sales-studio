/**
 * Vista de Configuración del Sistema (SystemSettingsView) — Kroma Lab Sales Studio
 * Exclusivo para rol ADMINISTRADOR.
 * Permite gestionar la tabla de clave-valor de configuración global del sistema,
 * incluyendo los umbrales de flete para envío gratis en Capital y Departamentos.
 * Enfoque Mobile-First estricto, sin desbordamiento horizontal y táctil (44px min).
 */

import { apiClient } from '../modules/api-client.js';
import { BUSINESS_CONFIG } from '../../shared/business-config.js';

// Metadatos amigables para claves conocidas
const SETTING_METADATA = {
  FREE_SHIPPING_THRESHOLD: {
    label: 'Envío Gratis — Capital / Área Metropolitana',
    description: 'Monto mínimo en Quetzales para calificar a flete gratuito dentro de la Ciudad de Guatemala (~5 metros lineales).',
    type: 'number',
    step: '1',
    unit: 'Q',
    placeholder: '575',
  },
  FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL: {
    label: 'Envío Gratis — Departamentos / Interior',
    description: 'Monto mínimo en Quetzales para calificar a flete gratuito fuera de la capital (~10 metros lineales).',
    type: 'number',
    step: '1',
    unit: 'Q',
    placeholder: '1000',
  },
};

export const settingsView = {
  path: '/settings',
  name: 'settings',
  allowedRoles: ['ADMIN'],

  render: () => `
    <div style="padding: 2rem 0 4rem; max-width: 960px; margin: 0 auto;">
      <!-- Encabezado de la Vista -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span class="badge" style="color: var(--cerulean); border-color: var(--cerulean);">Administración Global</span>
          <h1 style="font-size: clamp(1.8rem, 4vw, 2.3rem); font-weight: 800; margin-top: 0.4rem; letter-spacing: -0.02em;">
            ⚙️ Configuración del Sistema
          </h1>
          <p style="color: var(--text-secondary); font-size: 0.95rem; margin-top: 0.3rem;">
            Control de parámetros globales, umbrales comerciales y políticas de flete en tiempo real.
          </p>
        </div>

        <div style="display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap;">
          <button id="btnRefreshSettings" class="btn btn-secondary" style="min-height: 44px; display: inline-flex; align-items: center; gap: 0.5rem;" title="Recargar configuraciones de la base de datos">
            <span>🔄</span>
            <span>Recargar</span>
          </button>
          <button id="btnSaveSettings" class="btn btn-primary" style="min-height: 44px; display: inline-flex; align-items: center; gap: 0.5rem;">
            <span>💾</span>
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      <!-- Alerta o Mensaje de Feedback -->
      <div id="settingsAlert" style="display: none; padding: 1rem 1.25rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.95rem; font-weight: 500;"></div>

      <!-- Tarjeta Informativa de Negocio -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; margin-bottom: 2rem; display: flex; gap: 1rem; align-items: flex-start;">
        <span style="font-size: 1.5rem; line-height: 1;">💡</span>
        <div style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.5;">
          <strong style="color: var(--text-primary);">Impacto Inmediato en Ventas:</strong> Los valores aquí configurados son leídos automáticamente por el <strong>Cotizador Público</strong>. Al actualizar los límites de flete gratuito, la barra de progreso de incentivo y el mensaje comercial pregenerado para WhatsApp se sincronizan al instante.
        </div>
      </div>

      <!-- Contenedor de la Tabla / Formulario de Configuraciones -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
        <div style="padding: 1.25rem; border-bottom: 1px solid var(--border-color); background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            <span>📋</span>
            <span>Tabla de Parámetros (SystemSetting)</span>
          </h2>
          <span id="settingsCountBadge" class="badge" style="background: var(--baltic-blue); color: var(--powder-blue); border: none;">
            Cargando...
          </span>
        </div>

        <form id="settingsForm" style="margin: 0;">
          <div id="settingsListContainer" style="padding: 1.25rem; display: flex; flex-direction: column; gap: 1.5rem;">
            <!-- Skeletons de Carga Inicial -->
            <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
              <span style="font-size: 1.8rem; display: block; margin-bottom: 0.5rem;">⏳</span>
              Cargando parámetros desde la base de datos...
            </div>
          </div>

          <div style="padding: 1.25rem; border-top: 1px solid var(--border-color); background: rgba(255,255,255,0.02); display: flex; justify-content: flex-end; gap: 1rem;">
            <button type="submit" id="btnBottomSaveSettings" class="btn btn-primary" style="min-height: 44px; min-width: 180px; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;">
              <span>💾</span>
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,

  onMount: () => {
    return initSettingsView();
  },
  mount: () => {
    return initSettingsView();
  },
};

function initSettingsView() {
  const container = document.getElementById('settingsListContainer');
    const countBadge = document.getElementById('settingsCountBadge');
    const alertBox = document.getElementById('settingsAlert');
    const btnSave = document.getElementById('btnSaveSettings');
    const form = document.getElementById('settingsForm');
    const btnRefresh = document.getElementById('btnRefreshSettings');

    let currentSettings = [];

    function showAlert(message, type = 'success') {
      if (!alertBox) return;
      alertBox.textContent = message;
      alertBox.style.display = 'block';

      if (type === 'success') {
        alertBox.style.background = 'rgba(26, 179, 124, 0.15)';
        alertBox.style.border = '1px solid #1ab37c';
        alertBox.style.color = '#3dd69b';
      } else {
        alertBox.style.background = 'rgba(225, 37, 38, 0.15)';
        alertBox.style.border = '1px solid #e12526';
        alertBox.style.color = '#ff6b6b';
      }

      setTimeout(() => {
        if (alertBox) alertBox.style.display = 'none';
      }, 5000);
    }

    async function loadSettings() {
      if (container) {
        container.innerHTML = `
          <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
            <span style="font-size: 1.8rem; display: block; margin-bottom: 0.5rem;">⏳</span>
            Cargando parámetros desde la base de datos...
          </div>
        `;
      }

      try {
        const res = await apiClient.settings.getAll();
        if (res && res.success && Array.isArray(res.settings)) {
          currentSettings = res.settings;
          renderSettingsList(currentSettings);
          if (countBadge) {
            countBadge.textContent = `${currentSettings.length} Parámetros Activos`;
          }
        } else {
          throw new Error(res?.message || 'Error al obtener configuraciones');
        }
      } catch (err) {
        if (container) {
          container.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: var(--color-danger, #ff6b6b);">
              <span style="font-size: 1.8rem; display: block; margin-bottom: 0.5rem;">⚠️</span>
              Error al cargar parámetros: ${err.message || 'Error de conexión'}.
            </div>
          `;
        }
        if (countBadge) countBadge.textContent = 'Error';
      }
    }

    function renderSettingsList(settings) {
      if (!container) return;

      if (!settings || settings.length === 0) {
        container.innerHTML = `
          <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
            No hay parámetros configurados actualmente en la base de datos.
          </div>
        `;
        return;
      }

      container.innerHTML = settings.map((item) => {
        const meta = SETTING_METADATA[item.key] || {
          label: item.key,
          description: 'Parámetro configurable del sistema.',
          type: 'text',
          step: 'any',
          unit: '',
          placeholder: '',
        };

        const updatedDate = item.updatedAt ? new Date(item.updatedAt).toLocaleString('es-GT', {
          dateStyle: 'short',
          timeStyle: 'short',
        }) : 'Sin registro';

        return `
          <div class="setting-item-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <span class="setting-key-badge" style="font-family: monospace; font-size: 0.82rem; background: var(--space-indigo, #16182e); color: var(--cerulean, #208ad8); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid rgba(32,138,216,0.3); font-weight: 700;">
                  ${item.key}
                </span>
                <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0.4rem 0 0.2rem; color: var(--text-primary);">
                  ${meta.label}
                </h3>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                  ${meta.description}
                </p>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted, #8e9bb0); white-space: nowrap;">
                Última mod: ${updatedDate}
              </div>
            </div>

            <div style="margin-top: 0.25rem;">
              <label for="setting_input_${item.key}" style="display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem;">
                Valor Actual ${meta.unit ? `(${meta.unit})` : ''}:
              </label>
              <div style="position: relative; max-width: 380px;">
                ${meta.unit ? `
                  <span style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); font-weight: 700; color: var(--text-secondary); pointer-events: none;">
                    ${meta.unit}
                  </span>
                ` : ''}
                <input
                  type="${meta.type}"
                  id="setting_input_${item.key}"
                  name="${item.key}"
                  data-setting-key="${item.key}"
                  class="input-control"
                  value="${item.value}"
                  placeholder="${meta.placeholder}"
                  step="${meta.step}"
                  required
                  style="min-height: 44px; width: 100%; font-size: 1rem; font-weight: 600; ${meta.unit ? 'padding-left: 2.2rem;' : ''}"
                />
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    async function handleSave(e) {
      if (e) e.preventDefault();

      const inputs = container ? container.querySelectorAll('input[data-setting-key]') : [];
      if (inputs.length === 0) return;

      const payload = [];
      for (const input of inputs) {
        const key = input.getAttribute('data-setting-key');
        const value = input.value.trim();
        if (!key || !value) {
          showAlert('Todos los parámetros deben tener una clave y un valor válidos.', 'error');
          return;
        }
        payload.push({ key, value });
      }

      if (btnSave) {
        btnSave.disabled = true;
        btnSave.textContent = 'Guardando...';
      }

      try {
        const res = await apiClient.settings.update(payload);
        if (res && res.success) {
          showAlert('Configuraciones guardadas y sincronizadas exitosamente.', 'success');
          if (Array.isArray(res.settings)) {
            currentSettings = res.settings;
            renderSettingsList(currentSettings);
          }

          // Actualizar constantes de contingencia en memoria
          for (const item of payload) {
            if (item.key === 'FREE_SHIPPING_THRESHOLD') {
              BUSINESS_CONFIG.freeShippingThresholds.capital = Number(item.value) || 575;
            } else if (item.key === 'FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL') {
              BUSINESS_CONFIG.freeShippingThresholds.interior = Number(item.value) || 1000;
            }
          }

          // Disparar evento personalizado en window para sincronizar el cotizador si está activo
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kroma-settings-updated', { detail: payload }));
          }
        } else {
          throw new Error(res?.message || 'Error al actualizar configuraciones');
        }
      } catch (err) {
        showAlert(err.message || 'Error al guardar configuraciones', 'error');
      } finally {
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.innerHTML = '<span>💾</span> <span>Guardar Cambios</span>';
        }
      }
    }

    if (btnSave) {
      btnSave.addEventListener('click', handleSave);
    }

    if (form) {
      form.addEventListener('submit', handleSave);
    }

    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        loadSettings();
      });
    }

    // Carga inicial
    loadSettings();

    // Cleanup al desmontar vista
    return () => {
      if (btnSave) btnSave.removeEventListener('click', handleSave);
      if (form) form.removeEventListener('submit', handleSave);
      if (btnRefresh) btnRefresh.removeEventListener('click', loadSettings);
    };
}

export default settingsView;
