/**
 * Vista de Gestión de Usuarios y Permisos (Exclusivo: Administrador)
 */

export const usersView = {
  path: '/usuarios',
  name: 'users',
  allowedRoles: ['ADMIN'],
  render: () => `
    <div style="padding: 2rem 0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <span class="badge" style="color: var(--cerulean); border-color: var(--cerulean);">Seguridad y Acceso RBAC</span>
          <h1 style="font-size: 2.2rem; font-weight: 800; margin-top: 0.5rem;">
            Administración de Usuarios
          </h1>
        </div>
        <button class="btn btn-primary" onclick="alert('Invitar usuario')">+ Invitar Empleado</button>
      </div>

      <div class="calc-card" style="padding: 1.5rem; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
          <thead>
            <tr style="border-bottom: 2px solid var(--border-color); text-align: left; font-size: 0.85rem; color: var(--text-secondary); text-transform: uppercase;">
              <th style="padding: 0.75rem;">Usuario</th>
              <th style="padding: 0.75rem;">Email</th>
              <th style="padding: 0.75rem;">Rol Asignado</th>
              <th style="padding: 0.75rem;">Estado</th>
              <th style="padding: 0.75rem; text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.95rem;">
              <td style="padding: 1rem 0.75rem; font-weight: 700;">Miguel Dubois</td>
              <td style="padding: 1rem 0.75rem;">miguel@kromalab.gt</td>
              <td style="padding: 1rem 0.75rem;">
                <span class="badge" style="background: var(--regal-navy); color: #fff;">ADMIN</span>
              </td>
              <td style="padding: 1rem 0.75rem; color: var(--color-success); font-weight: 600;">Activo</td>
              <td style="padding: 1rem 0.75rem; text-align: right;">
                <button class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;">Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
};
