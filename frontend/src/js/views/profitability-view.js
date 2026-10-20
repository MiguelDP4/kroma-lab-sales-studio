/**
 * Vista de Costos Industriales y Rentabilidad Unitaria UV DTF.
 * Permite simular tirajes en tiempo real (por dimensiones de sticker con negociación de descuentos
 * o por metros lineales directos), desglosar costos por metro y pieza,
 * y analizar el margen neto de cada pedido en taller contra la meta de Q20,000/mes.
 */

import { store } from '../store.js';
import { ordersStore } from '../modules/orders-store.js';
import {
  getCostsConfig,
  saveCostsConfig,
  resetCostsConfig,
  calculatePrintRunCost,
  calculateStickerProfitability,
  calculatePortfolioProfitability,
} from '../modules/profitability-engine.js';

export const profitabilityView = {
  path: '/rentabilidad',
  name: 'profitability',
  allowedRoles: ['EMPLOYEE', 'ADMIN'],

  render: () => {
    const cfg = getCostsConfig();

    return `
      <div style="padding: 2rem 0 4rem;">
        <!-- Cabecera de la Vista -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1.25rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
              <span class="badge">Finanzas & Taller</span>
              <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: #10b981;">
                Bobina Audley 28 cm
              </span>
              <span class="badge" style="background: rgba(28, 114, 147, 0.15); color: var(--cerulean); border-color: var(--cerulean);">
                Meta: Q${cfg.monthlyTargetNetProfitQ.toLocaleString()}/mes
              </span>
            </div>
            <h1 style="font-size: clamp(1.8rem, 3.5vw, 2.4rem); font-weight: 800; margin: 0.25rem 0;">
              Costos y Rentabilidad Unitaria
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem; margin: 0;">
              Desglose técnico de Film A/B, tintas UV y margen neto por metro lineal y sticker.
            </p>
          </div>

          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <button id="btnOpenCostsConfigModal" class="btn btn-secondary" style="font-size: 0.88rem; padding: 0.55rem 1rem; min-height: 44px; display: inline-flex; align-items: center; gap: 0.4rem;">
              <span>⚙️</span>
              <span>Configurar Precios de Insumos</span>
            </button>
          </div>
        </div>

        <!-- Tarjeta de Avance hacia la Meta Mensual (Q20,000 netos) -->
        <div id="monthlyGoalCardContainer" style="margin-bottom: 2rem;">
          <!-- Inyectado dinámicamente por renderMonthlyGoalCard() -->
        </div>

        <!-- SECCIÓN DE SIMULACIÓN Y NEGOCIACIÓN -->
        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: clamp(1.2rem, 3vw, 1.75rem); margin-bottom: 2.5rem;">
          
          <!-- Selector de Modo de Simulación (Mobile-First) -->
          <div class="tabs-mode-container" style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; background: var(--bg-surface); padding: 0.35rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); flex-wrap: wrap;">
            <button type="button" id="btnModeSticker" class="btn btn-primary" style="flex: 1; min-height: 44px; display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.88rem; font-weight: 700;">
              <span>📐</span>
              <span>Por Medidas de Sticker y Descuento</span>
            </button>
            <button type="button" id="btnModeDirect" class="btn btn-secondary" style="flex: 1; min-height: 44px; display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.88rem; font-weight: 700;">
              <span>📏</span>
              <span>Por Metros Lineales Directos</span>
            </button>
          </div>

          <!-- MODO 1: SIMULADOR POR MEDIDAS DE STICKER Y DESCUENTO -->
          <div id="panelModeSticker">
            <div style="margin-bottom: 1.25rem;">
              <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0 0 0.25rem; display: flex; align-items: center; gap: 0.5rem;">
                <span>📐</span>
                <span>Calculadora de Tiraje por Medidas y Negociador de Descuentos</span>
              </h2>
              <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0;">
                Ingresa el tamaño del sticker y cantidad; calcularemos los metros lineales exactos en bobina de 28cm y el margen neto resultante si decides aplicar un descuento.
              </p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
              <!-- Inputs del Sticker -->
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div class="input-row" style="margin: 0; display: flex; gap: 0.75rem;">
                  <div class="form-group" style="margin: 0; flex: 1;">
                    <label class="form-label" for="stkWidth" style="font-weight: 700;">Ancho (cm):</label>
                    <input type="number" id="stkWidth" class="input-control" value="5" min="0.5" max="28" step="0.5" style="min-height: 44px;" required>
                  </div>
                  <div class="form-group" style="margin: 0; flex: 1;">
                    <label class="form-label" for="stkHeight" style="font-weight: 700;">Alto (cm):</label>
                    <input type="number" id="stkHeight" class="input-control" value="5" min="0.5" max="100" step="0.5" style="min-height: 44px;" required>
                  </div>
                </div>

                <div class="form-group" style="margin: 0;">
                  <label class="form-label" for="stkQty" style="font-weight: 700;">Cantidad de Stickers (Uds):</label>
                  <input type="number" id="stkQty" class="input-control" value="100" min="1" max="50000" step="1" style="min-height: 44px;" required>
                </div>

                <!-- Indicador de Metraje Calculado en Bobina Audley -->
                <div style="background: rgba(28, 114, 147, 0.1); border: 1px solid var(--cerulean); border-radius: var(--radius-md); padding: 0.75rem 1rem;">
                  <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; color: var(--cerulean); letter-spacing: 0.05em; margin-bottom: 0.2rem;">
                    Metraje en Bobina Audley (28 cm útiles)
                  </div>
                  <div id="stkCalculatedMetersText" style="font-weight: 800; font-size: 1.15rem; color: var(--text-primary); font-family: var(--font-mono);">
                    1.06 m lineales
                  </div>
                  <div id="stkDistributionText" style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">
                    5 stickers por fila • 20 filas en rollo
                  </div>
                </div>

                <div class="form-group" style="margin: 0;">
                  <label class="form-label" for="stkFinish" style="font-weight: 700;">Acabado y Barniz:</label>
                  <select id="stkFinish" class="input-control" style="min-height: 44px;">
                    <option value="Barniz con Relieve 3D">Barniz con Relieve 3D (Brillo + Textura)</option>
                    <option value="Barniz Brillante">Barniz Brillante Estándar</option>
                    <option value="Sin Barniz / Mate">Sin Barniz (Mate UV)</option>
                  </select>
                </div>

                <div class="form-group" style="margin: 0;">
                  <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem; cursor: pointer; min-height: 44px;">
                    <input type="checkbox" id="stkCutting" style="width: 20px; height: 20px;">
                    <span>✂️ Incluye servicio de corte perimetral de precisión</span>
                  </label>
                </div>

                <!-- Simulación de Descuento / Precio Ofrecido -->
                <div style="background: var(--bg-surface); border: 1px dashed var(--cerulean); border-radius: var(--radius-md); padding: 1rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.25rem;">
                    <label class="form-label" for="stkOfferedPrice" style="margin: 0; font-weight: 700; color: var(--text-primary);">
                      Precio Ofrecido al Cliente (Q):
                    </label>
                    <span id="stkListPriceDisplay" style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">
                      Lista: Q0.00
                    </span>
                  </div>
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="number" id="stkOfferedPrice" class="input-control" placeholder="Precio de lista" step="1" style="min-height: 44px;">
                    <button type="button" id="btnResetStkPrice" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.45rem 0.75rem; white-space: nowrap; min-height: 44px;">
                      Precio Lista
                    </button>
                  </div>
                  <div id="stkDiscountNotice" style="font-size: 0.8rem; margin-top: 0.4rem; font-weight: 600;">
                    <!-- Inyectado dinámicamente -->
                  </div>
                </div>
              </div>

              <!-- Panel de Resultados Financieros del Sticker -->
              <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <span style="font-size: 0.8rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.05em;">
                      Rentabilidad con Precio Negociado
                    </span>
                    <span id="stkDiscountBadge" class="badge" style="font-size: 0.75rem;">Precio Lista</span>
                  </div>

                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; margin: 1rem 0;">
                    <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: 4px; border-left: 3px solid var(--color-danger);">
                      <span style="font-size: 0.75rem; color: var(--text-secondary);">Costo Producción</span>
                      <div id="stkResTotalCost" style="font-size: 1.25rem; font-weight: 800; font-family: var(--font-mono); color: #ef4444;">Q0.00</div>
                      <span id="stkResCostPerMeter" style="font-size: 0.72rem; color: var(--text-muted);">Q0.00 / m</span>
                    </div>

                    <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: 4px; border-left: 3px solid var(--cerulean);">
                      <span style="font-size: 0.75rem; color: var(--text-secondary);">Precio Cobrado</span>
                      <div id="stkResSellingPrice" style="font-size: 1.25rem; font-weight: 800; font-family: var(--font-mono); color: var(--cerulean);">Q0.00</div>
                      <span id="stkResListCompare" style="font-size: 0.72rem; color: var(--text-muted);">Lista: Q0.00</span>
                    </div>

                    <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: 4px; border-left: 3px solid var(--color-success);">
                      <span style="font-size: 0.75rem; color: var(--text-secondary);">Utilidad Neta</span>
                      <div id="stkResNetProfit" style="font-size: 1.25rem; font-weight: 800; font-family: var(--font-mono); color: var(--color-success);">Q0.00</div>
                      <span id="stkResMarginPercent" style="font-size: 0.75rem; font-weight: 700; color: var(--color-success);">0% margen</span>
                    </div>

                    <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: 4px; border-left: 3px solid #8b5cf6;">
                      <span style="font-size: 0.75rem; color: var(--text-secondary);">Ganancia / Sticker</span>
                      <div id="stkResProfitPerSticker" style="font-size: 1.25rem; font-weight: 800; font-family: var(--font-mono); color: #8b5cf6;">Q0.00</div>
                      <span id="stkResCostPerSticker" style="font-size: 0.72rem; color: var(--text-muted);">Costo: Q0.00</span>
                    </div>
                  </div>

                  <!-- Barra Visual Costo vs Margen -->
                  <div style="margin: 1.25rem 0 0.75rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; margin-bottom: 0.35rem;">
                      <span style="color: #ef4444;">Costo Producción (<span id="stkPctCostBar">0%</span>)</span>
                      <span style="color: var(--color-success);">Margen Neto (<span id="stkPctMarginBar">0%</span>)</span>
                    </div>
                    <div style="width: 100%; height: 12px; background: #e2e8f0; border-radius: var(--radius-full); overflow: hidden; display: flex;">
                      <div id="stkBarCostFill" style="height: 100%; background: #ef4444; width: 25%; transition: width 0.3s ease;"></div>
                      <div id="stkBarMarginFill" style="height: 100%; background: #10b981; width: 75%; transition: width 0.3s ease;"></div>
                    </div>
                  </div>
                </div>

                <!-- Recomendación de Negociación y Salud -->
                <div>
                  <div id="stkTierBadgeIndicator" style="margin-top: 0.5rem; text-align: center;"></div>
                  <div id="stkAdviceBox" style="margin-top: 0.75rem; padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.85rem; font-weight: 600; text-align: center;"></div>
                </div>
              </div>
            </div>

            <!-- Tabla Desglosada del Sticker -->
            <div>
              <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.65rem; color: var(--text-primary);">
                Desglose Técnico de Insumos para este Tiraje de Stickers:
              </h3>
              <div class="orders-table-container">
                <table class="orders-table" style="font-size: 0.85rem;">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Consumo Estimado</th>
                      <th>Costo Unitario Ref.</th>
                      <th>Total Rubro (Q)</th>
                      <th>% del Costo</th>
                    </tr>
                  </thead>
                  <tbody id="stkCostBreakdownTableBody"></tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- MODO 2: SIMULADOR DIRECTO POR METROS LINEALES -->
          <div id="panelModeDirect" style="display: none;">
            <div style="margin-bottom: 1.25rem;">
              <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0 0 0.25rem; display: flex; align-items: center; gap: 0.5rem;">
                <span>📏</span>
                <span>Simulador Directo por Metros Lineales de Bobina</span>
              </h2>
              <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0;">
                Ajusta directamente los metros y piezas para proyectar el costo de producción exacto y tu ganancia neta en Quetzales.
              </p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
              <!-- Parámetros de Entrada Directos -->
              <div style="display: flex; flex-direction: column; gap: 1rem;">
                <div class="form-group" style="margin: 0;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                    <label class="form-label" for="simMeters" style="margin: 0; font-weight: 700;">Metros Lineales:</label>
                    <span id="simMetersDisplay" style="font-family: var(--font-mono); font-weight: 800; color: var(--cerulean); font-size: 1.05rem;">
                      2.00 m
                    </span>
                  </div>
                  <input type="range" id="simMetersSlider" min="0.5" max="25" step="0.5" value="2.0" style="width: 100%; margin-bottom: 0.4rem; accent-color: var(--cerulean); cursor: pointer;">
                  <input type="number" id="simMeters" class="input-control" value="2.0" min="0.1" max="100" step="0.1" style="min-height: 44px;">
                </div>

                <div class="form-group" style="margin: 0;">
                  <label class="form-label" for="simStickers" style="font-weight: 700;">Cantidad de Stickers (Piezas):</label>
                  <input type="number" id="simStickers" class="input-control" value="100" min="1" max="50000" step="1" style="min-height: 44px;">
                </div>

                <div class="form-group" style="margin: 0;">
                  <label class="form-label" for="simFinish" style="font-weight: 700;">Acabado y Barniz:</label>
                  <select id="simFinish" class="input-control" style="min-height: 44px;">
                    <option value="Barniz con Relieve 3D">Barniz con Relieve 3D (Brillo + Textura)</option>
                    <option value="Barniz Brillante">Barniz Brillante Estándar</option>
                    <option value="Sin Barniz / Mate">Sin Barniz (Mate UV)</option>
                  </select>
                </div>

                <div class="form-group" style="margin: 0;">
                  <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.9rem; cursor: pointer; min-height: 44px;">
                    <input type="checkbox" id="simCutting" style="width: 20px; height: 20px;">
                    <span>✂️ Incluye servicio de corte perimetral de precisión</span>
                  </label>
                </div>

                <div class="form-group" style="margin: 0;">
                  <label class="form-label" for="simCustomPrice" style="font-weight: 700;">Precio de Venta Cobrado (Q):</label>
                  <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input type="number" id="simCustomPrice" class="input-control" placeholder="Escala automática" step="0.5" style="min-height: 44px;">
                    <button type="button" id="btnResetPriceToScale" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.45rem 0.75rem; white-space: nowrap; min-height: 44px;">
                      Escala Auto
                    </button>
                  </div>
                  <span id="priceTierIndicator" style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 0.25rem; display: block;"></span>
                </div>
              </div>

              <!-- Panel de Resultados Financieros Directos -->
              <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <span style="font-size: 0.8rem; text-transform: uppercase; font-weight: 700; color: var(--text-muted); letter-spacing: 0.05em;">
                    Rentabilidad Proyectada del Tiraje
                  </span>
                  
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; margin: 1rem 0;">
                    <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: 4px; border-left: 3px solid var(--color-danger);">
                      <span style="font-size: 0.75rem; color: var(--text-secondary);">Costo Producción</span>
                      <div id="resTotalCost" style="font-size: 1.25rem; font-weight: 800; font-family: var(--font-mono); color: #ef4444;">Q0.00</div>
                      <span id="resCostPerMeter" style="font-size: 0.72rem; color: var(--text-muted);">Q0.00 / m</span>
                    </div>

                    <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: 4px; border-left: 3px solid var(--cerulean);">
                      <span style="font-size: 0.75rem; color: var(--text-secondary);">Precio Venta</span>
                      <div id="resSellingPrice" style="font-size: 1.25rem; font-weight: 800; font-family: var(--font-mono); color: var(--cerulean);">Q0.00</div>
                      <span id="resSellingRate" style="font-size: 0.72rem; color: var(--text-muted);">Tarifa base</span>
                    </div>

                    <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: 4px; border-left: 3px solid var(--color-success);">
                      <span style="font-size: 0.75rem; color: var(--text-secondary);">Utilidad Neta</span>
                      <div id="resNetProfit" style="font-size: 1.25rem; font-weight: 800; font-family: var(--font-mono); color: var(--color-success);">Q0.00</div>
                      <span id="resMarginPercent" style="font-size: 0.75rem; font-weight: 700; color: var(--color-success);">0% margen</span>
                    </div>

                    <div style="background: var(--bg-surface-elevated); padding: 0.75rem; border-radius: 4px; border-left: 3px solid #8b5cf6;">
                      <span style="font-size: 0.75rem; color: var(--text-secondary);">Ganancia / Sticker</span>
                      <div id="resProfitPerSticker" style="font-size: 1.25rem; font-weight: 800; font-family: var(--font-mono); color: #8b5cf6;">Q0.00</div>
                      <span id="resCostPerSticker" style="font-size: 0.72rem; color: var(--text-muted);">Costo: Q0.00</span>
                    </div>
                  </div>

                  <!-- Barra Visual de Distribución Directa -->
                  <div style="margin: 1.25rem 0 0.75rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; margin-bottom: 0.35rem;">
                      <span style="color: #ef4444;">Costo Producción (<span id="pctCostBar">0%</span>)</span>
                      <span style="color: var(--color-success);">Margen Neto (<span id="pctMarginBar">0%</span>)</span>
                    </div>
                    <div style="width: 100%; height: 12px; background: #e2e8f0; border-radius: var(--radius-full); overflow: hidden; display: flex;">
                      <div id="barCostFill" style="height: 100%; background: #ef4444; width: 25%; transition: width 0.3s ease;"></div>
                      <div id="barMarginFill" style="height: 100%; background: #10b981; width: 75%; transition: width 0.3s ease;"></div>
                    </div>
                  </div>
                </div>

                <div id="tierBadgeIndicator" style="margin-top: 0.5rem; text-align: center;"></div>
              </div>
            </div>

            <!-- Tabla Desglosada de Rubros Directos -->
            <div>
              <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.65rem; color: var(--text-primary);">
                Desglose Técnico de Rubros de Costo (Metros Directos):
              </h3>
              <div class="orders-table-container">
                <table class="orders-table" style="font-size: 0.85rem;">
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Consumo Estimado</th>
                      <th>Costo Unitario Ref.</th>
                      <th>Total Rubro (Q)</th>
                      <th>% del Costo</th>
                    </tr>
                  </thead>
                  <tbody id="costBreakdownTableBody"></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 2: HISTORIAL DE RENTABILIDAD EN TALLER -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0; display: flex; align-items: center; gap: 0.5rem;">
                <span>📋</span>
                <span>Rentabilidad Histórica de Pedidos en Taller</span>
              </h2>
              <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0.25rem 0 0;">
                Cálculo de margen real sobre todas las órdenes procesadas en la Audley.
              </p>
            </div>
          </div>

          <div class="mobile-scroll-hint">Desliza para ver columnas de costo y ganancia neta ↔</div>
          <div class="orders-table-container">
            <table class="orders-table">
              <thead>
                <tr>
                  <th>No. Pedido</th>
                  <th>Cliente / Empresa</th>
                  <th>Metros</th>
                  <th>Facturado</th>
                  <th>Costo Estimado</th>
                  <th>Utilidad Neta</th>
                  <th>Margen (%)</th>
                  <th>Evaluación</th>
                </tr>
              </thead>
              <tbody id="ordersProfitabilityTableBody">
                <!-- Inyectado por renderOrdersProfitabilityTable() -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- MODAL: CONFIGURAR PRECIOS DE INSUMOS -->
        <div id="costsConfigModal" class="modal-backdrop" style="display: none;">
          <div class="modal-card" style="width: min(560px, 94vw);">
            <div class="modal-header">
              <div>
                <h2 style="font-size: 1.25rem; font-weight: 800; margin: 0;">⚙️ Precios de Insumos y Costos</h2>
                <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0 0;">
                  Actualiza los precios de compra locales en Guatemala (Quetzales).
                </p>
              </div>
              <button type="button" class="btn-close-modal" id="btnCloseCostsModal">✕</button>
            </div>

            <form id="formCostsConfig">
              <div class="input-row">
                <div class="form-group">
                  <label class="form-label" for="cfgFilmA">Rollo Film A 100m (Q):</label>
                  <input type="number" id="cfgFilmA" class="input-control" value="${cfg.filmARoll100mQ}" step="10" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="cfgFilmB">Rollo Film B 100m (Q):</label>
                  <input type="number" id="cfgFilmB" class="input-control" value="${cfg.filmBRoll100mQ}" step="10" required>
                </div>
              </div>

              <div class="input-row">
                <div class="form-group">
                  <label class="form-label" for="cfgInk">Litro de Tinta UV (Q):</label>
                  <input type="number" id="cfgInk" class="input-control" value="${cfg.inkLiterCostQ}" step="10" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="cfgElectricity">Energía por metro (Q):</label>
                  <input type="number" id="cfgElectricity" class="input-control" value="${cfg.electricityCostPerMeterQ}" step="0.10" required>
                </div>
              </div>

              <div class="input-row">
                <div class="form-group">
                  <label class="form-label" for="cfgMaintenance">Depreciación cabezales/m (Q):</label>
                  <input type="number" id="cfgMaintenance" class="input-control" value="${cfg.maintenanceCostPerMeterQ}" step="0.25" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="cfgLabor">Mano de obra taller/m (Q):</label>
                  <input type="number" id="cfgLabor" class="input-control" value="${cfg.operatorLaborPerMeterQ}" step="0.50" required>
                </div>
              </div>

              <div class="input-row">
                <div class="form-group">
                  <label class="form-label" for="cfgCutting">Corte unitario por sticker (Q):</label>
                  <input type="number" id="cfgCutting" class="input-control" value="${cfg.cuttingCostPerStickerQ}" step="0.01" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="cfgMonthlyGoal">Meta ganancia mensual (Q):</label>
                  <input type="number" id="cfgMonthlyGoal" class="input-control" value="${cfg.monthlyTargetNetProfitQ}" step="500" required>
                </div>
              </div>

              <div class="modal-actions-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; flex-wrap: wrap; gap: 0.75rem;">
                <button type="button" class="btn btn-secondary" id="btnResetCostsFactory" style="color: #ef4444;">
                  Valores de Fábrica
                </button>
                <div style="display: flex; gap: 0.5rem;">
                  <button type="button" class="btn btn-secondary" id="btnCancelCostsModal">Cancelar</button>
                  <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  },

  onMount: () => {
    // Mode Switcher Elements
    const btnModeSticker = document.getElementById('btnModeSticker');
    const btnModeDirect = document.getElementById('btnModeDirect');
    const panelModeSticker = document.getElementById('panelModeSticker');
    const panelModeDirect = document.getElementById('panelModeDirect');

    // Sticker Mode Elements
    const stkWidth = document.getElementById('stkWidth');
    const stkHeight = document.getElementById('stkHeight');
    const stkQty = document.getElementById('stkQty');
    const stkFinish = document.getElementById('stkFinish');
    const stkCutting = document.getElementById('stkCutting');
    const stkOfferedPrice = document.getElementById('stkOfferedPrice');
    const btnResetStkPrice = document.getElementById('btnResetStkPrice');

    // Direct Mode Elements
    const metersInput = document.getElementById('simMeters');
    const metersSlider = document.getElementById('simMetersSlider');
    const metersDisplay = document.getElementById('simMetersDisplay');
    const stickersInput = document.getElementById('simStickers');
    const finishSelect = document.getElementById('simFinish');
    const cuttingCheckbox = document.getElementById('simCutting');
    const customPriceInput = document.getElementById('simCustomPrice');
    const btnResetPrice = document.getElementById('btnResetPriceToScale');
    const priceTierIndicator = document.getElementById('priceTierIndicator');

    // Modal Elements
    const configModal = document.getElementById('costsConfigModal');
    const btnOpenConfigModal = document.getElementById('btnOpenCostsConfigModal');
    const btnCloseConfigModal = document.getElementById('btnCloseCostsModal');
    const btnCancelConfigModal = document.getElementById('btnCancelCostsModal');
    const btnResetFactory = document.getElementById('btnResetCostsFactory');
    const formCostsConfig = document.getElementById('formCostsConfig');

    function toggleModal(show) {
      if (configModal) configModal.style.display = show ? 'block' : 'none';
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.overflow = show ? 'hidden' : '';
      }
    }

    if (btnOpenConfigModal) btnOpenConfigModal.addEventListener('click', () => toggleModal(true));
    if (btnCloseConfigModal) btnCloseConfigModal.addEventListener('click', () => toggleModal(false));
    if (btnCancelConfigModal) btnCancelConfigModal.addEventListener('click', () => toggleModal(false));

    // Control de Pestañas / Modos de Simulación
    function switchMode(mode) {
      if (mode === 'sticker') {
        if (panelModeSticker) panelModeSticker.style.display = 'block';
        if (panelModeDirect) panelModeDirect.style.display = 'none';
        if (btnModeSticker) {
          btnModeSticker.className = 'btn btn-primary';
        }
        if (btnModeDirect) {
          btnModeDirect.className = 'btn btn-secondary';
        }
        renderStickerSimulation();
      } else {
        if (panelModeSticker) panelModeSticker.style.display = 'none';
        if (panelModeDirect) panelModeDirect.style.display = 'block';
        if (btnModeSticker) {
          btnModeSticker.className = 'btn btn-secondary';
        }
        if (btnModeDirect) {
          btnModeDirect.className = 'btn btn-primary';
        }
        renderSimulation();
      }
    }

    if (btnModeSticker) btnModeSticker.addEventListener('click', () => switchMode('sticker'));
    if (btnModeDirect) btnModeDirect.addEventListener('click', () => switchMode('direct'));

    if (btnResetFactory) {
      btnResetFactory.addEventListener('click', () => {
        resetCostsConfig();
        const def = getCostsConfig();
        document.getElementById('cfgFilmA').value = def.filmARoll100mQ;
        document.getElementById('cfgFilmB').value = def.filmBRoll100mQ;
        document.getElementById('cfgInk').value = def.inkLiterCostQ;
        document.getElementById('cfgElectricity').value = def.electricityCostPerMeterQ;
        document.getElementById('cfgMaintenance').value = def.maintenanceCostPerMeterQ;
        document.getElementById('cfgLabor').value = def.operatorLaborPerMeterQ;
        document.getElementById('cfgCutting').value = def.cuttingCostPerStickerQ;
        document.getElementById('cfgMonthlyGoal').value = def.monthlyTargetNetProfitQ;
        renderAll();
      });
    }

    if (formCostsConfig) {
      formCostsConfig.addEventListener('submit', (e) => {
        e.preventDefault();
        saveCostsConfig({
          filmARoll100mQ: parseFloat(document.getElementById('cfgFilmA')?.value) || 600.0,
          filmBRoll100mQ: parseFloat(document.getElementById('cfgFilmB')?.value) || 400.0,
          inkLiterCostQ: parseFloat(document.getElementById('cfgInk')?.value) || 550.0,
          electricityCostPerMeterQ: parseFloat(document.getElementById('cfgElectricity')?.value) || 1.20,
          maintenanceCostPerMeterQ: parseFloat(document.getElementById('cfgMaintenance')?.value) || 2.00,
          operatorLaborPerMeterQ: parseFloat(document.getElementById('cfgLabor')?.value) || 4.00,
          cuttingCostPerStickerQ: parseFloat(document.getElementById('cfgCutting')?.value) || 0.08,
          monthlyTargetNetProfitQ: parseFloat(document.getElementById('cfgMonthlyGoal')?.value) || 20000.0,
        });
        toggleModal(false);
        renderAll();
      });
    }

    // ==========================================
    // LÓGICA DE SIMULACIÓN 1: MEDIDAS DE STICKER
    // ==========================================
    if (stkWidth) stkWidth.addEventListener('input', renderStickerSimulation);
    if (stkHeight) stkHeight.addEventListener('input', renderStickerSimulation);
    if (stkQty) stkQty.addEventListener('input', renderStickerSimulation);
    if (stkFinish) stkFinish.addEventListener('change', renderStickerSimulation);
    if (stkCutting) stkCutting.addEventListener('change', renderStickerSimulation);
    if (stkOfferedPrice) stkOfferedPrice.addEventListener('input', renderStickerSimulation);

    if (btnResetStkPrice) {
      btnResetStkPrice.addEventListener('click', () => {
        if (stkOfferedPrice) stkOfferedPrice.value = '';
        renderStickerSimulation();
      });
    }

    function renderStickerSimulation() {
      const w = parseFloat(stkWidth?.value) || 5.0;
      const h = parseFloat(stkHeight?.value) || 5.0;
      const q = parseInt(stkQty?.value, 10) || 100;
      const finish = stkFinish?.value || 'Barniz con Relieve 3D';
      const cut = Boolean(stkCutting?.checked);
      const customPrice = stkOfferedPrice?.value ? parseFloat(stkOfferedPrice.value) : null;

      const result = calculateStickerProfitability({
        widthCm: w,
        heightCm: h,
        qty: q,
        finishType: finish,
        includeCutting: cut,
        customSellingPriceQ: customPrice,
      });

      const quote = result.quote;
      const pComp = result.pricingComparison;
      const run = result.runCost;

      // Actualizar tarjeta técnica de metraje en bobina
      const elMetersText = document.getElementById('stkCalculatedMetersText');
      const elDistText = document.getElementById('stkDistributionText');
      const elListPriceDisplay = document.getElementById('stkListPriceDisplay');
      const elDiscountNotice = document.getElementById('stkDiscountNotice');
      const elDiscountBadge = document.getElementById('stkDiscountBadge');

      if (elMetersText) {
        elMetersText.textContent = `${quote.actualLinearMeters.toFixed(2)} m lineales ${quote.isUnderMin ? '(Mínimo 1.0 m facturable)' : ''}`;
      }
      if (elDistText) {
        elDistText.textContent = `${quote.stickersPerRow} por fila • ${quote.rows} filas en bobina Audley 28 cm`;
      }
      if (elListPriceDisplay) {
        elListPriceDisplay.textContent = `Precio Lista: Q${pComp.listPriceTotalQ.toFixed(2)}`;
      }

      // Noticia de descuento
      if (elDiscountNotice) {
        if (pComp.isDiscountApplied) {
          elDiscountNotice.innerHTML = `
            <span style="color: #f59e0b;">
              💰 Descuento aplicado: <strong>Q${pComp.discountAmountQ.toFixed(2)} (-${pComp.discountPercent.toFixed(1)}%)</strong>
            </span>
          `;
        } else {
          elDiscountNotice.innerHTML = `
            <span style="color: #10b981;">
              🟢 Sin descuento (Cobrando Precio de Lista Oficial)
            </span>
          `;
        }
      }

      if (elDiscountBadge) {
        if (pComp.isDiscountApplied) {
          elDiscountBadge.textContent = `Desc: -${pComp.discountPercent.toFixed(1)}%`;
          elDiscountBadge.style.background = 'rgba(245, 158, 11, 0.15)';
          elDiscountBadge.style.color = '#f59e0b';
          elDiscountBadge.style.borderColor = '#f59e0b';
        } else {
          elDiscountBadge.textContent = 'Precio Lista';
          elDiscountBadge.style.background = 'rgba(16, 185, 129, 0.15)';
          elDiscountBadge.style.color = '#10b981';
          elDiscountBadge.style.borderColor = '#10b981';
        }
      }

      // KPIs
      const elTotalCost = document.getElementById('stkResTotalCost');
      const elCostPerMeter = document.getElementById('stkResCostPerMeter');
      const elSellingPrice = document.getElementById('stkResSellingPrice');
      const elListCompare = document.getElementById('stkResListCompare');
      const elNetProfit = document.getElementById('stkResNetProfit');
      const elMarginPercent = document.getElementById('stkResMarginPercent');
      const elProfitPerSticker = document.getElementById('stkResProfitPerSticker');
      const elCostPerSticker = document.getElementById('stkResCostPerSticker');

      if (elTotalCost) elTotalCost.textContent = `Q${run.costs.totalProductionCostQ.toFixed(2)}`;
      if (elCostPerMeter) elCostPerMeter.textContent = `Q${run.costs.costPerMeterQ.toFixed(2)} / m`;
      if (elSellingPrice) elSellingPrice.textContent = `Q${pComp.offeredPriceTotalQ.toFixed(2)}`;
      if (elListCompare) {
        elListCompare.textContent = pComp.isDiscountApplied
          ? `Lista: Q${pComp.listPriceTotalQ.toFixed(2)}`
          : 'Tarifa oficial Kroma';
      }
      if (elNetProfit) elNetProfit.textContent = `Q${result.netProfitQ.toFixed(2)}`;
      if (elMarginPercent) elMarginPercent.textContent = `${result.profitMarginPercent.toFixed(1)}% margen`;
      if (elProfitPerSticker) elProfitPerSticker.textContent = `Q${result.profitPerStickerQ.toFixed(2)}`;
      if (elCostPerSticker) elCostPerSticker.textContent = `Costo: Q${result.costPerStickerQ.toFixed(2)}`;

      // Barra de distribución visual
      const costPercent = Math.max(0, Math.min(100, 100 - result.profitMarginPercent));
      const marginPercent = Math.max(0, Math.min(100, result.profitMarginPercent));

      const elBarCost = document.getElementById('stkBarCostFill');
      const elBarMargin = document.getElementById('stkBarMarginFill');
      const elPctCost = document.getElementById('stkPctCostBar');
      const elPctMargin = document.getElementById('stkPctMarginBar');

      if (elBarCost) elBarCost.style.width = `${costPercent}%`;
      if (elBarMargin) elBarMargin.style.width = `${marginPercent}%`;
      if (elPctCost) elPctCost.textContent = `${costPercent.toFixed(1)}%`;
      if (elPctMargin) elPctMargin.textContent = `${marginPercent.toFixed(1)}%`;

      // Insignia de salud
      const elBadgeContainer = document.getElementById('stkTierBadgeIndicator');
      if (elBadgeContainer) {
        elBadgeContainer.innerHTML = `
          <span class="badge" style="background: ${run.profitability.badgeColor}22; color: ${run.profitability.badgeColor}; border-color: ${run.profitability.badgeColor}; font-weight: 700; font-size: 0.85rem; padding: 0.4rem 0.85rem;">
            ${run.profitability.profitabilityBadge}
          </span>
        `;
      }

      // Caja de recomendación de negociación
      const elAdviceBox = document.getElementById('stkAdviceBox');
      if (elAdviceBox) {
        elAdviceBox.textContent = pComp.discountAdvice;
        elAdviceBox.style.background = `${pComp.adviceColor}18`;
        elAdviceBox.style.color = pComp.adviceColor;
        elAdviceBox.style.border = `1px solid ${pComp.adviceColor}44`;
      }

      // Tabla de desglose de costos
      renderItemizedCostBreakdownTable('stkCostBreakdownTableBody', run);
    }

    // ==========================================
    // LÓGICA DE SIMULACIÓN 2: METROS DIRECTOS
    // ==========================================
    if (metersSlider && metersInput) {
      metersSlider.addEventListener('input', (e) => {
        metersInput.value = e.target.value;
        if (metersDisplay) metersDisplay.textContent = `${parseFloat(e.target.value).toFixed(2)} m`;
        renderSimulation();
      });

      metersInput.addEventListener('input', (e) => {
        metersSlider.value = e.target.value;
        if (metersDisplay) metersDisplay.textContent = `${parseFloat(e.target.value || 0).toFixed(2)} m`;
        renderSimulation();
      });
    }

    if (stickersInput) stickersInput.addEventListener('input', renderSimulation);
    if (finishSelect) finishSelect.addEventListener('change', renderSimulation);
    if (cuttingCheckbox) cuttingCheckbox.addEventListener('change', renderSimulation);
    if (customPriceInput) customPriceInput.addEventListener('input', renderSimulation);

    if (btnResetPrice) {
      btnResetPrice.addEventListener('click', () => {
        if (customPriceInput) customPriceInput.value = '';
        renderSimulation();
      });
    }

    function renderSimulation() {
      const meters = parseFloat(metersInput?.value) || 1.0;
      const stickers = parseInt(stickersInput?.value, 10) || 50;
      const finish = finishSelect?.value || 'Barniz con Relieve 3D';
      const cutting = Boolean(cuttingCheckbox?.checked);
      const customPriceVal = customPriceInput?.value ? parseFloat(customPriceInput.value) : null;

      const run = calculatePrintRunCost({
        meters,
        stickersCount: stickers,
        hasCutting: cutting,
        finishType: finish,
        customSellingPriceQ: customPriceVal,
      });

      // Actualizar tarjeta de resultados
      const elTotalCost = document.getElementById('resTotalCost');
      const elCostPerMeter = document.getElementById('resCostPerMeter');
      const elSellingPrice = document.getElementById('resSellingPrice');
      const elSellingRate = document.getElementById('resSellingRate');
      const elNetProfit = document.getElementById('resNetProfit');
      const elMarginPercent = document.getElementById('resMarginPercent');
      const elProfitPerSticker = document.getElementById('resProfitPerSticker');
      const elCostPerSticker = document.getElementById('resCostPerSticker');
      const elBadgeContainer = document.getElementById('tierBadgeIndicator');

      const elBarCost = document.getElementById('barCostFill');
      const elBarMargin = document.getElementById('barMarginFill');
      const elPctCost = document.getElementById('pctCostBar');
      const elPctMargin = document.getElementById('pctMarginBar');

      if (elTotalCost) elTotalCost.textContent = `Q${run.costs.totalProductionCostQ.toFixed(2)}`;
      if (elCostPerMeter) elCostPerMeter.textContent = `Q${run.costs.costPerMeterQ.toFixed(2)} / m`;
      if (elSellingPrice) elSellingPrice.textContent = `Q${run.pricing.sellingPriceTotalQ.toFixed(2)}`;
      if (elSellingRate) {
        elSellingRate.textContent = customPriceVal !== null
          ? 'Precio Manual'
          : `Tarifa: Q${(run.pricing.materialSellingQ / run.meters).toFixed(2)}/m`;
      }
      if (elNetProfit) elNetProfit.textContent = `Q${run.profitability.netProfitQ.toFixed(2)}`;
      if (elMarginPercent) elMarginPercent.textContent = `${run.profitability.profitMarginPercent.toFixed(1)}% margen`;
      if (elProfitPerSticker) elProfitPerSticker.textContent = `Q${run.profitability.profitPerStickerQ.toFixed(2)}`;
      if (elCostPerSticker) elCostPerSticker.textContent = `Costo: Q${run.costs.costPerStickerQ.toFixed(2)}`;

      if (priceTierIndicator) {
        priceTierIndicator.textContent = customPriceVal !== null
          ? `(Precio fijado manualmente en Q${customPriceVal.toFixed(2)})`
          : `(Escala Kroma Lab para ${run.meters.toFixed(1)}m)`;
      }

      // Barra de distribución visual
      const costPercent = Math.max(0, Math.min(100, 100 - run.profitability.profitMarginPercent));
      const marginPercent = Math.max(0, Math.min(100, run.profitability.profitMarginPercent));

      if (elBarCost) elBarCost.style.width = `${costPercent}%`;
      if (elBarMargin) elBarMargin.style.width = `${marginPercent}%`;
      if (elPctCost) elPctCost.textContent = `${costPercent.toFixed(1)}%`;
      if (elPctMargin) elPctMargin.textContent = `${marginPercent.toFixed(1)}%`;

      if (elBadgeContainer) {
        elBadgeContainer.innerHTML = `
          <span class="badge" style="background: ${run.profitability.badgeColor}22; color: ${run.profitability.badgeColor}; border-color: ${run.profitability.badgeColor}; font-weight: 700; font-size: 0.85rem; padding: 0.4rem 0.85rem;">
            ${run.profitability.profitabilityBadge}
          </span>
        `;
      }

      renderItemizedCostBreakdownTable('costBreakdownTableBody', run);
    }

    function renderItemizedCostBreakdownTable(tbodyId, run) {
      const tbody = document.getElementById(tbodyId);
      if (!tbody) return;

      const total = run.costs.totalProductionCostQ;
      const getPct = (val) => total > 0 ? ((val / total) * 100).toFixed(1) : '0.0';

      const rows = [
        {
          name: 'Film A Base (PET Imprimible)',
          detail: `${run.metricsSummary.filmAMeters.toFixed(2)} m (incl. 5% cargador)`,
          unit: 'Q6.30 / m',
          cost: run.costs.filmA,
        },
        {
          name: 'Film B (Transferencia Calandrada)',
          detail: `${run.metricsSummary.filmBMeters.toFixed(2)} m (incl. 2% arrastre)`,
          unit: 'Q4.08 / m',
          cost: run.costs.filmB,
        },
        {
          name: 'Tinta UV CMYK (Color)',
          detail: `${(run.meters * 4.0).toFixed(1)} ml`,
          unit: 'Q0.55 / ml',
          cost: run.costs.inkCmyk,
        },
        {
          name: 'Tinta UV Blanca (Cama Fotográfica)',
          detail: `${(run.meters * 6.0).toFixed(1)} ml`,
          unit: 'Q0.55 / ml',
          cost: run.costs.inkWhite,
        },
        {
          name: 'Barniz UV Glossy 3D',
          detail: run.hasVarnish ? `${(run.meters * 5.0).toFixed(1)} ml` : '0 ml (Sin barniz)',
          unit: 'Q0.55 / ml',
          cost: run.costs.inkVarnish,
        },
        {
          name: 'Energía Eléctrica y Lámparas UV LED',
          detail: `${run.meters.toFixed(2)} m de tiraje`,
          unit: 'Q1.20 / m',
          cost: run.costs.electricity,
        },
        {
          name: 'Depreciación Cabezales y Mantenimiento',
          detail: `${run.meters.toFixed(2)} m de tiraje`,
          unit: 'Q2.00 / m',
          cost: run.costs.maintenance,
        },
        {
          name: 'Mano de Obra Operativa (Impresión)',
          detail: `${run.meters.toFixed(2)} m de supervisión`,
          unit: 'Q4.00 / m',
          cost: run.costs.labor,
        },
      ];

      if (run.hasCutting) {
        rows.push({
          name: 'Mano de Obra y Navaja de Corte Perimetral',
          detail: `${run.stickersCount} stickers cortados`,
          unit: 'Q0.08 / pieza',
          cost: run.costs.cutting,
        });
      }

      tbody.innerHTML = rows.map(r => `
        <tr>
          <td><strong>${r.name}</strong></td>
          <td style="color: var(--text-secondary);">${r.detail}</td>
          <td style="font-family: var(--font-mono);">${r.unit}</td>
          <td style="font-family: var(--font-mono); font-weight: 700; color: #ef4444;">Q${r.cost.toFixed(2)}</td>
          <td style="font-family: var(--font-mono); font-weight: 600;">${getPct(r.cost)}%</td>
        </tr>
      `).join('');
    }

    function renderMonthlyGoalCard() {
      const container = document.getElementById('monthlyGoalCardContainer');
      if (!container) return;

      const orders = ordersStore.getOrders();
      const portfolio = calculatePortfolioProfitability(orders);
      const goal = portfolio.monthlyGoal;

      container.innerHTML = `
        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">
                Meta Estratégica Mensual
              </span>
              <div style="font-weight: 800; font-size: 1.15rem; color: var(--text-primary);">
                Flujo Neto Proyectado: Q${portfolio.totalNetProfitQ.toFixed(2)} / Q${goal.targetQ.toFixed(2)} (${goal.progressPercent}%)
              </div>
            </div>
            <div style="text-align: right;">
              <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: #10b981; font-weight: 800;">
                Margen Global: ${portfolio.globalProfitMarginPercent.toFixed(1)}%
              </span>
            </div>
          </div>

          <div style="width: 100%; height: 12px; background: rgba(158, 179, 194, 0.2); border-radius: var(--radius-full); overflow: hidden; margin: 0.75rem 0;">
            <div style="width: ${goal.progressPercent}%; height: 100%; background: linear-gradient(90deg, var(--cerulean), #10b981); border-radius: var(--radius-full); transition: width 0.5s ease;"></div>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--text-secondary); flex-wrap: wrap; gap: 0.5rem;">
            <span>Metros facturados: <strong>${portfolio.totalMeters.toFixed(2)} m</strong></span>
            <span>Ganancia promedio por metro: <strong>Q${portfolio.averageProfitPerMeterQ.toFixed(2)}/m</strong></span>
            <span>
              ${goal.remainingProfitQ > 0
                ? `Faltan <strong>Q${goal.remainingProfitQ.toFixed(2)}</strong> (~${goal.remainingMetersNeeded.toFixed(1)} m) para la meta`
                : '🎉 ¡Meta mensual de Q20,000 alcanzada!'
              }
            </span>
          </div>
        </div>
      `;
    }

    function renderOrdersProfitabilityTable() {
      const tbody = document.getElementById('ordersProfitabilityTableBody');
      if (!tbody) return;

      const orders = ordersStore.getOrders();
      const portfolio = calculatePortfolioProfitability(orders);

      if (portfolio.ordersList.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-secondary);">
              No hay pedidos registrados en taller para evaluar rentabilidad.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = portfolio.ordersList.map(item => {
        const p = item.profitability;
        const cust = item.customer || {};
        return `
          <tr>
            <td style="font-weight: 700; font-family: var(--font-mono); color: var(--cerulean);">${item.orderId}</td>
            <td>
              <div style="font-weight: 700;">${cust.company || cust.name || 'Cliente'}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${cust.name || ''}</div>
            </td>
            <td style="font-family: var(--font-mono); font-weight: 600;">${p.meters.toFixed(2)} m</td>
            <td style="font-family: var(--font-mono); font-weight: 800; color: var(--cerulean);">Q${p.pricing.sellingPriceTotalQ.toFixed(2)}</td>
            <td style="font-family: var(--font-mono); color: #ef4444;">Q${p.costs.totalProductionCostQ.toFixed(2)}</td>
            <td style="font-family: var(--font-mono); font-weight: 800; color: var(--color-success);">Q${p.profitability.netProfitQ.toFixed(2)}</td>
            <td style="font-family: var(--font-mono); font-weight: 700;">${p.profitability.profitMarginPercent.toFixed(1)}%</td>
            <td>
              <span class="badge" style="background: ${p.profitability.badgeColor}22; color: ${p.profitability.badgeColor}; border-color: ${p.profitability.badgeColor}; font-size: 0.75rem;">
                ${p.profitability.profitabilityBadge}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }

    function renderAll() {
      renderStickerSimulation();
      renderSimulation();
      renderMonthlyGoalCard();
      renderOrdersProfitabilityTable();
    }

    // Suscripción al almacén de pedidos
    const unsub = ordersStore.subscribe(() => {
      renderMonthlyGoalCard();
      renderOrdersProfitabilityTable();
    });

    // Render Inicial
    renderAll();

    // Teardown
    return () => {
      unsub();
      toggleModal(false);
    };
  },
};
