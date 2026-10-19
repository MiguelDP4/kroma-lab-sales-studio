import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usersView } from '../src/js/views/users-view.js';
import { usersStore } from '../src/js/modules/users-store.js';
import { USER_ROLES } from '../src/shared/business-config.js';
import { USER_STATUS } from '../src/shared/rbac-config.js';

describe('Users View — Interfaz de Administración de Usuarios y Permisos RBAC', () => {
  let cleanup;

  beforeEach(() => {
    localStorage.clear();
    usersStore.resetToDefaults();

    document.body.innerHTML = usersView.render();
    cleanup = usersView.onMount();
  });

  afterEach(() => {
    if (typeof cleanup === 'function') {
      cleanup();
    }
  });

  describe('Renderizado e Inicialización de UI', () => {
    it('renderiza encabezado, indicadores KPI y tabla de usuarios con datos semilla', () => {
      expect(document.querySelector('h1').textContent).toContain('Administración de Usuarios');
      expect(document.body.innerHTML).toContain('Seguridad y Acceso RBAC');
      expect(document.getElementById('btnOpenCreateUserModal').textContent).toContain('Invitar Empleado');
      expect(document.getElementById('btnOpenRbacModal').textContent).toContain('Matriz de Permisos RBAC');

      // KPIs
      const metricCards = document.querySelectorAll('.orders-metric-card');
      expect(metricCards.length).toBe(4);
      expect(metricCards[0].textContent).toContain('5'); // Total
      expect(metricCards[1].textContent).toContain('3'); // Colaboradores activos
      expect(metricCards[2].textContent).toContain('1'); // Admins
      expect(metricCards[3].textContent).toContain('1'); // Clientes B2B

      // Tabla
      const rows = document.querySelectorAll('#usersTableBody tr');
      expect(rows.length).toBe(5);

      const firstRow = rows[0];
      expect(firstRow.textContent).toContain('Miguel Dubois');
      expect(firstRow.textContent).toContain('ADMIN');
      expect(firstRow.textContent).toContain('Dirección General');
    });

    it('renderiza iniciales en los avatares para nombres simples y compuestos', () => {
      const avatars = document.querySelectorAll('.user-avatar-badge');
      expect(avatars[0].textContent).toBe('MD'); // Miguel Dubois
      expect(avatars[1].textContent).toBe('CM'); // Carlos Morales
    });

    it('maneja nombres simples y usuarios sin teléfono en la tabla', () => {
      usersStore.createUser({
        name: 'Operador',
        email: 'operador@kromalab.gt',
        role: USER_ROLES.EMPLOYEE,
        phone: '',
      });

      expect(document.body.innerHTML).toContain('Sin teléfono');
      expect(document.body.innerHTML).toContain('OP'); // Primeras 2 letras de "Operador"
    });
  });

  describe('Filtros y Búsqueda en Tiempo Real', () => {
    it('filtra usuarios por texto de búsqueda en nombre o correo', () => {
      const searchInput = document.getElementById('userSearchInput');

      searchInput.value = 'Carlos';
      searchInput.dispatchEvent(new Event('input'));

      let rows = document.querySelectorAll('#usersTableBody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Carlos Morales');

      // Búsqueda sin resultados
      searchInput.value = 'NoExisteXYZ';
      searchInput.dispatchEvent(new Event('input'));

      rows = document.querySelectorAll('#usersTableBody tr');
      expect(rows.length).toBe(0);
      expect(document.getElementById('usersEmptyState').style.display).toBe('block');
    });

    it('filtra por rol asignado', () => {
      const roleFilter = document.getElementById('userRoleFilter');

      roleFilter.value = USER_ROLES.EMPLOYEE;
      roleFilter.dispatchEvent(new Event('change'));

      const rows = document.querySelectorAll('#usersTableBody tr');
      expect(rows.length).toBe(3); // Carlos, Sofía, Ana Lucía
    });

    it('filtra por estado activo / inactivo', () => {
      const statusFilter = document.getElementById('userStatusFilter');

      statusFilter.value = USER_STATUS.INACTIVE.id;
      statusFilter.dispatchEvent(new Event('change'));

      const rows = document.querySelectorAll('#usersTableBody tr');
      expect(rows.length).toBe(1);
      expect(rows[0].textContent).toContain('Ana Lucía Gómez');
    });
  });

  describe('Modal de Matriz de Permisos RBAC', () => {
    it('abre y cierra el modal explicativo de la matriz RBAC', () => {
      const btnOpen = document.getElementById('btnOpenRbacModal');
      const modal = document.getElementById('rbacMatrixModal');
      const btnClose = document.getElementById('btnCloseRbacModal');
      const btnOk = document.getElementById('btnOkRbacModal');

      expect(modal.style.display).toBe('none');

      btnOpen.click();
      expect(modal.style.display).toBe('block');
      expect(document.body.style.overflow).toBe('hidden');

      btnClose.click();
      expect(modal.style.display).toBe('none');
      expect(document.body.style.overflow).toBe('');

      btnOpen.click();
      expect(modal.style.display).toBe('block');
      btnOk.click();
      expect(modal.style.display).toBe('none');
    });
  });

  describe('Creación de Nuevo Usuario (Invitar Colaborador)', () => {
    it('abre el modal en modo creación y resetea los campos', () => {
      const btnOpen = document.getElementById('btnOpenCreateUserModal');
      const modal = document.getElementById('userFormModal');
      const title = document.getElementById('userModalTitle');

      btnOpen.click();
      expect(modal.style.display).toBe('block');
      expect(title.textContent).toContain('Registrar / Invitar');
      expect(document.getElementById('userFormId').value).toBe('');
    });

    it('crea un usuario satisfactoriamente y actualiza la tabla y KPIs', () => {
      const btnOpen = document.getElementById('btnOpenCreateUserModal');
      btnOpen.click();

      document.getElementById('userFormName').value = 'Javier Ortiz';
      document.getElementById('userFormEmail').value = 'javier@kromalab.gt';
      document.getElementById('userFormPhone').value = '+502 5555-4321';
      document.getElementById('userFormDepartment').value = 'Operador Audley & Taller';
      document.getElementById('userFormRole').value = USER_ROLES.EMPLOYEE;
      document.getElementById('userFormStatus').value = USER_STATUS.ACTIVE.id;

      const form = document.getElementById('formUser');
      form.dispatchEvent(new Event('submit'));

      expect(document.getElementById('userFormModal').style.display).toBe('none');

      const rows = document.querySelectorAll('#usersTableBody tr');
      expect(rows.length).toBe(6);
      expect(document.body.innerHTML).toContain('Javier Ortiz');
    });

    it('muestra mensaje de error si se intenta registrar un correo ya existente', () => {
      const btnOpen = document.getElementById('btnOpenCreateUserModal');
      btnOpen.click();

      document.getElementById('userFormName').value = 'Duplicado';
      document.getElementById('userFormEmail').value = 'miguel@kromalab.gt'; // Ya existe

      const form = document.getElementById('formUser');
      form.dispatchEvent(new Event('submit'));

      const errorBox = document.getElementById('userFormError');
      expect(errorBox.style.display).toBe('block');
      expect(errorBox.textContent).toContain('Ya existe un usuario');
      expect(document.getElementById('userFormModal').style.display).toBe('block');
    });

    it('cierra el modal al pulsar Cancelar o el botón de cierre', () => {
      const modal = document.getElementById('userFormModal');
      const btnOpen = document.getElementById('btnOpenCreateUserModal');
      const btnCancel = document.getElementById('btnCancelUserFormModal');
      const btnClose = document.getElementById('btnCloseUserFormModal');

      btnOpen.click();
      expect(modal.style.display).toBe('block');

      btnCancel.click();
      expect(modal.style.display).toBe('none');

      btnOpen.click();
      expect(modal.style.display).toBe('block');
      btnClose.click();
      expect(modal.style.display).toBe('none');
    });
  });

  describe('Edición de Usuario', () => {
    it('carga los datos del usuario en el formulario y guarda los cambios', () => {
      const editBtn = document.querySelector('.btn-edit-user[data-user-id="usr_002"]');
      editBtn.click();

      const modal = document.getElementById('userFormModal');
      expect(modal.style.display).toBe('block');
      expect(document.getElementById('userFormName').value).toBe('Carlos Morales');
      expect(document.getElementById('userFormEmail').value).toBe('carlos.taller@kromalab.gt');

      // Modificar datos
      document.getElementById('userFormName').value = 'Carlos Morales Editado';
      document.getElementById('userFormPhone').value = '+502 5555-0000';

      const form = document.getElementById('formUser');
      form.dispatchEvent(new Event('submit'));

      expect(modal.style.display).toBe('none');
      expect(document.body.innerHTML).toContain('Carlos Morales Editado');
      expect(usersStore.getUserById('usr_002').phone).toBe('+502 5555-0000');
    });

    it('muestra error en modal si la edición falla con correo duplicado', () => {
      const editBtn = document.querySelector('.btn-edit-user[data-user-id="usr_002"]');
      editBtn.click();

      document.getElementById('userFormEmail').value = 'miguel@kromalab.gt'; // duplicado
      const form = document.getElementById('formUser');
      form.dispatchEvent(new Event('submit'));

      const errorBox = document.getElementById('userFormError');
      expect(errorBox.style.display).toBe('block');
      expect(errorBox.textContent).toContain('ya está registrado');
    });
  });

  describe('Alternancia de Estado (Toggle Status)', () => {
    it('alterna el estado de un usuario al pulsar su botón de estado', () => {
      const toggleBtn = document.querySelector('.btn-status-toggle[data-user-id="usr_002"]');
      expect(toggleBtn.textContent).toContain('Activo');

      toggleBtn.click();

      const updatedUser = usersStore.getUserById('usr_002');
      expect(updatedUser.status).toBe(USER_STATUS.INACTIVE.id);

      const reloadedBtn = document.querySelector('.btn-status-toggle[data-user-id="usr_002"]');
      expect(reloadedBtn.textContent).toContain('Inactivo');
    });

    it('muestra alerta si se intenta desactivar al único admin', () => {
      window.alert = vi.fn();
      const adminToggleBtn = document.querySelector('.btn-status-toggle[data-user-id="usr_001"]');

      adminToggleBtn.click();

      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('único Administrador Activo'));
      expect(usersStore.getUserById('usr_001').status).toBe(USER_STATUS.ACTIVE.id);
    });
  });

  describe('Restablecimiento de Contraseña', () => {
    it('abre el modal de contraseña, genera una clave aleatoria y la confirma', () => {
      const resetBtn = document.querySelector('.btn-reset-pw[data-user-id="usr_002"]');
      resetBtn.click();

      const modal = document.getElementById('resetPasswordModal');
      expect(modal.style.display).toBe('block');
      expect(document.getElementById('resetPwUserName').textContent).toContain('Carlos Morales');

      const btnGen = document.getElementById('btnGenerateRandomPw');
      btnGen.click();

      const pwInput = document.getElementById('resetPwInput');
      expect(pwInput.value).toMatch(/^Kroma!\d{4}$/);

      const btnConfirm = document.getElementById('btnConfirmResetPw');
      btnConfirm.click();

      const feedback = document.getElementById('resetPwFeedback');
      expect(feedback.style.display).toBe('block');
      expect(document.getElementById('resetPwSuccessCode').textContent).toBe(pwInput.value);
    });

    it('copia la contraseña al portapapeles y restablece el texto del botón tras el timeout', async () => {
      vi.useFakeTimers();
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(true),
        },
      });

      const resetBtn = document.querySelector('.btn-reset-pw[data-user-id="usr_002"]');
      resetBtn.click();

      document.getElementById('btnConfirmResetPw').click();

      const copyBtn = document.getElementById('btnCopyPw');
      await copyBtn.click();

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
      expect(copyBtn.textContent).toContain('Copiado');

      vi.advanceTimersByTime(2100);
      expect(copyBtn.textContent).toContain('Copiar');
      vi.useRealTimers();
    });

    it('muestra alerta si ocurre un error al restablecer la contraseña', () => {
      window.alert = vi.fn();
      vi.spyOn(usersStore, 'resetPassword').mockImplementationOnce(() => {
        throw new Error('Fallo simulado al restablecer');
      });

      const resetBtn = document.querySelector('.btn-reset-pw[data-user-id="usr_002"]');
      resetBtn.click();
      document.getElementById('btnConfirmResetPw').click();

      expect(window.alert).toHaveBeenCalledWith('Fallo simulado al restablecer');
    });

    it('cierra el modal de contraseña', () => {
      const modal = document.getElementById('resetPasswordModal');
      const resetBtn = document.querySelector('.btn-reset-pw[data-user-id="usr_002"]');
      resetBtn.click();
      expect(modal.style.display).toBe('block');

      document.getElementById('btnCloseResetPwModal').click();
      expect(modal.style.display).toBe('none');

      resetBtn.click();
      expect(modal.style.display).toBe('block');
      document.getElementById('btnCancelResetPwModal').click();
      expect(modal.style.display).toBe('none');
    });
  });

  describe('Eliminación de Usuario', () => {
    it('abre modal de confirmación y elimina un usuario satisfactoriamente', () => {
      const deleteBtn = document.querySelector('.btn-delete-user[data-user-id="usr_005"]');
      deleteBtn.click();

      const modal = document.getElementById('deleteUserModal');
      expect(modal.style.display).toBe('block');
      expect(document.getElementById('deleteUserName').textContent).toContain('Ana Lucía Gómez');

      const confirmBtn = document.getElementById('btnConfirmDeleteUser');
      confirmBtn.click();

      expect(modal.style.display).toBe('none');
      expect(usersStore.getUserById('usr_005')).toBeNull();
      expect(document.querySelectorAll('#usersTableBody tr').length).toBe(4);
    });

    it('muestra error en modal si se intenta eliminar al único administrador activo', () => {
      const adminDeleteBtn = document.querySelector('.btn-delete-user[data-user-id="usr_001"]');
      adminDeleteBtn.click();

      const modal = document.getElementById('deleteUserModal');
      expect(modal.style.display).toBe('block');

      const confirmBtn = document.getElementById('btnConfirmDeleteUser');
      confirmBtn.click();

      const errorBox = document.getElementById('deleteUserError');
      expect(errorBox.style.display).toBe('block');
      expect(errorBox.textContent).toContain('único Administrador Activo');
      expect(usersStore.getUserById('usr_001')).not.toBeNull();
    });

    it('cancela la eliminación al pulsar Cancelar o el botón de cierre', () => {
      const modal = document.getElementById('deleteUserModal');
      const deleteBtn = document.querySelector('.btn-delete-user[data-user-id="usr_002"]');

      deleteBtn.click();
      expect(modal.style.display).toBe('block');

      document.getElementById('btnCancelDeleteUserModal').click();
      expect(modal.style.display).toBe('none');

      deleteBtn.click();
      expect(modal.style.display).toBe('block');
      document.getElementById('btnCloseDeleteUserModal').click();
      expect(modal.style.display).toBe('none');
    });
  });

  describe('Comportamiento Defensivo', () => {
    it('no falla si onMount se ejecuta en un DOM vacío', () => {
      document.body.innerHTML = '';
      expect(() => usersView.onMount()).not.toThrow();
    });
  });
});
