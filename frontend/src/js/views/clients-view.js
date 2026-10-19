/**
 * Vista de Directorio B2B y Cartera de Clientes de Kroma Lab UV DTF.
 * Permite gestionar clientes recurrentes, segmentación (VIP, Recurrente, Nuevo),
 * datos fiscales (NIT SAT), expediente comercial 360° e historial de consumo.
 */

import { store } from '../store.js';
import { clientsStore, CLIENT_CATEGORIES, CLIENT_TIERS } from '../modules/clients-store.js';
import { ordersStore, PRODUCTION_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '../modules/orders-store.js';
import { BUSINESS_CONFIG } from '../../shared/business-config.js';

export const clientsView = {
  path: '/clientes',
  name: 'clients',
  allowedRoles: ['EMPLOYEE', 'ADMIN'],

  render: () => {
    return `
      <div style="padding: 2rem 0 4rem;">
        <!-- Cabecera de la Cartera B2B -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <span class="badge">Cartera B2B</span>
              <span id="clientTargetBadge" class="badge" style="background: rgba(28, 114, 147, 0.15); color: var(--cerulean); border-color: var(--cerulean);">
                🎯 Meta: 25 Clientes
              </span>
            </div>
            <h1 style="font-size: clamp(1.8rem, 3.5vw, 2.4rem); font-weight: 800; margin: 0.5rem 0 0.25rem;">
              Directorio de Clientes
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem;">
              Control comercial de clientes recurrentes, datos fiscales SAT y cuentas por cobrar.
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <button id="btnOpenNewClientModal" class="btn btn-primary" style="font-size: 0.88rem; padding: 0.55rem 1.1rem;">
              <span>+</span>
              <span>Registrar Cliente</span>
            </button>
          </div>
        </div>

        <!-- Métricas KPI de Cartera -->
        <div id="clientsMetricsContainer" class="orders-metrics-grid">
          <!-- Inyectado dinámicamente por renderClientsMetrics() -->
        </div>

        <!-- Barra de Búsqueda y Filtros -->
        <div class="orders-controls-bar">
          <div class="orders-filters-group">
            <input type="text" id="clientSearchInput" class="input-control orders-search-input" placeholder="Buscar por empresa, contacto, teléfono o NIT...">
            
            <select id="clientCategoryFilter" class="input-control" style="max-width: 210px;">
              <option value="ALL">Categoría: Todas</option>
              <option value="RESTAURANTES_CAFES">Cafeterías & Restaurantes</option>
              <option value="BARBERIAS_ESTETICA">Barberías & Cuidado</option>
              <option value="PROMOCIONALES_MERCH">Promocionales & Merch</option>
              <option value="CERVECERIAS_LICORES">Cervecerías & Bebidas</option>
              <option value="COMERCIO_GENERAL">Comercio & Retail</option>
            </select>

            <select id="clientTierFilter" class="input-control" style="max-width: 175px;">
              <option value="ALL">Nivel: Todos</option>
              <option value="VIP">⭐ VIP (Alto Volumen)</option>
              <option value="RECURRENTE">🔄 Recurrente</option>
              <option value="NUEVO">🌱 Nuevo</option>
              <option value="INACTIVO">⏸️ Inactivo</option>
            </select>
          </div>
        </div>

        <!-- Tabla Principal de Clientes -->
        <div class="calc-card" style="padding: 1.25rem; overflow-x: auto;">
          <table class="orders-table">
            <thead>
              <tr>
                <th>Empresa / Marca</th>
                <th>Contacto & WhatsApp</th>
                <th>NIT (SAT)</th>
                <th>Historial de Tiradas</th>
                <th>Consumo / Saldo</th>
                <th style="text-align: right;">Acciones</th>
              </tr>
            </thead>
            <tbody id="clientsTableBody">
              <!-- Inyectado dinámicamente por renderClientsTable() -->
            </tbody>
          </table>
          <div id="clientsEmptyState" class="kanban-empty-col" style="display: none; margin: 1.5rem 0;">
            No se encontraron clientes que coincidan con la búsqueda o filtros aplicados.
          </div>
        </div>
      </div>

      <!-- MODAL 1: REGISTRAR / EDITAR CLIENTE B2B -->
      <div id="clientFormModal" class="modal-backdrop" style="display: none;">
        <div class="modal-card" style="width: min(580px, 94vw);">
          <div class="modal-header">
            <div>
              <h2 id="clientFormTitle" style="font-size: 1.25rem; font-weight: 800;">+ Registrar Cliente B2B</h2>
              <p style="font-size: 0.85rem; color: var(--text-secondary);">Directorio comercial para tiradas recurrentes UV DTF</p>
            </div>
            <button type="button" class="btn-close-modal" id="btnCloseClientFormModal">✕</button>
          </div>

          <form id="formClient">
            <input type="hidden" id="clientFormId" value="">

            <div class="input-row">
              <div class="form-group">
                <label class="form-label" for="clientFormCompany">Empresa / Marca Comercial:</label>
                <input type="text" id="clientFormCompany" class="input-control" placeholder="Ej. Café San Cristóbal" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="clientFormName">Nombre del Contacto:</label>
                <input type="text" id="clientFormName" class="input-control" placeholder="Ej. Rodrigo Méndez" required>
              </div>
            </div>

            <div class="input-row">
              <div class="form-group">
                <label class="form-label" for="clientFormPhone">Teléfono WhatsApp:</label>
                <input type="tel" id="clientFormPhone" class="input-control" placeholder="+502 5555-1234" required>
              </div>
              <div class="form-group">
                <label class="form-label" for="clientFormNit">NIT (SAT):</label>
                <input type="text" id="clientFormNit" class="input-control" placeholder="Ej. 7845129-4 o CF" value="CF">
              </div>
            </div>

            <div class="input-row">
              <div class="form-group">
                <label class="form-label" for="clientFormCategory">Categoría de Negocio:</label>
                <select id="clientFormCategory" class="input-control">
                  <option value="RESTAURANTES_CAFES">Cafeterías & Restaurantes</option>
                  <option value="BARBERIAS_ESTETICA">Barberías & Cuidado Personal</option>
                  <option value="PROMOCIONALES_MERCH">Artículos Promocionales & Merch</option>
                  <option value="CERVECERIAS_LICORES">Cervecerías & Bebidas</option>
                  <option value="COMERCIO_GENERAL">Comercio & Marcas Generales</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="clientFormTier">Nivel / Segmento:</label>
                <select id="clientFormTier" class="input-control">
                  <option value="NUEVO">🌱 Nuevo (Prospecto)</option>
                  <option value="RECURRENTE">🔄 Recurrente (2+ compras/mes)</option>
                  <option value="VIP">⭐ VIP (Alto Volumen / Maquila)</option>
                  <option value="INACTIVO">⏸️ Inactivo</option>
                </select>
              </div>
            </div>

            <div class="input-row">
              <div class="form-group">
                <label class="form-label" for="clientFormEmail">Correo Electrónico:</label>
                <input type="email" id="clientFormEmail" class="input-control" placeholder="contacto@empresa.com">
              </div>
              <div class="form-group">
                <label class="form-label" for="clientFormAddress">Dirección de Entrega:</label>
                <input type="text" id="clientFormAddress" class="input-control" placeholder="Zona, municipio...">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="clientFormNotes">Preferencias de Impresión y Notas de Taller:</label>
              <textarea id="clientFormNotes" class="input-control" rows="2" placeholder="Ej. Prefiere acabado 3D, entrega por las tardes, corte individual..."></textarea>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
              <button type="button" class="btn btn-secondary" id="btnCancelClientFormModal">Cancelar</button>
              <button type="submit" class="btn btn-primary" id="btnSaveClient">Guardar Cliente</button>
            </div>
          </form>
        </div>
      </div>

      <!-- MODAL 2: EXPEDIENTE 360° DEL CLIENTE -->
      <div id="clientDossierModal" class="modal-backdrop" style="display: none;">
        <div class="modal-card" style="width: min(720px, 95vw); max-height: 90vh;">
          <div class="modal-header">
            <div>
              <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.35rem;">
                <span id="dossierTierBadge" class="badge">Nivel</span>
                <span id="dossierCategoryBadge" class="badge">Categoría</span>
              </div>
              <h2 id="dossierCompany" style="font-size: 1.35rem; font-weight: 800; margin: 0;">Empresa</h2>
              <div id="dossierContact" style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 0.2rem;">Contacto</div>
            </div>
            <button type="button" class="btn-close-modal" id="btnCloseDossierModal">✕</button>
          </div>

          <div id="dossierContent" style="font-size: 0.92rem; line-height: 1.6; overflow-y: auto; max-height: calc(90vh - 180px); padding-right: 0.5rem;">
            <!-- Contenido dinámico del expediente -->
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <div id="dossierWhatsAppAction">
              <!-- Enlace dinámico a WhatsApp -->
            </div>
            <button type="button" class="btn btn-primary" id="btnOkDossierModal">Cerrar Expediente</button>
          </div>
        </div>
      </div>
    `;
  },

  onMount: () => {
    const metricsContainer = document.getElementById('clientsMetricsContainer');
    const tableBody = document.getElementById('clientsTableBody');
    const emptyState = document.getElementById('clientsEmptyState');
    const searchInput = document.getElementById('clientSearchInput');
    const categoryFilter = document.getElementById('clientCategoryFilter');
    const tierFilter = document.getElementById('clientTierFilter');

    // Modales
    const formModal = document.getElementById('clientFormModal');
    const btnOpenNewClient = document.getElementById('btnOpenNewClientModal');
    const btnCloseFormModal = document.getElementById('btnCloseClientFormModal');
    const btnCancelFormModal = document.getElementById('btnCancelClientFormModal');
    const formClient = document.getElementById('formClient');
    const formTitle = document.getElementById('clientFormTitle');

    const dossierModal = document.getElementById('clientDossierModal');
    const btnCloseDossier = document.getElementById('btnCloseDossierModal');
    const btnOkDossier = document.getElementById('btnOkDossierModal');

    function toggleModal(modal, show) {
      if (modal) modal.style.display = show ? 'block' : 'none';
    }

    // Handlers de modales
    if (btnOpenNewClient) {
      btnOpenNewClient.addEventListener('click', () => {
        if (formTitle) formTitle.textContent = '+ Registrar Cliente B2B';
        if (formClient) formClient.reset();
        const idInput = document.getElementById('clientFormId');
        if (idInput) idInput.value = '';
        const nitInput = document.getElementById('clientFormNit');
        if (nitInput) nitInput.value = 'CF';
        toggleModal(formModal, true);
      });
    }

    if (btnCloseFormModal) btnCloseFormModal.addEventListener('click', () => toggleModal(formModal, false));
    if (btnCancelFormModal) btnCancelFormModal.addEventListener('click', () => toggleModal(formModal, false));

    if (btnCloseDossier) btnCloseDossier.addEventListener('click', () => toggleModal(dossierModal, false));
    if (btnOkDossier) btnOkDossier.addEventListener('click', () => toggleModal(dossierModal, false));

    // Guardar / Editar Cliente
    if (formClient) {
      formClient.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('clientFormId')?.value;
        const company = document.getElementById('clientFormCompany')?.value || '';
        const name = document.getElementById('clientFormName')?.value || '';
        const phone = document.getElementById('clientFormPhone')?.value || '+502 5555-0000';
        const nit = document.getElementById('clientFormNit')?.value || 'CF';
        const email = document.getElementById('clientFormEmail')?.value || '';
        const address = document.getElementById('clientFormAddress')?.value || '';
        const category = document.getElementById('clientFormCategory')?.value || 'COMERCIO_GENERAL';
        const tier = document.getElementById('clientFormTier')?.value || 'NUEVO';
        const notes = document.getElementById('clientFormNotes')?.value || '';

        if (id) {
          clientsStore.updateClient(id, {
            company,
            name,
            phone,
            nit,
            email,
            address,
            category,
            tier,
            notes,
          });
        } else {
          clientsStore.createClient({
            company,
            name,
            phone,
            nit,
            email,
            address,
            category,
            tier,
            notes,
          });
        }

        formClient.reset();
        toggleModal(formModal, false);
      });
    }

    // Render de KPIs
    function renderClientsMetrics() {
      if (!metricsContainer) return;
      const metrics = clientsStore.getPortfolioMetrics();

      metricsContainer.innerHTML = `
        <div class="orders-metric-card" style="border-top: 4px solid var(--cerulean);">
          <span class="orders-metric-title">Cartera B2B Activa</span>
          <span class="orders-metric-value">${metrics.activeClientsCount} <span style="font-size: 0.85rem; font-weight: normal; color: var(--text-muted);">/ ${metrics.targetClients} meta</span></span>
        </div>
        <div class="orders-metric-card" style="border-top: 4px solid var(--color-warning);">
          <span class="orders-metric-title">Clientes VIP / Recurrentes</span>
          <span class="orders-metric-value" style="color: #f59e0b;">${metrics.vipCount + metrics.recurrentCount}</span>
        </div>
        <div class="orders-metric-card" style="border-top: 4px solid var(--baltic-blue);">
          <span class="orders-metric-title">Metraje Cartera Total</span>
          <span class="orders-metric-value" style="color: var(--cerulean);">${metrics.totalPortfolioMeters.toFixed(2)} m</span>
        </div>
        <div class="orders-metric-card" style="border-top: 4px solid ${metrics.totalPendingDebtQ > 0 ? 'var(--color-danger)' : 'var(--color-success)'};">
          <span class="orders-metric-title">Cuentas por Cobrar</span>
          <span class="orders-metric-value" style="color: ${metrics.totalPendingDebtQ > 0 ? '#ef4444' : 'var(--color-success)'};">
            Q${metrics.totalPendingDebtQ.toFixed(2)}
          </span>
        </div>
      `;
    }

    // Render de Tabla
    function renderClientsTable() {
      if (!tableBody) return;
      const allClients = clientsStore.getClients();
      const q = (searchInput?.value || '').toLowerCase().trim();
      const catFilter = categoryFilter?.value || 'ALL';
      const tierFilterVal = tierFilter?.value || 'ALL';

      const filtered = allClients.filter(c => {
        const matchesQuery = !q ||
          c.company.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.nit.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q);

        const matchesCat = catFilter === 'ALL' || c.category === catFilter;
        const matchesTier = tierFilterVal === 'ALL' || c.tier === tierFilterVal;

        return matchesQuery && matchesCat && matchesTier;
      });

      if (filtered.length === 0) {
        tableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      tableBody.innerHTML = filtered.map(client => {
        const catInfo = CLIENT_CATEGORIES[client.category];
        const tierInfo = CLIENT_TIERS[client.tier];
        const clientMetrics = clientsStore.getClientMetrics(client);

        return `
          <tr data-client-row="${client.id}">
            <td>
              <div style="font-weight: 800; font-size: 1rem; color: var(--text-primary); margin-bottom: 0.2rem;">
                ${client.company}
              </div>
              <div style="display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center;">
                <span class="badge" style="background: ${tierInfo.bg}; color: ${tierInfo.color}; border-color: ${tierInfo.color}; font-size: 0.72rem; padding: 0.15rem 0.45rem;">
                  ${tierInfo.badge}
                </span>
                <span style="font-size: 0.78rem; color: var(--text-secondary);">
                  ${catInfo.icon} ${catInfo.label}
                </span>
              </div>
            </td>

            <td>
              <div style="font-weight: 600; color: var(--text-primary);">${client.name}</div>
              <div style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.1rem;">
                ${client.phone}
              </div>
            </td>

            <td>
              <div style="font-family: var(--font-mono); font-weight: 700; color: var(--text-primary);">
                ${client.nit}
              </div>
              <div style="font-size: 0.78rem; color: var(--text-muted); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${client.address}">
                ${client.address}
              </div>
            </td>

            <td>
              <div style="font-family: var(--font-mono); font-weight: 700; color: var(--cerulean);">
                ${clientMetrics.totalMetersPurchased.toFixed(2)} m
              </div>
              <div style="font-size: 0.78rem; color: var(--text-secondary);">
                ${clientMetrics.ordersCount} ${clientMetrics.ordersCount === 1 ? 'pedido' : 'pedidos'}
              </div>
            </td>

            <td>
              <div style="font-weight: 700; font-family: var(--font-mono); color: var(--text-primary);">
                Q${clientMetrics.totalSpentQ.toFixed(2)}
              </div>
              ${clientMetrics.pendingDebtQ > 0 ? `
                <div style="font-size: 0.78rem; font-weight: 700; color: #ef4444; font-family: var(--font-mono);">
                  Saldo: Q${clientMetrics.pendingDebtQ.toFixed(2)}
                </div>
              ` : `
                <div style="font-size: 0.75rem; color: var(--color-success); font-weight: 600;">
                  ✓ Al día
                </div>
              `}
            </td>

            <td style="text-align: right; white-space: nowrap;">
              <button class="btn-action-icon btn-view-dossier" data-client-id="${client.id}" title="Ver Expediente">
                <span>📁</span>
              </button>
              <button class="btn-action-icon btn-edit-client" data-client-id="${client.id}" title="Editar Cliente">
                <span>✏️</span>
              </button>
              <a href="https://api.whatsapp.com/send?phone=${client.phone.replace(/\D/g, '')}&text=${encodeURIComponent(`Hola ${client.name}, le saludamos de Kroma Lab UV DTF. ¿En qué podemos apoyarle hoy para ${client.company}?`)}" target="_blank" rel="noopener noreferrer" class="btn-action-icon" title="Chat WhatsApp">
                <span>💬</span>
              </a>
              <button class="btn-action-icon btn-delete-client" data-client-id="${client.id}" title="Eliminar Cliente" style="color: var(--color-danger);">
                <span>🗑️</span>
              </button>
            </td>
          </tr>
        `;
      }).join('');

      attachTableEvents();
    }

    function openEditClientModal(clientId) {
      const client = clientsStore.getClientById(clientId);
      if (!client) return;

      if (formTitle) formTitle.textContent = `Editar: ${client.company}`;
      const idInput = document.getElementById('clientFormId');
      if (idInput) idInput.value = client.id;

      const compInput = document.getElementById('clientFormCompany');
      if (compInput) compInput.value = client.company;

      const nameInput = document.getElementById('clientFormName');
      if (nameInput) nameInput.value = client.name;

      const phoneInput = document.getElementById('clientFormPhone');
      if (phoneInput) phoneInput.value = client.phone;

      const nitInput = document.getElementById('clientFormNit');
      if (nitInput) nitInput.value = client.nit;

      const catInput = document.getElementById('clientFormCategory');
      if (catInput) catInput.value = client.category;

      const tierInput = document.getElementById('clientFormTier');
      if (tierInput) tierInput.value = client.tier;

      const emailInput = document.getElementById('clientFormEmail');
      if (emailInput) emailInput.value = client.email || '';

      const addrInput = document.getElementById('clientFormAddress');
      if (addrInput) addrInput.value = client.address || '';

      const notesInput = document.getElementById('clientFormNotes');
      if (notesInput) notesInput.value = client.notes || '';

      toggleModal(formModal, true);
    }

    function showClientDossier(clientId) {
      const client = clientsStore.getClientById(clientId);
      if (!client) return;

      const tierInfo = CLIENT_TIERS[client.tier];
      const catInfo = CLIENT_CATEGORIES[client.category];
      const metrics = clientsStore.getClientMetrics(client);
      const orders = clientsStore.getClientOrders(client);

      const tierBadge = document.getElementById('dossierTierBadge');
      if (tierBadge) {
        tierBadge.textContent = tierInfo.badge;
        tierBadge.style.background = tierInfo.bg;
        tierBadge.style.color = tierInfo.color;
        tierBadge.style.borderColor = tierInfo.color;
      }

      const catBadge = document.getElementById('dossierCategoryBadge');
      if (catBadge) {
        catBadge.textContent = `${catInfo.icon} ${catInfo.label}`;
      }

      const compEl = document.getElementById('dossierCompany');
      if (compEl) compEl.textContent = client.company;

      const contactEl = document.getElementById('dossierContact');
      if (contactEl) contactEl.textContent = `Contacto: ${client.name} • ${client.phone}`;

      const contentEl = document.getElementById('dossierContent');
      if (contentEl) {
        contentEl.innerHTML = `
          <!-- Tarjetas Métricas del Cliente -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem;">
            <div style="background: var(--bg-surface-elevated); padding: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Metraje Total:</span>
              <div style="font-size: 1.35rem; font-weight: 800; font-family: var(--font-mono); color: var(--cerulean);">
                ${metrics.totalMetersPurchased.toFixed(2)} m
              </div>
            </div>

            <div style="background: var(--bg-surface-elevated); padding: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Total Facturado:</span>
              <div style="font-size: 1.35rem; font-weight: 800; font-family: var(--font-mono); color: var(--color-success);">
                Q${metrics.totalSpentQ.toFixed(2)}
              </div>
            </div>

            <div style="background: var(--bg-surface-elevated); padding: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); text-align: center;">
              <span style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Saldo Pendiente:</span>
              <div style="font-size: 1.35rem; font-weight: 800; font-family: var(--font-mono); color: ${metrics.pendingDebtQ > 0 ? '#ef4444' : 'var(--text-muted)'};">
                Q${metrics.pendingDebtQ.toFixed(2)}
              </div>
            </div>
          </div>

          <!-- Ficha de Datos SAT y Contacto -->
          <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 1.25rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
            <div>
              <span style="color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase;">Facturación SAT:</span>
              <div style="font-weight: 700; font-family: var(--font-mono);">NIT: ${client.nit}</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">${client.email || 'Sin correo registrado'}</div>
            </div>
            <div>
              <span style="color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase;">Ubicación / Despacho:</span>
              <div style="font-weight: 600;">${client.address}</div>
              <div style="font-size: 0.82rem; color: var(--text-secondary);">WhatsApp: ${client.phone}</div>
            </div>
          </div>

          ${client.notes ? `
            <div style="margin-bottom: 1.25rem; padding: 0.75rem 1rem; background: rgba(28, 114, 147, 0.1); border-left: 3px solid var(--cerulean); border-radius: 4px; font-size: 0.88rem;">
              <strong>Instrucciones y Preferencias:</strong> ${client.notes}
            </div>
          ` : ''}

          <!-- Historial de Pedidos -->
          <div>
            <h4 style="font-size: 1rem; font-weight: 800; margin-bottom: 0.6rem; color: var(--text-primary); display: flex; justify-content: space-between; align-items: center;">
              <span>Historial de Pedidos en Taller:</span>
              <span style="font-size: 0.82rem; font-weight: normal; color: var(--text-muted);">${orders.length} ${orders.length === 1 ? 'registro' : 'registros'}</span>
            </h4>

            ${orders.length > 0 ? `
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${orders.map(o => {
                  const prodStyle = PRODUCTION_STATUS_LABELS[o.productionStatus];
                  const payStyle = PAYMENT_STATUS_LABELS[o.paymentStatus];

                  return `
                    <div style="background: var(--bg-surface-elevated); padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                      <div>
                        <div style="font-weight: 800; font-family: var(--font-mono); font-size: 0.95rem;">
                          #${o.id}
                          <span style="font-weight: normal; font-size: 0.8rem; color: var(--text-muted); margin-left: 0.5rem;">
                            ${new Date(o.createdAt).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div style="font-size: 0.82rem; color: var(--text-secondary);">
                          ${o.items[0].title} • ${o.metrics.totalBillableMeters.toFixed(2)} metros
                        </div>
                      </div>

                      <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span class="badge" style="background: ${prodStyle.bg}; color: ${prodStyle.color}; border-color: ${prodStyle.color}; font-size: 0.75rem;">
                          ${prodStyle.label}
                        </span>
                        <span class="badge" style="background: ${payStyle.bg}; color: ${payStyle.color}; border-color: ${payStyle.color}; font-size: 0.75rem;">
                          ${payStyle.label}
                        </span>
                        <div style="font-weight: 800; font-family: var(--font-mono); font-size: 0.95rem;">
                          Q${o.metrics.grandTotalQ.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div class="kanban-empty-col" style="padding: 1.5rem 1rem;">
                Este cliente no tiene pedidos registrados en el taller aún.
              </div>
            `}
          </div>
        `;
      }

      const waAction = document.getElementById('dossierWhatsAppAction');
      if (waAction) {
        waAction.innerHTML = `
          <a href="https://api.whatsapp.com/send?phone=${client.phone.replace(/\D/g, '')}&text=${encodeURIComponent(`Hola ${client.name}, le saludamos de Kroma Lab UV DTF para dar seguimiento a los pedidos de ${client.company}.`)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="font-size: 0.85rem; padding: 0.5rem 0.9rem;">
            <span>💬</span>
            <span>Escribir por WhatsApp</span>
          </a>
        `;
      }

      toggleModal(dossierModal, true);
    }

    function attachTableEvents() {
      // Ver expediente
      document.querySelectorAll('.btn-view-dossier').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.clientId;
          showClientDossier(id);
        });
      });

      // Editar cliente
      document.querySelectorAll('.btn-edit-client').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.clientId;
          openEditClientModal(id);
        });
      });

      // Eliminar cliente
      document.querySelectorAll('.btn-delete-client').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.clientId;
          const client = clientsStore.getClientById(id);
          if (!client) return;

          if (typeof window !== 'undefined' && window.confirm(`¿Deseas eliminar a "${client.company}" del directorio comercial?`)) {
            clientsStore.deleteClient(id);
          }
        });
      });
    }

    // Filtros interactivos
    if (searchInput) searchInput.addEventListener('input', renderClientsTable);
    if (categoryFilter) categoryFilter.addEventListener('change', renderClientsTable);
    if (tierFilter) tierFilter.addEventListener('change', renderClientsTable);

    // Suscripción al almacén de clientes y pedidos
    const unsubClients = clientsStore.subscribe(() => {
      renderClientsMetrics();
      renderClientsTable();
    });

    const unsubOrders = ordersStore.subscribe(() => {
      renderClientsMetrics();
      renderClientsTable();
    });

    // Render inicial
    renderClientsMetrics();
    renderClientsTable();

    return () => {
      unsubClients();
      unsubOrders();
    };
  }
};
