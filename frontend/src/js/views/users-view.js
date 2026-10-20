/**
 * Vista de Gestión de Usuarios y Permisos (Exclusivo: Administrador)
 * Permite administrar colaboradores de taller, operadores de máquina Audley,
 * asignar roles bajo política Default-Deny, auditar accesos y restablecer contraseñas.
 */

import { usersStore } from '../modules/users-store.js';
import { USER_ROLES } from '../../shared/business-config.js';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_DETAILS,
  USER_STATUS,
  USER_DEPARTMENTS,
  hasPermission,
} from '../../shared/rbac-config.js';

export const usersView = {
  path: '/usuarios',
  name: 'users',
  allowedRoles: ['ADMIN'],
  render: () => `
    <div style="padding: 2rem 0 4rem;">
      <!-- Encabezado Operativo y Acciones -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; flex-wrap: wrap; gap: 1.25rem;">
        <div>
          <span class="badge" style="color: var(--cerulean); border-color: var(--cerulean);">Seguridad y Acceso RBAC</span>
          <h1 style="font-size: clamp(1.8rem, 4vw, 2.3rem); font-weight: 800; margin-top: 0.4rem; letter-spacing: -0.02em;">
            Administración de Usuarios y Permisos
          </h1>
          <p style="color: var(--text-secondary); font-size: 0.95rem;">
            Control de credenciales, roles de taller y privilegios de acceso para colaboradores de Kroma Lab.
          </p>
        </div>

        <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
          <button id="btnOpenRbacModal" class="btn btn-secondary" style="font-size: 0.88rem; padding: 0.55rem 1rem;">
            <span>🛡️</span>
            <span>Matriz de Permisos RBAC</span>
          </button>
          <button id="btnOpenCreateUserModal" class="btn btn-primary" style="font-size: 0.88rem; padding: 0.55rem 1.1rem;">
            <span>+</span>
            <span>Invitar Empleado</span>
          </button>
        </div>
      </div>

      <!-- Métricas KPI de Usuarios y Accesos -->
      <div id="usersMetricsContainer" class="orders-metrics-grid">
        <!-- Inyectado dinámicamente por renderUsersMetrics() -->
      </div>

      <!-- Barra de Búsqueda y Filtros -->
      <div class="orders-controls-bar">
        <div class="orders-filters-group">
          <input
            type="text"
            id="userSearchInput"
            class="input-control orders-search-input"
            placeholder="Buscar por nombre, correo, teléfono o departamento..."
          >

          <select id="userRoleFilter" class="input-control" style="max-width: 200px;">
            <option value="ALL">Rol: Todos</option>
            <option value="${USER_ROLES.ADMIN}">👑 Administrador</option>
            <option value="${USER_ROLES.EMPLOYEE}">⚙️ Empleado / Operador</option>
            <option value="${USER_ROLES.CUSTOMER}">🏢 Cliente B2B</option>
          </select>

          <select id="userStatusFilter" class="input-control" style="max-width: 175px;">
            <option value="ALL">Estado: Todos</option>
            <option value="${USER_STATUS.ACTIVE.id}">🟢 Activos</option>
            <option value="${USER_STATUS.INACTIVE.id}">🔴 Inactivos</option>
          </select>
        </div>
      </div>

      <!-- Tabla Principal de Usuarios -->
      <div class="calc-card" style="padding: 1.25rem; overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <div class="mobile-scroll-hint">
          <span>👈 Desliza horizontalmente para ver más columnas 👉</span>
        </div>
        <table class="orders-table">
          <thead>
            <tr>
              <th>Usuario & Puesto</th>
              <th>Email / Contacto</th>
              <th>Teléfono WhatsApp</th>
              <th>Rol Asignado</th>
              <th>Estado</th>
              <th style="text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody id="usersTableBody">
            <!-- Inyectado dinámicamente por renderUsersTable() -->
          </tbody>
        </table>
        <div id="usersEmptyState" class="kanban-empty-col" style="display: none; margin: 1.5rem 0;">
          No se encontraron usuarios que coincidan con los filtros aplicados.
        </div>
      </div>
    </div>

    <!-- ======================================================================
         MODAL 1: REGISTRAR / EDITAR USUARIO
         ====================================================================== -->
    <div id="userFormModal" class="modal-backdrop" style="display: none;">
      <div class="modal-card" style="width: min(580px, 94vw);">
        <div class="modal-header">
          <div>
            <h2 id="userModalTitle" style="font-size: 1.25rem; font-weight: 800;">+ Registrar / Invitar Colaborador</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">Asigna permisos de taller o administración interna</p>
          </div>
          <button type="button" class="btn-close-modal" id="btnCloseUserFormModal" aria-label="Cerrar modal">✕</button>
        </div>

        <form id="formUser">
          <input type="hidden" id="userFormId" value="">

          <div id="userFormError" style="display: none; padding: 0.75rem 1rem; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); color: #fca5a5; font-size: 0.85rem; margin-bottom: 1rem;"></div>

          <div class="input-row">
            <div class="form-group">
              <label class="form-label" for="userFormName">Nombre Completo:</label>
              <input type="text" id="userFormName" class="input-control" placeholder="Ej. Carlos Morales" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="userFormEmail">Correo Electrónico:</label>
              <input type="email" id="userFormEmail" class="input-control" placeholder="carlos@kromalab.gt" required>
            </div>
          </div>

          <div class="input-row">
            <div class="form-group">
              <label class="form-label" for="userFormPhone">Teléfono WhatsApp:</label>
              <input type="tel" id="userFormPhone" class="input-control" placeholder="+502 5555-1234">
            </div>
            <div class="form-group">
              <label class="form-label" for="userFormDepartment">Puesto / Departamento:</label>
              <select id="userFormDepartment" class="input-control">
                ${USER_DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="input-row">
            <div class="form-group">
              <label class="form-label" for="userFormRole">Rol en el Sistema (RBAC):</label>
              <select id="userFormRole" class="input-control">
                <option value="${USER_ROLES.EMPLOYEE}">⚙️ Empleado / Operador de Taller</option>
                <option value="${USER_ROLES.ADMIN}">👑 Administrador General</option>
                <option value="${USER_ROLES.CUSTOMER}">🏢 Cliente B2B</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="userFormStatus">Estado de Acceso:</label>
              <select id="userFormStatus" class="input-control">
                <option value="${USER_STATUS.ACTIVE.id}">🟢 Activo</option>
                <option value="${USER_STATUS.INACTIVE.id}">🔴 Inactivo (Suspendido)</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="userFormNotes">Notas de Auditoría / Responsabilidades:</label>
            <textarea id="userFormNotes" class="input-control" rows="2" placeholder="Ej. Encargado de preparación de archivos RIP y calibración..."></textarea>
          </div>

          <div class="modal-actions-footer">
            <button type="button" class="btn btn-secondary" id="btnCancelUserFormModal">Cancelar</button>
            <button type="submit" class="btn btn-primary" id="btnSaveUser">Guardar Usuario</button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================================
         MODAL 2: RESTABLECER CONTRASEÑA
         ====================================================================== -->
    <div id="resetPasswordModal" class="modal-backdrop" style="display: none;">
      <div class="modal-card" style="width: min(500px, 94vw);">
        <div class="modal-header">
          <div>
            <span class="badge" style="color: var(--color-warning); border-color: var(--color-warning);">Seguridad</span>
            <h2 style="font-size: 1.25rem; font-weight: 800; margin-top: 0.35rem;">Restablecer Contraseña</h2>
            <p id="resetPwUserName" style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 0.2rem;">Usuario: -</p>
          </div>
          <button type="button" class="btn-close-modal" id="btnCloseResetPwModal" aria-label="Cerrar modal">✕</button>
        </div>

        <input type="hidden" id="resetPwUserId" value="">

        <div style="margin-bottom: 1.25rem;">
          <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">
            Genera una nueva contraseña temporal segura para el colaborador. Se le solicitará actualizarla en su siguiente inicio de sesión.
          </p>

          <div class="form-group">
            <label class="form-label" for="resetPwInput">
              Nueva Contraseña Temporal:
              <span class="tip">Mínimo 6 caracteres</span>
            </label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="text" id="resetPwInput" class="input-control" style="font-family: var(--font-mono); font-weight: 700;">
              <button type="button" id="btnGenerateRandomPw" class="btn btn-secondary" style="white-space: nowrap; padding: 0.5rem 0.85rem;" title="Generar clave aleatoria">
                🎲 Generar
              </button>
            </div>
          </div>

          <div id="resetPwFeedback" style="display: none; padding: 0.75rem 1rem; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); margin-top: 0.75rem;">
            <div style="font-size: 0.82rem; color: #34d399; font-weight: 700; margin-bottom: 0.25rem;">✓ Contraseña restablecida con éxito:</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong id="resetPwSuccessCode" style="font-family: var(--font-mono); font-size: 1.1rem; color: #ffffff;">-</strong>
              <button type="button" id="btnCopyPw" class="btn btn-secondary" style="font-size: 0.78rem; padding: 0.3rem 0.65rem;">
                📋 Copiar
              </button>
            </div>
          </div>
        </div>

        <div class="modal-actions-footer">
          <button type="button" class="btn btn-secondary" id="btnCancelResetPwModal">Cerrar</button>
          <button type="button" class="btn btn-primary" id="btnConfirmResetPw">Actualizar Contraseña</button>
        </div>
      </div>
    </div>

    <!-- ======================================================================
         MODAL 3: MATRIZ DE PERMISOS RBAC (DEFAULT-DENY)
         ====================================================================== -->
    <div id="rbacMatrixModal" class="modal-backdrop" style="display: none;">
      <div class="modal-card" style="width: min(780px, 95vw); max-height: 92vh;">
        <div class="modal-header">
          <div>
            <span class="badge" style="color: var(--cerulean); border-color: var(--cerulean);">Seguridad y Acceso</span>
            <h2 style="font-size: 1.35rem; font-weight: 800; margin-top: 0.35rem;">Matriz Maestra de Permisos RBAC</h2>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 0.2rem;">
              Política de seguridad <strong>Default-Deny</strong>: Todo acceso no explícitamente concedido queda bloqueado.
            </p>
          </div>
          <button type="button" class="btn-close-modal" id="btnCloseRbacModal" aria-label="Cerrar modal">✕</button>
        </div>

        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin-bottom: 1.5rem;">
          <table class="rbac-matrix-table">
            <thead>
              <tr style="background: var(--bg-surface-elevated);">
                <th>Permiso / Operación</th>
                <th>👑 Administrador</th>
                <th>⚙️ Empleado</th>
                <th>🏢 Cliente B2B</th>
                <th>🌐 Visitante</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(PERMISSIONS).map(perm => `
                <tr>
                  <td>
                    <strong>${perm.label}</strong>
                    <div style="font-size: 0.76rem; color: var(--text-muted);">${perm.desc}</div>
                  </td>
                  <td>${hasPermission('ADMIN', perm.code) ? '<span class="rbac-perm-check">✓</span>' : '<span class="rbac-perm-cross">✕</span>'}</td>
                  <td>${hasPermission('EMPLOYEE', perm.code) ? '<span class="rbac-perm-check">✓</span>' : '<span class="rbac-perm-cross">✕</span>'}</td>
                  <td>${hasPermission('CUSTOMER', perm.code) ? '<span class="rbac-perm-check">✓</span>' : '<span class="rbac-perm-cross">✕</span>'}</td>
                  <td>${hasPermission('VISITOR', perm.code) ? '<span class="rbac-perm-check">✓</span>' : '<span class="rbac-perm-cross">✕</span>'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="modal-actions-footer">
          <button type="button" class="btn btn-primary" id="btnOkRbacModal">Entendido</button>
        </div>
      </div>
    </div>

    <!-- ======================================================================
         MODAL 4: CONFIRMACIÓN DE ELIMINACIÓN
         ====================================================================== -->
    <div id="deleteUserModal" class="modal-backdrop" style="display: none;">
      <div class="modal-card" style="width: min(440px, 94vw);">
        <div class="modal-header">
          <h2 style="font-size: 1.2rem; font-weight: 800; color: #ef4444;">Eliminar Usuario</h2>
          <button type="button" class="btn-close-modal" id="btnCloseDeleteUserModal" aria-label="Cerrar modal">✕</button>
        </div>

        <input type="hidden" id="deleteUserId" value="">

        <div id="deleteUserError" style="display: none; padding: 0.75rem 1rem; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); color: #fca5a5; font-size: 0.85rem; margin-bottom: 1rem;"></div>

        <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1.25rem;">
          ¿Estás seguro de que deseas eliminar permanentemente a <strong id="deleteUserName" style="color: var(--text-primary);">-</strong>? Esta acción no se puede deshacer.
        </p>

        <div class="modal-actions-footer">
          <button type="button" class="btn btn-secondary" id="btnCancelDeleteUserModal">Cancelar</button>
          <button type="button" class="btn btn-primary" id="btnConfirmDeleteUser" style="background: #ef4444; border-color: #ef4444;">Eliminar Permanentemente</button>
        </div>
      </div>
    </div>
  `,

  onMount: () => {
    usersStore.syncWithApi().catch(() => {});
    // Referencias al DOM
    const metricsContainer = document.getElementById('usersMetricsContainer');
    const tableBody = document.getElementById('usersTableBody');
    const emptyState = document.getElementById('usersEmptyState');
    const searchInput = document.getElementById('userSearchInput');
    const roleFilter = document.getElementById('userRoleFilter');
    const statusFilter = document.getElementById('userStatusFilter');

    // Modales
    const userModal = document.getElementById('userFormModal');
    const resetPwModal = document.getElementById('resetPasswordModal');
    const rbacModal = document.getElementById('rbacMatrixModal');
    const deleteModal = document.getElementById('deleteUserModal');

    // Botones de Apertura de Modales
    const btnOpenCreate = document.getElementById('btnOpenCreateUserModal');
    const btnOpenRbac = document.getElementById('btnOpenRbacModal');

    // Botones de Cierre de Modales
    const btnCloseUserModal = document.getElementById('btnCloseUserFormModal');
    const btnCancelUserModal = document.getElementById('btnCancelUserFormModal');
    const btnCloseResetPw = document.getElementById('btnCloseResetPwModal');
    const btnCancelResetPw = document.getElementById('btnCancelResetPwModal');
    const btnCloseRbac = document.getElementById('btnCloseRbacModal');
    const btnOkRbac = document.getElementById('btnOkRbacModal');
    const btnCloseDeleteModal = document.getElementById('btnCloseDeleteUserModal');
    const btnCancelDeleteModal = document.getElementById('btnCancelDeleteUserModal');

    // Formulario de Usuario
    const formUser = document.getElementById('formUser');
    const userModalTitle = document.getElementById('userModalTitle');
    const userFormId = document.getElementById('userFormId');
    const userFormName = document.getElementById('userFormName');
    const userFormEmail = document.getElementById('userFormEmail');
    const userFormPhone = document.getElementById('userFormPhone');
    const userFormDepartment = document.getElementById('userFormDepartment');
    const userFormRole = document.getElementById('userFormRole');
    const userFormStatus = document.getElementById('userFormStatus');
    const userFormNotes = document.getElementById('userFormNotes');
    const userFormError = document.getElementById('userFormError');

    // Formulario Restablecer Contraseña
    const resetPwUserId = document.getElementById('resetPwUserId');
    const resetPwUserName = document.getElementById('resetPwUserName');
    const resetPwInput = document.getElementById('resetPwInput');
    const btnGenerateRandomPw = document.getElementById('btnGenerateRandomPw');
    const btnCopyPw = document.getElementById('btnCopyPw');
    const resetPwFeedback = document.getElementById('resetPwFeedback');
    const resetPwSuccessCode = document.getElementById('resetPwSuccessCode');
    const btnConfirmResetPw = document.getElementById('btnConfirmResetPw');

    // Formulario de Eliminación
    const deleteUserId = document.getElementById('deleteUserId');
    const deleteUserName = document.getElementById('deleteUserName');
    const deleteUserError = document.getElementById('deleteUserError');
    const btnConfirmDeleteUser = document.getElementById('btnConfirmDeleteUser');

    function toggleModal(modal, show) {
      if (modal) {
        modal.style.display = show ? 'block' : 'none';
        if (show) {
          document.body.style.overflow = 'hidden';
        } else {
          document.body.style.overflow = '';
        }
      }
    }

    function renderMetrics() {
      if (!metricsContainer) return;
      const m = usersStore.getMetrics();

      metricsContainer.innerHTML = `
        <div class="orders-metric-card">
          <span class="orders-metric-title">Total Usuarios</span>
          <div class="orders-metric-value">${m.totalUsers}</div>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Cuentas registradas</span>
        </div>

        <div class="orders-metric-card">
          <span class="orders-metric-title">Colaboradores Activos</span>
          <div class="orders-metric-value" style="color: var(--cerulean);">${m.activeStaff}</div>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Taller Audley y Ventas</span>
        </div>

        <div class="orders-metric-card">
          <span class="orders-metric-title">Administradores</span>
          <div class="orders-metric-value" style="color: #ffffff;">${m.activeAdmins}</div>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Control total RBAC</span>
        </div>

        <div class="orders-metric-card">
          <span class="orders-metric-title">Clientes B2B</span>
          <div class="orders-metric-value" style="color: var(--color-success);">${m.activeCustomers}</div>
          <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Portal autoservicio</span>
        </div>
      `;
    }

    function getInitials(name) {
      if (!name) return 'KL';
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function renderTable(usersList) {
      if (!tableBody) return;

      if (!usersList || usersList.length === 0) {
        tableBody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
      }

      if (emptyState) emptyState.style.display = 'none';

      tableBody.innerHTML = usersList.map(u => {
        const roleInfo = ROLE_DETAILS[u.role] || ROLE_DETAILS.EMPLOYEE;
        const statusInfo = u.status === USER_STATUS.ACTIVE.id ? USER_STATUS.ACTIVE : USER_STATUS.INACTIVE;
        const roleClass = u.role === USER_ROLES.ADMIN
          ? 'role-badge-admin'
          : u.role === USER_ROLES.CUSTOMER
            ? 'role-badge-customer'
            : 'role-badge-employee';

        return `
          <tr data-user-id="${u.id}">
            <td>
              <div class="user-identity-cell">
                <div class="user-avatar-badge">${getInitials(u.name)}</div>
                <div>
                  <div class="user-name-title">${u.name}</div>
                  <div class="user-department-tag">${u.department || 'Taller UV DTF'}</div>
                </div>
              </div>
            </td>

            <td>
              <div style="font-family: var(--font-mono); font-size: 0.88rem; font-weight: 600;">${u.email}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">
                Alta: ${new Date(u.createdAt).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </td>

            <td>
              ${u.phone ? `
                <a href="https://wa.me/${u.phone.replace(/[^0-9]/g, '')}" target="_blank" rel="noopener noreferrer" style="color: var(--cerulean); font-size: 0.88rem; font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;">
                  <span>💬</span>
                  <span>${u.phone}</span>
                </a>
              ` : '<span style="color: var(--text-muted); font-size: 0.82rem;">Sin teléfono</span>'}
            </td>

            <td>
              <span class="badge ${roleClass}" style="font-size: 0.75rem;">
                ${roleInfo.icon} ${roleInfo.badgeLabel}
              </span>
            </td>

            <td>
              <button
                type="button"
                class="btn-status-toggle"
                data-user-id="${u.id}"
                style="background: ${statusInfo.bg}; border: 1px solid ${statusInfo.color}; color: ${statusInfo.color}; border-radius: 999px; padding: 0.2rem 0.65rem; font-size: 0.76rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem;"
                title="Haga clic para alternar estado"
              >
                ${statusInfo.badge}
              </button>
            </td>

            <td style="text-align: right;">
              <div style="display: inline-flex; align-items: center; gap: 0.4rem;">
                <button
                  type="button"
                  class="btn-action-icon btn-edit-user"
                  data-user-id="${u.id}"
                  title="Editar Usuario"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  class="btn-action-icon btn-reset-pw"
                  data-user-id="${u.id}"
                  title="Restablecer Contraseña"
                >
                  🔑
                </button>
                <button
                  type="button"
                  class="btn-action-icon btn-delete-user"
                  data-user-id="${u.id}"
                  title="Eliminar Usuario"
                  style="color: #f87171;"
                >
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

      attachTableEvents();
    }

    function applyFilters() {
      const q = searchInput ? searchInput.value : '';
      const r = roleFilter ? roleFilter.value : 'ALL';
      const s = statusFilter ? statusFilter.value : 'ALL';
      const filtered = usersStore.filterUsers(q, r, s);
      renderTable(filtered);
    }

    function attachTableEvents() {
      // Toggle de Estado Rápido
      document.querySelectorAll('.btn-status-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-user-id');
          try {
            usersStore.toggleUserStatus(id);
          } catch (err) {
            alert(err.message);
          }
        });
      });

      // Botón Editar Usuario
      document.querySelectorAll('.btn-edit-user').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-user-id');
          const user = usersStore.getUserById(id);
          if (!user) return;

          if (userModalTitle) userModalTitle.textContent = 'Editar Colaborador';
          if (userFormId) userFormId.value = user.id;
          if (userFormName) userFormName.value = user.name;
          if (userFormEmail) userFormEmail.value = user.email;
          if (userFormPhone) userFormPhone.value = user.phone || '';
          if (userFormDepartment) userFormDepartment.value = user.department || USER_DEPARTMENTS[0];
          if (userFormRole) userFormRole.value = user.role;
          if (userFormStatus) userFormStatus.value = user.status;
          if (userFormNotes) userFormNotes.value = user.notes || '';
          if (userFormError) userFormError.style.display = 'none';

          toggleModal(userModal, true);
        });
      });

      // Botón Restablecer Contraseña
      document.querySelectorAll('.btn-reset-pw').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-user-id');
          const user = usersStore.getUserById(id);
          if (!user) return;

          if (resetPwUserId) resetPwUserId.value = user.id;
          if (resetPwUserName) resetPwUserName.textContent = `Colaborador: ${user.name} (${user.email})`;
          if (resetPwInput) resetPwInput.value = `Kroma!${Math.floor(1000 + Math.random() * 9000)}`;
          if (resetPwFeedback) resetPwFeedback.style.display = 'none';

          toggleModal(resetPwModal, true);
        });
      });

      // Botón Eliminar Usuario
      document.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-user-id');
          const user = usersStore.getUserById(id);
          if (!user) return;

          if (deleteUserId) deleteUserId.value = user.id;
          if (deleteUserName) deleteUserName.textContent = `${user.name} (${user.email})`;
          if (deleteUserError) deleteUserError.style.display = 'none';

          toggleModal(deleteModal, true);
        });
      });
    }

    // Filtros reactivos
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (roleFilter) roleFilter.addEventListener('change', applyFilters);
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);

    // Apertura de Modales
    if (btnOpenCreate) {
      btnOpenCreate.addEventListener('click', () => {
        if (formUser) formUser.reset();
        if (userModalTitle) userModalTitle.textContent = '+ Registrar / Invitar Colaborador';
        if (userFormId) userFormId.value = '';
        if (userFormRole) userFormRole.value = USER_ROLES.EMPLOYEE;
        if (userFormStatus) userFormStatus.value = USER_STATUS.ACTIVE.id;
        if (userFormDepartment) userFormDepartment.value = USER_DEPARTMENTS[1]; // Taller
        if (userFormError) userFormError.style.display = 'none';

        toggleModal(userModal, true);
      });
    }

    if (btnOpenRbac) {
      btnOpenRbac.addEventListener('click', () => toggleModal(rbacModal, true));
    }

    // Cierre de Modales
    if (btnCloseUserModal) btnCloseUserModal.addEventListener('click', () => toggleModal(userModal, false));
    if (btnCancelUserModal) btnCancelUserModal.addEventListener('click', () => toggleModal(userModal, false));

    if (btnCloseResetPw) btnCloseResetPw.addEventListener('click', () => toggleModal(resetPwModal, false));
    if (btnCancelResetPw) btnCancelResetPw.addEventListener('click', () => toggleModal(resetPwModal, false));

    if (btnCloseRbac) btnCloseRbac.addEventListener('click', () => toggleModal(rbacModal, false));
    if (btnOkRbac) btnOkRbac.addEventListener('click', () => toggleModal(rbacModal, false));

    if (btnCloseDeleteModal) btnCloseDeleteModal.addEventListener('click', () => toggleModal(deleteModal, false));
    if (btnCancelDeleteModal) btnCancelDeleteModal.addEventListener('click', () => toggleModal(deleteModal, false));

    // Guardar Usuario (Crear / Editar)
    if (formUser) {
      formUser.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = userFormId ? userFormId.value : '';
        const name = userFormName ? userFormName.value.trim() : '';
        const email = userFormEmail ? userFormEmail.value.trim() : '';
        const phone = userFormPhone ? userFormPhone.value.trim() : '';
        const department = userFormDepartment ? userFormDepartment.value : '';
        const role = userFormRole ? userFormRole.value : USER_ROLES.EMPLOYEE;
        const status = userFormStatus ? userFormStatus.value : USER_STATUS.ACTIVE.id;
        const notes = userFormNotes ? userFormNotes.value.trim() : '';

        try {
          if (id) {
            // Edición
            usersStore.updateUser(id, { name, email, phone, department, role, status, notes });
          } else {
            // Creación
            usersStore.createUser({ name, email, phone, department, role, status, notes });
          }
          toggleModal(userModal, false);
        } catch (err) {
          if (userFormError) {
            userFormError.textContent = err.message;
            userFormError.style.display = 'block';
          }
        }
      });
    }

    // Restablecer Contraseña
    if (btnGenerateRandomPw) {
      btnGenerateRandomPw.addEventListener('click', () => {
        if (resetPwInput) {
          resetPwInput.value = `Kroma!${Math.floor(1000 + Math.random() * 9000)}`;
        }
      });
    }

    if (btnConfirmResetPw) {
      btnConfirmResetPw.addEventListener('click', () => {
        const id = resetPwUserId ? resetPwUserId.value : '';
        const customPw = resetPwInput ? resetPwInput.value.trim() : '';
        if (!id) return;

        try {
          const res = usersStore.resetPassword(id, customPw);
          if (resetPwSuccessCode) resetPwSuccessCode.textContent = res.tempPassword;
          if (resetPwFeedback) resetPwFeedback.style.display = 'block';
        } catch (err) {
          alert(err.message);
        }
      });
    }

    if (btnCopyPw) {
      btnCopyPw.addEventListener('click', async () => {
        const text = resetPwSuccessCode ? resetPwSuccessCode.textContent : '';
        if (text && navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(text);
            btnCopyPw.textContent = '✓ ¡Copiado!';
            setTimeout(() => {
              if (btnCopyPw) btnCopyPw.textContent = '📋 Copiar';
            }, 2000);
          } catch (_) {}
        }
      });
    }

    // Confirmar Eliminación
    if (btnConfirmDeleteUser) {
      btnConfirmDeleteUser.addEventListener('click', () => {
        const id = deleteUserId ? deleteUserId.value : '';
        if (!id) return;

        try {
          usersStore.deleteUser(id);
          toggleModal(deleteModal, false);
        } catch (err) {
          if (deleteUserError) {
            deleteUserError.textContent = err.message;
            deleteUserError.style.display = 'block';
          }
        }
      });
    }

    // Suscripción reactiva al UsersStore
    const unsubscribe = usersStore.subscribe(() => {
      renderMetrics();
      applyFilters();
    });

    // Render inicial
    renderMetrics();
    applyFilters();

    // Función de limpieza al desmontar vista
    return () => {
      unsubscribe();
    };
  }
};
