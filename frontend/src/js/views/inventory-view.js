/**
 * Vista de Control de Inventario y Stock de Taller UV DTF (Kroma Lab).
 * Supervisa existencias de bobinas Film A/B, tintas UV y cuchillas en tiempo real,
 * registra entradas por compra, ajustes de merma física y exporta el Kardex a CSV.
 */

import {
  inventoryStore,
  INVENTORY_CATEGORIES,
  STOCK_STATUS,
  STOCK_STATUS_META,
  MOVEMENT_TYPES,
  PRODUCTION_SUPPLIES_CATALOG,
} from '../modules/inventory-store.js';
import { downloadCSV } from '../modules/reports-engine.js';
import { renderMetricsSkeleton, renderCardsSkeleton, renderTableSkeleton } from '../components/skeleton-loader.js';
import { apiClient } from '../modules/api-client.js';
import { renderApiOfflineAlert } from '../components/api-offline-alert.js';

export const inventoryView = {
  path: '/inventario',
  name: 'inventory',
  allowedRoles: ['EMPLOYEE', 'ADMIN'],

  render: () => {
    return `
      <div style="padding: 2rem 0 4rem; width: 100%; max-width: 100%; overflow-x: hidden;">
        <!-- Cabecera de la Vista -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1.25rem;">
          <div style="flex: 1 1 340px; min-width: 0;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
              <span class="badge">Operación & Bodega</span>
              <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: #10b981;">
                Audley UV DTF Insumos
              </span>
            </div>
            <h1 style="font-size: clamp(1.8rem, 3.5vw, 2.4rem); font-weight: 800; margin: 0.25rem 0;">
              Inventario de Insumos de Taller
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem; margin: 0;">
              Control de existencias de Film A/B, tintas UV y navajas, registro de compras y kardex de movimientos.
            </p>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; flex-shrink: 0;">
            <button id="btnOpenRestockModal" class="btn btn-primary" style="font-size: 0.88rem; padding: 0.6rem 1.1rem; min-height: 44px; display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap;">
              <span>➕</span>
              <span>Registrar Compra / Entrada</span>
            </button>
            <button id="btnExportKardexCSV" class="btn btn-secondary" style="font-size: 0.88rem; padding: 0.6rem 1rem; min-height: 44px; display: inline-flex; align-items: center; gap: 0.4rem; white-space: nowrap;">
              <span>📥</span>
              <span>Exportar Kardex CSV</span>
            </button>
          </div>
        </div>

        <!-- Toast de Notificación de Bodega (No afecta la posición ni el tamaño de los botones) -->
        <div id="inventoryToast" class="reports-notification" style="display: none; margin-bottom: 1.5rem;"></div>

        <!-- Tarjetas de Resumen KPI de Bodega -->
        <div id="inventorySummaryContainer" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          ${inventoryStore.isLoading ? renderMetricsSkeleton(4) : ''}
        </div>

        <!-- Filtros de Categoría de Insumos -->
        <div style="margin-bottom: 1.5rem; display: flex; gap: 0.5rem; overflow-x: auto; padding-bottom: 0.35rem; -webkit-overflow-scrolling: touch;">
          <button type="button" class="btn btn-primary btn-cat-filter" data-category="ALL" style="min-height: 44px; padding: 0.45rem 1rem; font-size: 0.85rem; border-radius: var(--radius-full); white-space: nowrap;">
            Todos los Insumos
          </button>
          <button type="button" class="btn btn-secondary btn-cat-filter" data-category="FILM" style="min-height: 44px; padding: 0.45rem 1rem; font-size: 0.85rem; border-radius: var(--radius-full); white-space: nowrap;">
            📜 Bobinas de Film
          </button>
          <button type="button" class="btn btn-secondary btn-cat-filter" data-category="INK" style="min-height: 44px; padding: 0.45rem 1rem; font-size: 0.85rem; border-radius: var(--radius-full); white-space: nowrap;">
            🎨 Tintas UV
          </button>
          <button type="button" class="btn btn-secondary btn-cat-filter" data-category="BLADE" style="min-height: 44px; padding: 0.45rem 1rem; font-size: 0.85rem; border-radius: var(--radius-full); white-space: nowrap;">
            ✂️ Navajas y Corte
          </button>
          <button type="button" class="btn btn-secondary btn-cat-filter" data-category="MAINTENANCE" style="min-height: 44px; padding: 0.45rem 1rem; font-size: 0.85rem; border-radius: var(--radius-full); white-space: nowrap;">
            🧼 Mantenimiento
          </button>
        </div>

        <!-- Alerta Offline si el API no responde -->
        <div id="inventoryOfflineAlertContainer">
        </div>

        <!-- Cuadrícula de Tarjetas de Insumos -->
        <div id="inventoryGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 3rem;">
          ${inventoryStore.isLoading ? renderCardsSkeleton(4) : ''}
        </div>

        <!-- SECCIÓN 2: HISTORIAL DE MOVIMIENTOS / KARDEX -->
        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: clamp(1.2rem, 3vw, 1.75rem);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 1rem;">
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <span>📋</span>
                <span>Kardex y Registro de Movimientos de Taller</span>
              </h2>
              <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0.25rem 0 0;">
                Trazabilidad de entradas por compra, deducciones automáticas por tiraje y ajustes físicos.
              </p>
            </div>

            <!-- Controles de Filtro de Kardex -->
            <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center;">
              <input type="text" id="kardexSearchInput" class="input-control" placeholder="Buscar por insumo, orden..." style="min-height: 44px; font-size: 0.85rem; min-width: 140px; flex: 1 1 180px;">
              <select id="kardexTypeFilter" class="input-control" style="min-height: 44px; font-size: 0.85rem; min-width: 140px; flex: 1 1 160px;">
                <option value="ALL">Todos los Movimientos</option>
                <option value="IN_PURCHASE">➕ Entradas por Compra</option>
                <option value="OUT_PRODUCTION">➖ Salidas por Tiraje</option>
                <option value="ADJUSTMENT">± Ajustes y Mermas</option>
              </select>
            </div>
          </div>

          <div class="mobile-scroll-hint">Desliza para ver columnas de stock y costos ↔</div>
          <div class="orders-table-container inventory-table-wrapper" style="width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <table class="orders-table" style="font-size: 0.85rem;">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Fecha</th>
                  <th>Insumo</th>
                  <th>Tipo</th>
                  <th>Cantidad</th>
                  <th>Nuevo Stock</th>
                  <th>Costo (Q)</th>
                  <th>Referencia</th>
                  <th>Observaciones</th>
                </tr>
              </thead>
              <tbody id="kardexTableBody">
                ${inventoryStore.isLoading ? renderTableSkeleton(5, 9) : ''}
              </tbody>
            </table>
          </div>
        </div>

        <!-- MODAL 1: REGISTRAR COMPRA / ENTRADA -->
        <div id="restockModal" class="modal-backdrop" style="display: none;" role="dialog" aria-modal="true">
          <div class="modal-card" style="width: min(560px, 94vw); max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
              <div>
                <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0;">➕ Registrar Entrada / Factura</h2>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0 0;">
                  Ingresa las existencias, datos de factura y configura las alertas de stock.
                </p>
              </div>
              <button type="button" class="btn-close-modal" id="btnCloseRestockModal" aria-label="Cerrar modal">✕</button>
            </div>

            <form id="formRestock">
              <div class="form-group">
                <label class="form-label" for="restockItemId" style="font-weight: 700;">Insumo a Ingresar:</label>
                <select id="restockItemId" class="input-control" style="min-height: 44px;" required>
                  <!-- Inyectado dinámicamente -->
                </select>
                <span id="restockUnitLabel" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; display: block;"></span>
              </div>

              <!-- Contenedor desplegable para crear un insumo nuevo personalizado -->
              <div id="restockCustomFields" style="display: none; background: rgba(59, 130, 246, 0.08); border: 1px dashed var(--cerulean); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem;">
                <div class="form-group">
                  <label class="form-label" for="restockCustomName" style="font-weight: 700;">Nombre del Nuevo Insumo:</label>
                  <input type="text" id="restockCustomName" class="input-control" placeholder="Ej: Film DTF UV Especial Dorado" style="min-height: 44px;">
                </div>
                <div class="input-row">
                  <div class="form-group">
                    <label class="form-label" for="restockCustomCategory" style="font-weight: 700;">Categoría:</label>
                    <select id="restockCustomCategory" class="input-control" style="min-height: 44px;">
                      <option value="FILM">📜 Bobinas de Film</option>
                      <option value="INK">🎨 Tintas UV</option>
                      <option value="BLADE">✂️ Navajas y Corte</option>
                      <option value="MAINTENANCE">🧼 Mantenimiento</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="restockCustomUnit" style="font-weight: 700;">Unidad de Medida:</label>
                    <select id="restockCustomUnit" class="input-control" style="min-height: 44px;">
                      <option value="m">Metros lineales (m)</option>
                      <option value="L">Litros (L)</option>
                      <option value="ml">Mililitros (ml)</option>
                      <option value="uds">Unidades (uds)</option>
                      <option value="kg">Kilogramos (kg)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="input-row">
                <div class="form-group">
                  <label class="form-label" for="restockQuantity" style="font-weight: 700;">Cantidad Comprada:</label>
                  <input type="number" id="restockQuantity" class="input-control" placeholder="Ej: 100" min="0.01" step="any" style="min-height: 44px;" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="restockCostQ" style="font-weight: 700;">Costo Total Factura (Q):</label>
                  <input type="number" id="restockCostQ" class="input-control" placeholder="Ej: 600.00" min="0" step="any" style="min-height: 44px;">
                </div>
              </div>

              <div class="input-row">
                <div class="form-group">
                  <label class="form-label" for="restockSupplier" style="font-weight: 700;">Proveedor:</label>
                  <input type="text" id="restockSupplier" class="input-control" placeholder="Ej: Audley Guatemala" style="min-height: 44px;">
                </div>
                <div class="form-group">
                  <label class="form-label" for="restockInvoice" style="font-weight: 700;">No. Factura / Recibo:</label>
                  <input type="text" id="restockInvoice" class="input-control" placeholder="Ej: FAC-8921" style="min-height: 44px;">
                </div>
              </div>

              <!-- SECCIÓN: ALERTAS DE STOCK CONFIGURABLES POR MIGUEL -->
              <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1rem;">
                <div style="font-weight: 800; font-size: 0.92rem; margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem;">
                  <span>🔔</span>
                  <span>Configuración de Alertas de Stock</span>
                </div>
                <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0 0 0.75rem; line-height: 1.4;">
                  Tú decides los límites: ingresa la cantidad exacta para encender la alerta crítica roja (🔴) y el nivel óptimo verde (🟢).
                </p>
                <div class="input-row">
                  <div class="form-group">
                    <label class="form-label" for="restockCriticalThreshold" style="font-weight: 700; color: #ef4444; font-size: 0.82rem;">
                      🔴 Cantidad Nivel Crítico:
                    </label>
                    <input type="number" id="restockCriticalThreshold" class="input-control" placeholder="Ej: 20" min="0" step="any" style="min-height: 44px;">
                    <span style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">Rojo cuando el stock sea ≤ este valor.</span>
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="restockOptimalThreshold" style="font-weight: 700; color: #10b981; font-size: 0.82rem;">
                      🟢 Cantidad Nivel Óptimo:
                    </label>
                    <input type="number" id="restockOptimalThreshold" class="input-control" placeholder="Ej: 50" min="0" step="any" style="min-height: 44px;">
                    <span style="font-size: 0.7rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">Verde si el stock es ≥ este valor (🟡 en el rango medio).</span>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="restockNotes" style="font-weight: 700;">Observaciones:</label>
                <textarea id="restockNotes" class="input-control" placeholder="Detalles de la compra, condición del empaque..." rows="2"></textarea>
              </div>

              <div class="modal-actions-footer" style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem;">
                <button type="button" class="btn btn-secondary" id="btnCancelRestockModal">Cancelar</button>
                <button type="submit" class="btn btn-primary">Registrar Ingreso</button>
              </div>
            </form>
          </div>
        </div>

        <!-- MODAL 2: AJUSTE FÍSICO / MERMA DE TALLER -->
        <div id="adjustStockModal" class="modal-backdrop" style="display: none;" role="dialog" aria-modal="true">
          <div class="modal-card" style="width: min(500px, 94vw);">
            <div class="modal-header">
              <div>
                <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0;">✏️ Ajuste Físico de Stock</h2>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0 0;">
                  Actualiza el stock real tras un conteo físico o reporte de merma técnica.
                </p>
              </div>
              <button type="button" class="btn-close-modal" id="btnCloseAdjustModal" aria-label="Cerrar modal">✕</button>
            </div>

            <form id="formAdjustStock">
              <input type="hidden" id="adjustItemId">
              
              <div style="background: var(--bg-surface); padding: 0.75rem 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; border: 1px solid var(--border-color);">
                <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Insumo Seleccionado:</span>
                <div id="adjustItemName" style="font-weight: 800; font-size: 1.05rem; color: var(--cerulean);"></div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.2rem;">
                  Stock actual en sistema: <strong id="adjustCurrentStock">0</strong>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="adjustNewStock" style="font-weight: 700;">Nuevo Stock Real Contado:</label>
                <input type="number" id="adjustNewStock" class="input-control" min="0" step="any" style="min-height: 44px;" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="adjustReason" style="font-weight: 700;">Motivo del Ajuste:</label>
                <select id="adjustReason" class="input-control" style="min-height: 44px;">
                  <option value="Conteo físico periódico">Conteo físico periódico</option>
                  <option value="Merma técnica / Atasco en cabezal">Merma técnica / Atasco en cabezal</option>
                  <option value="Purga y calibración de tracción">Purga y calibración de tracción</option>
                  <option value="Desgaste prematuro de cuchilla">Desgaste prematuro de cuchilla</option>
                  <option value="Corrección de ingreso erróneo">Corrección de ingreso erróneo</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="adjustNotes" style="font-weight: 700;">Notas Adicionales:</label>
                <textarea id="adjustNotes" class="input-control" placeholder="Explicación del ajuste..." rows="2"></textarea>
              </div>

              <div class="modal-actions-footer" style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem;">
                <button type="button" class="btn btn-secondary" id="btnCancelAdjustModal">Cancelar</button>
                <button type="submit" class="btn btn-primary">Guardar Ajuste</button>
              </div>
            </form>
          </div>
        </div>

        <!-- MODAL 3: CONFIGURACIÓN INDIVIDUAL DE ALERTAS DE STOCK -->
        <div id="configureAlertsModal" class="modal-backdrop" style="display: none;" role="dialog" aria-modal="true">
          <div class="modal-card" style="width: min(500px, 94vw);">
            <div class="modal-header">
              <div>
                <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0;">⚙️ Configurar Alertas de Stock</h2>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0 0;">
                  Define la cantidad que activa el estado crítico y el óptimo para este insumo.
                </p>
              </div>
              <button type="button" class="btn-close-modal" id="btnCloseAlertsModal" aria-label="Cerrar modal">✕</button>
            </div>

            <form id="formConfigureAlerts">
              <input type="hidden" id="alertItemId">

              <div style="background: var(--bg-surface); padding: 0.75rem 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; border: 1px solid var(--border-color);">
                <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Insumo Seleccionado:</span>
                <div id="alertItemNameDisplay" style="font-weight: 800; font-size: 1.05rem; color: var(--cerulean);"></div>
                <div id="alertCurrentStockDisplay" style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.2rem;"></div>
              </div>

              <div class="input-row">
                <div class="form-group">
                  <label class="form-label" for="alertCriticalInput" style="font-weight: 700; color: #ef4444;">🔴 Cantidad Nivel Crítico:</label>
                  <input type="number" id="alertCriticalInput" class="input-control" min="0" step="any" style="min-height: 44px;" required>
                  <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">Alerta roja si el stock es ≤ a esta cantidad.</span>
                </div>
                <div class="form-group">
                  <label class="form-label" for="alertOptimalInput" style="font-weight: 700; color: #10b981;">🟢 Cantidad Nivel Óptimo:</label>
                  <input type="number" id="alertOptimalInput" class="input-control" min="0" step="any" style="min-height: 44px;" required>
                  <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-top: 0.2rem;">Alerta verde si el stock es ≥ a esta cantidad.</span>
                </div>
              </div>

              <div class="input-row">
                <div class="form-group">
                  <label class="form-label" for="alertUnitCostInput" style="font-weight: 700;">Costo Ref. Unitario (Q):</label>
                  <input type="number" id="alertUnitCostInput" class="input-control" min="0" step="any" style="min-height: 44px;">
                </div>
                <div class="form-group">
                  <label class="form-label" for="alertSupplierInput" style="font-weight: 700;">Proveedor Preferido:</label>
                  <input type="text" id="alertSupplierInput" class="input-control" style="min-height: 44px;">
                </div>
              </div>

              <div class="modal-actions-footer" style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem;">
                <button type="button" class="btn btn-secondary" id="btnCancelAlertsModal">Cancelar</button>
                <button type="submit" class="btn btn-primary" id="btnSaveAlerts">Guardar Configuración</button>
              </div>
            </form>
          </div>
        </div>

        <!-- MODAL 4: CONFIRMACIÓN DE ELIMINACIÓN DE INSUMO (Modelo Consistente) -->
        <div id="deleteInventoryModal" class="modal-backdrop" style="display: none;" role="dialog" aria-modal="true">
          <div class="modal-card" style="width: min(440px, 94vw);">
            <div class="modal-header">
              <h2 style="font-size: 1.2rem; font-weight: 800; color: #ef4444; margin: 0;">Eliminar Insumo</h2>
              <button type="button" class="btn-close-modal" id="btnCloseDeleteInventoryModal" aria-label="Cerrar modal">✕</button>
            </div>

            <input type="hidden" id="deleteInventoryItemId" value="">

            <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.25rem;">
              ¿Estás seguro de que deseas eliminar permanentemente el insumo <strong id="deleteInventoryItemName" style="color: var(--text-primary);">-</strong> del inventario? Esta acción no se puede deshacer.
            </p>

            <div class="modal-actions-footer" style="display: flex; justify-content: flex-end; gap: 0.75rem;">
              <button type="button" class="btn btn-secondary" id="btnCancelDeleteInventoryModal" style="min-height: 44px;">Cancelar</button>
              <button type="button" class="btn btn-primary" id="btnConfirmDeleteInventory" style="background: #ef4444; border-color: #ef4444; min-height: 44px;">Eliminar Permanentemente</button>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  onMount: () => {
    inventoryStore.syncWithApi().catch(() => {});
    let activeCategory = 'ALL';

    // Elementos de Modales
    const restockModal = document.getElementById('restockModal');
    const adjustModal = document.getElementById('adjustStockModal');
    const alertsModal = document.getElementById('configureAlertsModal');
    const deleteModal = document.getElementById('deleteInventoryModal');

    const btnOpenRestock = document.getElementById('btnOpenRestockModal');
    const btnCloseRestock = document.getElementById('btnCloseRestockModal');
    const btnCancelRestock = document.getElementById('btnCancelRestockModal');
    const formRestock = document.getElementById('formRestock');
    const restockItemSelect = document.getElementById('restockItemId');
    const restockUnitLabel = document.getElementById('restockUnitLabel');
    const restockCustomFields = document.getElementById('restockCustomFields');

    const btnCloseAdjust = document.getElementById('btnCloseAdjustModal');
    const btnCancelAdjust = document.getElementById('btnCancelAdjustModal');
    const formAdjust = document.getElementById('formAdjustStock');

    const btnCloseAlerts = document.getElementById('btnCloseAlertsModal');
    const btnCancelAlerts = document.getElementById('btnCancelAlertsModal');
    const formAlerts = document.getElementById('formConfigureAlerts');

    const btnCloseDelete = document.getElementById('btnCloseDeleteInventoryModal');
    const btnCancelDelete = document.getElementById('btnCancelDeleteInventoryModal');
    const btnConfirmDelete = document.getElementById('btnConfirmDeleteInventory');
    const deleteInventoryItemId = document.getElementById('deleteInventoryItemId');
    const deleteInventoryItemName = document.getElementById('deleteInventoryItemName');

    const btnExportCSV = document.getElementById('btnExportKardexCSV');
    const kardexSearch = document.getElementById('kardexSearchInput');
    const kardexFilter = document.getElementById('kardexTypeFilter');

    function toggleModal(modal, show) {
      if (modal) modal.style.display = show ? 'block' : 'none';
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = show ? 'hidden' : '';
      }
    }

    // Poblar selector de insumos en modal de reabastecimiento (existentes + catálogo base + opción nuevo)
    function populateRestockSelect(selectedId = null) {
      if (!restockItemSelect) return;
      const catalog = PRODUCTION_SUPPLIES_CATALOG || [];
      const items = inventoryStore.getItems();
      const optionsMap = new Map();

      // Insumos ya dados de alta en el sistema
      items.forEach(it => {
        optionsMap.set(it.id, `<option value="${it.id}">📦 ${it.name} (${it.currentStock.toFixed(1)} ${it.unit} disponibles)</option>`);
      });

      // Insumos del catálogo estándar de taller
      catalog.forEach(c => {
        if (!optionsMap.has(c.id)) {
          optionsMap.set(c.id, `<option value="${c.id}">📋 ${c.name} (Catálogo oficial de taller)</option>`);
        }
      });

      const optionsHtml = [
        '<option value="" disabled>-- Selecciona un Insumo o Crea uno Nuevo --</option>',
        '<option value="__CUSTOM__">✨ + Crear Nuevo Insumo Personalizado...</option>',
        Array.from(optionsMap.values()).join(''),
      ].join('');

      restockItemSelect.innerHTML = optionsHtml;
      if (selectedId) {
        restockItemSelect.value = selectedId;
      } else if (items.length > 0) {
        restockItemSelect.value = items[0].id;
      } else {
        restockItemSelect.value = catalog[0]?.id || '__CUSTOM__';
      }
      updateRestockFields();
    }

    function updateRestockFields() {
      if (!restockItemSelect) return;
      const val = restockItemSelect.value;
      const isCustom = val === '__CUSTOM__';
      const critInput = document.getElementById('restockCriticalThreshold');
      const optInput = document.getElementById('restockOptimalThreshold');
      const supplierInput = document.getElementById('restockSupplier');
      const costInput = document.getElementById('restockCostQ');

      if (restockCustomFields) {
        restockCustomFields.style.display = isCustom ? 'block' : 'none';
      }

      if (isCustom) {
        if (restockUnitLabel) {
          restockUnitLabel.textContent = 'Unidad de medida definida en el formulario.';
        }
        if (critInput && critInput.value === '') critInput.value = 10;
        if (optInput && optInput.value === '') optInput.value = 25;
      } else {
        const it = inventoryStore.getItemById(val) || (PRODUCTION_SUPPLIES_CATALOG || []).find(c => c.id === val);
        if (it) {
          if (restockUnitLabel) {
            restockUnitLabel.textContent = `Unidad de medida: ${it.unit} (Presentación común: ${it.packageSize || 100} ${it.unit})`;
          }
          if (supplierInput && it.supplier && !supplierInput.value) {
            supplierInput.value = it.supplier;
          }
          if (critInput) {
            critInput.value = it.minStockThreshold !== undefined ? it.minStockThreshold : (it.minThreshold || 10);
          }
          if (optInput) {
            const crit = parseFloat(critInput.value) || 10;
            optInput.value = it.optimalThreshold !== undefined ? it.optimalThreshold : Math.round(crit * 1.5);
          }
        }
      }
    }

    if (restockItemSelect) restockItemSelect.addEventListener('change', updateRestockFields);

    if (btnOpenRestock) {
      btnOpenRestock.addEventListener('click', () => {
        populateRestockSelect();
        toggleModal(restockModal, true);
      });
    }
    if (btnCloseRestock) btnCloseRestock.addEventListener('click', () => toggleModal(restockModal, false));
    if (btnCancelRestock) btnCancelRestock.addEventListener('click', () => toggleModal(restockModal, false));

    // Envío del formulario de registro de compra/entrada
    if (formRestock) {
      formRestock.addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedValue = restockItemSelect?.value;
        const isCustom = selectedValue === '__CUSTOM__';

        const customName = document.getElementById('restockCustomName')?.value.trim();
        const customCategory = document.getElementById('restockCustomCategory')?.value;
        const customUnit = document.getElementById('restockCustomUnit')?.value;

        if (isCustom && !customName) {
          showInventoryToast('⚠️ Por favor ingresa el nombre del nuevo insumo.');
          return;
        }

        const qty = parseFloat(document.getElementById('restockQuantity')?.value) || 0;
        if (qty <= 0) {
          showInventoryToast('⚠️ La cantidad ingresada debe ser mayor a 0.');
          return;
        }

        const cost = parseFloat(document.getElementById('restockCostQ')?.value) || 0;
        const supplier = document.getElementById('restockSupplier')?.value.trim() || '';
        const invoice = document.getElementById('restockInvoice')?.value.trim() || '';
        const notes = document.getElementById('restockNotes')?.value.trim() || '';

        const critVal = document.getElementById('restockCriticalThreshold')?.value;
        const optVal = document.getElementById('restockOptimalThreshold')?.value;
        const minStockThreshold = critVal !== '' && !isNaN(parseFloat(critVal)) ? parseFloat(critVal) : undefined;
        const optimalThreshold = optVal !== '' && !isNaN(parseFloat(optVal)) ? parseFloat(optVal) : undefined;

        if (isCustom) {
          inventoryStore.createItem({
            name: customName,
            category: customCategory,
            unit: customUnit,
            currentStock: qty,
            minStockThreshold: minStockThreshold !== undefined ? minStockThreshold : 10,
            optimalThreshold: optimalThreshold !== undefined ? optimalThreshold : (minStockThreshold ? minStockThreshold * 2 : 25),
            unitCostQ: qty > 0 ? (cost / qty) : 0,
            supplier,
            invoiceNumber: invoice,
            notes,
          });
        } else {
          inventoryStore.recordRestock({
            itemId: selectedValue,
            quantity: qty,
            costTotalQ: cost,
            supplier,
            invoiceNumber: invoice,
            notes,
            minStockThreshold,
            optimalThreshold,
          });
        }

        formRestock.reset();
        toggleModal(restockModal, false);
        showInventoryToast('✅ Factura e insumo registrados exitosamente.');
      });
    }

    // Modal Ajuste Físico
    if (btnCloseAdjust) btnCloseAdjust.addEventListener('click', () => toggleModal(adjustModal, false));
    if (btnCancelAdjust) btnCancelAdjust.addEventListener('click', () => toggleModal(adjustModal, false));

    if (formAdjust) {
      formAdjust.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemId = document.getElementById('adjustItemId')?.value;
        const newStock = parseFloat(document.getElementById('adjustNewStock')?.value) || 0;
        const reason = document.getElementById('adjustReason')?.value;
        const notes = document.getElementById('adjustNotes')?.value;

        inventoryStore.recordManualAdjustment({
          itemId,
          newStock,
          reason,
          notes,
        });

        formAdjust.reset();
        toggleModal(adjustModal, false);
        showInventoryToast('✅ Ajuste físico guardado en el inventario.');
      });
    }

    // Modal Configuración de Alertas
    if (btnCloseAlerts) btnCloseAlerts.addEventListener('click', () => toggleModal(alertsModal, false));
    if (btnCancelAlerts) btnCancelAlerts.addEventListener('click', () => toggleModal(alertsModal, false));

    if (formAlerts) {
      formAlerts.addEventListener('submit', (e) => {
        e.preventDefault();
        const itemId = document.getElementById('alertItemId')?.value;
        const crit = parseFloat(document.getElementById('alertCriticalInput')?.value);
        const opt = parseFloat(document.getElementById('alertOptimalInput')?.value);
        const unitCostQ = parseFloat(document.getElementById('alertUnitCostInput')?.value);
        const supplier = document.getElementById('alertSupplierInput')?.value.trim();

        if (isNaN(crit) || crit < 0) {
          showInventoryToast('⚠️ La cantidad crítica debe ser un número mayor o igual a 0.');
          return;
        }
        if (isNaN(opt) || opt <= crit) {
          showInventoryToast('⚠️ La cantidad óptima debe ser estrictamente mayor a la cantidad crítica.');
          return;
        }

        inventoryStore.updateItemAlerts(itemId, {
          minStockThreshold: crit,
          optimalThreshold: opt,
          unitCostQ: !isNaN(unitCostQ) ? unitCostQ : undefined,
          supplier: supplier || undefined,
        });

        toggleModal(alertsModal, false);
        showInventoryToast('✅ Umbrales de alerta configurados exitosamente.');
      });
    }

    // Modal Eliminación de Insumo
    if (btnCloseDelete) btnCloseDelete.addEventListener('click', () => toggleModal(deleteModal, false));
    if (btnCancelDelete) btnCancelDelete.addEventListener('click', () => toggleModal(deleteModal, false));

    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', async () => {
        const id = deleteInventoryItemId?.value;
        if (!id) return;
        try {
          btnConfirmDelete.disabled = true;
          btnConfirmDelete.textContent = '⏳ Eliminando...';
          await inventoryStore.deleteItem(id);
          showInventoryToast('✅ Insumo eliminado permanentemente de la base de datos.');
          toggleModal(deleteModal, false);
        } catch (err) {
          showInventoryToast(`❌ Error al eliminar insumo: ${err.message || 'Error del servidor'}`);
        } finally {
          btnConfirmDelete.disabled = false;
          btnConfirmDelete.textContent = 'Eliminar Permanentemente';
        }
      });
    }

    // Toast de Notificación de Inventario
    const inventoryToastEl = document.getElementById('inventoryToast');
    function showInventoryToast(message) {
      if (!inventoryToastEl) return;
      inventoryToastEl.textContent = message;
      inventoryToastEl.style.display = 'block';
      setTimeout(() => {
        if (inventoryToastEl) inventoryToastEl.style.display = 'none';
      }, 3500);
    }

    // Exportación a CSV
    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', () => {
        try {
          const csvContent = inventoryStore.exportKardexCSV();
          const filename = `kardex_inventario_audley_${new Date().toISOString().slice(0, 10)}.csv`;
          downloadCSV(filename, csvContent);
          showInventoryToast('✅ Kardex de inventario exportado exitosamente en CSV.');
        } catch (err) {
          console.error('Error al exportar Kardex CSV:', err);
          showInventoryToast('❌ Ocurrió un error al generar el Kardex en CSV.');
        }
      });
    }

    // Filtros de categoría
    const filterButtons = document.querySelectorAll('.btn-cat-filter');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        activeCategory = btn.getAttribute('data-category');
        filterButtons.forEach(b => {
          b.className = b === btn ? 'btn btn-primary btn-cat-filter' : 'btn btn-secondary btn-cat-filter';
        });
        renderInventoryGrid();
      });
    });

    if (kardexSearch) kardexSearch.addEventListener('input', renderKardexTable);
    if (kardexFilter) kardexFilter.addEventListener('change', renderKardexTable);

    // ==========================================
    // RENDERIZADO DE COMPONENTES
    // ==========================================
    function renderSummaryKPIs() {
      const container = document.getElementById('inventorySummaryContainer');
      if (!container) return;
      if (inventoryStore.isLoading) {
        container.innerHTML = renderMetricsSkeleton(4);
        return;
      }
      const summary = inventoryStore.getInventorySummary();

      container.innerHTML = `
        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; border-left: 4px solid var(--color-success);">
          <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Valor Total Bodega</span>
          <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: var(--color-success); margin: 0.2rem 0;">
            Q${summary.totalValueQ.toFixed(2)}
          </div>
          <span style="font-size: 0.78rem; color: var(--text-secondary);">${summary.totalItemsCount} insumos controlados</span>
        </div>

        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; border-left: 4px solid ${summary.criticalCount > 0 ? '#ef4444' : '#10b981'};">
          <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Alertas de Stock</span>
          <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: ${summary.criticalCount > 0 ? '#ef4444' : '#10b981'}; margin: 0.2rem 0;">
            ${summary.criticalCount > 0 ? `${summary.criticalCount} Críticos` : '0 Críticos'}
          </div>
          <span style="font-size: 0.78rem; color: var(--text-secondary);">
            ${summary.lowCount > 0 ? `${summary.lowCount} insumos en nivel bajo` : 'Existencias saludables'}
          </span>
        </div>

        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; border-left: 4px solid var(--cerulean);">
          <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Film Disponible</span>
          <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: var(--cerulean); margin: 0.2rem 0;">
            ${summary.totalFilmMeters.toFixed(1)} m
          </div>
          <span style="font-size: 0.78rem; color: var(--text-secondary);">Film A Base + Film B Transfer</span>
        </div>

        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; border-left: 4px solid #8b5cf6;">
          <span style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Tintas UV en Taller</span>
          <div style="font-size: 1.4rem; font-weight: 800; font-family: var(--font-mono); color: #8b5cf6; margin: 0.2rem 0;">
            ${summary.totalInkLiters.toFixed(2)} L
          </div>
          <span style="font-size: 0.78rem; color: var(--text-secondary);">CMYK + Blanco + Barniz 3D</span>
        </div>
      `;
    }

    function renderInventoryGrid() {
      const grid = document.getElementById('inventoryGrid');
      if (!grid) return;

      const offlineAlertEl = document.getElementById('inventoryOfflineAlertContainer');
      if (offlineAlertEl) {
        offlineAlertEl.innerHTML = !apiClient.isOnline ? renderApiOfflineAlert('No se pudo sincronizar el inventario con el backend.') : '';
      }

      if (inventoryStore.isLoading) {
        grid.innerHTML = renderCardsSkeleton(6);
        return;
      }
      const allItems = inventoryStore.getItems();
      const filtered = allItems.filter(it => activeCategory === 'ALL' || it.category === activeCategory);

      if (filtered.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: var(--text-secondary);">
            No hay insumos en esta categoría.
          </div>
        `;
        return;
      }

      grid.innerHTML = filtered.map(item => {
        const cat = INVENTORY_CATEGORIES[item.category] || { label: item.category, icon: '📦' };
        const meta = item.statusMeta;

        return `
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; gap: 0.5rem;">
                <div>
                  <span style="font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted);">
                    ${cat.icon} ${cat.label}
                  </span>
                  <h3 style="font-size: 1.05rem; font-weight: 800; margin: 0.2rem 0 0; color: var(--text-primary);">
                    ${item.name}
                  </h3>
                </div>
                <span class="badge" style="background: ${meta.bg}; color: ${meta.color}; border-color: ${meta.border}; font-size: 0.72rem; white-space: nowrap;">
                  ${meta.badge}
                </span>
              </div>

              <!-- Nivel de Stock Grande -->
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin: 0.75rem 0 0.35rem;">
                <div style="font-size: 1.5rem; font-weight: 800; font-family: var(--font-mono); color: ${meta.color};">
                  ${item.currentStock.toFixed(1)} <span style="font-size: 0.95rem; font-weight: 600; color: var(--text-secondary);">${item.unit}</span>
                </div>
                <div style="font-size: 0.85rem; font-family: var(--font-mono); font-weight: 700; color: var(--text-muted);">
                  Valor: Q${item.totalValueQ.toFixed(2)}
                </div>
              </div>

              <!-- Barra de Nivel -->
              <div style="width: 100%; height: 8px; background: rgba(158, 179, 194, 0.2); border-radius: var(--radius-full); overflow: hidden; margin-bottom: 0.75rem;">
                <div style="width: ${item.stockPercent}%; height: 100%; background: ${meta.color}; border-radius: var(--radius-full); transition: width 0.4s ease;"></div>
              </div>

              <!-- Metadatos de Taller con Alertas Configurables -->
              <div style="font-size: 0.78rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.03); padding: 0.35rem 0.5rem; border-radius: 4px;">
                  <span style="font-weight: 700; color: var(--text-muted); text-transform: uppercase; font-size: 0.7rem;">Alertas Configuradas:</span>
                  <button type="button" class="btn-config-alerts" data-item-id="${item.id}" style="background: none; border: none; color: var(--cerulean); font-weight: 700; font-size: 0.75rem; cursor: pointer; padding: 0; text-decoration: underline;">
                    ⚙️ Configurar
                  </button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; font-size: 0.75rem;">
                  <div>🔴 Crítico: <strong>≤ ${item.minStockThreshold} ${item.unit}</strong></div>
                  <div>🟢 Óptimo: <strong>≥ ${item.optimalThreshold} ${item.unit}</strong></div>
                </div>
                <div>Costo Ref: <strong>Q${item.costPerUnitQ.toFixed(2)} / ${item.unit}</strong></div>
                <div>Proveedor: <span style="color: var(--text-primary);">${item.supplier || 'No asignado'}</span></div>
              </div>
            </div>

            <!-- Botones de Acción Táctiles (44px mínimos) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 44px 44px; gap: 0.35rem; margin-top: auto;">
              <button type="button" class="btn btn-secondary btn-quick-restock" data-item-id="${item.id}" style="min-height: 44px; font-size: 0.8rem; padding: 0.4rem 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.25rem;" title="Registrar Entrada">
                <span>➕</span>
                <span>Entrada</span>
              </button>
              <button type="button" class="btn btn-secondary btn-quick-adjust" data-item-id="${item.id}" style="min-height: 44px; font-size: 0.8rem; padding: 0.4rem 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.25rem;" title="Ajuste Físico de Stock">
                <span>✏️</span>
                <span>Ajuste</span>
              </button>
              <button type="button" class="btn btn-secondary btn-config-alerts" data-item-id="${item.id}" style="color: var(--cerulean); border-color: rgba(59, 130, 246, 0.3); min-height: 44px; min-width: 44px; padding: 0.4rem; display: flex; align-items: center; justify-content: center;" title="Configurar Alertas">
                <span>⚙️</span>
              </button>
              <button type="button" class="btn btn-secondary btn-delete-inventory-item" data-item-id="${item.id}" style="color: #ef4444; border-color: rgba(239, 68, 68, 0.3); min-height: 44px; min-width: 44px; padding: 0.4rem; display: flex; align-items: center; justify-content: center;" title="Eliminar Insumo">
                <span>🗑️</span>
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Enlazar eventos de botones rápidos
      grid.querySelectorAll('.btn-quick-restock').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-item-id');
          populateRestockSelect(id);
          toggleModal(restockModal, true);
        });
      });

      grid.querySelectorAll('.btn-quick-adjust').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-item-id');
          const it = inventoryStore.getItemById(id);
          if (!it) return;

          document.getElementById('adjustItemId').value = it.id;
          document.getElementById('adjustItemName').textContent = it.name;
          document.getElementById('adjustCurrentStock').textContent = `${it.currentStock.toFixed(1)} ${it.unit}`;
          document.getElementById('adjustNewStock').value = it.currentStock;
          toggleModal(adjustModal, true);
        });
      });

      grid.querySelectorAll('.btn-config-alerts').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-item-id');
          const it = inventoryStore.getItemById(id);
          if (!it) return;

          document.getElementById('alertItemId').value = it.id;
          document.getElementById('alertItemNameDisplay').textContent = it.name;
          document.getElementById('alertCurrentStockDisplay').textContent = `Stock actual: ${it.currentStock.toFixed(1)} ${it.unit}`;
          document.getElementById('alertCriticalInput').value = it.minStockThreshold !== undefined ? it.minStockThreshold : 10;
          document.getElementById('alertOptimalInput').value = it.optimalThreshold !== undefined ? it.optimalThreshold : 25;
          document.getElementById('alertUnitCostInput').value = it.costPerUnitQ || '';
          document.getElementById('alertSupplierInput').value = it.supplier || '';
          toggleModal(alertsModal, true);
        });
      });

      // Eliminar insumo con modal consistente
      grid.querySelectorAll('.btn-delete-inventory-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-item-id');
          const it = inventoryStore.getItemById(id);
          if (!it) return;
          if (deleteInventoryItemId) deleteInventoryItemId.value = id;
          if (deleteInventoryItemName) deleteInventoryItemName.textContent = it.name;
          toggleModal(deleteModal, true);
        });
      });
    }

    function renderKardexTable() {
      const tbody = document.getElementById('kardexTableBody');
      if (!tbody) return;
      if (inventoryStore.isLoading) {
        tbody.innerHTML = renderTableSkeleton(4, 7);
        return;
      }
      const searchVal = kardexSearch?.value || '';
      const typeVal = kardexFilter?.value || 'ALL';

      const movements = inventoryStore.getKardexMovements({
        category: 'ALL',
        type: typeVal,
        search: searchVal,
      });

      if (movements.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
              No se encontraron movimientos registrados en el Kardex.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = movements.map(m => {
        const meta = MOVEMENT_TYPES[m.type] || { label: m.type, sign: '', color: 'var(--text-primary)' };
        const isNegative = m.quantity < 0;
        const formattedQty = `${isNegative ? '' : '+'}${m.quantity.toFixed(2)} ${m.unit}`;

        return `
          <tr>
            <td style="font-family: var(--font-mono); font-weight: 700; color: var(--cerulean);">${m.id}</td>
            <td style="white-space: nowrap; color: var(--text-secondary); font-size: 0.8rem;">
              ${new Date(m.timestamp).toLocaleDateString('es-GT', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </td>
            <td><strong>${m.itemName}</strong></td>
            <td>
              <span class="badge" style="background: ${meta.color}22; color: ${meta.color}; border-color: ${meta.color}; font-size: 0.72rem;">
                ${meta.label}
              </span>
            </td>
            <td style="font-family: var(--font-mono); font-weight: 800; color: ${meta.color};">
              ${formattedQty}
            </td>
            <td style="font-family: var(--font-mono); font-weight: 700;">
              ${m.newStock.toFixed(2)} ${m.unit}
            </td>
            <td style="font-family: var(--font-mono); font-weight: 600;">
              Q${m.costTotalQ.toFixed(2)}
            </td>
            <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--cerulean);">
              ${m.referenceOrderId || m.invoiceNumber || '—'}
            </td>
            <td style="font-size: 0.8rem; color: var(--text-secondary); max-width: 200px;">
              ${m.notes || ''}
            </td>
          </tr>
        `;
      }).join('');
    }

    function renderAll() {
      renderSummaryKPIs();
      renderInventoryGrid();
      renderKardexTable();
    }

    // Suscripción reactiva al almacén de inventario
    const unsub = inventoryStore.subscribe(() => {
      renderAll();
    });

    renderAll();

    return () => {
      unsub();
      toggleModal(restockModal, false);
      toggleModal(adjustModal, false);
      toggleModal(alertsModal, false);
      toggleModal(deleteModal, false);
    };
  },
};
