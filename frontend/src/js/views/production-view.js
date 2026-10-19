/**
 * Vista de Producción y Cola de Impresión Audley (Staff: Empleado y Admin)
 */

export const productionView = {
  path: '/produccion',
  name: 'production',
  allowedRoles: ['EMPLOYEE', 'ADMIN'],
  render: () => `
    <div style="padding: 2rem 0;">
      <div style="margin-bottom: 2rem;">
        <span class="badge">Taller Industrial</span>
        <h1 style="font-size: 2.2rem; font-weight: 800; margin-top: 0.5rem;">
          Tablero de Producción — Impresora Audley
        </h1>
        <p style="color: var(--text-secondary);">
          Supervisión en tiempo real de los rollos de 28 cm útiles y avance de estaciones de trabajo.
        </p>
      </div>

      <!-- Tablero Kanban de Producción -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem;">
        
        <!-- Columna 1: En Cola Audley -->
        <div class="calc-card" style="padding: 1.25rem; border-top: 4px solid var(--cerulean);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="font-size: 1.05rem; font-weight: 700;">1. En Cola Audley</h3>
            <span class="badge" style="font-size: 0.7rem;">2 Órdenes</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
              <div style="font-weight: 700; font-family: var(--font-mono);">#KL-00042 • 1.58m</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0;">Cliente: Café San Cristóbal</div>
              <span class="badge" style="font-size: 0.68rem;">150 pcs (5x5cm)</span>
            </div>
          </div>
        </div>

        <!-- Columna 2: Imprimiendo -->
        <div class="calc-card" style="padding: 1.25rem; border-top: 4px solid var(--color-warning);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="font-size: 1.05rem; font-weight: 700;">2. Imprimiendo UV</h3>
            <span class="badge" style="font-size: 0.7rem;">1 Orden</span>
          </div>
          <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="font-weight: 700; font-family: var(--font-mono);">#KL-00041 • 3.20m</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0;">Cliente: Barbería Vintage</div>
            <span class="badge" style="font-size: 0.68rem;">Relieve + Barniz</span>
          </div>
        </div>

        <!-- Columna 3: Laminado y Corte -->
        <div class="calc-card" style="padding: 1.25rem; border-top: 4px solid var(--baltic-blue);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="font-size: 1.05rem; font-weight: 700;">3. Laminado y Corte</h3>
            <span class="badge" style="font-size: 0.7rem;">0 Órdenes</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-muted); text-align: center; padding: 1rem;">Mesa libre</p>
        </div>

        <!-- Columna 4: Listo para Entrega -->
        <div class="calc-card" style="padding: 1.25rem; border-top: 4px solid var(--color-success);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="font-size: 1.05rem; font-weight: 700;">4. Listo / Empaque</h3>
            <span class="badge" style="font-size: 0.7rem;">1 Orden</span>
          </div>
          <div style="background: var(--bg-surface-elevated); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
            <div style="font-weight: 700; font-family: var(--font-mono);">#KL-00040 • 1.00m</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin: 0.25rem 0;">Cliente: Sport Gym GT</div>
            <span class="badge" style="font-size: 0.68rem; color: var(--color-success);">Empacado en rollo</span>
          </div>
        </div>

      </div>
    </div>
  `
};
