/**
 * Vista de Pedidos (Adaptada por rol: Cliente vs Personal Staff)
 */

import { store } from '../store.js';

export const ordersView = {
  path: '/pedidos',
  name: 'orders',
  allowedRoles: ['CUSTOMER', 'EMPLOYEE', 'ADMIN'],
  render: () => {
    const role = store.state.user?.role || 'CUSTOMER';
    const isStaff = role === 'ADMIN' || role === 'EMPLOYEE';

    return `
      <div style="padding: 2rem 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <span class="badge">${isStaff ? 'Gestión Operativa B2B' : 'Portal de Clientes'}</span>
            <h1 style="font-size: 2.2rem; font-weight: 800; margin-top: 0.5rem;">
              ${isStaff ? 'Control General de Pedidos' : 'Mis Pedidos UV DTF'}
            </h1>
          </div>
          <a href="/" class="btn btn-primary" data-link>+ Nueva Cotización / Pedido</a>
        </div>

        <div class="calc-card" style="padding: 1.5rem; overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; min-width: 650px;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-color); text-align: left; font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase;">
                <th style="padding: 0.75rem;">Código</th>
                ${isStaff ? '<th style="padding: 0.75rem;">Cliente</th>' : ''}
                <th style="padding: 0.75rem;">Medida</th>
                <th style="padding: 0.75rem;">Cantidad</th>
                <th style="padding: 0.75rem;">Metros</th>
                <th style="padding: 0.75rem;">Estado Producción</th>
                <th style="padding: 0.75rem; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.95rem;">
                <td style="padding: 1rem 0.75rem; font-weight: 700; font-family: var(--font-mono);">KL-00042</td>
                ${isStaff ? '<td style="padding: 1rem 0.75rem;">Café San Cristóbal</td>' : ''}
                <td style="padding: 1rem 0.75rem;">5 × 5 cm</td>
                <td style="padding: 1rem 0.75rem;">150 pcs</td>
                <td style="padding: 1rem 0.75rem; font-family: var(--font-mono);">1.58 m</td>
                <td style="padding: 1rem 0.75rem;">
                  <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--color-success); border-color: rgba(16, 185, 129, 0.3);">En Cola Audley</span>
                </td>
                <td style="padding: 1rem 0.75rem; text-align: right; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary);">Q181.70</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
};
