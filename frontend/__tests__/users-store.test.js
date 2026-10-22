import { describe, it, expect, beforeEach } from 'vitest';
import { usersStore, INITIAL_SEED_USERS } from '../src/js/modules/users-store.js';
import { USER_ROLES } from '../src/shared/business-config.js';
import { USER_STATUS, hasPermission } from '../src/shared/rbac-config.js';

describe('UsersStore — Gestión de Usuarios y Permisos RBAC', () => {
  beforeEach(() => {
    localStorage.clear();
    usersStore.resetToDefaults();
  });

  describe('Carga y Estado Inicial', () => {
    it('carga la lista de usuarios semilla correctamente', () => {
      const users = usersStore.getUsers();
      expect(users.length).toBe(INITIAL_SEED_USERS.length);
      expect(users[0].name).toBe('Miguel Dubois');
      expect(users[0].role).toBe(USER_ROLES.ADMIN);
    });

    it('carga usuarios guardados en localStorage si existen previamente', () => {
      const customUsers = [{ id: 'usr_custom', name: 'Custom User', email: 'custom@kromalab.gt', role: 'EMPLOYEE', status: 'ACTIVE' }];
      localStorage.setItem('kromalab_users', JSON.stringify(customUsers));

      usersStore.loadFromStorage();
      expect(usersStore.getUsers().length).toBe(1);
      expect(usersStore.getUsers()[0].id).toBe('usr_custom');
    });

    it('encuentra usuarios por ID o correo electrónico', () => {
      const user = usersStore.getUserById('usr_001');
      expect(user).toBeDefined();
      expect(user.email).toBe('miguel@kromalab.gt');

      const byEmail = usersStore.getUserByEmail('CARLOS.TALLER@KROMALAB.GT');
      expect(byEmail).toBeDefined();
      expect(byEmail.id).toBe('usr_002');

      expect(usersStore.getUserById('inexistente')).toBeNull();
      expect(usersStore.getUserByEmail('')).toBeNull();
    });

    it('calcula métricas correctas del equipo y accesos', () => {
      const metrics = usersStore.getMetrics();
      expect(metrics.totalUsers).toBe(5);
      expect(metrics.activeStaff).toBe(3); // Miguel (ADMIN) + Carlos (EMPLOYEE) + Sofia (EMPLOYEE)
      expect(metrics.activeAdmins).toBe(1); // Miguel
      expect(metrics.activeCustomers).toBe(1); // Rodrigo
      expect(metrics.inactiveUsers).toBe(1); // Ana Lucía
    });
  });

  describe('Creación de Usuarios (createUser)', () => {
    it('crea un nuevo colaborador exitosamente con valores por defecto', () => {
      const newUser = usersStore.createUser({
        name: 'Fernando Ruiz',
        email: 'fernando@kromalab.gt',
        role: USER_ROLES.EMPLOYEE,
        phone: '+502 5555-9988',
        department: 'Operador Audley & Taller',
      });

      expect(newUser.id).toBeDefined();
      expect(newUser.name).toBe('Fernando Ruiz');
      expect(newUser.email).toBe('fernando@kromalab.gt');
      expect(newUser.status).toBe(USER_STATUS.ACTIVE.id);
      expect(usersStore.getUsers().length).toBe(6);
    });

    it('falla si el nombre está vacío o no se proporciona', () => {
      expect(() => {
        usersStore.createUser({ email: 'test@kromalab.gt' });
      }).toThrow('nombre del usuario es obligatorio');
    });

    it('falla si el correo no es válido', () => {
      expect(() => {
        usersStore.createUser({ name: 'Test', email: 'correo-invalido' });
      }).toThrow('correo electrónico válido');
    });

    it('rechaza correos duplicados sin importar mayúsculas', () => {
      expect(() => {
        usersStore.createUser({
          name: 'Duplicado',
          email: 'MIGUEL@KROMALAB.GT',
          role: USER_ROLES.EMPLOYEE,
        });
      }).toThrow('Ya existe un usuario registrado');
    });

    it('rechaza roles no permitidos', () => {
      expect(() => {
        usersStore.createUser({
          name: 'Invalido',
          email: 'invalido@kromalab.gt',
          role: 'SUPER_HACKER',
        });
      }).toThrow('Rol inválido');
    });
  });

  describe('Edición y Actualización de Usuarios (updateUser)', () => {
    it('actualiza datos de un usuario existente', () => {
      const updated = usersStore.updateUser('usr_002', {
        name: 'Carlos Morales Jr.',
        phone: '+502 5555-7777',
        department: 'Jefe de Taller',
      });

      expect(updated.name).toBe('Carlos Morales Jr.');
      expect(updated.phone).toBe('+502 5555-7777');
      expect(updated.department).toBe('Jefe de Taller');
    });

    it('permite cambiar el correo si no está en uso', () => {
      const updated = usersStore.updateUser('usr_003', {
        email: 'sofia.nueva@kromalab.gt',
      });
      expect(updated.email).toBe('sofia.nueva@kromalab.gt');
    });

    it('impide cambiar el correo a uno que ya pertenece a otro usuario', () => {
      expect(() => {
        usersStore.updateUser('usr_003', {
          email: 'miguel@kromalab.gt',
        });
      }).toThrow('ya está registrado para otro usuario');
    });

    it('falla al actualizar con un formato de correo inválido', () => {
      expect(() => {
        usersStore.updateUser('usr_003', {
          email: 'correo-sin-dominio',
        });
      }).toThrow('correo electrónico válido');
    });

    it('falla al actualizar un ID inexistente', () => {
      expect(() => {
        usersStore.updateUser('inexistente', { name: 'X' });
      }).toThrow('Usuario no encontrado');
    });

    it('protege al único Administrador Activo de ser degradado a otro rol', () => {
      expect(() => {
        usersStore.updateUser('usr_001', {
          role: USER_ROLES.EMPLOYEE,
        });
      }).toThrow('único Administrador Activo');
    });

    it('protege al único Administrador Activo de ser desactivado', () => {
      expect(() => {
        usersStore.updateUser('usr_001', {
          status: USER_STATUS.INACTIVE.id,
        });
      }).toThrow('único Administrador Activo');
    });

    it('permite degradar a un admin si existe otro admin activo', () => {
      // Crear un segundo admin
      const secondAdmin = usersStore.createUser({
        name: 'Segundo Admin',
        email: 'admin2@kromalab.gt',
        role: USER_ROLES.ADMIN,
      });

      // Ahora sí se debe permitir cambiar el rol del segundo admin
      const updated = usersStore.updateUser(secondAdmin.id, {
        role: USER_ROLES.EMPLOYEE,
      });
      expect(updated.role).toBe(USER_ROLES.EMPLOYEE);
    });
  });

  describe('Eliminación y Alternancia de Estado (deleteUser y toggleUserStatus)', () => {
    it('elimina un usuario no administrador', () => {
      const success = usersStore.deleteUser('usr_005');
      expect(success).toBe(true);
      expect(usersStore.getUserById('usr_005')).toBeNull();
    });

    it('impide eliminar al único Administrador Activo', () => {
      expect(() => {
        usersStore.deleteUser('usr_001');
      }).toThrow('único Administrador Activo');
    });

    it('falla al intentar eliminar un usuario inexistente', () => {
      expect(() => {
        usersStore.deleteUser('no-existe');
      }).toThrow('Usuario no encontrado');
    });

    it('falla al intentar alternar estado de un usuario inexistente', () => {
      expect(() => {
        usersStore.toggleUserStatus('inexistente');
      }).toThrow('Usuario no encontrado');
    });

    it('alterna el estado de un usuario entre ACTIVO e INACTIVO', () => {
      const toggled = usersStore.toggleUserStatus('usr_002');
      expect(toggled.status).toBe(USER_STATUS.INACTIVE.id);

      const reactivated = usersStore.toggleUserStatus('usr_002');
      expect(reactivated.status).toBe(USER_STATUS.ACTIVE.id);
    });
  });

  describe('Restablecimiento de Contraseñas (resetPassword)', () => {
    it('genera una contraseña temporal aleatoria segura si no se pasa una específica', () => {
      const result = usersStore.resetPassword('usr_002');
      expect(result.tempPassword).toMatch(/^Kroma!\d{4}$/);
      expect(result.user.mustChangePassword).toBe(true);
      expect(result.user.passwordLastReset).toBeDefined();
    });

    it('asigna una contraseña personalizada válida', () => {
      const result = usersStore.resetPassword('usr_002', 'ClaveSegura2026!');
      expect(result.tempPassword).toBe('ClaveSegura2026!');
    });

    it('falla al restablecer contraseña de un ID inexistente', () => {
      expect(() => {
        usersStore.resetPassword('no-existe');
      }).toThrow('Usuario no encontrado');
    });
  });

  describe('Filtros y Búsqueda (filterUsers)', () => {
    it('filtra por rol específico', () => {
      const employees = usersStore.filterUsers('', USER_ROLES.EMPLOYEE);
      expect(employees.length).toBe(3); // Carlos, Sofía, Ana Lucía
    });

    it('filtra por estado', () => {
      const inactive = usersStore.filterUsers('', 'ALL', USER_STATUS.INACTIVE.id);
      expect(inactive.length).toBe(1);
      expect(inactive[0].name).toBe('Ana Lucía Gómez');
    });

    it('busca texto en nombre, email o departamento', () => {
      const byTaller = usersStore.filterUsers('taller');
      expect(byTaller.length).toBe(1);
      expect(byTaller[0].name).toBe('Carlos Morales');

      const byEmail = usersStore.filterUsers('cafesancristobal');
      expect(byEmail.length).toBe(1);
      expect(byEmail[0].name).toBe('Rodrigo Méndez');
    });
  });

  describe('Patrón de Suscripción Reactiva (Pub/Sub)', () => {
    it('notifica a los suscriptores cuando se crea, edita o elimina un usuario', () => {
      let notifiedCount = 0;
      const unsubscribe = usersStore.subscribe((users) => {
        notifiedCount++;
        expect(Array.isArray(users)).toBe(true);
      });

      usersStore.createUser({
        name: 'Prueba PubSub',
        email: 'pubsub@kromalab.gt',
        role: USER_ROLES.EMPLOYEE,
      });

      expect(notifiedCount).toBe(1);

      unsubscribe();

      usersStore.createUser({
        name: 'Otra Prueba',
        email: 'otra@kromalab.gt',
        role: USER_ROLES.EMPLOYEE,
      });

      // No debe haberse incrementado tras unsubscribe
      expect(notifiedCount).toBe(1);
    });
  });

  describe('rbac-config helper functions', () => {
    it('valida permisos según la matriz Default-Deny', () => {
      expect(hasPermission('ADMIN', 'MANAGE_USERS')).toBe(true);
      expect(hasPermission('EMPLOYEE', 'MANAGE_USERS')).toBe(false);
      expect(hasPermission('EMPLOYEE', 'MANAGE_PRODUCTION')).toBe(true);
      expect(hasPermission('CUSTOMER', 'MANAGE_PRODUCTION')).toBe(false);
      expect(hasPermission('CUSTOMER', 'VIEW_OWN_ORDERS')).toBe(true);
      expect(hasPermission('VISITOR', 'VIEW_OWN_ORDERS')).toBe(false);
      expect(hasPermission('VISITOR', 'PUBLIC_ACCESS')).toBe(true);
      expect(hasPermission(null, 'PUBLIC_ACCESS')).toBe(false);
      expect(hasPermission('ADMIN', null)).toBe(false);
    });
  });
});
