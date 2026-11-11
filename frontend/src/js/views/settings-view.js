/**
 * Vista de Configuración del Sistema (SystemSettingsView) — Kroma Lab Sales Studio
 * Exclusivo para rol ADMINISTRADOR.
 * Permite gestionar la tabla de clave-valor de configuración global del sistema,
 * incluyendo la creación inline de nuevos parámetros (key, value, description)
 * y la edición de los umbrales de flete para envío gratis en Capital y Departamentos.
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

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function syncDynamicShippingThreshold(key, value) {
  if (key === 'FREE_SHIPPING_THRESHOLD') {
    BUSINESS_CONFIG.freeShippingThresholds.capital = Number(value) || 575;
  } else if (key === 'FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL') {
    BUSINESS_CONFIG.freeShippingThresholds.interior = Number(value) || 1000;
  }
}

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
          <button type="button" id="btnRefreshSettings" class="btn btn-secondary" style="min-height: 44px; display: inline-flex; align-items: center; gap: 0.5rem;" title="Recargar configuraciones de la base de datos">
            <span>🔄</span>
            <span>Recargar</span>
          </button>
          <button type="button" id="btnSaveSettings" class="btn btn-primary" style="min-height: 44px; display: inline-flex; align-items: center; gap: 0.5rem;">
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
        <div style="padding: 1.25rem; border-bottom: 1px solid var(--border-color); background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
            <span>📋</span>
            <span>Tabla de Parámetros (SystemSetting)</span>
          </h2>
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <span id="settingsCountBadge" class="badge" style="background: var(--baltic-blue); color: var(--powder-blue); border: none;">
              Cargando...
            </span>
            <button type="button" id="btnNewSetting" class="btn btn-primary" style="min-height: 44px; padding: 0.5rem 1rem; display: inline-flex; align-items: center; gap: 0.45rem; font-weight: 700;">
              <span>➕</span>
              <span>Nuevo</span>
            </button>
          </div>
        </div>

        <!-- Inline Form para Crear Nuevo Parámetro (estilo Arte Modelo) -->
        <div id="inlineNewSettingContainer" style="display: none; padding: 1.25rem; border-bottom: 1px solid var(--cerulean, #208ad8); background: rgba(32, 138, 216, 0.06);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; gap: 0.5rem; flex-wrap: wrap;">
            <h3 style="font-size: 1rem; font-weight: 700; margin: 0; color: var(--cerulean, #208ad8); display: flex; align-items: center; gap: 0.45rem;">
              <span>🆕</span>
              <span>Nuevo Parámetro de Configuración</span>
            </h3>
            <span style="font-size: 0.78rem; color: var(--text-secondary);">Se guardará inmediatamente en SystemSetting</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label for="newSettingKey" style="display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem;">
                Clave (Key) *
              </label>
              <input
                type="text"
                id="newSettingKey"
                class="input-control"
                placeholder="Ej. FREE_SHIPPING_THRESHOLD"
                autocomplete="off"
                style="min-height: 44px; width: 100%; font-family: monospace; font-size: 0.95rem; font-weight: 600;"
              />
            </div>

            <div>
              <label for="newSettingValue" style="display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem;">
                Valor (Value) *
              </label>
              <input
                type="text"
                id="newSettingValue"
                class="input-control"
                placeholder="Ej. 575"
                autocomplete="off"
                style="min-height: 44px; width: 100%; font-size: 0.95rem; font-weight: 600;"
              />
            </div>
          </div>

          <div style="margin-bottom: 1rem;">
            <label for="newSettingDescription" style="display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem;">
              Descripción (¿Para qué se usa este valor?)
            </label>
            <textarea
              id="newSettingDescription"
              rows="2"
              class="input-control"
              placeholder="Ej. Monto mínimo en Quetzales para envío gratis en Ciudad de Guatemala..."
              style="min-height: 44px; width: 100%; font-size: 0.9rem; resize: vertical; padding-top: 0.6rem;"
            ></textarea>
          </div>

          <div id="inlineNewSettingError" style="display: none; padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.88rem; font-weight: 500; background: rgba(225, 37, 38, 0.15); border: 1px solid #e12526; color: #ff6b6b;"></div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; flex-wrap: wrap;">
            <button type="button" id="btnCancelNewSetting" class="btn btn-secondary" style="min-height: 44px; min-width: 110px;">
              Cancelar
            </button>
            <button type="button" id="btnCreateNewSetting" class="btn btn-primary" style="min-height: 44px; min-width: 150px; display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem;">
              <span>💾</span>
              <span>Crear Parámetro</span>
            </button>
          </div>
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

  // Controles del Inline Form "Nuevo"
  const btnNewSetting = document.getElementById('btnNewSetting');
  const inlineContainer = document.getElementById('inlineNewSettingContainer');
  const inputNewKey = document.getElementById('newSettingKey');
  const inputNewValue = document.getElementById('newSettingValue');
  const inputNewDescription = document.getElementById('newSettingDescription');
  const inlineErrorBox = document.getElementById('inlineNewSettingError');
  const btnCancelNew = document.getElementById('btnCancelNewSetting');
  const btnCreateNew = document.getElementById('btnCreateNewSetting');

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

  function showInlineError(message) {
    if (!inlineErrorBox) return;
    if (!message) {
      inlineErrorBox.style.display = 'none';
      inlineErrorBox.textContent = '';
      return;
    }
    inlineErrorBox.textContent = message;
    inlineErrorBox.style.display = 'block';
  }

  function openInlineForm() {
    if (!inlineContainer) return;
    showInlineError('');
    inlineContainer.style.display = 'block';
    if (btnNewSetting) btnNewSetting.disabled = true;
    if (inputNewKey) {
      inputNewKey.value = '';
      inputNewKey.focus();
    }
    if (inputNewValue) inputNewValue.value = '';
    if (inputNewDescription) inputNewDescription.value = '';
  }

  function closeInlineForm() {
    if (!inlineContainer) return;
    inlineContainer.style.display = 'none';
    showInlineError('');
    if (btnNewSetting) btnNewSetting.disabled = false;
    if (inputNewKey) inputNewKey.value = '';
    if (inputNewValue) inputNewValue.value = '';
    if (inputNewDescription) inputNewDescription.value = '';
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
            Error al cargar parámetros: ${escapeHtml(err.message || 'Error de conexión')}.
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
          No hay parámetros configurados actualmente en la base de datos. Usa el botón <strong>«Nuevo»</strong> para agregar el primero.
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

      const displayDescription = item.description || meta.description || 'Parámetro configurable del sistema.';
      const updatedDate = item.updatedAt ? new Date(item.updatedAt).toLocaleString('es-GT', {
        dateStyle: 'short',
        timeStyle: 'short',
      }) : 'Sin registro';

      const safeKey = escapeHtml(item.key);
      const safeValue = escapeHtml(item.value);
      const safeDescValue = escapeHtml(item.description || '');

      return `
        <div class="setting-item-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 10px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <span class="setting-key-badge" style="font-family: monospace; font-size: 0.82rem; background: var(--space-indigo, #16182e); color: var(--cerulean, #208ad8); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid rgba(32,138,216,0.3); font-weight: 700;">
                ${safeKey}
              </span>
              <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0.4rem 0 0.2rem; color: var(--text-primary);">
                ${escapeHtml(meta.label)}
              </h3>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                ${escapeHtml(displayDescription)}
              </p>
            </div>
            <div style="font-size: 0.75rem; color: var(--text-muted, #8e9bb0); white-space: nowrap;">
              Última mod: ${escapeHtml(updatedDate)}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-top: 0.25rem;">
            <div>
              <label for="setting_input_${safeKey}" style="display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem;">
                Valor Actual ${meta.unit ? `(${meta.unit})` : ''}:
              </label>
              <div style="position: relative;">
                ${meta.unit ? `
                  <span style="position: absolute; left: 0.85rem; top: 50%; transform: translateY(-50%); font-weight: 700; color: var(--text-secondary); pointer-events: none;">
                    ${meta.unit}
                  </span>
                ` : ''}
                <input
                  type="${meta.type}"
                  id="setting_input_${safeKey}"
                  name="${safeKey}"
                  data-setting-key="${safeKey}"
                  class="input-control"
                  value="${safeValue}"
                  placeholder="${escapeHtml(meta.placeholder)}"
                  step="${meta.step}"
                  required
                  style="min-height: 44px; width: 100%; font-size: 1rem; font-weight: 600; ${meta.unit ? 'padding-left: 2.2rem;' : ''}"
                />
              </div>
            </div>

            <div>
              <label for="setting_desc_${safeKey}" style="display: block; font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.35rem;">
                Descripción de uso:
              </label>
              <input
                type="text"
                id="setting_desc_${safeKey}"
                name="${safeKey}_description"
                data-setting-description="${safeKey}"
                class="input-control"
                value="${safeDescValue}"
                placeholder="Describe para qué se utiliza este valor..."
                style="min-height: 44px; width: 100%; font-size: 0.9rem;"
              />
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  async function handleCreateNew(e) {
    if (e) e.preventDefault();
    showInlineError('');

    const key = inputNewKey ? inputNewKey.value.trim() : '';
    const value = inputNewValue ? inputNewValue.value.trim() : '';
    const description = inputNewDescription ? inputNewDescription.value.trim() : '';

    if (!key) {
      showInlineError('La clave (Key) es obligatoria.');
      if (inputNewKey) inputNewKey.focus();
      return;
    }

    if (!/^[A-Za-z0-9_.-]+$/.test(key)) {
      showInlineError('La clave solo puede contener letras, números, puntos y guiones (sin espacios).');
      if (inputNewKey) inputNewKey.focus();
      return;
    }

    if (!value) {
      showInlineError('El valor (Value) es obligatorio.');
      if (inputNewValue) inputNewValue.focus();
      return;
    }

    if (btnCreateNew) {
      btnCreateNew.disabled = true;
      btnCreateNew.textContent = 'Creando...';
    }

    try {
      const res = await apiClient.settings.create({
        key,
        value,
        description: description || null,
      });

      if (res && res.success && res.setting) {
        currentSettings = [...currentSettings.filter((s) => s.key !== res.setting.key), res.setting]
          .sort((a, b) => a.key.localeCompare(b.key));
        renderSettingsList(currentSettings);
        if (countBadge) {
          countBadge.textContent = `${currentSettings.length} Parámetros Activos`;
        }

        syncDynamicShippingThreshold(res.setting.key, res.setting.value);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('kroma-settings-updated', { detail: [res.setting] }));
        }

        closeInlineForm();
        showAlert(`Parámetro "${res.setting.key}" creado exitosamente.`, 'success');
      } else {
        throw new Error(res?.message || 'Error al crear el parámetro');
      }
    } catch (err) {
      showInlineError(err.message || 'Ocurrió un error al crear el parámetro.');
    } finally {
      if (btnCreateNew) {
        btnCreateNew.disabled = false;
        btnCreateNew.innerHTML = '<span>💾</span> <span>Crear Parámetro</span>';
      }
    }
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

      const escapedKey = typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(key) : key;
      const descInput = container.querySelector(`input[data-setting-description="${escapedKey}"]`);
      const description = descInput ? descInput.value.trim() : undefined;

      payload.push({
        key,
        value,
        ...(description !== undefined ? { description: description || null } : {}),
      });
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
          if (countBadge) {
            countBadge.textContent = `${currentSettings.length} Parámetros Activos`;
          }
        }

        // Actualizar constantes de contingencia en memoria
        for (const item of payload) {
          syncDynamicShippingThreshold(item.key, item.value);
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

  function handleInlineKeydown(e) {
    if (e.key === 'Enter' && e.target && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      handleCreateNew(e);
    } else if (e.key === 'Escape') {
      closeInlineForm();
    }
  }

  if (btnSave) btnSave.addEventListener('click', handleSave);
  if (form) form.addEventListener('submit', handleSave);
  if (btnRefresh) btnRefresh.addEventListener('click', loadSettings);
  if (btnNewSetting) btnNewSetting.addEventListener('click', openInlineForm);
  if (btnCancelNew) btnCancelNew.addEventListener('click', closeInlineForm);
  if (btnCreateNew) btnCreateNew.addEventListener('click', handleCreateNew);
  if (inlineContainer) inlineContainer.addEventListener('keydown', handleInlineKeydown);

  // Carga inicial
  loadSettings();

  // Cleanup al desmontar vista
  return () => {
    if (btnSave) btnSave.removeEventListener('click', handleSave);
    if (form) form.removeEventListener('submit', handleSave);
    if (btnRefresh) btnRefresh.removeEventListener('click', loadSettings);
    if (btnNewSetting) btnNewSetting.removeEventListener('click', openInlineForm);
    if (btnCancelNew) btnCancelNew.removeEventListener('click', closeInlineForm);
    if (btnCreateNew) btnCreateNew.removeEventListener('click', handleCreateNew);
    if (inlineContainer) inlineContainer.removeEventListener('keydown', handleInlineKeydown);
  };
}

export default settingsView;
