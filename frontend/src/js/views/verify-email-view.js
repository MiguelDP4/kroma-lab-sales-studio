/**
 * Vista de Verificación de Correo Electrónico (VerifyEmailView) — Kroma Lab Sales Studio
 * Procesa la activación de cuenta cuando el usuario pulsa el enlace enviado por correo electrónico.
 * Enfoque Mobile-First, táctil y accesible.
 */

import { store } from '../store.js';
import { apiClient } from '../modules/api-client.js';

export const verifyEmailView = {
  path: '/verificar-correo',
  name: 'verify-email',
  allowedRoles: ['VISITOR', 'CUSTOMER', 'EMPLOYEE', 'ADMIN'],

  render: () => {
    return `
      <div class="container" style="padding: 2.5rem 1rem 4rem; max-width: 620px; margin: 0 auto;">
        <div id="verifyEmailCard" style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: clamp(1.5rem, 4vw, 2.75rem); text-align: center; box-shadow: var(--shadow-md);">
          
          <!-- Estado 1: Cargando / Procesando -->
          <div id="verifyStateLoading">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(28, 114, 147, 0.12); color: var(--cerulean); font-size: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; animation: pulse 1.5s infinite;">
              ⏳
            </div>
            <h1 style="font-size: clamp(1.4rem, 3.5vw, 1.85rem); font-weight: 800; margin: 0 0 0.75rem; color: var(--text-primary);">
              Verificando tu Cuenta...
            </h1>
            <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin: 0 auto; max-width: 440px;">
              Estamos validando tu enlace de confirmación con el servidor de Kroma Lab. Un momento por favor.
            </p>
          </div>

          <!-- Estado 2: Éxito -->
          <div id="verifyStateSuccess" style="display: none;">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); color: #10b981; font-size: 2.25rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
              ✅
            </div>
            <span class="badge" style="background: rgba(16, 185, 129, 0.12); color: #10b981; border-color: #10b981; margin-bottom: 0.5rem; display: inline-block;">
              Identidad Confirmada
            </span>
            <h1 style="font-size: clamp(1.4rem, 3.5vw, 1.85rem); font-weight: 800; margin: 0.25rem 0 0.75rem; color: var(--text-primary);">
              ¡Correo Verificado con Éxito!
            </h1>
            <p id="verifySuccessMsg" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; margin: 0 auto 1.75rem; max-width: 460px;">
              Tu cuenta ha sido activada correctamente. Ya puedes acceder al cotizador en tiempo real, enviar tus diseños para impresión UV DTF y gestionar tus pedidos.
            </p>
            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
              <a href="/" class="btn btn-primary" data-link style="min-height: 48px; padding: 0.75rem 2rem; font-weight: 800; display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none;">
                <span>🚀 Comenzar a Cotizar</span>
              </a>
              <a href="/mi-cuenta" class="btn btn-secondary" data-link style="min-height: 48px; padding: 0.75rem 1.5rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none;">
                <span>👤 Ver Mi Perfil</span>
              </a>
            </div>
          </div>

          <!-- Estado 3: Error / Token Inválido o Expirado -->
          <div id="verifyStateError" style="display: none;">
            <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); color: #ef4444; font-size: 2.25rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
              ⚠️
            </div>
            <h1 style="font-size: clamp(1.4rem, 3.5vw, 1.85rem); font-weight: 800; margin: 0 0 0.75rem; color: var(--text-primary);">
              Enlace No Válido o Expirado
            </h1>
            <p id="verifyErrorMsg" style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; margin: 0 auto 1.5rem; max-width: 460px;">
              El enlace de confirmación ha caducado (límite de 24 horas) o ya ha sido utilizado previamente.
            </p>

            <!-- Caja para Reenviar Correo de Confirmación -->
            <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-top: 1.5rem; text-align: left;">
              <h2 style="font-size: 1rem; font-weight: 700; margin: 0 0 0.5rem; color: var(--text-primary);">
                ¿Necesitas un nuevo enlace?
              </h2>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0 0 1rem; line-height: 1.4;">
                Ingresa tu correo electrónico registrado y te enviaremos un nuevo enlace de activación de inmediato.
              </p>
              
              <form id="formResendVerification">
                <div class="form-group" style="margin-bottom: 0.75rem;">
                  <input type="email" id="resendEmailInput" class="input-control" required placeholder="tu-correo@ejemplo.gt" style="min-height: 44px; width: 100%;">
                </div>
                <div id="resendFeedbackMsg" style="display: none; padding: 0.65rem 0.85rem; border-radius: var(--radius-sm); font-size: 0.84rem; font-weight: 600; margin-bottom: 0.75rem;"></div>
                <button type="submit" id="btnSubmitResend" class="btn btn-primary" style="min-height: 44px; width: 100%; font-weight: 700;">
                  <span>📨 Reenviar Correo de Verificación</span>
                </button>
              </form>
            </div>

            <div style="margin-top: 1.5rem;">
              <a href="/" class="btn btn-secondary" data-link style="min-height: 44px; padding: 0.6rem 1.5rem; display: inline-flex; align-items: center; gap: 0.4rem; text-decoration: none;">
                <span>🏠 Volver al Inicio</span>
              </a>
            </div>
          </div>

        </div>
      </div>
    `;
  },

  onMount: async (container) => {
    if (!container) return;

    const stateLoading = container.querySelector('#verifyStateLoading');
    const stateSuccess = container.querySelector('#verifyStateSuccess');
    const stateError = container.querySelector('#verifyStateError');
    const errorMsg = container.querySelector('#verifyErrorMsg');

    // Obtener token de la query string
    let token = '';
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      token = params.get('token') || '';
    }

    if (!token) {
      if (stateLoading) stateLoading.style.display = 'none';
      if (stateError) stateError.style.display = 'block';
      if (errorMsg) errorMsg.textContent = 'No se proporcionó ningún token de verificación en el enlace.';
      return;
    }

    try {
      const res = await apiClient.auth.verifyEmail(token);
      if (res && res.success) {
        if (stateLoading) stateLoading.style.display = 'none';
        if (stateSuccess) stateSuccess.style.display = 'block';

        // Actualizar sesión en store si recibimos datos del usuario
        if (res.user && res.token) {
          const perms = res.user.role === 'ADMIN' ? ['*'] : (res.user.role === 'EMPLOYEE' ? ['ORDERS', 'WORKSHOP'] : ['ORDERS']);
          store.setUser(res.user, res.token, perms, true);
        }
      } else {
        throw new Error(res?.message || 'Error al validar el enlace.');
      }
    } catch (err) {
      if (stateLoading) stateLoading.style.display = 'none';
      if (stateError) stateError.style.display = 'block';
      if (errorMsg) {
        errorMsg.textContent = err.message || 'El enlace de confirmación no es válido o ha expirado.';
      }
    }

    // Manejar reenvío de correo
    const formResend = container.querySelector('#formResendVerification');
    const resendEmailInput = container.querySelector('#resendEmailInput');
    const resendFeedback = container.querySelector('#resendFeedbackMsg');
    const btnSubmitResend = container.querySelector('#btnSubmitResend');

    if (formResend) {
      formResend.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = resendEmailInput?.value?.trim();
        if (!email) return;

        try {
          if (btnSubmitResend) {
            btnSubmitResend.disabled = true;
            btnSubmitResend.textContent = 'Enviando...';
          }
          const res = await apiClient.auth.resendVerification(email);
          if (resendFeedback) {
            resendFeedback.style.display = 'block';
            resendFeedback.style.background = 'rgba(16, 185, 129, 0.15)';
            resendFeedback.style.color = '#10b981';
            resendFeedback.style.border = '1px solid #10b981';
            resendFeedback.textContent = res.message || 'Correo reenviado exitosamente. Revisa tu bandeja de entrada.';
          }
        } catch (resendErr) {
          if (resendFeedback) {
            resendFeedback.style.display = 'block';
            resendFeedback.style.background = 'rgba(239, 68, 68, 0.15)';
            resendFeedback.style.color = '#ef4444';
            resendFeedback.style.border = '1px solid #ef4444';
            resendFeedback.textContent = resendErr.message || 'Error al reenviar el correo.';
          }
        } finally {
          if (btnSubmitResend) {
            btnSubmitResend.disabled = false;
            btnSubmitResend.textContent = '📨 Reenviar Correo de Verificación';
          }
        }
      });
    }
  },
};
export default verifyEmailView;
