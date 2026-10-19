/**
 * Almacén Reactivo de Cartera de Clientes B2B (ClientsStore)
 * Administra el directorio de clientes, segmentación (VIP, Recurrente),
 * historial comercial de pedidos y métricas de fidelización.
 */

import { ordersStore, PAYMENT_STATUS } from './orders-store.js';

const STORAGE_KEY_CLIENTS = 'kromalab_clients';

export const CLIENT_CATEGORIES = {
  RESTAURANTES_CAFES: { id: 'RESTAURANTES_CAFES', label: 'Cafeterías & Restaurantes', icon: '☕' },
  BARBERIAS_ESTETICA: { id: 'BARBERIAS_ESTETICA', label: 'Barberías & Cuidado Personal', icon: '✂️' },
  PROMOCIONALES_MERCH: { id: 'PROMOCIONALES_MERCH', label: 'Artículos Promocionales & Merch', icon: '🎁' },
  CERVECERIAS_LICORES: { id: 'CERVECERIAS_LICORES', label: 'Cervecerías & Bebidas', icon: '🍺' },
  COMERCIO_GENERAL: { id: 'COMERCIO_GENERAL', label: 'Comercio & Marcas Generales', icon: '🏪' },
};

export const CLIENT_TIERS = {
  VIP: { id: 'VIP', label: 'VIP (Alto Volumen)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', badge: '⭐ VIP' },
  RECURRENTE: { id: 'RECURRENTE', label: 'Recurrente', color: 'var(--cerulean)', bg: 'rgba(28, 114, 147, 0.15)', badge: '🔄 Recurrente' },
  NUEVO: { id: 'NUEVO', label: 'Nuevo', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', badge: '🌱 Nuevo' },
  INACTIVO: { id: 'INACTIVO', label: 'Inactivo', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)', badge: '⏸️ Inactivo' },
};

export const INITIAL_SEED_CLIENTS = [
  {
    id: 'CLI-001',
    company: 'Café San Cristóbal',
    name: 'Rodrigo Méndez',
    phone: '+502 5555-1234',
    nit: '7845129-4',
    email: 'rodrigo@cafesancristobal.gt',
    address: 'San Cristóbal, Zona 8 de Mixco, Guatemala',
    category: 'RESTAURANTES_CAFES',
    tier: 'VIP',
    notes: 'Cliente de alto consumo para tazas, termos y cristalería. Siempre solicita barniz con relieve 3D.',
    createdAt: new Date(Date.now() - 3600000 * 24 * 35).toISOString(),
  },
  {
    id: 'CLI-002',
    company: 'Barbería Vintage',
    name: 'Alejandro Morales',
    phone: '+502 5111-2233',
    nit: 'CF',
    email: 'contacto@barberiavintage.com',
    address: '6ta Avenida, Zona 1, Centro Histórico, Guatemala',
    category: 'BARBERIAS_ESTETICA',
    tier: 'RECURRENTE',
    notes: 'Logos para espejos, capas de corte y frascos de tónicos. Solicita siempre servicio de corte individual.',
    createdAt: new Date(Date.now() - 3600000 * 24 * 25).toISOString(),
  },
  {
    id: 'CLI-003',
    company: 'Cervecería El Injerto',
    name: 'Daniel Estrada',
    phone: '+502 5999-8877',
    nit: '6549871-2',
    email: 'ventas@elinjerto.gt',
    address: 'Km 14.5 Carretera a El Salvador, Guatemala',
    category: 'CERVECERIAS_LICORES',
    tier: 'VIP',
    notes: 'Stickers DTF UV resistentes al agua y condensación para growlers y botellas de vidrio.',
    createdAt: new Date(Date.now() - 3600000 * 24 * 40).toISOString(),
  },
  {
    id: 'CLI-004',
    company: 'Emprende Pack GT',
    name: 'Claudia Ramos',
    phone: '+502 4444-9988',
    nit: '1238974-5',
    email: 'info@emprendepack.gt',
    address: 'Zona 10, Ciudad de Guatemala',
    category: 'PROMOCIONALES_MERCH',
    tier: 'RECURRENTE',
    notes: 'Empaques de lujo y cajas rígidas personalizadas. Solicita entrega en bobina continua.',
    createdAt: new Date(Date.now() - 3600000 * 24 * 18).toISOString(),
  },
  {
    id: 'CLI-005',
    company: 'Impresos La Paz S.A.',
    name: 'Mario Santos',
    phone: '+502 5432-1098',
    nit: '112233-4',
    email: 'contacto@lapaz.com.gt',
    address: 'San José el Placer, Villa Nueva, Guatemala',
    category: 'COMERCIO_GENERAL',
    tier: 'NUEVO',
    notes: 'Taller aliado local en Villa Nueva. Maquila de volumen cuando se satura su capacidad propia.',
    createdAt: new Date(Date.now() - 3600000 * 24 * 6).toISOString(),
  },
];

class ClientsStore {
  constructor() {
    this.clients = [];
    this.listeners = new Set();
    this._loadClients();
  }

  _loadClients() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY_CLIENTS);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.clients = Array.isArray(parsed) ? parsed : [...INITIAL_SEED_CLIENTS];
          return;
        }
      } catch (e) {
        console.warn('Error al leer clientes de localStorage:', e);
      }
    }
    this.clients = JSON.parse(JSON.stringify(INITIAL_SEED_CLIENTS));
  }

  _saveClients() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_CLIENTS, JSON.stringify(this.clients));
      } catch (e) {
        console.warn('Error al guardar clientes en localStorage:', e);
      }
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify() {
    this._saveClients();
    this.listeners.forEach(fn => {
      try {
        fn(this.clients);
      } catch (err) {
        console.error('Error en listener de clientsStore:', err);
      }
    });
  }

  getClients() {
    return this.clients;
  }

  getClientById(id) {
    return this.clients.find(c => c.id === id) || null;
  }

  getClientByNit(nit) {
    if (!nit || nit === 'CF') return null;
    const cleanNit = nit.trim().toLowerCase();
    return this.clients.find(c => c.nit && c.nit.trim().toLowerCase() === cleanNit) || null;
  }

  getClientByPhone(phone) {
    if (!phone) return null;
    const cleanQuery = phone.replace(/\D/g, '');
    if (!cleanQuery) return null;
    return this.clients.find(c => {
      const cPhone = c.phone.replace(/\D/g, '');
      return cPhone === cleanQuery || cPhone.endsWith(cleanQuery) || cleanQuery.endsWith(cPhone);
    }) || null;
  }

  createClient({
    company = '',
    name = '',
    phone = '+502 5555-0000',
    nit = 'CF',
    email = '',
    address = 'Ciudad de Guatemala',
    category = 'COMERCIO_GENERAL',
    tier = 'NUEVO',
    notes = '',
  }) {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const newId = `CLI-${randomNum}`;

    const newClient = {
      id: newId,
      company: company.trim() || name.trim() || 'Cliente B2B',
      name: name.trim() || company.trim() || 'Contacto Principal',
      phone: phone.trim() || '+502 5555-0000',
      nit: nit.trim() || 'CF',
      email: email.trim(),
      address: address.trim() || 'Ciudad de Guatemala',
      category: CLIENT_CATEGORIES[category] ? category : 'COMERCIO_GENERAL',
      tier: CLIENT_TIERS[tier] ? tier : 'NUEVO',
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    this.clients.unshift(newClient);
    this._notify();
    return newClient;
  }

  updateClient(id, data) {
    const client = this.getClientById(id);
    if (!client) return false;

    if (data.company !== undefined) client.company = data.company.trim() || client.company;
    if (data.name !== undefined) client.name = data.name.trim() || client.name;
    if (data.phone !== undefined) client.phone = data.phone.trim() || client.phone;
    if (data.nit !== undefined) client.nit = data.nit.trim() || 'CF';
    if (data.email !== undefined) client.email = data.email.trim();
    if (data.address !== undefined) client.address = data.address.trim() || client.address;
    if (data.category && CLIENT_CATEGORIES[data.category]) client.category = data.category;
    if (data.tier && CLIENT_TIERS[data.tier]) client.tier = data.tier;
    if (data.notes !== undefined) client.notes = data.notes.trim();

    client.updatedAt = new Date().toISOString();
    this._notify();
    return true;
  }

  deleteClient(id) {
    const index = this.clients.findIndex(c => c.id === id);
    if (index === -1) return false;

    this.clients.splice(index, 1);
    this._notify();
    return true;
  }

  getClientOrders(clientOrId) {
    const client = typeof clientOrId === 'string' ? this.getClientById(clientOrId) : clientOrId;
    if (!client) return [];

    const cleanCompany = (client.company || '').trim().toLowerCase();
    const cleanName = (client.name || '').trim().toLowerCase();
    const cleanPhone = (client.phone || '').replace(/\D/g, '');
    const cleanNit = (client.nit || '').trim().toLowerCase();

    const allOrders = ordersStore.getOrders();
    return allOrders.filter(o => {
      const oCompany = (o.customer.company || '').trim().toLowerCase();
      const oName = (o.customer.name || '').trim().toLowerCase();
      const oPhone = (o.customer.phone || '').replace(/\D/g, '');
      const oNit = (o.customer.nit || '').trim().toLowerCase();

      const matchCompany = cleanCompany && oCompany && (oCompany === cleanCompany || oCompany.includes(cleanCompany) || cleanCompany.includes(oCompany));
      const matchName = cleanName && oName && (oName === cleanName || oName.includes(cleanName) || cleanName.includes(oName));
      const matchPhone = cleanPhone && oPhone && (oPhone === cleanPhone || oPhone.endsWith(cleanPhone) || cleanPhone.endsWith(oPhone));
      const matchNit = cleanNit && cleanNit !== 'cf' && oNit === cleanNit;

      return matchCompany || matchPhone || matchNit || matchName;
    });
  }

  getClientMetrics(clientOrId) {
    const orders = this.getClientOrders(clientOrId);

    const ordersCount = orders.length;
    const totalMetersPurchased = orders.reduce((sum, o) => sum + o.metrics.totalBillableMeters, 0);
    const totalSpentQ = orders.reduce((sum, o) => sum + o.metrics.grandTotalQ, 0);
    const pendingDebtQ = orders
      .filter(o => o.paymentStatus === PAYMENT_STATUS.PENDING)
      .reduce((sum, o) => sum + o.metrics.grandTotalQ, 0);

    const lastOrderDate = orders.length > 0 ? orders[0].createdAt : null;

    return {
      ordersCount,
      totalMetersPurchased,
      totalSpentQ,
      pendingDebtQ,
      lastOrderDate,
    };
  }

  getPortfolioMetrics() {
    let totalPortfolioMeters = 0;
    let totalPortfolioRevenueQ = 0;
    let totalPendingDebtQ = 0;

    this.clients.forEach(c => {
      const m = this.getClientMetrics(c);
      totalPortfolioMeters += m.totalMetersPurchased;
      totalPortfolioRevenueQ += m.totalSpentQ;
      totalPendingDebtQ += m.pendingDebtQ;
    });

    const activeClientsCount = this.clients.filter(c => c.tier !== 'INACTIVO').length;
    const vipCount = this.clients.filter(c => c.tier === 'VIP').length;
    const recurrentCount = this.clients.filter(c => c.tier === 'RECURRENTE').length;

    return {
      totalClients: this.clients.length,
      targetClients: 25, // Meta estratégica de Miguel Dubois: 20 a 30 clientes B2B
      activeClientsCount,
      vipCount,
      recurrentCount,
      totalPortfolioMeters,
      totalPortfolioRevenueQ,
      totalPendingDebtQ,
    };
  }

  resetToInitial() {
    this.clients = JSON.parse(JSON.stringify(INITIAL_SEED_CLIENTS));
    this._notify();
  }
}

export const clientsStore = new ClientsStore();
