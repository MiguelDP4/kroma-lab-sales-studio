/**
 * Almacén Reactivo de Gestión de Usuarios y Permisos RBAC (UsersStore)
 * Administra colaboradores de taller, asignación de roles, auditoría de accesos y credenciales.
 */

import { USER_ROLES } from '../../shared/business-config.js';
import { USER_STATUS } from '../../shared/rbac-config.js';

const STORAGE_KEY_USERS = 'kromalab_users';

export const INITIAL_SEED_USERS = [
  {
    id: 'usr_001',
    name: 'Miguel Dubois',
    email: 'miguel@kromalab.gt',
    phone: '+502 5406-6217',
    role: USER_ROLES.ADMIN,
    department: 'Dirección General',
    status: USER_STATUS.ACTIVE.id,
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-01-15T08:00:00.000Z',
    lastLogin: '2026-10-19T14:30:00.000Z',
    notes: 'Propietario y administrador principal del sistema Kroma Lab.',
  },
  {
    id: 'usr_002',
    name: 'Carlos Morales',
    email: 'carlos.taller@kromalab.gt',
    phone: '+502 5555-0202',
    role: USER_ROLES.EMPLOYEE,
    department: 'Operador Audley & Taller',
    status: USER_STATUS.ACTIVE.id,
    createdAt: '2026-02-01T09:00:00.000Z',
    updatedAt: '2026-02-01T09:00:00.000Z',
    lastLogin: '2026-10-19T08:15:00.000Z',
    notes: 'Operador principal de máquina industrial Audley UV DTF, calandrado y corte.',
  },
  {
    id: 'usr_003',
    name: 'Sofía Castillo',
    email: 'sofia.ventas@kromalab.gt',
    phone: '+502 5555-0303',
    role: USER_ROLES.EMPLOYEE,
    department: 'Ventas B2B & Mostrador',
    status: USER_STATUS.ACTIVE.id,
    createdAt: '2026-02-15T10:00:00.000Z',
    updatedAt: '2026-02-15T10:00:00.000Z',
    lastLogin: '2026-10-18T16:45:00.000Z',
    notes: 'Atención a clientes recurrentes, cotizaciones por WhatsApp y pedidos en recepción.',
  },
  {
    id: 'usr_004',
    name: 'Rodrigo Méndez',
    email: 'rodrigo@cafesancristobal.gt',
    phone: '+502 5555-1234',
    role: USER_ROLES.CUSTOMER,
    department: 'Cliente B2B',
    status: USER_STATUS.ACTIVE.id,
    createdAt: '2026-03-01T14:30:00.000Z',
    updatedAt: '2026-03-01T14:30:00.000Z',
    lastLogin: '2026-10-17T11:20:00.000Z',
    notes: 'Cuenta de autoservicio B2B para Café San Cristóbal.',
  },
  {
    id: 'usr_005',
    name: 'Ana Lucía Gómez',
    email: 'ana.diseno@kromalab.gt',
    phone: '+502 5555-0404',
    role: USER_ROLES.EMPLOYEE,
    department: 'Diseño y Pre-prensa',
    status: USER_STATUS.INACTIVE.id,
    createdAt: '2026-01-20T11:00:00.000Z',
    updatedAt: '2026-08-30T17:00:00.000Z',
    lastLogin: '2026-08-30T16:00:00.000Z',
    notes: 'Diseñadora gráfica. Acceso suspendido temporalmente por permiso laboral.',
  },
];

class UsersStore {
  constructor() {
    this.users = [];
    this.listeners = new Set();
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_USERS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.users = parsed;
            return;
          }
        }
      }
    } catch (_) {}
    this.users = JSON.parse(JSON.stringify(INITIAL_SEED_USERS));
    this.saveToStorage();
  }

  saveToStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(this.users));
      }
    } catch (_) {}
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.users);
      } catch (_) {}
    }
  }

  getUsers() {
    return [...this.users];
  }

  getUserById(id) {
    return this.users.find(u => u.id === id) || null;
  }

  getUserByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    return this.users.find(u => u.email.trim().toLowerCase() === normalized) || null;
  }

  createUser(userData) {
    const name = userData?.name?.trim();
    const email = userData?.email?.trim().toLowerCase();
    const role = userData?.role || USER_ROLES.EMPLOYEE;
    const phone = userData?.phone?.trim() || '';
    const department = userData?.department?.trim() || 'Operador Audley & Taller';
    const status = userData?.status || USER_STATUS.ACTIVE.id;
    const notes = userData?.notes?.trim() || '';

    if (!name) {
      throw new Error('El nombre del usuario es obligatorio.');
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      throw new Error('Se requiere un correo electrónico válido.');
    }

    if (this.getUserByEmail(email)) {
      throw new Error(`Ya existe un usuario registrado con el correo ${email}.`);
    }

    const validRoles = [USER_ROLES.ADMIN, USER_ROLES.EMPLOYEE, USER_ROLES.CUSTOMER];
    if (!validRoles.includes(role)) {
      throw new Error(`Rol inválido: ${role}.`);
    }

    const id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    const newUser = {
      id,
      name,
      email,
      phone,
      role,
      department,
      status: status === USER_STATUS.INACTIVE.id ? USER_STATUS.INACTIVE.id : USER_STATUS.ACTIVE.id,
      notes,
      createdAt: now,
      updatedAt: now,
      lastLogin: null,
    };

    this.users.unshift(newUser);
    this.saveToStorage();
    this.notify();
    return newUser;
  }

  updateUser(id, updates) {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) {
      throw new Error(`Usuario no encontrado con ID: ${id}`);
    }

    const currentUser = this.users[index];

    // Validación de unicidad de email si cambia
    if (updates.email) {
      const newEmail = updates.email.trim().toLowerCase();
      if (!newEmail.includes('@') || !newEmail.includes('.')) {
        throw new Error('Se requiere un correo electrónico válido.');
      }
      const existing = this.getUserByEmail(newEmail);
      if (existing && existing.id !== id) {
        throw new Error(`El correo ${newEmail} ya está registrado para otro usuario.`);
      }
    }

    // Regla de Protección: No se puede degradar de rol ni desactivar al único Administrador Activo
    if (currentUser.role === USER_ROLES.ADMIN && currentUser.status === USER_STATUS.ACTIVE.id) {
      const willDemoteRole = updates.role && updates.role !== USER_ROLES.ADMIN;
      const willDeactivate = updates.status && updates.status === USER_STATUS.INACTIVE.id;

      if (willDemoteRole || willDeactivate) {
        const activeAdmins = this.users.filter(u => u.role === USER_ROLES.ADMIN && u.status === USER_STATUS.ACTIVE.id);
        if (activeAdmins.length <= 1) {
          throw new Error('No es posible desactivar o quitar permisos al único Administrador Activo del sistema.');
        }
      }
    }

    const updatedUser = {
      ...currentUser,
      ...updates,
      id: currentUser.id, // ID inmutable
      createdAt: currentUser.createdAt,
      updatedAt: new Date().toISOString(),
    };

    if (updates.name) updatedUser.name = updates.name.trim();
    if (updates.email) updatedUser.email = updates.email.trim().toLowerCase();
    if (updates.phone) updatedUser.phone = updates.phone.trim();
    if (updates.department) updatedUser.department = updates.department.trim();
    if (updates.notes !== undefined) updatedUser.notes = updates.notes.trim();

    this.users[index] = updatedUser;
    this.saveToStorage();
    this.notify();
    return updatedUser;
  }

  deleteUser(id) {
    const user = this.getUserById(id);
    if (!user) {
      throw new Error(`Usuario no encontrado con ID: ${id}`);
    }

    // Regla de Protección: No se puede eliminar al único Administrador Activo
    if (user.role === USER_ROLES.ADMIN && user.status === USER_STATUS.ACTIVE.id) {
      const activeAdmins = this.users.filter(u => u.role === USER_ROLES.ADMIN && u.status === USER_STATUS.ACTIVE.id);
      if (activeAdmins.length <= 1) {
        throw new Error('No es posible eliminar al único Administrador Activo del sistema.');
      }
    }

    this.users = this.users.filter(u => u.id !== id);
    this.saveToStorage();
    this.notify();
    return true;
  }

  toggleUserStatus(id) {
    const user = this.getUserById(id);
    if (!user) {
      throw new Error(`Usuario no encontrado con ID: ${id}`);
    }

    const nextStatus = user.status === USER_STATUS.ACTIVE.id ? USER_STATUS.INACTIVE.id : USER_STATUS.ACTIVE.id;
    return this.updateUser(id, { status: nextStatus });
  }

  resetPassword(id, newPassword = null) {
    const user = this.getUserById(id);
    if (!user) {
      throw new Error(`Usuario no encontrado con ID: ${id}`);
    }

    const tempPassword = newPassword && newPassword.trim().length >= 6
      ? newPassword.trim()
      : `Kroma!${Math.floor(1000 + Math.random() * 9000)}`;

    const updated = this.updateUser(id, {
      passwordLastReset: new Date().toISOString(),
      mustChangePassword: true,
    });

    return {
      user: updated,
      tempPassword,
    };
  }

  getMetrics() {
    const totalUsers = this.users.length;
    const activeStaff = this.users.filter(
      u => (u.role === USER_ROLES.ADMIN || u.role === USER_ROLES.EMPLOYEE) && u.status === USER_STATUS.ACTIVE.id
    ).length;
    const activeAdmins = this.users.filter(
      u => u.role === USER_ROLES.ADMIN && u.status === USER_STATUS.ACTIVE.id
    ).length;
    const activeCustomers = this.users.filter(
      u => u.role === USER_ROLES.CUSTOMER && u.status === USER_STATUS.ACTIVE.id
    ).length;
    const inactiveUsers = this.users.filter(
      u => u.status === USER_STATUS.INACTIVE.id
    ).length;

    return {
      totalUsers,
      activeStaff,
      activeAdmins,
      activeCustomers,
      inactiveUsers,
    };
  }

  filterUsers(query = '', roleFilter = 'ALL', statusFilter = 'ALL') {
    let result = [...this.users];

    if (roleFilter && roleFilter !== 'ALL') {
      result = result.filter(u => u.role === roleFilter);
    }

    if (statusFilter && statusFilter !== 'ALL') {
      result = result.filter(u => u.status === statusFilter);
    }

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q))
      );
    }

    return result;
  }

  resetToDefaults() {
    this.users = JSON.parse(JSON.stringify(INITIAL_SEED_USERS));
    this.saveToStorage();
    this.notify();
  }
}

export const usersStore = new UsersStore();
