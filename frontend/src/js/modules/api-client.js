/**
 * Kroma Lab Sales Studio — Cliente de Conexión HTTP / API REST
 * Sincroniza el frontend con el backend Express + Prisma + Neon PostgreSQL.
 * Incluye tolerancia a fallos y fallback transparente si el servidor local está desconectado.
 */

const DEFAULT_API_URL = 'http://localhost:4000/api';

export class ApiClient {
  constructor(baseUrl = DEFAULT_API_URL) {
    this.baseUrl = baseUrl;
    this.token = this._loadToken();
    this.isOnline = false;
  }

  _loadToken() {
    try {
      return localStorage.getItem('kromalab_jwt_token') || null;
    } catch {
      return null;
    }
  }

  setToken(token) {
    this.token = token;
    try {
      if (token) {
        localStorage.setItem('kromalab_jwt_token', token);
      } else {
        localStorage.removeItem('kromalab_jwt_token');
      }
    } catch {
      // Ignorar quota exceeded
    }
  }

  clearToken() {
    this.setToken(null);
  }

  async _request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const error = new Error(data.message || `Error HTTP ${res.status}`);
        error.status = res.status;
        error.data = data;
        throw error;
      }

      this.isOnline = true;
      return data;
    } catch (err) {
      if (err.name === 'TypeError' || err.message?.includes('fetch')) {
        this.isOnline = false;
      }
      throw err;
    }
  }

  // --- Health Check ---
  async checkHealth() {
    try {
      const res = await this._request('/health');
      this.isOnline = res.status === 'ok';
      return res;
    } catch (err) {
      this.isOnline = false;
      return { status: 'error', database: 'disconnected', error: err.message };
    }
  }

  // --- Autenticación y Usuarios ---
  auth = {
    login: async (email, password) => {
      const res = await this._request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (res.token) {
        this.setToken(res.token);
      }
      return res;
    },
    register: async (userData) => {
      const res = await this._request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      if (res.token) {
        this.setToken(res.token);
      }
      return res;
    },
    logout: async () => {
      try {
        await this._request('/auth/logout', { method: 'POST' });
      } finally {
        this.clearToken();
      }
    },
    me: async () => {
      return this._request('/auth/me');
    },
    updateProfile: async (data) => {
      return this._request('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    listUsers: async () => {
      return this._request('/auth/users');
    },
    createUser: async (userData) => {
      return this._request('/auth/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    resetPassword: async (userId, newPassword) => {
      return this._request(`/auth/users/${userId}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({ newPassword }),
      });
    },
    deleteUser: async (userId) => {
      return this._request(`/auth/users/${userId}`, {
        method: 'DELETE',
      });
    },
  };

  // --- Pedidos y Órdenes ---
  orders = {
    list: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      if (filters.search) params.append('search', filters.search);

      const qs = params.toString() ? `?${params.toString()}` : '';
      return this._request(`/orders${qs}`);
    },
    getById: async (id) => {
      return this._request(`/orders/${id}`);
    },
    create: async (data) => {
      return this._request('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    updateStatus: async (id, status) => {
      return this._request(`/orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
    },
    updatePayment: async (id, paymentData) => {
      return this._request(`/orders/${id}/payment`, {
        method: 'PUT',
        body: JSON.stringify(paymentData),
      });
    },
    getStats: async () => {
      return this._request('/orders/stats');
    },
  };

  // --- Cartera B2B y Clientes ---
  customers = {
    list: async () => {
      return this._request('/customers');
    },
    getById: async (id) => {
      return this._request(`/customers/${id}`);
    },
    create: async (data) => {
      return this._request('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id, data) => {
      return this._request(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  };

  // --- Remisiones y Guías de Entrega ---
  dispatch = {
    list: async () => {
      return this._request('/dispatch');
    },
    getById: async (id) => {
      return this._request(`/dispatch/${id}`);
    },
    create: async (data) => {
      return this._request('/dispatch', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    updateStatus: async (id, data) => {
      return this._request(`/dispatch/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  };

  // --- Inventario y Bodega UV DTF ---
  inventory = {
    list: async () => {
      return this._request('/inventory');
    },
    recordRestock: async (data) => {
      return this._request('/inventory/restock', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    adjustStock: async (data) => {
      return this._request('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    listKardex: async () => {
      return this._request('/inventory/kardex');
    },
  };

  // --- Cobranza y Cuentas por Cobrar ---
  receivables = {
    list: async () => {
      return this._request('/receivables');
    },
    listPayments: async () => {
      return this._request('/receivables/payments');
    },
    recordPayment: async (data) => {
      return this._request('/receivables/payments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    voidPayment: async (id) => {
      return this._request(`/receivables/payments/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // --- Configuración de Taller Audley ---
  workshop = {
    getConfig: async () => {
      return this._request('/workshop');
    },
    updateConfig: async (data) => {
      return this._request('/workshop', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
  };

  // --- Cotizaciones Guardadas y Conversión a Orden ---
  quotes = {
    list: async (filters = {}) => {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      const qs = params.toString() ? `?${params.toString()}` : '';
      return this._request(`/quotes${qs}`);
    },
    getById: async (id) => {
      return this._request(`/quotes/${id}`);
    },
    create: async (data) => {
      return this._request('/quotes', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id, data) => {
      return this._request(`/quotes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    convertToOrder: async (id) => {
      return this._request(`/quotes/${id}/convert`, {
        method: 'POST',
      });
    },
    delete: async (id) => {
      return this._request(`/quotes/${id}`, {
        method: 'DELETE',
      });
    },
  };
}

export const apiClient = new ApiClient();
export default apiClient;
