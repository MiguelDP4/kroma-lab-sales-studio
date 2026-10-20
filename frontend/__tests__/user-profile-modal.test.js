import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initUserProfileModal,
  openUserProfileModal,
  closeUserProfileModal,
  handleProfileSubmit,
  switchUserAccount,
  showFeedback,
} from '../src/js/components/user-profile-modal.js';
import { store } from '../src/js/store.js';
import { usersStore } from '../src/js/modules/users-store.js';

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
      expect(roleBadge.textContent).toContain('Cliente B2B');
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

    it('cierra el modal al llamar a closeUserProfileModal()', () => {
      openUserProfileModal();
      const modal = document.getElementById('userProfileModal');
      expect(modal.style.display).toBe('block');

      closeUserProfileModal();
      expect(modal.style.display).toBe('none');
    });

    it('abre el modal al pulsar el chip del topbar o la tarjeta del sidebar', () => {
      const chip = document.getElementById('userProfileChip');
      const sidebarCard = document.getElementById('sidebarUserCard');
      const modal = document.getElementById('userProfileModal');

      expect(modal.style.display).toBe('none');

      chip.click();
      expect(modal.style.display).toBe('block');

      closeUserProfileModal();
      expect(modal.style.display).toBe('none');

      sidebarCard.click();
      expect(modal.style.display).toBe('block');
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
    });

    it('cierra el modal al hacer clic en el backdrop fuera de la tarjeta', () => {
      openUserProfileModal();
      const modal = document.getElementById('userProfileModal');

      modal.click();
      expect(modal.style.display).toBe('none');
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

      // Verificar actualización en store global
      expect(store.state.user.name).toBe('Miguel Ángel Dubois Pappa');
      expect(store.state.user.company).toBe('Kroma Lab Sales Studio');
      expect(store.state.user.address).toContain('Villa Nueva');

      // Verificar actualización en usersStore
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

      // Duplicar el correo del admin para forzar error de unicidad
      document.getElementById('profileNameInput').value = 'Carlos';
      document.getElementById('profileEmailInput').value = 'miguel@kromalab.gt';
      document.getElementById('profilePhoneInput').value = '+502 5555-0000';

      const success = handleProfileSubmit({ preventDefault: vi.fn() });
      expect(success).toBe(false);

      const feedback = document.getElementById('profileFeedbackMsg');
      expect(feedback.textContent).toContain('ya está registrado');
    });
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
