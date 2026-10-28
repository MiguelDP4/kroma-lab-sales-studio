/**
 * Componente Modal de Autenticación, Creación de Cuentas y Configuración de Usuario (UserProfileModal)
 * Permite a cualquier usuario (Admin, Operador Taller, Cliente o Visitante)
 * iniciar sesión con credenciales reales, registrar nuevas cuentas de clientes,
 * gestionar sus datos de perfil (Nombre, Teléfono, Correo, Empresa, NIT y Dirección de Entrega)
 * y cerrar sesión.
 */

import { store } from '../store.js';
import { usersStore } from '../modules/users-store.js';
import { apiClient } from '../modules/api-client.js';

const IS_TEST_ENV = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

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
            <p style="color: var(--text-secondary); font-size: 0.88rem; margin: 0;" id="userProfileModalSubtitle">
              Actualiza tu información personal, datos de facturación y contacto.
            </p>
          </div>
          <button type="button" class="btn-close-modal" id="btnCloseUserProfileModal" aria-label="Cerrar modal" style="min-width: 44px; min-height: 44px;">✕</button>
        </div>

        <!-- Selector de Pestañas (Tabs de Navegación) -->
        <div id="authTabsContainer" style="display: flex; gap: 0.35rem; margin-bottom: 1.25rem; background: var(--bg-surface-elevated); padding: 0.3rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <button type="button" id="tabBtnProfile" class="btn btn-secondary auth-tab-btn is-active" style="flex: 1; min-height: 40px; font-size: 0.84rem; padding: 0.4rem 0.5rem;">
            👤 Mi Perfil
          </button>
          <button type="button" id="tabBtnLogin" class="btn btn-secondary auth-tab-btn" style="flex: 1; min-height: 40px; font-size: 0.84rem; padding: 0.4rem 0.5rem;">
            🔑 Iniciar Sesión
          </button>
          <button type="button" id="tabBtnRegister" class="btn btn-secondary auth-tab-btn" style="flex: 1; min-height: 40px; font-size: 0.84rem; padding: 0.4rem 0.5rem;">
            📝 Crear Cuenta
          </button>
        </div>

        <!-- Mensaje de Feedback Global -->
        <div id="profileFeedbackMsg" style="display: none; padding: 0.75rem 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.88rem; font-weight: 600;"></div>

        <!-- ====================================================================
             VISTA 1: MI PERFIL (USUARIO AUTENTICADO)
             ==================================================================== -->
        <div id="authViewProfile">
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

            ${IS_TEST_ENV ? `
            <!-- Selector Rápido de Cuenta (Solo en entorno de pruebas) -->
            <div style="background: rgba(28, 114, 147, 0.05); border: 1px dashed var(--border-color); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.03em;">
                  🔄 Cuentas Demo Reales (Autenticación Backend)
                </span>
                <span style="font-size: 0.75rem; color: var(--text-muted);">
                  Validación JWT
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
            </div>` : ''}

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

        <!-- ====================================================================
             VISTA 2: INICIAR SESIÓN (LOGIN REAL CON BACKEND)
             ==================================================================== -->
        <div id="authViewLogin" style="display: none;">
          <form id="formUserLogin">
            <div style="margin-bottom: 1.25rem;">
              <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.5; margin: 0 0 1rem;">
                Ingresa con tu correo y contraseña registrados para acceder a tu historial comercial, pedidos en taller y estado de cuenta.
              </p>

              <div class="form-group" style="margin-bottom: 1rem;">
                <label class="form-label" for="loginEmailInput" style="font-weight: 700;">Correo Electrónico: <span style="color: #ef4444;">*</span></label>
                <input type="email" id="loginEmailInput" class="input-control" required style="min-height: 44px;" placeholder="ejemplo@kromalab.gt" autocomplete="email">
              </div>

              <div class="form-group" style="margin-bottom: 1rem;">
                <label class="form-label" for="loginPasswordInput" style="font-weight: 700;">Contraseña: <span style="color: #ef4444;">*</span></label>
                <input type="password" id="loginPasswordInput" class="input-control" required style="min-height: 44px;" placeholder="••••••••" autocomplete="current-password">
              </div>

              <div class="form-group" style="margin-bottom: 1.25rem;">
                <label class="checkbox-wrapper" for="loginRememberMe" style="display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer; min-height: 44px; margin: 0; user-select: none;">
                  <input type="checkbox" id="loginRememberMe" checked style="width: 18px; height: 18px; accent-color: var(--cerulean); cursor: pointer;">
                  <span style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">Mantener sesión iniciada</span>
                </label>
              </div>
            </div>

            ${IS_TEST_ENV ? `
            <!-- Accesos Rápidos con Cuentas Reales (Solo en entorno de pruebas) -->
            <div style="background: rgba(28, 114, 147, 0.06); border: 1px dashed var(--border-color); border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1.25rem;">
              <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 0.5rem;">
                ⚡ Cuentas Semilla de Taller (Login Automático Real)
              </div>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button type="button" class="btn btn-secondary btn-quick-login" data-email="miguel@kromalab.gt" data-pw="Admin2026!" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; min-height: 38px;">
                  👑 Miguel Dubois (Admin)
                </button>
                <button type="button" class="btn btn-secondary btn-quick-login" data-email="taller@kromalab.gt" data-pw="Taller2026!" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; min-height: 38px;">
                  🛠️ Carlos Méndez (Taller)
                </button>
                <button type="button" class="btn btn-secondary btn-quick-login" data-email="rodrigo@promoguate.gt" data-pw="Cliente2026!" style="font-size: 0.78rem; padding: 0.35rem 0.65rem; min-height: 38px;">
                  🏢 Rodrigo Castillo (Cliente)
                </button>
              </div>
            </div>` : ''}

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
              <button type="button" class="btn btn-secondary" id="btnCancelLogin" style="min-height: 44px;">Cancelar</button>
              <button type="submit" class="btn btn-primary" id="btnSubmitLogin" style="min-height: 44px;">
                <span>🔑 Iniciar Sesión</span>
              </button>
            </div>

            <div style="text-align: center; margin-top: 1.25rem; font-size: 0.88rem; color: var(--text-secondary);">
              ¿Aún no tienes una cuenta? <button type="button" id="btnSwitchToRegister" style="color: var(--cerulean); font-weight: 700; background: none; border: none; cursor: pointer; text-decoration: underline; padding: 0.25rem; font-size: 0.88rem;">Crear cuenta</button>
            </div>
          </form>
        </div>

        <!-- ====================================================================
             VISTA 3: CREAR CUENTA B2B (REGISTRO REAL)
             ==================================================================== -->
        <div id="authViewRegister" style="display: none;">
          <form id="formUserRegister">
            <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.5; margin: 0 0 1rem;">
              Crea tu cuenta para cotizar de inmediato, enviar tus artes de impresión UV DTF y guardar tu historial de pedidos.
            </p>

            <div class="input-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label" for="registerNameInput" style="font-weight: 600;">Nombre del Contacto: <span style="color: #ef4444;">*</span></label>
                <input type="text" id="registerNameInput" class="input-control" required style="min-height: 44px;" placeholder="Tu nombre y apellido">
                <span id="registerNameError" class="field-error-msg" style="display: none; color: #ef4444; font-size: 0.78rem; margin-top: 0.25rem;"></span>
              </div>
              <div class="form-group">
                <label class="form-label" for="registerCompanyInput" style="font-weight: 600;">Empresa / Marca:</label>
                <input type="text" id="registerCompanyInput" class="input-control" style="min-height: 44px;" placeholder="Ej. Café & Roastery, Tazas GT">
              </div>
            </div>

            <div class="input-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label" for="registerPhoneInput" style="font-weight: 600;">Teléfono / WhatsApp: <span style="color: #ef4444;">*</span></label>
                <input type="tel" id="registerPhoneInput" class="input-control" required style="min-height: 44px;" placeholder="+502 5555-0000">
                <span id="registerPhoneError" class="field-error-msg" style="display: none; color: #ef4444; font-size: 0.78rem; margin-top: 0.25rem;"></span>
              </div>
              <div class="form-group">
                <label class="form-label" for="registerNitInput" style="font-weight: 600;">NIT Facturación SAT:</label>
                <input type="text" id="registerNitInput" class="input-control" style="min-height: 44px;" placeholder="Ej. 7845129-4 o CF">
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1rem;">
              <label class="form-label" for="registerAddressInput" style="font-weight: 600;">Dirección de Entrega o Envíos:</label>
              <textarea id="registerAddressInput" class="input-control" rows="2" placeholder="Dirección en Ciudad de Guatemala, Mixco, Villa Nueva o Departamentos..."></textarea>
            </div>

            <div class="input-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label" for="registerEmailInput" style="font-weight: 600;">Correo Electrónico: <span style="color: #ef4444;">*</span></label>
                <input type="email" id="registerEmailInput" class="input-control" required style="min-height: 44px;" placeholder="pedidos@tuempresa.gt">
                <span id="registerEmailError" class="field-error-msg" style="display: none; color: #ef4444; font-size: 0.78rem; margin-top: 0.25rem;"></span>
              </div>
              <div class="form-group">
                <label class="form-label" for="registerPasswordInput" style="font-weight: 600;">Contraseña: <span style="color: #ef4444;">*</span> <span class="tip">(Mínimo 6 caracteres)</span></label>
                <input type="password" id="registerPasswordInput" class="input-control" required minlength="6" style="min-height: 44px;" placeholder="••••••••" autocomplete="new-password">
                <span id="registerPasswordError" class="field-error-msg" style="display: none; color: #ef4444; font-size: 0.78rem; margin-top: 0.25rem;"></span>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label class="form-label" for="registerPasswordConfirmInput" style="font-weight: 600;">Confirmar Contraseña: <span style="color: #ef4444;">*</span></label>
              <input type="password" id="registerPasswordConfirmInput" class="input-control" required minlength="6" style="min-height: 44px;" placeholder="••••••••" autocomplete="new-password">
              <span id="registerPasswordConfirmError" class="field-error-msg" style="display: none; color: #ef4444; font-size: 0.78rem; margin-top: 0.25rem;"></span>
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem;">
              <button type="button" class="btn btn-secondary" id="btnCancelRegister" style="min-height: 44px;">Cancelar</button>
              <button type="submit" class="btn btn-primary" id="btnSubmitRegister" style="min-height: 44px;">
                <span>✨ Crear Cuenta y Entrar</span>
              </button>
            </div>

            <div style="text-align: center; margin-top: 1.25rem; font-size: 0.88rem; color: var(--text-secondary);">
              ¿Ya tienes una cuenta registrada? <button type="button" id="btnSwitchToLogin" style="color: var(--cerulean); font-weight: 700; background: none; border: none; cursor: pointer; text-decoration: underline; padding: 0.25rem; font-size: 0.88rem;">Iniciar sesión</button>
            </div>
          </form>
        </div>

      </div>
    </div>
  `;

  attachModalEventListeners();
  modalInitialized = true;
}

function attachModalEventListeners() {
  // Nota: userProfileChip es gestionado exclusivamente por initUserDropdown() en app.js

  const sidebarUser = document.getElementById('sidebarUserCard');
  if (sidebarUser) {
    sidebarUser.addEventListener('click', () => openUserProfileModal());
  }

  const btnClose = document.getElementById('btnCloseUserProfileModal');
  if (btnClose) {
    btnClose.addEventListener('click', closeUserProfileModal);
  }

  const btnCancel = document.getElementById('btnCancelUserProfile');
  if (btnCancel) {
    btnCancel.addEventListener('click', closeUserProfileModal);
  }

  const btnCancelLogin = document.getElementById('btnCancelLogin');
  if (btnCancelLogin) {
    btnCancelLogin.addEventListener('click', closeUserProfileModal);
  }

  const btnCancelRegister = document.getElementById('btnCancelRegister');
  if (btnCancelRegister) {
    btnCancelRegister.addEventListener('click', closeUserProfileModal);
  }

  // Pestañas (Tabs)
  const tabProfile = document.getElementById('tabBtnProfile');
  const tabLogin = document.getElementById('tabBtnLogin');
  const tabRegister = document.getElementById('tabBtnRegister');

  if (tabProfile) tabProfile.addEventListener('click', () => switchAuthTab('profile'));
  if (tabLogin) tabLogin.addEventListener('click', () => switchAuthTab('login'));
  if (tabRegister) tabRegister.addEventListener('click', () => switchAuthTab('register'));

  const btnSwitchReg = document.getElementById('btnSwitchToRegister');
  if (btnSwitchReg) btnSwitchReg.addEventListener('click', () => switchAuthTab('register'));

  const btnSwitchLog = document.getElementById('btnSwitchToLogin');
  if (btnSwitchLog) btnSwitchLog.addEventListener('click', () => switchAuthTab('login'));

  // Modal backdrop click disabled per QA specs (Task 5: solo se cierra con la X o botones explícitos)

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

  // Formularios
  const formProfile = document.getElementById('formUserProfile');
  if (formProfile) {
    formProfile.addEventListener('submit', handleProfileSubmit);
  }

  const formLogin = document.getElementById('formUserLogin');
  if (formLogin) {
    formLogin.addEventListener('submit', handleLoginSubmit);
  }

  const formRegister = document.getElementById('formUserRegister');
  if (formRegister) {
    formRegister.addEventListener('submit', handleRegisterSubmit);
  }

  // Logout
  const btnLogout = document.getElementById('btnLogoutProfileBtn');
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogout);
  }

  // Validación reactiva con debounce de 500ms para formulario de registro (Task 2)
  setupRegisterDebounceValidation();

  // Botones de cambio rápido de cuenta
  const switchBtns = document.querySelectorAll('.btn-switch-account');
  switchBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const userId = btn.dataset.userId;
      switchUserAccount(userId);
    });
  });

  // Botones de login rápido real
  const quickLogins = document.querySelectorAll('.btn-quick-login');
  quickLogins.forEach((btn) => {
    btn.addEventListener('click', () => {
      const email = btn.dataset.email;
      const pw = btn.dataset.pw;
      if (email && pw) {
        loginWithRealCredentials(email, pw);
      }
    });
  });
}

export function switchAuthTab(tabName) {
  const currentUser = store.state.user;
  const currentRole = currentUser?.role || 'VISITOR';
  const hasActiveSession = currentUser && currentRole !== 'VISITOR';

  // Limpiar cualquier feedback previo (ej. credenciales inválidas) al cambiar de pestaña (Task 3)
  const feedback = document.getElementById('profileFeedbackMsg');
  if (feedback) {
    feedback.style.display = 'none';
    feedback.textContent = '';
  }

  // Limpiar mensajes de error de campo
  if (typeof document !== 'undefined') {
    document.querySelectorAll('.field-error-msg').forEach((el) => {
      el.style.display = 'none';
      el.textContent = '';
    });
  }

  // Si ya hay sesión iniciada, las opciones de Iniciar Sesión y Crear Cuenta deben desaparecer
  if (hasActiveSession && tabName !== 'profile') {
    tabName = 'profile';
  }

  const viewProfile = document.getElementById('authViewProfile');
  const viewLogin = document.getElementById('authViewLogin');
  const viewRegister = document.getElementById('authViewRegister');

  const tabProfile = document.getElementById('tabBtnProfile');
  const tabLogin = document.getElementById('tabBtnLogin');
  const tabRegister = document.getElementById('tabBtnRegister');

  const titleEl = document.getElementById('userProfileModalTitle');
  const subTitleEl = document.getElementById('userProfileModalSubtitle');

  [tabProfile, tabLogin, tabRegister].forEach(b => {
    if (b) {
      b.classList.remove('is-active', 'btn-primary');
      b.classList.add('btn-secondary');
    }
  });

  if (viewProfile) viewProfile.style.display = 'none';
  if (viewLogin) viewLogin.style.display = 'none';
  if (viewRegister) viewRegister.style.display = 'none';

  if (tabName === 'login') {
    if (viewLogin) viewLogin.style.display = 'block';
    if (tabLogin) {
      tabLogin.classList.add('is-active', 'btn-primary');
      tabLogin.classList.remove('btn-secondary');
    }
    if (titleEl) titleEl.textContent = 'Iniciar Sesión';
    if (subTitleEl) subTitleEl.textContent = 'Acceso al sistema Kroma Lab UV DTF con credenciales reales.';
    const emailInput = document.getElementById('loginEmailInput');
    if (emailInput) setTimeout(() => emailInput.focus(), 50);
  } else if (tabName === 'register') {
    if (viewRegister) viewRegister.style.display = 'block';
    if (tabRegister) {
      tabRegister.classList.add('is-active', 'btn-primary');
      tabRegister.classList.remove('btn-secondary');
    }
    if (titleEl) titleEl.textContent = 'Crear Cuenta';
    if (subTitleEl) subTitleEl.textContent = 'Crea tu cuenta de empresa para cotizaciones directas y compras de pliegos.';
    const nameInput = document.getElementById('registerNameInput');
    if (nameInput) setTimeout(() => nameInput.focus(), 50);
  } else {
    if (viewProfile) viewProfile.style.display = 'block';
    if (tabProfile) {
      tabProfile.classList.add('is-active', 'btn-primary');
      tabProfile.classList.remove('btn-secondary');
    }
    if (titleEl) titleEl.textContent = 'Configuración de Cuenta';
    if (subTitleEl) subTitleEl.textContent = 'Actualiza tu información personal, datos de facturación y contacto.';
  }
}

export function openUserProfileModal(preferredTab = null) {
  const modal = typeof document !== 'undefined' ? document.getElementById('userProfileModal') : null;
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
      roleBadge.textContent = '🏢 Cliente Registrado';
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

  // Inputs de Perfil
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

  const isVisitor = !user || role === 'VISITOR';
  const authTabs = document.getElementById('authTabsContainer');
  const tabProfile = document.getElementById('tabBtnProfile');
  const tabLogin = document.getElementById('tabBtnLogin');
  const tabRegister = document.getElementById('tabBtnRegister');

  if (!isVisitor) {
    // Sesión iniciada: OCULTAR COMPLETAMENTE opciones de Iniciar Sesión y Crear Cuenta
    if (authTabs) authTabs.style.display = 'none';
    if (tabLogin) tabLogin.style.display = 'none';
    if (tabRegister) tabRegister.style.display = 'none';
    if (tabProfile) tabProfile.style.display = 'none';
    switchAuthTab('profile');
  } else {
    // Modo Visitante (sin sesión): Mostrar Iniciar Sesión y Crear Cuenta
    if (authTabs) authTabs.style.display = 'flex';
    if (tabProfile) tabProfile.style.display = 'none';
    if (tabLogin) tabLogin.style.display = 'block';
    if (tabRegister) tabRegister.style.display = 'block';
    switchAuthTab(preferredTab || 'login');
  }

  modal.style.display = 'block';
  if (nameInput && role !== 'VISITOR') nameInput.focus();
}

export function closeUserProfileModal() {
  const modal = typeof document !== 'undefined' ? document.getElementById('userProfileModal') : null;
  if (modal) {
    modal.style.display = 'none';
  }

  // Limpiar inputs de login y credenciales inválidas (Task 6)
  const loginEmail = typeof document !== 'undefined' ? document.getElementById('loginEmailInput') : null;
  const loginPw = typeof document !== 'undefined' ? document.getElementById('loginPasswordInput') : null;
  if (loginEmail) loginEmail.value = '';
  if (loginPw) loginPw.value = '';

  const feedback = typeof document !== 'undefined' ? document.getElementById('profileFeedbackMsg') : null;
  if (feedback && (feedback.textContent.includes('inválid') || feedback.textContent.includes('error') || feedback.textContent.includes('Por favor') || feedback.style.color.includes('ef4444') || feedback.style.color.includes('239'))) {
    feedback.style.display = 'none';
    feedback.textContent = '';
  }

  // Limpiar inputs de registro y mensajes de error
  const registerForm = typeof document !== 'undefined' ? document.getElementById('formUserRegister') : null;
  if (registerForm) registerForm.reset();

  if (typeof document !== 'undefined') {
    document.querySelectorAll('.field-error-msg').forEach((el) => {
      el.style.display = 'none';
      el.textContent = '';
    });
    document.querySelectorAll('.input-control').forEach((el) => {
      el.style.borderColor = '';
    });
  }
}

export async function handleLoginSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const emailInput = document.getElementById('loginEmailInput');
  const pwInput = document.getElementById('loginPasswordInput');
  const rememberInput = document.getElementById('loginRememberMe');

  const email = emailInput?.value?.trim() || '';
  const password = pwInput?.value || '';
  const rememberMe = rememberInput ? rememberInput.checked : true;

  if (!email || !password) {
    showFeedback('Por favor ingresa tu correo y contraseña.', 'error');
    return false;
  }

  const user = await loginWithRealCredentials(email, password, rememberMe);
  return Boolean(user);
}

export async function handleRegisterSubmit(e) {
  if (e && e.preventDefault) e.preventDefault();

  const nameInput = document.getElementById('registerNameInput');
  const companyInput = document.getElementById('registerCompanyInput');
  const nitInput = document.getElementById('registerNitInput');
  const phoneInput = document.getElementById('registerPhoneInput');
  const addressInput = document.getElementById('registerAddressInput');
  const emailInput = document.getElementById('registerEmailInput');
  const pwInput = document.getElementById('registerPasswordInput');

  const confirmPwInput = document.getElementById('registerPasswordConfirmInput');

  const name = nameInput?.value?.trim() || '';
  const company = companyInput?.value?.trim() || '';
  const taxId = nitInput?.value?.trim() || 'CF';
  const phone = phoneInput?.value?.trim() || '';
  const address = addressInput?.value?.trim() || 'Ciudad de Guatemala';
  const email = emailInput?.value?.trim().toLowerCase() || '';
  const password = pwInput?.value || '';
  const confirmPassword = confirmPwInput?.value || '';

  if (!name || name.length < 2) {
    showFeedback('El nombre debe tener al menos 2 caracteres.', 'error');
    if (nameInput) nameInput.focus();
    return false;
  }

  if (!email || !email.includes('@') || !email.includes('.')) {
    showFeedback('Ingresa un correo electrónico válido.', 'error');
    if (emailInput) emailInput.focus();
    return false;
  }

  if (!phone) {
    showFeedback('El número de teléfono es obligatorio.', 'error');
    if (phoneInput) phoneInput.focus();
    return false;
  }

  if (/[a-zA-Z]/.test(phone)) {
    showFeedback('El teléfono debe contener únicamente números.', 'error');
    if (phoneInput) phoneInput.focus();
    return false;
  }

  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 8) {
    showFeedback('Ingresa un número de teléfono válido (mínimo 8 dígitos).', 'error');
    if (phoneInput) phoneInput.focus();
    return false;
  }

  if (!password || password.length < 6) {
    showFeedback('La contraseña debe tener al menos 6 caracteres.', 'error');
    if (pwInput) pwInput.focus();
    return false;
  }

  if (password !== confirmPassword) {
    showFeedback('Las contraseñas no coinciden.', 'error');
    if (confirmPwInput) confirmPwInput.focus();
    return false;
  }

  const user = await registerWithRealAccount({
    name,
    company: company || name,
    taxId,
    phone,
    address,
    email,
    password,
  });

  return Boolean(user);
}

export async function loginWithRealCredentials(email, password, rememberMe = true) {
  try {
    showFeedback('Autenticando credenciales en base de datos...', 'info');
    if (typeof apiClient !== 'undefined' && apiClient.auth) {
      const res = await apiClient.auth.login(email, password, rememberMe);
      if (res && res.success && res.user) {
        const permissions = res.user.role === 'ADMIN' ? ['ALL'] : (res.user.role === 'EMPLOYEE' ? ['WORKSHOP', 'ORDERS', 'INVENTORY', 'DISPATCH'] : ['ORDERS']);
        store.setUser(res.user, res.token, permissions, rememberMe);
        showFeedback(`✅ Sesión real iniciada: ${res.user.name} (${res.user.role})`, 'success');
        // Cierre inmediato sin transmutar la interfaz a configuración de cuenta (Task 4)
        closeUserProfileModal();
        return res.user;
      }
    }
  } catch (err) {
    showFeedback(err.message || 'Credenciales inválidas o servidor no disponible.', 'error');
  }
  return null;
}

export async function registerWithRealAccount(userData) {
  try {
    showFeedback('Creando cuenta en base de datos...', 'info');
    if (typeof apiClient !== 'undefined' && apiClient.auth) {
      const res = await apiClient.auth.register(userData);
      if (res && res.success) {
        if (res.requireVerification) {
          showFeedback(`📧 ¡Cuenta creada! Hemos enviado un correo de confirmación a ${userData.email}. Revisa tu bandeja de entrada o spam y confirma tu identidad para iniciar sesión.`, 'success');
          setTimeout(() => {
            switchAuthTab('login');
          }, 4000);
          return res.user;
        } else if (res.user && res.token) {
          store.setUser(res.user, res.token, ['ORDERS'], true);
          openUserProfileModal('profile');
          showFeedback(`✅ ¡Bienvenido! Cuenta creada exitosamente para ${res.user.name}.`, 'success');
          setTimeout(() => {
            closeUserProfileModal();
          }, 600);
          return res.user;
        }
      }
    }
  } catch (err) {
    showFeedback(err.message || 'Error al registrar usuario.', 'error');
  }
  return null;
}

export async function handleLogout() {
  store.clearUser();
  if (typeof apiClient !== 'undefined' && apiClient.clearToken) {
    apiClient.clearToken();
  }
  showFeedback('Sesión finalizada. Has pasado al modo Visitante.', 'info');
  setTimeout(() => {
    closeUserProfileModal();
  }, 500);

  try {
    if (typeof apiClient !== 'undefined' && apiClient.auth) {
      await apiClient.auth.logout().catch(() => {});
    }
  } catch (_) {}
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

  // Sincronizar actualización en backend API si hay token
  if (typeof apiClient !== 'undefined' && apiClient.auth && store.state.token) {
    apiClient.auth.updateProfile({
      name,
      phone,
      company,
      taxId: nit,
      address,
      department,
    }).catch(() => {});
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
    handleLogout();
    return null;
  }

  const user = usersStore.getUserById(userId);
  if (!user) {
    showFeedback(`No se encontró el usuario con ID: ${userId}`, 'error');
    return null;
  }

  const permissions = user.role === 'ADMIN' ? ['ALL'] : user.role === 'EMPLOYEE' ? ['WORKSHOP', 'ORDERS', 'INVENTORY', 'DISPATCH'] : ['ORDERS'];
  store.setUser(user, `jwt-token-${userId}`, permissions);
  openUserProfileModal();
  showFeedback(`✅ Sesión cambiada a: ${user.name} (${user.role})`, 'success');

  // Si tiene credenciales y backend está activo, autenticar con JWT real en segundo plano
  if (typeof apiClient !== 'undefined' && apiClient.auth) {
    const credMap = {
      'usr_001': { email: 'miguel@kromalab.gt', pw: 'Admin2026!' },
      'usr_002': { email: 'taller@kromalab.gt', pw: 'Taller2026!' },
      'usr_004': { email: 'rodrigo@promoguate.gt', pw: 'Cliente2026!' },
    };
    const cred = credMap[userId];
    if (cred) {
      apiClient.auth.login(cred.email, cred.pw).then(res => {
        if (res && res.token && res.user) {
          store.setUser(res.user, res.token, permissions);
        }
      }).catch(() => {});
    }
  }

  return user;
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


let debounceTimers = {};

/**
 * Validación reactiva en tiempo real con debounce de 500ms para el formulario de crear cuenta (Task 2).
 */
export function setupRegisterDebounceValidation() {
  if (typeof document === 'undefined') return;

  const fields = [
    {
      id: 'registerPhoneInput',
      errorId: 'registerPhoneError',
      validate: (val) => {
        if (!val || !val.trim()) return 'El teléfono es obligatorio.';
        if (/[a-zA-Z]/.test(val)) {
          return 'El teléfono debe contener únicamente números.';
        }
        const digits = val.replace(/\D/g, '');
        if (digits.length < 8) {
          return 'El teléfono debe tener al menos 8 dígitos.';
        }
        return null;
      },
    },
    {
      id: 'registerEmailInput',
      errorId: 'registerEmailError',
      validate: (val) => {
        if (!val || !val.trim()) return 'El correo electrónico es obligatorio.';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val.trim())) {
          return 'Ingresa un formato de correo electrónico válido (ej. usuario@dominio.gt).';
        }
        return null;
      },
    },
    {
      id: 'registerPasswordInput',
      errorId: 'registerPasswordError',
      validate: (val) => {
        if (!val) return 'La contraseña es obligatoria.';
        if (val.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
        const confirmInput = document.getElementById('registerPasswordConfirmInput');
        if (confirmInput && confirmInput.value) {
          const confirmErr = document.getElementById('registerPasswordConfirmError');
          if (confirmInput.value !== val) {
            if (confirmErr) {
              confirmErr.textContent = 'Las contraseñas no coinciden.';
              confirmErr.style.display = 'block';
            }
          } else {
            if (confirmErr) {
              confirmErr.textContent = '';
              confirmErr.style.display = 'none';
            }
          }
        }
        return null;
      },
    },
    {
      id: 'registerPasswordConfirmInput',
      errorId: 'registerPasswordConfirmError',
      validate: (val) => {
        if (!val) return 'Por favor confirma tu contraseña.';
        const pwInput = document.getElementById('registerPasswordInput');
        if (val !== pwInput?.value) {
          return 'Las contraseñas no coinciden.';
        }
        return null;
      },
    },
    {
      id: 'registerNameInput',
      errorId: 'registerNameError',
      validate: (val) => {
        if (!val || val.trim().length < 2) {
          return 'El nombre debe tener al menos 2 caracteres.';
        }
        return null;
      },
    },
  ];

  fields.forEach(({ id, errorId, validate }) => {
    const input = document.getElementById(id);
    const errEl = document.getElementById(errorId);
    if (!input || !errEl) return;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimers[id]);
      debounceTimers[id] = setTimeout(() => {
        const error = validate(input.value);
        if (error) {
          errEl.textContent = error;
          errEl.style.display = 'block';
          input.style.borderColor = '#ef4444';
        } else {
          errEl.textContent = '';
          errEl.style.display = 'none';
          input.style.borderColor = '';
        }
      }, 500);
    });
  });
}
