/**
 * Componente Modal de Configuración de Cuenta de Usuario (UserProfileModal)
 * Permite a cualquier usuario (Admin, Operador Taller, Cliente B2B o Visitante)
 * gestionar sus datos de perfil (Nombre, Teléfono, Correo, Empresa, NIT y Dirección de Entrega),
 * cambiar de cuenta rápida o cerrar sesión.
 */

import { store } from '../store.js';
import { usersStore } from '../modules/users-store.js';

let modalInitialized = false;

export function initUserProfileModal() {
  let container = document.getElementById('userProfileModalContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'userProfileModalContainer';
    if (typeof document !== 'undefined' && document.body) {
      document.body.appendChild(container);
    }
  }

  container.innerHTML = `
    <div id="userProfileModal" class="modal-backdrop" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="userProfileModalTitle">
      <div class="modal-card" style="width: min(580px, 95vw); max-height: 92vh; overflow-y: auto;">
        
        <!-- Encabezado del Modal -->
        <div class="modal-header">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <span class="badge" id="profileModalRoleBadge" style="color: var(--cerulean); border-color: var(--cerulean);">👤 Perfil de Usuario</span>
              <span id="profileModalStatusBadge" class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: #10b981; display: none;">Activo</span>
            </div>
            <h2 id="userProfileModalTitle" style="font-size: 1.35rem; font-weight: 800; margin: 0.4rem 0 0.15rem;">
              Configuración de Cuenta
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0;">
              Actualiza tu información personal, datos de facturación y contacto.
            </p>
          </div>
          <button type="button" class="btn-close-modal" id="btnCloseUserProfileModal" aria-label="Cerrar modal" style="min-width: 44px; min-height: 44px;">✕</button>
        </div>

        <!-- Banner de Identidad -->
        <div style="display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1rem; background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 1.25rem;">
          <div id="profileBannerAvatar" style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, var(--cerulean), var(--baltic-blue)); color: #fff; font-size: 1.3rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            M
          </div>
          <div style="flex: 1; min-width: 0;">
            <div id="profileBannerName" style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              Miguel Dubois
            </div>
            <div id="profileBannerEmail" style="font-size: 0.82rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              miguel@kromalab.gt
            </div>
          </div>
        </div>

        <!-- Mensaje de Feedback -->
        <div id="profileFeedbackMsg" style="display: none; padding: 0.75rem 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.88rem; font-weight: 600;"></div>

        <!-- Formulario de Perfil -->
        <form id="formUserProfile">
          <div class="input-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div class="form-group">
              <label class="form-label" for="profileNameInput" style="font-weight: 600;">Nombre Completo: <span style="color: #ef4444;">*</span></label>
              <input type="text" id="profileNameInput" class="input-control" required style="min-height: 44px;" placeholder="Tu nombre y apellido">
            </div>
            <div class="form-group">
              <label class="form-label" for="profileEmailInput" style="font-weight: 600;">Correo Electrónico: <span style="color: #ef4444;">*</span></label>
              <input type="email" id="profileEmailInput" class="input-control" required style="min-height: 44px;" placeholder="correo@ejemplo.gt">
            </div>
          </div>

          <div class="input-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div class="form-group">
              <label class="form-label" for="profilePhoneInput" style="font-weight: 600;">Teléfono / WhatsApp: <span style="color: #ef4444;">*</span></label>
              <input type="tel" id="profilePhoneInput" class="input-control" required style="min-height: 44px;" placeholder="+502 5406-6217">
            </div>
            <div class="form-group">
              <label class="form-label" for="profileCompanyInput" style="font-weight: 600;">Empresa o Negocio: (opcional)</label>
              <input type="text" id="profileCompanyInput" class="input-control" style="min-height: 44px;" placeholder="Ej. Arte Modelo Dubois, Café San Cristóbal...">
            </div>
          </div>

          <div class="input-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
            <div class="form-group">
              <label class="form-label" for="profileNitInput" style="font-weight: 600;">NIT SAT (Facturación):</label>
              <input type="text" id="profileNitInput" class="input-control" style="min-height: 44px;" placeholder="Ej. 1234567-8 o C/F">
            </div>
            <div class="form-group" id="profileDepartmentGroup">
              <label class="form-label" for="profileDepartmentInput" style="font-weight: 600;">Área / Departamento:</label>
              <input type="text" id="profileDepartmentInput" class="input-control" style="min-height: 44px;" placeholder="Ej. Dirección General, Operador Audley...">
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 1.25rem;">
            <label class="form-label" for="profileAddressInput" style="font-weight: 600;">Dirección de Entrega / Taller:</label>
            <textarea id="profileAddressInput" class="input-control" rows="2" placeholder="Colonia San José el Placer, Villa Nueva / Zona 10 Ciudad de Guatemala..."></textarea>
          </div>

          <!-- Selector Rápido de Cuenta / Simulador de Rol -->
          <div style="background: rgba(28, 114, 147, 0.05); border: 1px dashed var(--border-color); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.03em;">
                🔄 Cambiar de Cuenta de Usuario
              </span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">
                Acceso Rápido
              </span>
            </div>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-secondary btn-switch-account" data-user-id="usr_001" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; min-height: 38px;">
                👑 Miguel (Admin)
              </button>
              <button type="button" class="btn btn-secondary btn-switch-account" data-user-id="usr_002" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; min-height: 38px;">
                🛠️ Carlos (Taller)
              </button>
              <button type="button" class="btn btn-secondary btn-switch-account" data-user-id="usr_004" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; min-height: 38px;">
                🏢 Rodrigo (Cliente)
              </button>
              <button type="button" class="btn btn-secondary btn-switch-account" data-user-id="visitor" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; min-height: 38px;">
                👤 Visitante
              </button>
            </div>
          </div>

          <!-- Botones de Acción -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary" id="btnLogoutProfileBtn" style="color: #ef4444; min-height: 44px; display: inline-flex; align-items: center; gap: 0.35rem;">
              <span>🚪</span>
              <span>Cerrar Sesión</span>
            </button>

            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <button type="button" class="btn btn-secondary" id="btnCancelUserProfile" style="min-height: 44px;">
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary" id="btnSaveUserProfile" style="min-height: 44px;">
                <span>💾 Guardar Cambios</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  `;

  attachModalEventListeners();
  modalInitialized = true;
}

function attachModalEventListeners() {
  const chip = document.getElementById('userProfileChip');
  if (chip) {
    chip.addEventListener('click', openUserProfileModal);
  }

  const sidebarUser = document.getElementById('sidebarUserCard');
  if (sidebarUser) {
    sidebarUser.addEventListener('click', openUserProfileModal);
  }

  const btnClose = document.getElementById('btnCloseUserProfileModal');
  if (btnClose) {
    btnClose.addEventListener('click', closeUserProfileModal);
  }

  const btnCancel = document.getElementById('btnCancelUserProfile');
  if (btnCancel) {
    btnCancel.addEventListener('click', closeUserProfileModal);
  }

  const modal = document.getElementById('userProfileModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeUserProfileModal();
      }
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const m = document.getElementById('userProfileModal');
        if (m && m.style.display !== 'none') {
          closeUserProfileModal();
        }
      }
    });
  }

  const form = document.getElementById('formUserProfile');
  if (form) {
    form.addEventListener('submit', handleProfileSubmit);
  }

  const btnLogout = document.getElementById('btnLogoutProfileBtn');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      store.clearUser();
      showFeedback('Sesión finalizada. Has pasado al modo visitante.', 'info');
      setTimeout(() => {
        closeUserProfileModal();
      }, 500);
    });
  }

  const switchBtns = document.querySelectorAll('.btn-switch-account');
  switchBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const userId = btn.dataset.userId;
      switchUserAccount(userId);
    });
  });
}

export function openUserProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (!modal) return;

  const user = store.state.user;
  const role = user?.role || 'VISITOR';

  // Role Badge
  const roleBadge = document.getElementById('profileModalRoleBadge');
  if (roleBadge) {
    if (role === 'ADMIN') {
      roleBadge.textContent = '👑 Administrador General';
      roleBadge.style.color = '#f59e0b';
      roleBadge.style.borderColor = '#f59e0b';
    } else if (role === 'EMPLOYEE') {
      roleBadge.textContent = '🛠️ Operador Audley & Taller';
      roleBadge.style.color = 'var(--cerulean)';
      roleBadge.style.borderColor = 'var(--cerulean)';
    } else if (role === 'CUSTOMER') {
      roleBadge.textContent = '🏢 Cliente B2B Registrado';
      roleBadge.style.color = '#10b981';
      roleBadge.style.borderColor = '#10b981';
    } else {
      roleBadge.textContent = '👤 Visitante Web';
      roleBadge.style.color = 'var(--text-muted)';
      roleBadge.style.borderColor = 'var(--border-color)';
    }
  }

  // Banner
  const bannerAvatar = document.getElementById('profileBannerAvatar');
  const bannerName = document.getElementById('profileBannerName');
  const bannerEmail = document.getElementById('profileBannerEmail');

  const nameVal = user?.name || (role === 'VISITOR' ? 'Visitante Web' : 'Usuario');
  if (bannerAvatar) {
    bannerAvatar.textContent = nameVal ? nameVal[0].toUpperCase() : 'U';
  }
  if (bannerName) {
    bannerName.textContent = nameVal;
  }
  if (bannerEmail) {
    bannerEmail.textContent = user?.email || (role === 'VISITOR' ? 'Navegando sin sesión activa' : 'Sin correo registrado');
  }

  // Inputs
  const nameInput = document.getElementById('profileNameInput');
  const emailInput = document.getElementById('profileEmailInput');
  const phoneInput = document.getElementById('profilePhoneInput');
  const companyInput = document.getElementById('profileCompanyInput');
  const nitInput = document.getElementById('profileNitInput');
  const deptInput = document.getElementById('profileDepartmentInput');
  const addressInput = document.getElementById('profileAddressInput');

  if (nameInput) nameInput.value = user?.name || '';
  if (emailInput) emailInput.value = user?.email || '';
  if (phoneInput) phoneInput.value = user?.phone || '';
  if (companyInput) companyInput.value = user?.company || '';
  if (nitInput) nitInput.value = user?.nit || '';
  if (deptInput) deptInput.value = user?.department || '';
  if (addressInput) addressInput.value = user?.address || '';

  // Department field only relevant for Staff
  const deptGroup = document.getElementById('profileDepartmentGroup');
  if (deptGroup) {
    deptGroup.style.display = (role === 'ADMIN' || role === 'EMPLOYEE') ? 'block' : 'none';
  }

  // Hide feedback
  const feedback = document.getElementById('profileFeedbackMsg');
  if (feedback) {
    feedback.style.display = 'none';
    feedback.textContent = '';
  }

  modal.style.display = 'block';
  if (nameInput) nameInput.focus();
}

export function closeUserProfileModal() {
  const modal = document.getElementById('userProfileModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

export function handleProfileSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const nameInput = document.getElementById('profileNameInput');
  const emailInput = document.getElementById('profileEmailInput');
  const phoneInput = document.getElementById('profilePhoneInput');
  const companyInput = document.getElementById('profileCompanyInput');
  const nitInput = document.getElementById('profileNitInput');
  const deptInput = document.getElementById('profileDepartmentInput');
  const addressInput = document.getElementById('profileAddressInput');

  const name = nameInput?.value?.trim() || '';
  const email = emailInput?.value?.trim().toLowerCase() || '';
  const phone = phoneInput?.value?.trim() || '';
  const company = companyInput?.value?.trim() || '';
  const nit = nitInput?.value?.trim() || '';
  const department = deptInput?.value?.trim() || '';
  const address = addressInput?.value?.trim() || '';

  if (!name) {
    showFeedback('El nombre completo es obligatorio.', 'error');
    if (nameInput) nameInput.focus();
    return false;
  }

  if (!email || !email.includes('@') || !email.includes('.')) {
    showFeedback('Ingresa un correo electrónico válido.', 'error');
    if (emailInput) emailInput.focus();
    return false;
  }

  if (!phone) {
    showFeedback('El número de teléfono o WhatsApp es obligatorio.', 'error');
    if (phoneInput) phoneInput.focus();
    return false;
  }

  const currentUser = store.state.user;
  const role = currentUser?.role || 'CUSTOMER';

  let updatedUser = {
    ...currentUser,
    id: currentUser?.id || `usr_${Date.now()}`,
    name,
    email,
    phone,
    company,
    nit,
    address,
    role,
  };

  if (department) {
    updatedUser.department = department;
  }

  // Sincronizar con usersStore si el usuario existe allí
  try {
    if (currentUser?.id) {
      const existingInStore = usersStore.getUserById(currentUser.id);
      if (existingInStore) {
        updatedUser = usersStore.updateUser(currentUser.id, {
          name,
          email,
          phone,
          company,
          nit,
          address,
          department,
        });
      }
    } else {
      const existingByEmail = usersStore.getUserByEmail(email);
      if (existingByEmail) {
        updatedUser = usersStore.updateUser(existingByEmail.id, {
          name,
          phone,
          company,
          nit,
          address,
          department,
        });
      }
    }
  } catch (err) {
    showFeedback(err.message || 'Error al actualizar usuario en almacén.', 'error');
    return false;
  }

  // Actualizar estado global reactivo
  store.setUser(updatedUser, store.state.token || 'jwt-profile-active', store.state.permissions || []);

  showFeedback('✅ Información de perfil actualizada exitosamente.', 'success');

  // Actualizar banner en el modal
  const bannerAvatar = document.getElementById('profileBannerAvatar');
  const bannerName = document.getElementById('profileBannerName');
  const bannerEmail = document.getElementById('profileBannerEmail');
  if (bannerAvatar) bannerAvatar.textContent = name[0]?.toUpperCase() || 'U';
  if (bannerName) bannerName.textContent = name;
  if (bannerEmail) bannerEmail.textContent = email;

  return true;
}

export function switchUserAccount(userId) {
  if (userId === 'visitor') {
    store.clearUser();
    openUserProfileModal();
    showFeedback('Has cambiado al modo Visitante.', 'info');
    return;
  }

  const user = usersStore.getUserById(userId);
  if (!user) {
    showFeedback(`No se encontró el usuario con ID: ${userId}`, 'error');
    return;
  }

  const permissions = user.role === 'ADMIN' ? ['ALL'] : user.role === 'EMPLOYEE' ? ['WORKSHOP', 'ORDERS', 'INVENTORY', 'DISPATCH'] : ['ORDERS'];
  store.setUser(user, `jwt-token-${userId}`, permissions);
  openUserProfileModal();
  showFeedback(`✅ Sesión cambiada a: ${user.name} (${user.role})`, 'success');
}

export function showFeedback(msg, type = 'info') {
  const el = document.getElementById('profileFeedbackMsg');
  if (!el) return;

  el.style.display = 'block';
  el.textContent = msg;

  if (type === 'success') {
    el.style.background = 'rgba(16, 185, 129, 0.15)';
    el.style.color = '#10b981';
    el.style.border = '1px solid #10b981';
  } else if (type === 'error') {
    el.style.background = 'rgba(239, 68, 68, 0.15)';
    el.style.color = '#ef4444';
    el.style.border = '1px solid #ef4444';
  } else {
    el.style.background = 'rgba(2, 132, 199, 0.15)';
    el.style.color = 'var(--cerulean)';
    el.style.border = '1px solid var(--cerulean)';
  }
}
