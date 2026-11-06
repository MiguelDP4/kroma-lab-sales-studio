/**
 * Componente Reutilizable de Esqueleto de Carga (Skeleton Loader)
 * 
 * Proporciona marcadores de posición animados (shimmer) para tablas, tarjetas,
 * paneles Kanban, métricas KPI y perfiles mientras se obtienen los datos reales del backend.
 * 
 * Evita la exposición de datos antiguos de sesiones previas y la visualización de
 * estados vacíos prematuros mientras se resuelve la sincronización con el API.
 */

/**
 * Genera el HTML de esqueletos para la cuadrícula de métricas / tarjetas KPI.
 * @param {number} [count=4]
 * @returns {string}
 */
export function renderMetricsSkeleton(count = 4) {
  const cards = Array.from({ length: count }).map((_, i) => `
    <div class="metric-card skeleton-metric-card" role="status" aria-busy="true" aria-label="Cargando métrica...">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="skeleton-line" style="width: ${40 + (i % 3) * 15}%; height: 12px;"></div>
        <div class="skeleton-circle" style="width: 28px; height: 28px;"></div>
      </div>
      <div class="skeleton-box" style="width: ${60 + (i % 2) * 20}%; height: 32px; margin: 4px 0;"></div>
      <div class="skeleton-line" style="width: ${50 + (i % 4) * 10}%; height: 11px;"></div>
    </div>
  `).join('');

  return `<div class="metrics-grid" role="status" aria-busy="true">${cards}</div>`;
}

/**
 * Genera el HTML de filas de tabla con efecto skeleton.
 * @param {number} [rows=5]
 * @param {number} [cols=6]
 * @returns {string}
 */
export function renderTableSkeleton(rows = 5, cols = 6) {
  const widths = ['75%', '50%', '85%', '60%', '40%', '65%', '90%', '55%'];
  
  return Array.from({ length: rows }).map((_, rIdx) => `
    <tr class="skeleton-table-row" role="status" aria-busy="true">
      ${Array.from({ length: cols }).map((_, cIdx) => {
        const w = widths[(rIdx + cIdx) % widths.length];
        return `
          <td class="skeleton-table-cell">
            <div class="skeleton-line" style="width: ${w}; height: 14px; margin: 0 auto 0 0;"></div>
          </td>
        `;
      }).join('')}
    </tr>
  `).join('');
}

/**
 * Genera el HTML de tarjetas de lista con efecto skeleton (vista móvil o grid de tarjetas).
 * @param {number} [count=3]
 * @returns {string}
 */
export function renderCardsSkeleton(count = 3) {
  return Array.from({ length: count }).map((_, idx) => `
    <div class="skeleton-card" role="status" aria-busy="true" aria-label="Cargando información...">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
        <div class="skeleton-box" style="width: ${90 + (idx % 2) * 20}px; height: 18px;"></div>
        <div class="skeleton-box" style="width: 75px; height: 22px; border-radius: var(--radius-full);"></div>
      </div>
      <div class="skeleton-line" style="width: 85%; height: 16px; margin-bottom: 0.5rem;"></div>
      <div class="skeleton-line" style="width: 60%; height: 13px; margin-bottom: 0.75rem;"></div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px dashed var(--border-color); margin-top: 0.75rem;">
        <div class="skeleton-box" style="width: 70px; height: 20px;"></div>
        <div class="skeleton-box" style="width: 90px; height: 32px; border-radius: var(--radius-sm);"></div>
      </div>
    </div>
  `).join('');
}

/**
 * Genera el HTML de columnas y tarjetas para el tablero Kanban de producción.
 * @param {number} [columns=4]
 * @param {number} [cardsPerCol=2]
 * @returns {string}
 */
export function renderKanbanSkeleton(columns = 4, cardsPerCol = 2) {
  return Array.from({ length: columns }).map((_, colIdx) => `
    <div class="kanban-column" role="status" aria-busy="true" style="opacity: 0.9;">
      <div class="kanban-column-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <div class="skeleton-box" style="width: 110px; height: 20px;"></div>
        <div class="skeleton-box" style="width: 28px; height: 20px; border-radius: var(--radius-full);"></div>
      </div>
      <div class="kanban-column-body">
        ${Array.from({ length: cardsPerCol }).map((_, cardIdx) => `
          <div class="skeleton-kanban-card">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
              <div class="skeleton-box" style="width: 75px; height: 16px;"></div>
              <div class="skeleton-box" style="width: 55px; height: 16px; border-radius: var(--radius-full);"></div>
            </div>
            <div class="skeleton-line" style="width: 80%; height: 14px; margin-bottom: 0.4rem;"></div>
            <div class="skeleton-line" style="width: 50%; height: 12px; margin-bottom: 0.6rem;"></div>
            <div style="display: flex; gap: 0.4rem;">
              <div class="skeleton-box" style="width: 50px; height: 16px;"></div>
              <div class="skeleton-box" style="width: 40px; height: 16px;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

/**
 * Genera el HTML de gráfico / panel analítico con efecto skeleton.
 * @param {number} [heightPx=220]
 * @returns {string}
 */
export function renderChartSkeleton(heightPx = 220) {
  return `
    <div class="skeleton-card" role="status" aria-busy="true" aria-label="Cargando gráfico..." style="height: ${heightPx}px; display: flex; flex-direction: column; justify-content: space-between; padding: 1.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div class="skeleton-box" style="width: 140px; height: 20px;"></div>
        <div class="skeleton-box" style="width: 80px; height: 24px;"></div>
      </div>
      <div style="display: flex; align-items: flex-end; gap: 1rem; height: 65%; padding: 0 0.5rem;">
        <div class="skeleton-box" style="flex: 1; height: 45%;"></div>
        <div class="skeleton-box" style="flex: 1; height: 75%;"></div>
        <div class="skeleton-box" style="flex: 1; height: 60%;"></div>
        <div class="skeleton-box" style="flex: 1; height: 90%;"></div>
        <div class="skeleton-box" style="flex: 1; height: 50%;"></div>
        <div class="skeleton-box" style="flex: 1; height: 80%;"></div>
      </div>
    </div>
  `;
}

/**
 * Genera el HTML de perfil de usuario con efecto skeleton.
 * @returns {string}
 */
export function renderProfileSkeleton() {
  return `
    <div class="skeleton-card" role="status" aria-busy="true" aria-label="Cargando perfil..." style="padding: 1.75rem;">
      <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem;">
        <div class="skeleton-circle" style="width: 64px; height: 64px;"></div>
        <div style="flex: 1;">
          <div class="skeleton-box" style="width: 160px; height: 22px; margin-bottom: 0.4rem;"></div>
          <div class="skeleton-line" style="width: 120px; height: 14px;"></div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div><div class="skeleton-line" style="width: 40%; height: 12px; margin-bottom: 6px;"></div><div class="skeleton-box" style="width: 100%; height: 38px;"></div></div>
        <div><div class="skeleton-line" style="width: 40%; height: 12px; margin-bottom: 6px;"></div><div class="skeleton-box" style="width: 100%; height: 38px;"></div></div>
        <div><div class="skeleton-line" style="width: 40%; height: 12px; margin-bottom: 6px;"></div><div class="skeleton-box" style="width: 100%; height: 38px;"></div></div>
        <div><div class="skeleton-line" style="width: 40%; height: 12px; margin-bottom: 6px;"></div><div class="skeleton-box" style="width: 100%; height: 38px;"></div></div>
      </div>
    </div>
  `;
}
