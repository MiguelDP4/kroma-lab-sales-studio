import { describe, it, expect, beforeEach, vi } from 'vitest';
import { verifyEmailView } from '../src/js/views/verify-email-view.js';
import { store } from '../src/js/store.js';
import { apiClient } from '../src/js/modules/api-client.js';

describe('VerifyEmailView — Vista de Verificación de Correo Electrónico (/verificar-correo)', () => {
  let container;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    store.clearUser();

    document.body.innerHTML = '<div id="appContainer"></div>';
    container = document.getElementById('appContainer');

    // Reset URL
    delete window.location;
    window.location = new URL('http://localhost:3000/verificar-correo');
  });

  it('renderiza la estructura básica con estados de carga, éxito y error', () => {
    container.innerHTML = verifyEmailView.render();

    expect(container.querySelector('#verifyStateLoading')).not.toBeNull();
    expect(container.querySelector('#verifyStateSuccess')).not.toBeNull();
    expect(container.querySelector('#verifyStateError')).not.toBeNull();
    expect(container.querySelector('#formResendVerification')).not.toBeNull();
  });

  it('muestra estado de error si no se proporciona ningún token en la URL', async () => {
    window.location = new URL('http://localhost:3000/verificar-correo');
    container.innerHTML = verifyEmailView.render();

    await verifyEmailView.onMount(container);

    const stateLoading = container.querySelector('#verifyStateLoading');
    const stateError = container.querySelector('#verifyStateError');
    const errorMsg = container.querySelector('#verifyErrorMsg');

    expect(stateLoading.style.display).toBe('none');
    expect(stateError.style.display).toBe('block');
    expect(errorMsg.textContent).toContain('No se proporcionó ningún token');
  });

  it('valida exitosamente el token e inicia la sesión en el store', async () => {
    window.location = new URL('http://localhost:3000/verificar-correo?token=valid-test-token-123');
    container.innerHTML = verifyEmailView.render();

    const mockUser = {
      id: 'USR_VERIFIED_01',
      name: 'Cliente Verificado',
      email: 'cliente@ejemplo.gt',
      role: 'CUSTOMER',
    };

    const verifySpy = vi.spyOn(apiClient.auth, 'verifyEmail').mockResolvedValue({
      success: true,
      token: 'jwt-auth-verified-token',
      user: mockUser,
    });

    await verifyEmailView.onMount(container);

    expect(verifySpy).toHaveBeenCalledWith('valid-test-token-123');

    const stateLoading = container.querySelector('#verifyStateLoading');
    const stateSuccess = container.querySelector('#verifyStateSuccess');

    expect(stateLoading.style.display).toBe('none');
    expect(stateSuccess.style.display).toBe('block');
    expect(store.state.user).toEqual(mockUser);
    expect(store.state.token).toBe('jwt-auth-verified-token');

    verifySpy.mockRestore();
  });

  it('muestra mensaje de error si el token es inválido o expiró', async () => {
    window.location = new URL('http://localhost:3000/verificar-correo?token=expired-token-456');
    container.innerHTML = verifyEmailView.render();

    const verifySpy = vi.spyOn(apiClient.auth, 'verifyEmail').mockRejectedValue(
      new Error('El enlace de confirmación ha caducado (límite de 24 horas).')
    );

    await verifyEmailView.onMount(container);

    const stateLoading = container.querySelector('#verifyStateLoading');
    const stateError = container.querySelector('#verifyStateError');
    const errorMsg = container.querySelector('#verifyErrorMsg');

    expect(stateLoading.style.display).toBe('none');
    expect(stateError.style.display).toBe('block');
    expect(errorMsg.textContent).toContain('El enlace de confirmación ha caducado');

    verifySpy.mockRestore();
  });

  it('permite reenviar el correo de confirmación desde el formulario', async () => {
    window.location = new URL('http://localhost:3000/verificar-correo?token=expired-token-456');
    container.innerHTML = verifyEmailView.render();

    vi.spyOn(apiClient.auth, 'verifyEmail').mockRejectedValue(new Error('Token expirado'));
    const resendSpy = vi.spyOn(apiClient.auth, 'resendVerification').mockResolvedValue({
      success: true,
      message: 'Correo reenviado exitosamente.',
    });

    await verifyEmailView.onMount(container);

    const emailInput = container.querySelector('#resendEmailInput');
    const form = container.querySelector('#formResendVerification');
    const feedback = container.querySelector('#resendFeedbackMsg');

    emailInput.value = 'usuario@ejemplo.gt';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(resendSpy).toHaveBeenCalledWith('usuario@ejemplo.gt');
    });

    expect(feedback.style.display).toBe('block');
    expect(feedback.textContent).toContain('Correo reenviado exitosamente');

    resendSpy.mockRestore();
  });
});
