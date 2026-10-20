/**
 * Vista Principal: Hero + Cotizador Interactivo UV DTF + Simulador de Bobina
 */

import { initQuoter } from '../app.js';

export const quoterView = {
  path: '/',
  name: 'quoter',
  allowedRoles: ['VISITOR', 'CUSTOMER', 'EMPLOYEE', 'ADMIN'],
  render: () => `
    <!-- Hero / Encabezado Comercial -->
    <div style="text-align: center; max-width: 820px; margin: 2rem auto 1.5rem;">
      <span class="badge">Tecnología Industrial UV DTF en Guatemala</span>
      <h1 style="font-size: clamp(2rem, 4.5vw, 3rem); font-weight: 800; margin: 1rem 0; line-height: 1.2; letter-spacing: -0.02em;">
        Calcula tu tiraje por metro lineal en tiempo real
      </h1>
      <p style="color: var(--text-secondary); font-size: clamp(1rem, 2vw, 1.15rem); line-height: 1.6;">
        Impresión con lámpara LED UV, cama blanca fotográfica, barniz con relieve 3D y adherencia permanente sobre superficies rígidas.
      </p>
    </div>

    <!-- SECCIÓN DE CALCULADORA Y SIMULADOR -->
    <section class="calculator-section" id="cotizador">
      <div class="calc-layout">
        
        <!-- Panel 1: Parámetros del Sticker y Bobina -->
        <div class="calc-card">
          <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.25rem; color: var(--text-primary);">
            1. Medidas de tu diseño
          </h2>

          <div class="input-row">
            <div class="form-group">
              <label class="form-label" for="stickerWidth">
                Ancho (cm)
                <span class="tip">Máx. 28 cm</span>
              </label>
              <input type="number" id="stickerWidth" class="input-control" value="5" min="0.5" max="28" step="0.1">
            </div>

            <div class="form-group">
              <label class="form-label" for="stickerHeight">
                Alto (cm)
                <span class="tip">Largo libre</span>
              </label>
              <input type="number" id="stickerHeight" class="input-control" value="5" min="0.5" max="200" step="0.1">
            </div>
          </div>

          <!-- Presets Rápidos -->
          <div class="form-group">
            <span class="form-label" style="margin-bottom: 0.35rem;">Medidas comunes de referencia:</span>
            <div class="quick-sizes">
              <button class="btn-chip active" data-w="5" data-h="5">5 × 5 cm (Vasos/Tazas)</button>
              <button class="btn-chip" data-w="8" data-h="5">8 × 5 cm (Termos Stanley/Yeti)</button>
              <button class="btn-chip" data-w="10" data-h="10">10 × 10 cm (Laptops/Autos)</button>
              <button class="btn-chip" data-w="4" data-h="4">4 × 4 cm (Logos pequeños)</button>
            </div>
          </div>

          <div class="form-group" style="margin-top: 1.5rem;">
            <label class="form-label" for="stickerQty">
              Cantidad de stickers
              <span class="tip">Piezas totales</span>
            </label>
            <input type="number" id="stickerQty" class="input-control" value="50" min="1" max="10000" step="1">
          </div>

          <!-- Opción de Acabado: Despiece / Corte Recto de Precisión -->
          <div class="cutting-option-card" id="cuttingCard">
            <label class="checkbox-wrapper" for="optCutting">
              <input type="checkbox" id="optCutting">
              <div class="checkbox-content">
                <div class="checkbox-header">
                  <span class="checkbox-title">✂️ Entregar cortados individualmente</span>
                  <span class="checkbox-badge" id="cuttingBadgeRate">+Q0.35 / pza</span>
                </div>
                <p class="checkbox-desc">
                  Recibe tus stickers separados en recuadros listos para aplicar o entregar a tus clientes. Corte perimetral recto con máquina de precisión.
                </p>
              </div>
            </label>

            <div class="cutting-details">
              <div class="cutting-tier-info">
                <span class="tier-tag active" id="tierTag1">1 - 50 uds: Q0.35 c/u</span>
                <span class="tier-tag" id="tierTag2">51 - 200 uds: Q0.30 c/u</span>
                <span class="tier-tag" id="tierTag3">+200 uds: Q0.25 c/u</span>
              </div>
              <p class="cutting-policy-note">
                * <strong>Nota de acabado:</strong> Si no seleccionas corte, tu pedido se entrega en <strong>rollo continuo sin cortar</strong> (estándar de maquila industrial). Tarifa mínima de servicio de corte: Q25.00.
              </p>
            </div>
          </div>

          <!-- Zona de Carga de Archivo Gráfico -->
          <div class="form-group" style="margin-top: 1.5rem;">
            <label class="form-label">
              Diseño de Impresión
              <span class="tip">PNG, TIFF, PDF a 300 DPI</span>
            </label>
            <div class="upload-dropzone" id="quoterDropzone">
              <input type="file" id="quoterFileInput" accept=".png,.tif,.tiff,.pdf,.svg,.ai,.psd" style="display: none;">
              <div id="dropzoneEmptyState" class="dropzone-empty">
                <div class="dropzone-icon">📁</div>
                <div class="dropzone-text">
                  <strong>Arrastra tu archivo aquí</strong> o <span class="dropzone-link">haz clic para explorar</span>
                </div>
                <span class="dropzone-hint">Formatos: PNG transparente, TIFF, PDF, SVG, AI (Máx. 100 MB)</span>
              </div>

              <div id="dropzoneFileSelected" class="dropzone-selected" style="display: none; flex-direction: column; align-items: stretch; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.75rem; width: 100%;">
                  <div class="dropzone-thumb-wrap" id="dropzoneThumbWrap">
                    <span id="dropzoneThumbIcon">📄</span>
                  </div>
                  <div class="dropzone-file-info" style="flex: 1;">
                    <div class="dropzone-file-name" id="dropzoneFileName">archivo.png</div>
                    <div style="display: flex; gap: 0.5rem; align-items: center; font-size: 0.78rem;">
                      <span id="dropzoneFileSize" style="color: var(--text-muted);">1.2 MB</span>
                      <span id="dropzoneUploadBadge" class="badge" style="font-size: 0.7rem; display: none;">☁️ R2</span>
                    </div>
                  </div>
                  <button type="button" class="btn-remove-file" id="btnRemoveFile" title="Quitar archivo" style="min-width: 44px; min-height: 44px;">✕</button>
                </div>

                <!-- Barra de Progreso de Subida Real -->
                <div id="dropzoneProgressWrap" style="display: none; width: 100%;">
                  <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                    <span id="dropzoneProgressLabel">Subiendo archivo a Cloudflare R2...</span>
                    <span id="dropzoneProgressPercent" style="font-family: var(--font-mono); font-weight: 700;">0%</span>
                  </div>
                  <div style="height: 6px; background: var(--border-color); border-radius: 999px; overflow: hidden;">
                    <div id="dropzoneProgressBar" style="height: 100%; width: 0%; background: var(--cerulean); transition: width 0.15s ease-out;"></div>
                  </div>
                </div>
              </div>
            </div>
            <div id="dropzoneError" class="dropzone-error-msg" style="display: none;"></div>
          </div>

          <!-- Simulador Visual de Bobina Audley -->
          <div class="simulator-container">
            <div class="simulator-header">
              <span>ANCHO DE BOBINA: 28 CM ÚTILES</span>
              <span id="canvasStats">5 por fila</span>
            </div>
            <div class="roll-canvas-wrap">
              <canvas id="rollCanvas" width="580" height="200"></canvas>
            </div>
            <p style="font-size: 0.76rem; color: var(--text-muted); margin-top: 0.5rem;">
              * Esquema a escala con separación técnica de 3 mm entre piezas para despiece seguro.
            </p>
          </div>
        </div>

        <!-- Panel 2: Desglose Técnico y Financiero -->
        <div class="calc-card calc-results-panel">
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.25rem; color: var(--text-primary);">
              2. Desglose del Pedido
            </h2>

            <div class="results-breakdown">
              <div class="breakdown-row">
                <span>Stickers por fila:</span>
                <strong id="resStickersPerRow">5 piezas</strong>
              </div>
              <div class="breakdown-row">
                <span>Filas requeridas:</span>
                <strong id="resRows">10 filas</strong>
              </div>
              <div class="breakdown-row">
                <span>Largo físico que ocupan:</span>
                <strong id="resPhysicalLength">51.8 cm</strong>
              </div>
              <div class="breakdown-row">
                <span>Metros lineales a cobrar:</span>
                <strong id="resBillableMeters">1.00 m (Mínimo)</strong>
              </div>
              <div class="breakdown-row">
                <span>Tarifa por metro lineal:</span>
                <strong id="resTierRate">Q140.00 / m</strong>
              </div>
              <div class="breakdown-row">
                <span>Corte individual:</span>
                <strong id="resCuttingCost">No incluido (En rollo)</strong>
              </div>
            </div>

            <!-- Aviso de aprovechamiento de metro mínimo -->
            <div id="minimumNotice" class="minimum-notice" style="display: none;"></div>

            <!-- Caja de Total en Quetzales -->
            <div class="total-box">
              <div class="total-label">Total Estimado en Quetzales</div>
              <div class="total-price" id="resTotalPrice">Q140.00</div>
              <div class="unit-price-hint" id="resUnitHint">Costo aprox: Q2.80 por sticker</div>
            </div>
          </div>

          <!-- Acciones Comerciales -->
          <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1.5rem;">
            <button id="btnAddToCart" class="btn btn-primary" style="width: 100%;">
              <span>+ Agregar al Carrito</span>
              <span>🛒</span>
            </button>
            <button id="btnSaveQuote" class="btn btn-secondary" style="width: 100%; border-color: var(--cerulean); color: var(--cerulean); min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;">
              <span>💾 Guardar Cotización</span>
            </button>
            <button id="btnQuoteWhatsApp" class="btn btn-whatsapp" style="width: 100%;">
              <span>Consultar esta Cotización por WhatsApp</span>
              <span>💬</span>
            </button>
          </div>
        </div>

      </div>
    </section>
  `,
  onMount: () => {
    initQuoter();
  }
};
