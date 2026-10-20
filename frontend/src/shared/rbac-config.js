/**
 * Matriz de Roles y Permisos RBAC (Role-Based Access Control) para Kroma Lab Sales Studio.
 * Define la jerarquía de acceso, permisos atómicos y metadatos de roles.
 */

export const PERMISSIONS = {
  PUBLIC_ACCESS: {
    code: 'PUBLIC_ACCESS',
    label: 'Acceso Público General',
    desc: 'Acceso al cotizador público, información técnica de bobina y calculadora en tiempo real.',
  },
  SUBMIT_LEAD: {
    code: 'SUBMIT_LEAD',
    label: 'Envío de Cotizaciones / Leads',
    desc: 'Enviar cotizaciones automáticas formateadas a WhatsApp y registrar prospectos comerciales.',
  },
  VIEW_OWN_ORDERS: {
    code: 'VIEW_OWN_ORDERS',
    label: 'Consultar Pedidos Propios',
    desc: 'Acceder al portal de cliente para monitorear el avance de impresión UV DTF y cuentas personales.',
  },
  CREATE_CUSTOMER_ORDER: {
    code: 'CREATE_CUSTOMER_ORDER',
    label: 'Creación de Pedidos en Línea',
    desc: 'Generar pedidos formales de pliegos y stickers a través del carrito multidiseño y checkout.',
  },
  UPLOAD_PRINT_ASSETS: {
    code: 'UPLOAD_PRINT_ASSETS',
    label: 'Carga de Archivos de Impresión',
    desc: 'Adjuntar y validar archivos gráficos de alta resolución (PNG transparente, TIFF, PDF a 300 DPI).',
  },
  MANAGE_PRODUCTION: {
    code: 'MANAGE_PRODUCTION',
    label: 'Control de Producción Audley',
    desc: 'Mover tarjetas en el tablero Kanban, supervisar cola RIP y monitorear consumo de film PET.',
  },
  MANAGE_ALL_ORDERS: {
    code: 'MANAGE_ALL_ORDERS',
    label: 'Gestión Integral de Pedidos',
    desc: 'Visualizar, editar estados de producción y actualizar estados de pago de todas las órdenes en taller.',
  },
  CREATE_WALKIN_ORDER: {
    code: 'CREATE_WALKIN_ORDER',
    label: 'Ventas de Mostrador (Walk-in)',
    desc: 'Ingresar pedidos manuales asistidos para clientes en recepción sin requerir registro previo.',
  },
  MANAGE_CLIENTS: {
    code: 'MANAGE_CLIENTS',
    label: 'Directorio y Cartera B2B',
    desc: 'Administrar cartera comercial de clientes recurrentes, expedientes 360°, datos fiscales SAT y NIT.',
  },
  MANAGE_USERS: {
    code: 'MANAGE_USERS',
    label: 'Administración de Usuarios',
    desc: 'Crear colaboradores, invitar operadores de máquina, restablecer contraseñas y desactivar accesos.',
  },
  MANAGE_ROLES_PERMS: {
    code: 'MANAGE_ROLES_PERMS',
    label: 'Auditoría y Matriz de Permisos',
    desc: 'Consultar e inspeccionar la matriz de seguridad y privilegios RBAC asignados a cada rol.',
  },
  VIEW_COMMERCIAL_REPORTS: {
    code: 'VIEW_COMMERCIAL_REPORTS',
    label: 'Reportes y Analítica Comercial',
    desc: 'Supervisar métricas de facturación, consumo de bobinas Audley, cobranza y exportar a CSV.',
  },
  CONFIG_PRICING_TIERS: {
    code: 'CONFIG_PRICING_TIERS',
    label: 'Configuración de Tarifas',
    desc: 'Modificar escalas de precios por volumen por metro lineal y costos unitarios de despiece/corte.',
  },
  VIEW_PROFITABILITY_ANALYSIS: {
    code: 'VIEW_PROFITABILITY_ANALYSIS',
    label: 'Costos y Rentabilidad Unitaria',
    desc: 'Simular costos de consumibles, calcular margen neto y configurar precios de compra de insumos.',
  },
  MANAGE_INVENTORY: {
    code: 'MANAGE_INVENTORY',
    label: 'Inventario de Insumos de Taller',
    desc: 'Supervisar existencias de Film A/B, tintas UV y cuchillas, registrar compras y controlar mermas.',
  },
};

export const ROLE_PERMISSIONS = {
  ADMIN: [
    'PUBLIC_ACCESS',
    'SUBMIT_LEAD',
    'VIEW_OWN_ORDERS',
    'CREATE_CUSTOMER_ORDER',
    'UPLOAD_PRINT_ASSETS',
    'MANAGE_PRODUCTION',
    'MANAGE_ALL_ORDERS',
    'CREATE_WALKIN_ORDER',
    'MANAGE_CLIENTS',
    'MANAGE_USERS',
    'MANAGE_ROLES_PERMS',
    'CONFIG_PRICING_TIERS',
    'VIEW_PROFITABILITY_ANALYSIS',
    'MANAGE_INVENTORY',
    'VIEW_COMMERCIAL_REPORTS',
  ],
  EMPLOYEE: [
    'VIEW_PROFITABILITY_ANALYSIS',
    'MANAGE_INVENTORY',
    'VIEW_COMMERCIAL_REPORTS',
    'PUBLIC_ACCESS',
    'SUBMIT_LEAD',
    'CREATE_CUSTOMER_ORDER',
    'UPLOAD_PRINT_ASSETS',
    'MANAGE_PRODUCTION',
    'MANAGE_ALL_ORDERS',
    'CREATE_WALKIN_ORDER',
    'MANAGE_CLIENTS',
  ],
  CUSTOMER: [
    'PUBLIC_ACCESS',
    'SUBMIT_LEAD',
    'VIEW_OWN_ORDERS',
    'CREATE_CUSTOMER_ORDER',
    'UPLOAD_PRINT_ASSETS',
  ],
  VISITOR: [
    'PUBLIC_ACCESS',
    'SUBMIT_LEAD',
  ],
};

export const ROLE_DETAILS = {
  ADMIN: {
    id: 'ADMIN',
    name: 'Administrador General',
    desc: 'Control integral y sin restricciones de finanzas, producción Audley, cartera B2B y seguridad.',
    badgeLabel: 'ADMIN',
    badgeColor: '#ffffff',
    badgeBg: 'var(--regal-navy)',
    badgeBorder: 'var(--cerulean)',
    icon: '👑',
  },
  EMPLOYEE: {
    id: 'EMPLOYEE',
    name: 'Operador / Colaborador',
    desc: 'Supervisión de cola Audley, control de estaciones en taller, toma de pedidos y gestión de clientes.',
    badgeLabel: 'EMPLEADO',
    badgeColor: '#ffffff',
    badgeBg: 'var(--cerulean)',
    badgeBorder: 'var(--baltic-blue)',
    icon: '⚙️',
  },
  CUSTOMER: {
    id: 'CUSTOMER',
    name: 'Cliente B2B',
    desc: 'Portal de autoservicio para consulta de pedidos propios, subida de archivos y cotizaciones.',
    badgeLabel: 'CLIENTE B2B',
    badgeColor: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeBorder: 'rgba(16, 185, 129, 0.3)',
    icon: '🏢',
  },
};

export const USER_STATUS = {
  ACTIVE: {
    id: 'ACTIVE',
    label: 'Activo',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    badge: '🟢 Activo',
  },
  INACTIVE: {
    id: 'INACTIVE',
    label: 'Inactivo',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    badge: '🔴 Inactivo',
  },
};

export const USER_DEPARTMENTS = [
  'Dirección General',
  'Operador Audley & Taller',
  'Ventas B2B & Mostrador',
  'Diseño y Pre-prensa',
  'Cliente B2B',
];

/**
 * Verifica si un rol determinado cuenta con un permiso específico bajo política Default-Deny.
 * @param {string} role Rol del usuario
 * @param {string} permissionCode Código del permiso
 * @returns {boolean}
 */
export function hasPermission(role, permissionCode) {
  if (!role || !permissionCode) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return Array.isArray(permissions) && permissions.includes(permissionCode);
}
