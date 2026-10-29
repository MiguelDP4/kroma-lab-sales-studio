import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initUserProfileModal,
  openUserProfileModal,
  closeUserProfileModal,
  switchAuthTab,
  handleProfileSubmit,
  handleLoginSubmit,
  handleRegisterSubmit,
  loginWithRealCredentials,
  registerWithRealAccount,
  handleLogout,
  switchUserAccount,
  showFeedback,
} from '../src/js/components/user-profile-modal.js';
import { store } from '../src/js/store.js';
import { usersStore } from '../src/js/modules/users-store.js';
import { apiClient } from '../src/js/modules/api-client.js';

describe('User Profile Modal — Configuración de Cuenta de Usuario', () => {
  let container;

  beforeEach(() => {
    localStorage.clear();
    store.clearUser();

    document.body.innerHTML = `
      <div id="userProfileChip" class="user-profile-chip">
        <span id="userChipAvatar">👑</span>
        <span id="userChipName">Admin</span>
      </div>
      <div id="sidebarUserCard" class="sidebar-user-card">
        <div id="sidebarUserAvatar">M</div>
        <div id="sidebarUserName">Miguel Dubois</div>
        <div id="sidebarUserRole">ADMINISTRADOR</div>
      </div>
      <div id="userProfileModalContainer"></div>
    `;

    initUserProfileModal();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('Inicialización y Renderizado', () => {
    it('crea el contenedor si no existe e inyecta la estructura del modal', () => {
      document.body.innerHTML = '';
      initUserProfileModal();

      const modal = document.getElementById('userProfileModal');
      expect(modal).not.toBeNull();
      expect(modal.getAttribute('role')).toBe('dialog');
      expect(modal.getAttribute('aria-modal')).toBe('true');
      expect(modal.style.display).toBe('none');
    });

    it('renderiza todos los campos del formulario de perfil de usuario', () => {
      expect(document.getElementById('profileNameInput')).not.toBeNull();
      expect(document.getElementById('profileEmailInput')).not.toBeNull();
      expect(document.getElementById('profilePhoneInput')).not.toBeNull();
      expect(document.getElementById('profileCompanyInput')).not.toBeNull();
      expect(document.getElementById('profileNitInput')).not.toBeNull();
      expect(document.getElementById('profileDepartmentInput')).not.toBeNull();
      expect(document.getElementById('profileAddressInput')).not.toBeNull();
      expect(document.getElementById('btnLogoutProfileBtn')).not.toBeNull();
      expect(document.getElementById('btnSaveUserProfile')).not.toBeNull();
    });

    it('renderiza las pestañas de navegación y los formularios de login y registro', () => {
      expect(document.getElementById('tabBtnProfile')).not.toBeNull();
      expect(document.getElementById('tabBtnLogin')).not.toBeNull();
      expect(document.getElementById('tabBtnRegister')).not.toBeNull();
      expect(document.getElementById('formUserLogin')).not.toBeNull();
      expect(document.getElementById('formUserRegister')).not.toBeNull();
    });
  });

  describe('Pestañas de Autenticación y Navegación (switchAuthTab)', () => {
    it('cambia a pestaña login mostrando formulario de acceso y ocultando perfil', () => {
      switchAuthTab('login');

      const viewLogin = document.getElementById('authViewLogin');
      const viewProfile = document.getElementById('authViewProfile');
      const viewRegister = document.getElementById('authViewRegister');

      expect(viewLogin.style.display).toBe('block');
      expect(viewProfile.style.display).toBe('none');
      expect(viewRegister.style.display).toBe('none');

      const title = document.getElementById('userProfileModalTitle');
      expect(title.textContent).toBe('Iniciar Sesión');
    });

    it('cambia a pestaña register mostrando formulario de registro B2B', () => {
      switchAuthTab('register');

      const viewRegister = document.getElementById('authViewRegister');
      const viewLogin = document.getElementById('authViewLogin');
      const viewProfile = document.getElementById('authViewProfile');

      expect(viewRegister.style.display).toBe('block');
      expect(viewLogin.style.display).toBe('none');
      expect(viewProfile.style.display).toBe('none');

      const title = document.getElementById('userProfileModalTitle');
      expect(title.textContent).toBe('Crear Cuenta');
    });

    it('cambia a pestaña profile mostrando datos de usuario', () => {
      switchAuthTab('login');
      switchAuthTab('profile');

      const viewProfile = document.getElementById('authViewProfile');
      const viewLogin = document.getElementById('authViewLogin');

      expect(viewProfile.style.display).toBe('block');
      expect(viewLogin.style.display).toBe('none');

      const title = document.getElementById('userProfileModalTitle');
      expect(title.textContent).toBe('Configuración de Cuenta');
    });

    it('cambia de pestaña al hacer clic en los botones de pestaña', () => {
      const tabLogin = document.getElementById('tabBtnLogin');
      const tabRegister = document.getElementById('tabBtnRegister');
      const tabProfile = document.getElementById('tabBtnProfile');

      tabLogin.click();
      expect(document.getElementById('authViewLogin').style.display).toBe('block');

      tabRegister.click();
      expect(document.getElementById('authViewRegister').style.display).toBe('block');

      tabProfile.click();
      expect(document.getElementById('authViewProfile').style.display).toBe('block');
    });
  });

  describe('Apertura, Cierre y Poblado de Datos (openUserProfileModal)', () => {
    it('abre el modal y puebla los datos de un usuario Administrador', () => {
      const adminUser = {
        id: 'usr_001',
        name: 'Miguel Dubois',
        email: 'miguel@kromalab.gt',
        phone: '+502 5406-6217',
        role: 'ADMIN',
        department: 'Dirección General',
        company: 'Kroma Lab',
        nit: '4829102-3',
        address: 'Colonia San José el Placer',
      };
      store.setUser(adminUser, 'admin-token', ['ALL']);

      openUserProfileModal();

      const modal = document.getElementById('userProfileModal');
      expect(modal.style.display).toBe('block');

      const nameInput = document.getElementById('profileNameInput');
      const emailInput = document.getElementById('profileEmailInput');
      const phoneInput = document.getElementById('profilePhoneInput');
      const companyInput = document.getElementById('profileCompanyInput');
      const nitInput = document.getElementById('profileNitInput');
      const deptInput = document.getElementById('profileDepartmentInput');
      const addressInput = document.getElementById('profileAddressInput');

      expect(nameInput.value).toBe('Miguel Dubois');
      expect(emailInput.value).toBe('miguel@kromalab.gt');
      expect(phoneInput.value).toBe('+502 5406-6217');
      expect(companyInput.value).toBe('Kroma Lab');
      expect(nitInput.value).toBe('4829102-3');
      expect(deptInput.value).toBe('Dirección General');
      expect(addressInput.value).toBe('Colonia San José el Placer');

      const roleBadge = document.getElementById('profileModalRoleBadge');
      expect(roleBadge.textContent).toContain('Administrador');

      const bannerAvatar = document.getElementById('profileBannerAvatar');
      expect(bannerAvatar.textContent.trim()).toBe('M');
    });

    it('muestra campos adecuados y oculta el grupo departamento para Cliente B2B', () => {
      const customerUser = {
        id: 'usr_004',
        name: 'Rodrigo Méndez',
        email: 'rodrigo@cafesancristobal.gt',
        phone: '+502 5555-1234',
        role: 'CUSTOMER',
        company: 'Café San Cristóbal',
        nit: '7829102-1',
        address: 'Zona 10 Guatemala',
      };
      store.setUser(customerUser, 'customer-token', ['ORDERS']);

      openUserProfileModal();

      const deptGroup = document.getElementById('profileDepartmentGroup');
      expect(deptGroup.style.display).toBe('none');

      const roleBadge = document.getElementById('profileModalRoleBadge');
      expect(roleBadge.textContent).toContain('Cliente Registrado');
    });

    it('maneja el modo Visitante con valores limpios e indicación de rol', () => {
      store.clearUser();

      openUserProfileModal();

      const nameInput = document.getElementById('profileNameInput');
      expect(nameInput.value).toBe('');

      const roleBadge = document.getElementById('profileModalRoleBadge');
      expect(roleBadge.textContent).toContain('Visitante');

      const bannerEmail = document.getElementById('profileBannerEmail');
      expect(bannerEmail.textContent).toContain('Navegando sin sesión activa');
    });

    it('abre en pestaña específica cuando se le solicita por parámetro', () => {
      openUserProfileModal('register');
      const viewRegister = document.getElementById('authViewRegister');
      expect(viewRegister.style.display).toBe('block');
    });

    it('cierra el modal al llamar a closeUserProfileModal()', () => {
      openUserProfileModal();
      const modal = document.getElementById('userProfileModal');
      expect(modal.style.display).toBe('block');

      closeUserProfileModal();
      expect(modal.style.display).toBe('none');
    });

    it('abre el modal al pulsar la tarjeta del sidebar', () => {
      const sidebarCard = document.getElementById('sidebarUserCard');
      const modal = document.getElementById('userProfileModal');

      expect(modal.style.display).toBe('none');

      sidebarCard.click();
      expect(modal.style.display).toBe('block');
    });

    it('oculta completamente las pestanas y opciones de Iniciar Sesion y Crear Cuenta cuando la sesion esta activa', () => {
      const activeUser = {
        id: 'usr_001',
        name: 'Miguel Dubois',
        email: 'miguel@kromalab.gt',
        role: 'ADMIN',
      };
      store.setUser(activeUser, 'valid-token', ['ALL']);

      openUserProfileModal();

      const authTabs = document.getElementById('authTabsContainer');
      const tabLogin = document.getElementById('tabBtnLogin');
      const tabRegister = document.getElementById('tabBtnRegister');
      const authViewLogin = document.getElementById('authViewLogin');
      const authViewRegister = document.getElementById('authViewRegister');
      const authViewProfile = document.getElementById('authViewProfile');

      expect(authTabs.style.display).toBe('none');
      expect(tabLogin.style.display).toBe('none');
      expect(tabRegister.style.display).toBe('none');
      expect(authViewProfile.style.display).toBe('block');
      expect(authViewLogin.style.display).toBe('none');
      expect(authViewRegister.style.display).toBe('none');

      // Intentar forzar cambio a pestana login o register no debe surtir efecto si hay sesion activa
      switchAuthTab('login');
      expect(authViewLogin.style.display).toBe('none');
      expect(authViewProfile.style.display).toBe('block');

      switchAuthTab('register');
      expect(authViewRegister.style.display).toBe('none');
      expect(authViewProfile.style.display).toBe('block');
    });

    it('muestra las pestanas de Iniciar Sesion y Crear Cuenta solo cuando esta en modo visitante', () => {
      store.clearUser();

      openUserProfileModal();

      const authTabs = document.getElementById('authTabsContainer');
      const tabLogin = document.getElementById('tabBtnLogin');
      const tabRegister = document.getElementById('tabBtnRegister');
      const tabProfile = document.getElementById('tabBtnProfile');

      expect(authTabs.style.display).toBe('flex');
      expect(tabLogin.style.display).toBe('block');
      expect(tabRegister.style.display).toBe('block');
      expect(tabProfile.style.display).toBe('none');
    });

    it('cierra el modal al pulsar el botón X o Cancelar', () => {
      openUserProfileModal();
      const modal = document.getElementById('userProfileModal');

      const btnClose = document.getElementById('btnCloseUserProfileModal');
      btnClose.click();
      expect(modal.style.display).toBe('none');

      openUserProfileModal();
      const btnCancel = document.getElementById('btnCancelUserProfile');
      btnCancel.click();
      expect(modal.style.display).toBe('none');

      openUserProfileModal();
      const btnCancelLogin = document.getElementById('btnCancelLogin');
      btnCancelLogin.click();
      expect(modal.style.display).toBe('none');

      openUserProfileModal();
      const btnCancelRegister = document.getElementById('btnCancelRegister');
      btnCancelRegister.click();
      expect(modal.style.display).toBe('none');
    });

    it('no cierra el modal al hacer clic en el backdrop fuera de la tarjeta (Task 5)', () => {
      openUserProfileModal();
      const modal = document.getElementById('userProfileModal');

      modal.click();
      expect(modal.style.display).toBe('block');
    });

    it('cierra el modal al presionar la tecla Escape', () => {
      openUserProfileModal();
      const modal = document.getElementById('userProfileModal');
      expect(modal.style.display).toBe('block');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(modal.style.display).toBe('none');
    });
  });

  describe('Validación y Actualización de Perfil (handleProfileSubmit)', () => {
    it('muestra error si el nombre completo está vacío', () => {
      openUserProfileModal();
      const nameInput = document.getElementById('profileNameInput');
      nameInput.value = '   ';

      const success = handleProfileSubmit({ preventDefault: vi.fn() });
      expect(success).toBe(false);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.style.display).toBe('block');
      expect(feedback.textContent).toContain('El nombre completo es obligatorio');
    });

    it('muestra error si el correo electrónico es inválido', () => {
      openUserProfileModal();
      const nameInput = document.getElementById('profileNameInput');
      const emailInput = document.getElementById('profileEmailInput');

      nameInput.value = 'Miguel Dubois';
      emailInput.value = 'correo-invalido-sin-arroba';

      const success = handleProfileSubmit({ preventDefault: vi.fn() });
      expect(success).toBe(false);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('correo electrónico válido');
    });

    it('muestra error si el teléfono está vacío', () => {
      openUserProfileModal();
      const nameInput = document.getElementById('profileNameInput');
      const emailInput = document.getElementById('profileEmailInput');
      const phoneInput = document.getElementById('profilePhoneInput');

      nameInput.value = 'Miguel Dubois';
      emailInput.value = 'miguel@kromalab.gt';
      phoneInput.value = '';

      const success = handleProfileSubmit({ preventDefault: vi.fn() });
      expect(success).toBe(false);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('teléfono o WhatsApp es obligatorio');
    });

    it('actualiza exitosamente el perfil de un usuario existente en usersStore y store', () => {
      const user = usersStore.getUserById('usr_001');
      store.setUser(user, 'token', ['ALL']);

      openUserProfileModal();

      document.getElementById('profileNameInput').value = 'Miguel Ángel Dubois Pappa';
      document.getElementById('profilePhoneInput').value = '+502 5406-6217';
      document.getElementById('profileCompanyInput').value = 'Kroma Lab Sales Studio';
      document.getElementById('profileNitInput').value = '4829102-3';
      document.getElementById('profileAddressInput').value = 'Colonia San José el Placer, Villa Nueva, Guatemala';

      const success = handleProfileSubmit({ preventDefault: vi.fn() });
      expect(success).toBe(true);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('actualizada exitosamente');

      expect(store.state.user.name).toBe('Miguel Ángel Dubois Pappa');
      expect(store.state.user.company).toBe('Kroma Lab Sales Studio');
      expect(store.state.user.address).toContain('Villa Nueva');

      const updatedInStore = usersStore.getUserById('usr_001');
      expect(updatedInStore.name).toBe('Miguel Ángel Dubois Pappa');
    });

    it('actualiza el usuario si coincide por correo cuando no tiene ID previo', () => {
      store.setUser({ email: 'rodrigo@cafesancristobal.gt', role: 'CUSTOMER' }, 'tok');

      openUserProfileModal();
      document.getElementById('profileNameInput').value = 'Rodrigo Méndez Editado';
      document.getElementById('profilePhoneInput').value = '+502 5555-9999';

      const success = handleProfileSubmit({ preventDefault: vi.fn() });
      expect(success).toBe(true);

      const updated = usersStore.getUserByEmail('rodrigo@cafesancristobal.gt');
      expect(updated.name).toBe('Rodrigo Méndez Editado');
      expect(updated.phone).toBe('+502 5555-9999');
    });

    it('maneja errores arrojados por usersStore mostrando el mensaje al usuario', () => {
      const user = usersStore.getUserById('usr_002');
      store.setUser(user, 'token', ['WORKSHOP']);

      openUserProfileModal();

      document.getElementById('profileNameInput').value = 'Carlos';
      document.getElementById('profileEmailInput').value = 'miguel@kromalab.gt';
      document.getElementById('profilePhoneInput').value = '+502 5555-0000';

      const success = handleProfileSubmit({ preventDefault: vi.fn() });
      expect(success).toBe(false);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('ya está registrado');
    });
  });

  describe('Autenticación Real con Backend (Login)', () => {
    it('muestra error si el correo o contraseña están vacíos', async () => {
      document.getElementById('loginEmailInput').value = '';
      document.getElementById('loginPasswordInput').value = '';

      const ok = await handleLoginSubmit({ preventDefault: vi.fn() });
      expect(ok).toBe(false);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('ingresa tu correo y contraseña');
    });

    it('inicia sesión exitosamente contra la API backend seteando usuario y token en store', async () => {
      const mockBackendUser = {
        id: 'usr_real_001',
        email: 'miguel@kromalab.gt',
        name: 'Miguel Dubois',
        role: 'ADMIN',
      };

      vi.spyOn(apiClient.auth, 'login').mockResolvedValue({
        success: true,
        user: mockBackendUser,
        token: 'real-jwt-token-xyz',
      });

      document.getElementById('loginEmailInput').value = 'miguel@kromalab.gt';
      document.getElementById('loginPasswordInput').value = 'Admin2026!';

      const ok = await handleLoginSubmit({ preventDefault: vi.fn() });
      expect(ok).toBe(true);

      expect(store.state.user.id).toBe('usr_real_001');
      expect(store.state.user.role).toBe('ADMIN');
      expect(store.state.token).toBe('real-jwt-token-xyz');

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('Sesión real iniciada');
    });

    it('maneja credenciales incorrectas o error de servidor mostrando mensaje de error', async () => {
      vi.spyOn(apiClient.auth, 'login').mockRejectedValue(new Error('Credenciales inválidas'));

      document.getElementById('loginEmailInput').value = 'err@kromalab.gt';
      document.getElementById('loginPasswordInput').value = 'WrongPass';

      const ok = await handleLoginSubmit({ preventDefault: vi.fn() });
      expect(ok).toBe(false);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('Credenciales inválidas');
    });

    it('los botones de login rápido invocan la autenticación real con credenciales', async () => {
      const loginSpy = vi.spyOn(apiClient.auth, 'login').mockResolvedValue({
        success: true,
        user: { id: 'usr_002', name: 'Carlos Morales', role: 'EMPLOYEE' },
        token: 'jwt-taller-tok',
      });

      const btnQuick = document.querySelector('.btn-quick-login[data-email="taller@kromalab.gt"]');
      expect(btnQuick).not.toBeNull();

      btnQuick.click();

      // Permitir que la promesa de login se resuelva
      await vi.waitFor(() => {
        expect(loginSpy).toHaveBeenCalledWith('taller@kromalab.gt', 'Taller2026!', true);
      });
    });
  });

  describe('Registro Real de Nuevos Clientes B2B (Register)', () => {
    it('valida que el nombre de contacto tenga al menos 2 caracteres', async () => {
      document.getElementById('registerNameInput').value = 'A';
      document.getElementById('registerEmailInput').value = 'test@empresa.gt';
      document.getElementById('registerPhoneInput').value = '55551234';
      document.getElementById('registerPasswordInput').value = 'Secret123!';
      document.getElementById('registerPasswordConfirmInput').value = 'Secret123!';

      const ok = await handleRegisterSubmit({ preventDefault: vi.fn() });
      expect(ok).toBe(false);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('al menos 2 caracteres');
    });

    it('valida que el correo electrónico sea válido', async () => {
      document.getElementById('registerNameInput').value = 'Juan Pérez';
      document.getElementById('registerEmailInput').value = 'emailinvalido';
      document.getElementById('registerPhoneInput').value = '55551234';
      document.getElementById('registerPasswordInput').value = 'Secret123!';
      document.getElementById('registerPasswordConfirmInput').value = 'Secret123!';

      const ok = await handleRegisterSubmit({ preventDefault: vi.fn() });
      expect(ok).toBe(false);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('correo electrónico válido');
    });

    it('valida que el teléfono tenga al menos 8 dígitos', async () => {
      document.getElementById('registerNameInput').value = 'Juan Pérez';
      document.getElementById('registerEmailInput').value = 'juan@empresa.gt';
      document.getElementById('registerPhoneInput').value = '123';
      document.getElementById('registerPasswordInput').value = 'Secret123!';
      document.getElementById('registerPasswordConfirmInput').value = 'Secret123!';

      const ok = await handleRegisterSubmit({ preventDefault: vi.fn() });
      expect(ok).toBe(false);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('mínimo 8 dígitos');
    });

    it('valida que la contraseña tenga al menos 6 caracteres', async () => {
      document.getElementById('registerNameInput').value = 'Juan Pérez';
      document.getElementById('registerEmailInput').value = 'juan@empresa.gt';
      document.getElementById('registerPhoneInput').value = '55551234';
      document.getElementById('registerPasswordInput').value = '123';

      const ok = await handleRegisterSubmit({ preventDefault: vi.fn() });
      expect(ok).toBe(false);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('al menos 6 caracteres');
    });

    it('registra exitosamente un cliente B2B y establece su sesión real', async () => {
      const mockRegisteredUser = {
        id: 'usr_new_client_01',
        name: 'Rodrigo Castillo',
        company: 'Publicidad Creativa GT',
        email: 'rodrigo@publicidad.gt',
        phone: '+502 5555-8888',
        role: 'CUSTOMER',
      };

      vi.spyOn(apiClient.auth, 'register').mockResolvedValue({
        success: true,
        user: mockRegisteredUser,
        token: 'new-client-jwt-token',
      });

      document.getElementById('registerNameInput').value = 'Rodrigo Castillo';
      document.getElementById('registerCompanyInput').value = 'Publicidad Creativa GT';
      document.getElementById('registerNitInput').value = '9876543-2';
      document.getElementById('registerPhoneInput').value = '+502 5555-8888';
      document.getElementById('registerAddressInput').value = 'Zona 9 Ciudad de Guatemala';
      document.getElementById('registerEmailInput').value = 'rodrigo@publicidad.gt';
      document.getElementById('registerPasswordInput').value = 'Promo2026!';
      document.getElementById('registerPasswordConfirmInput').value = 'Promo2026!';

      const ok = await handleRegisterSubmit({ preventDefault: vi.fn() });
      expect(ok).toBe(true);

      expect(store.state.user.name).toBe('Rodrigo Castillo');
      expect(store.state.user.role).toBe('CUSTOMER');
      expect(store.state.token).toBe('new-client-jwt-token');

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('Cuenta creada exitosamente');
    });

    it('muestra error cuando el registro en backend falla (p. ej. correo duplicado)', async () => {
      vi.spyOn(apiClient.auth, 'register').mockRejectedValue(
        new Error('Ya existe una cuenta registrada con este correo electrónico.')
      );

      document.getElementById('registerNameInput').value = 'Juan Pérez';
      document.getElementById('registerEmailInput').value = 'existente@empresa.gt';
      document.getElementById('registerPhoneInput').value = '55551234';
      document.getElementById('registerPasswordInput').value = 'Secret123!';
      document.getElementById('registerPasswordConfirmInput').value = 'Secret123!';

      const ok = await handleRegisterSubmit({ preventDefault: vi.fn() });
      expect(ok).toBe(false);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('Ya existe una cuenta registrada');
    });
  });


    it('valida que las contraseñas coincidan al crear cuenta (Task 1)', async () => {
      document.getElementById('registerNameInput').value = 'Carlos Gómez';
      document.getElementById('registerEmailInput').value = 'carlos@gomez.gt';
      document.getElementById('registerPhoneInput').value = '55551234';
      document.getElementById('registerPasswordInput').value = 'Secret123!';
      document.getElementById('registerPasswordConfirmInput').value = 'MismatchPass!';

      const ok = await handleRegisterSubmit({ preventDefault: vi.fn() });
      expect(ok).toBe(false);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('Las contraseñas no coinciden');
    });

    it('valida teléfono numérico antes de enviar al backend (Task 2)', async () => {
      document.getElementById('registerNameInput').value = 'Carlos Gómez';
      document.getElementById('registerEmailInput').value = 'carlos@gomez.gt';
      document.getElementById('registerPhoneInput').value = 'numero-invalido';
      document.getElementById('registerPasswordInput').value = 'Secret123!';
      document.getElementById('registerPasswordConfirmInput').value = 'Secret123!';

      const ok = await handleRegisterSubmit({ preventDefault: vi.fn() });
      expect(ok).toBe(false);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('únicamente números');
    });

    it('elimina notificación de credenciales inválidas al cambiar de login a crear cuenta (Task 3)', () => {
      switchAuthTab('login');
      showFeedback('Credenciales inválidas o servidor no disponible.', 'error');
      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.style.display).toBe('block');
      expect(feedback.textContent).toContain('Credenciales inválidas');

      switchAuthTab('register');
      expect(feedback.style.display).toBe('none');
      expect(feedback.textContent).toBe('');
    });

    it('limpia correo, contraseña y credenciales inválidas al cerrar el modal (Task 6)', () => {
      openUserProfileModal('login');
      document.getElementById('loginEmailInput').value = 'usuario@test.gt';
      document.getElementById('loginPasswordInput').value = 'PasswordErr123';
      showFeedback('Credenciales inválidas.', 'error');

      closeUserProfileModal();

      expect(document.getElementById('loginEmailInput').value).toBe('');
      expect(document.getElementById('loginPasswordInput').value).toBe('');
      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toBe('');
      expect(feedback.style.display).toBe('none');
    });

  describe('Acciones Rápidas: Cambio de Cuenta y Cierre de Sesión', () => {
    it('cambia de cuenta al pulsar un botón de acceso rápido (.btn-switch-account)', () => {
      switchUserAccount('usr_002');

      expect(store.state.user).not.toBeNull();
      expect(store.state.user.id).toBe('usr_002');
      expect(store.state.user.role).toBe('EMPLOYEE');

      const nameInput = document.getElementById('profileNameInput');
      expect(nameInput.value).toBe('Carlos Morales');

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('Carlos Morales');
    });

    it('cambia al modo Visitante al pulsar la opción de visitante', () => {
      store.setUser({ id: 'usr_001', role: 'ADMIN' }, 'tok');
      switchUserAccount('visitor');

      expect(store.state.user).toBeNull();
      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('Visitante');
    });

    it('muestra error si el ID de usuario a cambiar no existe', () => {
      switchUserAccount('usr_inexistente_999');

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('No se encontró el usuario');
    });

    it('cierra sesión con el botón de logout limpiando store', () => {
      vi.useFakeTimers();
      store.setUser({ id: 'usr_001', role: 'ADMIN' }, 'tok');
      openUserProfileModal();

      const btnLogout = document.getElementById('btnLogoutProfileBtn');
      btnLogout.click();

      expect(store.state.user).toBeNull();

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('Sesión finalizada');

      vi.advanceTimersByTime(600);
      const modal = document.getElementById('userProfileModal');
      expect(modal.style.display).toBe('none');

      vi.useRealTimers();
    });

    it('despliega feedback con los diferentes estilos de color según el tipo', () => {
      showFeedback('Mensaje de éxito', 'success');
      const el = document.getElementById('profileFeedbackMsg');
      expect(el.style.color).toBe('rgb(16, 185, 129)');

      showFeedback('Mensaje de error', 'error');
      expect(el.style.color).toBe('rgb(239, 68, 68)');

      showFeedback('Mensaje informativo', 'info');
      expect(el.style.color).toBe('var(--cerulean)');
    });
  });
});
