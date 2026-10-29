import { describe, it, expect, beforeEach, vi } from 'vitest';
import { accountView } from '../src/js/views/account-view.js';
import { store } from '../src/js/store.js';
import { apiClient } from '../src/js/modules/api-client.js';
import * as userProfileModal from '../src/js/components/user-profile-modal.js';

describe('AccountView — Vista de Mi Cuenta y Configuración (/mi-cuenta)', () => {
  let container;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    store.clearUser();

    document.body.innerHTML = '<div id="appContainer"></div>';
    container = document.getElementById('appContainer');
  });

  it('renderiza pantalla de bienvenida y botones de acceso cuando el usuario es visitante', () => {
    const html = accountView.render();
    container.innerHTML = html;

    expect(container.querySelector('#btnVisitorGoLogin')).not.toBeNull();
    expect(container.querySelector('#btnVisitorGoRegister')).not.toBeNull();
    expect(container.textContent).toContain('Acceso a tu Cuenta');
  });

  it('abre los modales de login y registro al presionar los botones en modo visitante', () => {
    const openModalSpy = vi.spyOn(userProfileModal, 'openUserProfileModal').mockImplementation(() => {});
    container.innerHTML = accountView.render();
    accountView.onMount(container);

    const btnLogin = container.querySelector('#btnVisitorGoLogin');
    const btnRegister = container.querySelector('#btnVisitorGoRegister');

    btnLogin.click();
    expect(openModalSpy).toHaveBeenCalledWith('login');

    btnRegister.click();
    expect(openModalSpy).toHaveBeenCalledWith('register');

    openModalSpy.mockRestore();
  });

  it('renderiza los datos del usuario autenticado en el formulario', () => {
    const user = {
      id: 'USR_TEST_01',
      name: 'Lesly Rivera',
      email: 'lesly@kromalab.gt',
      phone: '+502 5555-1234',
      company: 'Arte & Diseño GT',
      nit: '1234567-8',
      taxId: '1234567-8',
      address: 'San José el Placer, Villa Nueva, Guatemala',
      role: 'CUSTOMER'
    };
    store.setUser(user, 'fake-token-test', ['ORDERS']);

    container.innerHTML = accountView.render();

    expect(container.querySelector('#accountNameInput').value).toBe('Lesly Rivera');
    expect(container.querySelector('#accountEmailInput').value).toBe('lesly@kromalab.gt');
    expect(container.querySelector('#accountPhoneInput').value).toBe('+502 5555-1234');
    expect(container.querySelector('#accountCompanyInput').value).toBe('Arte & Diseño GT');
    expect(container.querySelector('#accountNitInput').value).toBe('1234567-8');
    expect(container.querySelector('#accountAddressInput').value).toBe('San José el Placer, Villa Nueva, Guatemala');
  });

  it('guarda los cambios correctamente e interactúa con apiClient.auth.updateProfile', async () => {
    const user = {
      id: 'USR_TEST_01',
      name: 'Lesly Rivera',
      email: 'lesly@kromalab.gt',
      phone: '+502 5555-1234',
      company: 'Arte & Diseño GT',
      nit: '1234567-8',
      address: 'Villa Nueva',
      role: 'CUSTOMER'
    };
    store.setUser(user, 'fake-token-test', ['ORDERS']);

    const updateProfileSpy = vi.spyOn(apiClient.auth, 'updateProfile').mockResolvedValue({
      success: true,
      user: {
        ...user,
        name: 'Lesly Dubois',
        phone: '+502 5406-6217',
        company: 'Kroma Studio',
        address: 'San José el Placer, Villa Nueva'
      }
    });

    container.innerHTML = accountView.render();
    accountView.onMount(container);

    const nameInput = container.querySelector('#accountNameInput');
    const phoneInput = container.querySelector('#accountPhoneInput');
    const companyInput = container.querySelector('#accountCompanyInput');
    const addressInput = container.querySelector('#accountAddressInput');
    const form = container.querySelector('#formAccountSettings');

    nameInput.value = 'Lesly Dubois';
    phoneInput.value = '+502 5406-6217';
    companyInput.value = 'Kroma Studio';
    addressInput.value = 'San José el Placer, Villa Nueva';

    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(updateProfileSpy).toHaveBeenCalledWith({
        name: 'Lesly Dubois',
        phone: '+502 5406-6217',
        company: 'Kroma Studio',
        taxId: '1234567-8',
        address: 'San José el Placer, Villa Nueva'
      });
    });

    const feedback = container.querySelector('#accountFeedbackMsg');
    expect(feedback.style.display).toBe('block');
    expect(feedback.textContent).toContain('actualizados exitosamente');
    expect(store.state.user.name).toBe('Lesly Dubois');

    updateProfileSpy.mockRestore();
  });

  it('muestra mensaje de error si falla la actualización del perfil', async () => {
    const user = {
      id: 'USR_TEST_01',
      name: 'Lesly Rivera',
      email: 'lesly@kromalab.gt',
      phone: '+502 5555-1234',
      role: 'CUSTOMER'
    };
    store.setUser(user, 'fake-token-test', ['ORDERS']);

    const updateProfileSpy = vi.spyOn(apiClient.auth, 'updateProfile').mockRejectedValue(new Error('Fallo de red en servidor'));

    container.innerHTML = accountView.render();
    accountView.onMount(container);

    const form = container.querySelector('#formAccountSettings');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      const feedback = container.querySelector('#accountFeedbackMsg');
      expect(feedback.style.display).toBe('block');
      expect(feedback.textContent).toContain('Fallo de red en servidor');
    });

    updateProfileSpy.mockRestore();
  });

  it('cierra la sesión al hacer clic en el botón de logout', () => {
    const user = { id: 'USR_01', name: 'Miguel', role: 'ADMIN' };
    store.setUser(user, 'token-123', ['*']);

    const logoutSpy = vi.spyOn(userProfileModal, 'handleLogout').mockImplementation(() => {});

    container.innerHTML = accountView.render();
    accountView.onMount(container);

    const btnLogout = container.querySelector('#btnAccountLogout');
    btnLogout.click();

    expect(logoutSpy).toHaveBeenCalled();
    logoutSpy.mockRestore();
  });

  it('enlaza eventos y previene recarga completa al guardar cuando onMount es llamado sin argumentos', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const appEl = document.getElementById('app');
    const user = {
      id: 'USR_TEST_01',
      name: 'Miguel Dubois',
      email: 'miguel@kromalab.gt',
      phone: '+502 5406-6217',
      role: 'ADMIN'
    };
    store.setUser(user, 'fake-token-test', ['*']);

    appEl.innerHTML = accountView.render();
    // Invocación como lo hace router.js: sin argumentos
    accountView.onMount();

    const form = appEl.querySelector('#formAccountSettings');
    expect(form).not.toBeNull();

    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);

    expect(submitEvent.defaultPrevented).toBe(true);
  });
  it('requiere contraseña actual para cambiar correo electrónico (Task 8)', async () => {
    const user = { id: 'USR_01', name: 'Miguel Dubois', email: 'miguel@kromalab.gt', phone: '55551234', role: 'ADMIN' };
    store.setUser(user, 'token-123', ['*']);

    container.innerHTML = accountView.render();
    accountView.onMount(container);

    const emailInput = container.querySelector('#accountEmailInput');
    emailInput.value = 'nuevo@kromalab.gt';

    const form = container.querySelector('#formAccountSettings');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      const feedback = container.querySelector('#accountFeedbackMsg');
      expect(feedback.style.display).toBe('block');
      expect(feedback.textContent).toContain('debes ingresar tu contraseña actual');
    });
  });

  it('invoca changeEmail al proporcionar nuevo correo y contraseña actual válida (Task 8)', async () => {
    const user = { id: 'USR_01', name: 'Miguel Dubois', email: 'miguel@kromalab.gt', phone: '55551234', role: 'ADMIN' };
    store.setUser(user, 'token-123', ['*']);

    const changeEmailSpy = vi.spyOn(apiClient.auth, 'changeEmail').mockResolvedValue({
      success: true,
      message: 'Hemos enviado un correo de verificación a nuevo@kromalab.gt'
    });
    vi.spyOn(apiClient.auth, 'updateProfile').mockResolvedValue({ success: true, user });

    container.innerHTML = accountView.render();
    accountView.onMount(container);

    container.querySelector('#accountEmailInput').value = 'nuevo@kromalab.gt';
    container.querySelector('#accountCurrentPasswordInput').value = 'Admin2026!';

    const form = container.querySelector('#formAccountSettings');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(changeEmailSpy).toHaveBeenCalledWith('Admin2026!', 'nuevo@kromalab.gt');
      const feedback = container.querySelector('#accountFeedbackMsg');
      expect(feedback.textContent).toContain('Hemos enviado un correo de verificación');
    });
    changeEmailSpy.mockRestore();
  });

  it('valida requisitos y contraseñas al cambiar contraseña (Task 7)', async () => {
    const user = { id: 'USR_01', name: 'Miguel Dubois', email: 'miguel@kromalab.gt', phone: '55551234', role: 'ADMIN' };
    store.setUser(user, 'token-123', ['*']);

    container.innerHTML = accountView.render();
    accountView.onMount(container);

    container.querySelector('#accountNewPasswordInput').value = 'NewPass2026!';
    container.querySelector('#accountConfirmPasswordInput').value = 'DifferentPass!';

    const form = container.querySelector('#formAccountSettings');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      const feedback = container.querySelector('#accountFeedbackMsg');
      expect(feedback.textContent).toContain('debes ingresar tu contraseña actual');
    });

    container.querySelector('#accountCurrentPasswordInput').value = 'Admin2026!';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      const feedback = container.querySelector('#accountFeedbackMsg');
      expect(feedback.textContent).toContain('Las contraseñas no coinciden');
    });
  });

  it('invoca changePassword al enviar contraseña actual y nueva contraseña coincidente (Task 7)', async () => {
    const user = { id: 'USR_01', name: 'Miguel Dubois', email: 'miguel@kromalab.gt', phone: '55551234', role: 'ADMIN' };
    store.setUser(user, 'token-123', ['*']);

    const changePwSpy = vi.spyOn(apiClient.auth, 'changePassword').mockResolvedValue({
      success: true,
      message: 'Hemos enviado un correo de verificación para activar tu nueva contraseña'
    });
    vi.spyOn(apiClient.auth, 'updateProfile').mockResolvedValue({ success: true, user });

    container.innerHTML = accountView.render();
    accountView.onMount(container);

    container.querySelector('#accountCurrentPasswordInput').value = 'Admin2026!';
    container.querySelector('#accountNewPasswordInput').value = 'SuperNewPass2026!';
    container.querySelector('#accountConfirmPasswordInput').value = 'SuperNewPass2026!';

    const form = container.querySelector('#formAccountSettings');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    await vi.waitFor(() => {
      expect(changePwSpy).toHaveBeenCalledWith('Admin2026!', 'SuperNewPass2026!');
      const feedback = container.querySelector('#accountFeedbackMsg');
      expect(feedback.textContent).toContain('correo de verificación');
    });
    changePwSpy.mockRestore();
  });
});
