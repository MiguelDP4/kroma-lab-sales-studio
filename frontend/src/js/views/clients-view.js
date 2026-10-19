/**
 * Vista de Directorio de Clientes B2B (Staff: Empleado y Admin)
 */

export const clientsView = {
  path: '/clientes',
  name: 'clients',
  allowedRoles: ['EMPLOYEE', 'ADMIN'],
  render: () => `
    <div style="padding: 2rem 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span class="badge">Cartera B2B</span>
          <h1 style="font-size: 2.2rem; font-weight: 800; margin-top: 0.5rem;">
            Directorio de Clientes
          </h1>
        </div>
        <button class="btn btn-primary" onclick="alert('Funcionalidad de alta de cliente')">+ Registrar Cliente</button>
      </div>

      <div class="calc-card" style="padding: 1.5rem; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color); text-align: left; font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase;">
              <th style="padding: 0.75rem;">Empresa / Marca</th>
              <th style="padding: 0.75rem;">Contacto</th>
              <th style="padding: 0.75rem;">Teléfono WhatsApp</th>
              <th style="padding: 0.75rem;">NIT (SAT)</th>
              <th style="padding: 0.75rem; text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.95rem;">
              <td style="padding: 1rem 0.75rem; font-weight: 700;">Café San Cristóbal</td>
              <td style="padding: 1rem 0.75rem;">Rodrigo Méndez</td>
              <td style="padding: 1rem 0.75rem; font-family: var(--font-mono);">+502 5555-1234</td>
              <td style="padding: 1rem 0.75rem; font-family: var(--font-mono);">7845129-4</td>
              <td style="padding: 1rem 0.75rem; text-align: right;">
                <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Ver Pedidos</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
};
