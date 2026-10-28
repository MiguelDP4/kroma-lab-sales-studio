/**
 * Vista de Cuenta y Configuración de Usuario (AccountView) — Kroma Lab Sales Studio
 * Permite al usuario consultar y actualizar todos sus datos de registro:
 * Nombre completo, Correo electrónico, WhatsApp, Empresa o Negocio, NIT SAT y Dirección de entrega.
 * Enfoque Mobile-First estricto, accesible y táctil.
 */

import { store } from '../store.js';
import { apiClient } from '../modules/api-client.js';
import { handleLogout, openUserProfileModal } from '../components/user-profile-modal.js';

export const accountView = {
  path: '/mi-cuenta',
  name: 'account',
  allowedRoles: ['VISITOR', 'CUSTOMER', 'EMPLOYEE', 'ADMIN'],

  render: () => {
    const user = store.state.user;
    const isVisitor = !user || user.role === 'VISITOR';

    if (isVisitor) {
      return `
        <div class="container" style="padding: 2.5rem 1rem 4rem; max-width: 680px; margin: 0 auto;">
          <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: clamp(1.5rem, 4vw, 2.5rem); text-align: center; box-shadow: var(--shadow-sm);">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(28, 114, 147, 0.12); color: var(--cerulean); font-size: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem;">
              👤
            </div>
            <h1 style="font-size: clamp(1.5rem, 3vw, 1.85rem); font-weight: 800; margin: 0 0 0.5rem; color: var(--text-primary);">
              Acceso a tu Cuenta
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin: 0 auto 1.75rem; max-width: 480px;">
              Inicia sesión o crea tu cuenta para guardar cotizaciones, realizar pedidos de impresión UV DTF y gestionar tus datos de entrega y facturación.
            </p>
            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
              <button type="button" id="btnVisitorGoLogin" class="btn btn-primary" style="min-height: 44px; padding: 0.6rem 1.5rem; display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 700;">
                <span>🔑 Iniciar Sesión</span>
              </button>
              <button type="button" id="btnVisitorGoRegister" class="btn btn-secondary" style="min-height: 44px; padding: 0.6rem 1.5rem; display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 700; border-color: var(--cerulean); color: var(--cerulean);">
                <span>📝 Crear Cuenta</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }

    const roleLabel = user.role === 'ADMIN' ? '👑 Administrador' : (user.role === 'EMPLOYEE' ? '🛠️ Equipo de Taller' : '🏢 Cliente Registrado');
    const avatarLetter = user.name ? user.name[0].toUpperCase() : 'U';

    return `
      <div class="container" style="padding: 2rem 1rem 4rem; max-width: 760px; margin: 0 auto;">
        
        <!-- Encabezado de la Vista -->
        <div style="margin-bottom: 1.75rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem;">
            <span class="badge" style="color: var(--cerulean); border-color: var(--cerulean);">⚙️ Configuración</span>
            <span class="badge" style="background: rgba(16, 185, 129, 0.12); color: #10b981; border-color: #10b981;">Sesión Activa</span>
          </div>
          <h1 style="font-size: clamp(1.75rem, 3.5vw, 2.2rem); font-weight: 800; margin: 0.25rem 0 0.5rem; color: var(--text-primary); letter-spacing: -0.01em;">
            Mi Cuenta y Configuración
          </h1>
          <p style="color: var(--text-secondary); font-size: 0.95rem; margin: 0; line-height: 1.5;">
            Consulta y actualiza tus datos de contacto, empresa, facturación y dirección de entrega para envíos en Guatemala.
          </p>
        </div>

        <!-- Banner de Perfil -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; align-items: center; gap: 1rem; min-width: 0;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, var(--cerulean), var(--baltic-blue)); color: #fff; font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 10px rgba(28, 114, 147, 0.25);">
              ${avatarLetter}
            </div>
            <div style="min-width: 0;">
              <div style="font-weight: 800; font-size: 1.15rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${user.name}
              </div>
              <div style="font-size: 0.85rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${user.email}
              </div>
              <span class="badge" style="font-size: 0.72rem; margin-top: 0.35rem; display: inline-block;">
                ${roleLabel}
              </span>
            </div>
          </div>

          <button type="button" id="btnAccountLogout" class="btn btn-secondary" style="min-height: 44px; color: #ef4444; border-color: rgba(239, 68, 68, 0.3); display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.88rem; font-weight: 600;">
            <span>🚪 Cerrar Sesión</span>
          </button>
        </div>

        <!-- Mensaje de Feedback -->
        <div id="accountFeedbackMsg" style="display: none; padding: 0.85rem 1.15rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; font-size: 0.9rem; font-weight: 600;"></div>

        <!-- Formulario de Edición de Cuenta -->
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: clamp(1.25rem, 3vw, 2rem); box-shadow: var(--shadow-sm);">
          <h2 style="font-size: 1.15rem; font-weight: 700; margin: 0 0 1.25rem; color: var(--text-primary); border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
            📋 Datos de Contacto y Facturación
          </h2>

          <form id="formAccountSettings">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label" for="accountNameInput" style="font-weight: 700;">
                  Nombre Completo: <span style="color: #ef4444;">*</span>
                </label>
                <input type="text" id="accountNameInput" class="input-control" value="${user.name || ''}" required style="min-height: 44px;" placeholder="Tu nombre y apellido">
              </div>

              <div class="form-group">
                <label class="form-label" for="accountEmailInput" style="font-weight: 700;">
                  Correo Electrónico: <span style="color: #ef4444;">*</span>
                </label>
                <input type="email" id="accountEmailInput" class="input-control" value="${user.email || ''}" data-original-email="${user.email || ''}" required style="min-height: 44px;" placeholder="correo@ejemplo.gt">
                <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; display: block;">Para cambiarlo, requerirá tu contraseña actual y verificación en el nuevo correo.</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label" for="accountPhoneInput" style="font-weight: 700;">
                  Teléfono / WhatsApp: <span style="color: #ef4444;">*</span>
                </label>
                <input type="tel" id="accountPhoneInput" class="input-control" value="${user.phone || ''}" required style="min-height: 44px;" placeholder="+502 5406-6217">
              </div>

              <div class="form-group">
                <label class="form-label" for="accountCompanyInput" style="font-weight: 700;">
                  Empresa o Nombre del Negocio:
                </label>
                <input type="text" id="accountCompanyInput" class="input-control" value="${user.company || ''}" style="min-height: 44px;" placeholder="Ej. Imprenta Express, Café Don Juan">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
              <div class="form-group">
                <label class="form-label" for="accountNitInput" style="font-weight: 700;">
                  NIT Facturación SAT:
                </label>
                <input type="text" id="accountNitInput" class="input-control" value="${user.taxId || user.nit || ''}" style="min-height: 44px;" placeholder="Ej. 1234567-8 o C/F">
              </div>

              ${(user.role === 'ADMIN' || user.role === 'EMPLOYEE') ? `
              <div class="form-group">
                <label class="form-label" for="accountDeptInput" style="font-weight: 700;">
                  Área / Departamento Interno:
                </label>
                <input type="text" id="accountDeptInput" class="input-control" value="${user.department || ''}" style="min-height: 44px;" placeholder="Ej. Taller Audley, Dirección">
              </div>
              ` : ''}
            </div>

            <div class="form-group" style="margin-bottom: 1.75rem;">
              <label class="form-label" for="accountAddressInput" style="font-weight: 700;">
                Dirección de Entrega en Guatemala:
              </label>
              <textarea id="accountAddressInput" class="input-control" rows="3" style="min-height: 80px;" placeholder="Zona, Colonia, Municipio (ej. San José el Placer, Villa Nueva / Zona 10 Ciudad de Guatemala)...">${user.address || ''}</textarea>
              <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; display: block;">Utilizada para generar tus guías y remisiones de entrega UV DTF</span>
            </div>

            <!-- Sección de Seguridad y Contraseña (Tasks 7 & 8) -->
            <div style="background: rgba(28, 114, 147, 0.04); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;">
              <h3 style="font-size: 1.05rem; font-weight: 700; margin: 0 0 0.5rem; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
                <span>🔒</span>
                <span>Seguridad y Contraseña</span>
              </h3>
              <p style="color: var(--text-secondary); font-size: 0.85rem; line-height: 1.5; margin: 0 0 1rem;">
                Si deseas cambiar tu contraseña o tu correo electrónico, ingresa tu contraseña actual para autorizar la operación.
              </p>

              <div class="form-group" style="margin-bottom: 1rem;">
                <label class="form-label" for="accountCurrentPasswordInput" style="font-weight: 700;">
                  Contraseña Actual:
                </label>
                <input type="password" id="accountCurrentPasswordInput" class="input-control" style="min-height: 44px;" placeholder="Tu contraseña actual" autocomplete="current-password">
                <span style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; display: block;">Obligatoria para cambiar correo o asignar una nueva contraseña</span>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem;">
                <div class="form-group">
                  <label class="form-label" for="accountNewPasswordInput" style="font-weight: 700;">
                    Nueva Contraseña:
                  </label>
                  <input type="password" id="accountNewPasswordInput" class="input-control" minlength="6" style="min-height: 44px;" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
                </div>

                <div class="form-group">
                  <label class="form-label" for="accountConfirmPasswordInput" style="font-weight: 700;">
                    Confirmar Nueva Contraseña:
                  </label>
                  <input type="password" id="accountConfirmPasswordInput" class="input-control" minlength="6" style="min-height: 44px;" placeholder="Repite tu nueva contraseña" autocomplete="new-password">
                  <span id="accountConfirmPasswordError" class="field-error-msg" style="display: none; color: #ef4444; font-size: 0.78rem; margin-top: 0.25rem;"></span>
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: flex-end; align-items: center; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1.25rem; flex-wrap: wrap;">
              <button type="submit" class="btn btn-primary" id="btnSaveAccountSettings" style="min-height: 44px; padding: 0.65rem 1.75rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.5rem;">
                <span>💾 Guardar Cambios</span>
              </button>
            </div>
          </form>
        </div>

      </div>
    `;
  },

  onMount: (container) => {
    const root = container || document.getElementById('app') || (typeof document !== 'undefined' ? document : null);
    if (!root) return;

    // Si es visitante, enlazar botones rápidos a los modales correspondientes
    const btnVisitorLogin = root.querySelector('#btnVisitorGoLogin');
    if (btnVisitorLogin) {
      btnVisitorLogin.addEventListener('click', () => openUserProfileModal('login'));
    }

    const btnVisitorRegister = root.querySelector('#btnVisitorGoRegister');
    if (btnVisitorRegister) {
      btnVisitorRegister.addEventListener('click', () => openUserProfileModal('register'));
    }

    // Botón de Cerrar Sesión
    const btnLogout = root.querySelector('#btnAccountLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        await handleLogout();
        window.location.href = '/';
      });
    }

    // Formulario de Guardado
    const form = root.querySelector('#formAccountSettings');
    const feedback = root.querySelector('#accountFeedbackMsg');
    const submitBtn = root.querySelector('#btnSaveAccountSettings');

    function showFeedback(msg, type = 'success') {
      if (!feedback) return;
      feedback.style.display = 'block';
      feedback.textContent = msg;
      if (type === 'success') {
        feedback.style.background = 'rgba(16, 185, 129, 0.15)';
        feedback.style.color = '#10b981';
        feedback.style.border = '1px solid #10b981';
      } else {
        feedback.style.background = 'rgba(239, 68, 68, 0.15)';
        feedback.style.color = '#ef4444';
        feedback.style.border = '1px solid #ef4444';
      }
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nameInput = root.querySelector('#accountNameInput');
        const emailInput = root.querySelector('#accountEmailInput');
        const phoneInput = root.querySelector('#accountPhoneInput');
        const companyInput = root.querySelector('#accountCompanyInput');
        const nitInput = root.querySelector('#accountNitInput');
        const deptInput = root.querySelector('#accountDeptInput');
        const addressInput = root.querySelector('#accountAddressInput');
        const currentPwInput = root.querySelector('#accountCurrentPasswordInput');
        const newPwInput = root.querySelector('#accountNewPasswordInput');
        const confirmPwInput = root.querySelector('#accountConfirmPasswordInput');

        const name = nameInput?.value?.trim() || '';
        const email = emailInput?.value?.trim().toLowerCase() || '';
        const originalEmail = emailInput?.dataset?.originalEmail?.trim().toLowerCase() || store.state.user?.email?.toLowerCase() || '';
        const phone = phoneInput?.value?.trim() || '';
        const company = companyInput?.value?.trim() || '';
        const taxId = nitInput?.value?.trim() || '';
        const department = deptInput?.value?.trim() || '';
        const address = addressInput?.value?.trim() || '';
        const currentPassword = currentPwInput?.value || '';
        const newPassword = newPwInput?.value || '';
        const confirmPassword = confirmPwInput?.value || '';

        if (!name || name.length < 2) {
          showFeedback('El nombre debe tener al menos 2 caracteres.', 'error');
          if (nameInput) nameInput.focus();
          return;
        }

        if (!email || !email.includes('@') || !email.includes('.')) {
          showFeedback('Ingresa un correo electrónico válido.', 'error');
          if (emailInput) emailInput.focus();
          return;
        }

        if (!phone || phone.length < 8) {
          showFeedback('Ingresa un número de teléfono válido (mínimo 8 dígitos).', 'error');
          if (phoneInput) phoneInput.focus();
          return;
        }

        // Validación de cambio de correo (Task 8)
        const isEmailChanged = Boolean(email && originalEmail && email !== originalEmail);
        if (isEmailChanged && !currentPassword) {
          showFeedback('Para cambiar tu correo electrónico debes ingresar tu contraseña actual.', 'error');
          if (currentPwInput) currentPwInput.focus();
          return;
        }

        // Validación de cambio de contraseña (Task 7)
        const isPasswordChangeRequested = Boolean(newPassword || confirmPassword);
        if (isPasswordChangeRequested) {
          if (!currentPassword) {
            showFeedback('Para cambiar tu contraseña debes ingresar tu contraseña actual.', 'error');
            if (currentPwInput) currentPwInput.focus();
            return;
          }
          if (newPassword.length < 6) {
            showFeedback('La nueva contraseña debe tener al menos 6 caracteres.', 'error');
            if (newPwInput) newPwInput.focus();
            return;
          }
          if (newPassword !== confirmPassword) {
            showFeedback('Las contraseñas no coinciden.', 'error');
            if (confirmPwInput) confirmPwInput.focus();
            return;
          }
        }

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Guardando...';
          }

          let feedbackMsgs = [];

          // 1. Ejecutar cambio de correo con verificación si se solicitó (Task 8)
          if (isEmailChanged && typeof apiClient !== 'undefined' && apiClient.auth?.changeEmail) {
            const emailRes = await apiClient.auth.changeEmail(currentPassword, email);
            if (emailRes && emailRes.message) {
              feedbackMsgs.push(emailRes.message);
            }
          }

          // 2. Ejecutar cambio de contraseña con verificación si se solicitó (Task 7)
          if (isPasswordChangeRequested && typeof apiClient !== 'undefined' && apiClient.auth?.changePassword) {
            const pwRes = await apiClient.auth.changePassword(currentPassword, newPassword);
            if (pwRes && pwRes.message) {
              feedbackMsgs.push(pwRes.message);
            }
            if (currentPwInput) currentPwInput.value = '';
            if (newPwInput) newPwInput.value = '';
            if (confirmPwInput) confirmPwInput.value = '';
          }

          // 3. Actualizar datos de perfil generales
          const payload = {
            name,
            phone,
            company,
            taxId,
            address,
            ...(department ? { department } : {}),
          };

          let updatedUser = null;

          if (typeof apiClient !== 'undefined' && apiClient.auth) {
            const res = await apiClient.auth.updateProfile(payload);
            if (res && res.success && res.user) {
              updatedUser = res.user;
            }
          }

          if (!updatedUser) {
            updatedUser = {
              ...(store.state.user || {}),
              name,
              phone,
              company,
              taxId,
              nit: taxId,
              address,
              department,
            };
          }

          const isRemembered = typeof localStorage !== 'undefined' && localStorage.getItem('kromalab_remember_me') === 'true';
          store.setUser(updatedUser, store.state.token, store.state.permissions, isRemembered);

          if (feedbackMsgs.length > 0) {
            showFeedback(feedbackMsgs.join(' | ') + ' ✅ Datos de perfil guardados.', 'success');
          } else {
            showFeedback('✅ Tus datos han sido actualizados exitosamente.', 'success');
          }
        } catch (err) {
          showFeedback(err.message || 'Error al actualizar tus datos.', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>💾 Guardar Cambios</span>';
          }
        }
      });
    }

    return () => {
      // Teardown
    };
  },
};
