import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient } from '../src/js/modules/api-client.js';
import { ordersStore, PAYMENT_STATUS } from '../src/js/modules/orders-store.js';
import { clientsStore } from '../src/js/modules/clients-store.js';
import { inventoryStore } from '../src/js/modules/inventory-store.js';
import { receivablesStore } from '../src/js/modules/receivables-store.js';
import { dispatchStore, DISPATCH_STATUS } from '../src/js/modules/dispatch-store.js';
import { usersStore } from '../src/js/modules/users-store.js';
import { initBackendSync } from '../src/js/app.js';
import { ORDER_STATUS } from '../src/shared/business-config.js';

describe('Frontend API Integration & Store Synchronization Layer', () => {
  beforeEach(() => {
    localStorage.clear();
    ordersStore.resetToInitial();
    clientsStore.resetToInitial();
    inventoryStore.resetToInitial();
    receivablesStore.resetToInitial();
    dispatchStore.resetToInitial();
    usersStore.resetToInitial();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('OrdersStore <-> API Sync', () => {
    it('sincroniza pedidos desde el backend correctamente mapeando atributos', async () => {
      const mockBackendOrder = {
        id: 'ord-backend-123',
        code: 'KL-00999',
        createdAt: '2026-10-20T10:00:00.000Z',
        customerName: 'Cliente API Test',
        customerPhone: '+502 5555-8888',
        customerEmail: 'api@cliente.gt',
        customerTaxId: '1234567-8',
        customerAddress: 'Zona 10, Guatemala',
        widthCm: 10,
        heightCm: 10,
        qty: 100,
        linearMeters: 2.5,
        unitRateQ: 115,
        materialPriceQ: 287.5,
        withCutting: true,
        cuttingPriceQ: 30.0,
        totalAmountQ: 317.5,
        finishType: 'GLOSSY_VARNISH',
        status: ORDER_STATUS.PRINTING,
        paymentStatus: PAYMENT_STATUS.PARTIAL,
        amountPaidQ: 150.0,
        notes: 'Logo para termos',
      };

      vi.spyOn(apiClient.orders, 'list').mockResolvedValueOnce({
        success: true,
        orders: [mockBackendOrder],
      });

      const orders = await ordersStore.syncWithApi();
      expect(orders.length).toBeGreaterThanOrEqual(1);

      const found = orders.find(o => o.id === 'KL-00999');
      expect(found).toBeDefined();
      expect(found.backendId).toBe('ord-backend-123');
      expect(found.customer.name).toBe('Cliente API Test');
      expect(found.metrics.totalBillableMeters).toBe(2.5);
      expect(found.metrics.grandTotalQ).toBe(317.5);
      expect(found.productionStatus).toBe(ORDER_STATUS.PRINTING);
    });

    it('sincroniza con lista vacía de pedidos sin alterar estado', async () => {
      vi.spyOn(apiClient.orders, 'list').mockResolvedValueOnce({
        success: true,
        orders: [],
      });
      const orders = await ordersStore.syncWithApi();
      expect(orders.length).toBeGreaterThanOrEqual(1);
    });

    it('maneja fallos de red en syncWithApi sin lanzar error y preservando estado local', async () => {
      vi.spyOn(apiClient.orders, 'list').mockRejectedValueOnce(new Error('Network error'));
      const initialCount = ordersStore.getOrders().length;

      const orders = await ordersStore.syncWithApi();
      expect(orders.length).toBe(initialCount);
    });

    it('despacha mutaciones a la API al crear pedido', async () => {
      const createSpy = vi.spyOn(apiClient.orders, 'create').mockResolvedValueOnce({
        success: true,
        order: { id: 'ord-new-999', code: 'KL-88888' },
      });

      const newOrder = ordersStore.createOrder({
        customer: { name: 'Empresa Test', phone: '+502 4444-1111' },
        cartTotals: { totalBillableMeters: 1.0, grandTotalQ: 140.0 },
        items: [{ title: 'Item 1', widthCm: 5, heightCm: 5, qty: 50 }],
      });

      expect(newOrder).toBeDefined();
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
        customerName: 'Empresa Test',
        customerPhone: '+502 4444-1111',
      }));
    });

    it('despacha actualización de estado de producción y pago a la API', async () => {
      const updateStatusSpy = vi.spyOn(apiClient.orders, 'updateStatus').mockResolvedValueOnce({ success: true });
      const updatePaymentSpy = vi.spyOn(apiClient.orders, 'updatePayment').mockResolvedValueOnce({ success: true });

      const order = ordersStore.getOrders()[0];
      ordersStore.updateProductionStatus(order.id, ORDER_STATUS.READY_FOR_DELIVERY);
      ordersStore.updatePaymentStatus(order.id, PAYMENT_STATUS.PAID);

      expect(updateStatusSpy).toHaveBeenCalledWith(order.backendId || order.id, ORDER_STATUS.READY_FOR_DELIVERY);
      expect(updatePaymentSpy).toHaveBeenCalledWith(order.backendId || order.id, { paymentStatus: PAYMENT_STATUS.PAID });
    });
  });

  describe('ClientsStore <-> API Sync', () => {
    it('sincroniza clientes B2B desde el backend mapeando sectores y tiers', async () => {
      const mockBackendCustomers = [
        {
          id: 'cust-uuid-1',
          companyName: 'Café de la Montaña',
          managerName: 'Ana Morales',
          phone: '+502 5432-9999',
          email: 'ana@cafemontana.gt',
          address: 'Antigua Guatemala',
          taxId: '543210-9',
          tier: 'VIP',
          sector: 'CAFETERIAS',
          notes: 'Cliente de alta demanda',
          createdAt: '2026-09-01T08:00:00.000Z',
        },
        {
          id: 'cust-uuid-2',
          companyName: 'Barber Shop X',
          managerName: 'Juan Barber',
          phone: '+502 5432-1111',
          email: 'juan@barber.gt',
          address: 'Zona 1',
          tier: 'RECURRENTE',
          sector: 'BARBERIAS_ESTETICA',
          createdAt: '2026-09-02T08:00:00.000Z',
        },
        {
          id: 'cust-uuid-3',
          managerName: 'Pedro Solo',
          email: 'pedro@correo.gt',
          tier: 'DESCONOCIDO',
          sector: 'OTRO_SECTOR',
          createdAt: '2026-09-03T08:00:00.000Z',
        },
      ];

      vi.spyOn(apiClient.customers, 'list').mockResolvedValueOnce({
        success: true,
        customers: mockBackendCustomers,
      });

      const clients = await clientsStore.syncWithApi();
      expect(clients.length).toBeGreaterThanOrEqual(3);

      const c1 = clients.find(c => c.id === 'cust-uuid-1');
      expect(c1.category).toBe('RESTAURANTES_CAFES');
      expect(c1.tier).toBe('VIP');

      const c2 = clients.find(c => c.id === 'cust-uuid-2');
      expect(c2.category).toBe('BARBERIAS_ESTETICA');

      const c3 = clients.find(c => c.id === 'cust-uuid-3');
      expect(c3.category).toBe('COMERCIO_GENERAL');
      expect(c3.tier).toBe('NUEVO');
    });

    it('sincroniza con lista vacía de clientes sin modificar cartera local', async () => {
      vi.spyOn(apiClient.customers, 'list').mockResolvedValueOnce({
        success: true,
        customers: [],
      });
      const clients = await clientsStore.syncWithApi();
      expect(clients.length).toBeGreaterThanOrEqual(1);
    });

    it('maneja errores en syncWithApi de clientes retornando lista actual', async () => {
      vi.spyOn(apiClient.customers, 'list').mockRejectedValueOnce(new Error('API Timeout'));
      const clients = await clientsStore.syncWithApi();
      expect(clients.length).toBeGreaterThanOrEqual(1);
    });

    it('despacha creación y edición de cliente a la API', async () => {
      const createSpy = vi.spyOn(apiClient.customers, 'create').mockResolvedValueOnce({
        success: true,
        customer: { id: 'cust-created-1' },
      });
      const updateSpy = vi.spyOn(apiClient.customers, 'update').mockResolvedValueOnce({ success: true });

      const created = clientsStore.createClient({
        company: 'Empresa Nueva S.A.',
        name: 'Carlos Ruiz',
        phone: '+502 5111-9988',
        email: 'carlos@empresa.gt',
      });

      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
        companyName: 'Empresa Nueva S.A.',
        managerName: 'Carlos Ruiz',
      }));

      clientsStore.updateClient(created.id, { phone: '+502 5111-0000' });
      expect(updateSpy).toHaveBeenCalledWith(created.backendId || created.id, expect.objectContaining({
        phone: '+502 5111-0000',
      }));
    });
  });

  describe('InventoryStore <-> API Sync', () => {
    it('sincroniza niveles de inventario y costos unitarios desde backend', async () => {
      const mockItems = [
        {
          id: 'item-backend-film-a',
          code: 'FILM_A',
          name: 'Film A Base PET',
          currentStock: 250.0,
          minStockThreshold: 40.0,
          unitCostQ: 6.25,
        },
      ];

      vi.spyOn(apiClient.inventory, 'list').mockResolvedValueOnce({
        success: true,
        items: mockItems,
      });

      const items = await inventoryStore.syncWithApi();
      const filmA = items.find(i => i.id === 'film_a');
      expect(filmA).toBeDefined();
      expect(filmA.currentStock).toBe(250.0);
      expect(filmA.costPerUnitQ).toBe(6.25);
      expect(filmA.minThreshold).toBe(40.0);
    });

    it('sincroniza con lista vacía de inventario sin fallar', async () => {
      vi.spyOn(apiClient.inventory, 'list').mockResolvedValueOnce({
        success: true,
        items: [],
      });
      const items = await inventoryStore.syncWithApi();
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it('maneja fallos de red en inventario', async () => {
      vi.spyOn(apiClient.inventory, 'list').mockRejectedValueOnce(new Error('Inv fetch fail'));
      const items = await inventoryStore.syncWithApi();
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it('despacha reabastecimiento y ajuste físico a la API', async () => {
      const restockSpy = vi.spyOn(apiClient.inventory, 'recordRestock').mockResolvedValueOnce({ success: true });
      const adjustSpy = vi.spyOn(apiClient.inventory, 'adjustStock').mockResolvedValueOnce({ success: true });

      const filmA = inventoryStore.items.find(it => it.id === 'film_a');
      filmA.backendId = 'item-film-a-backend-id';

      inventoryStore.recordRestock({
        itemId: 'film_a',
        quantity: 50,
        supplier: 'Audley GT',
      });

      expect(restockSpy).toHaveBeenCalledWith(expect.objectContaining({
        itemId: 'item-film-a-backend-id',
        quantity: 50,
      }));

      inventoryStore.recordManualAdjustment({
        itemId: 'film_a',
        newStock: 300,
        reason: 'Conteo mensual',
      });

      expect(adjustSpy).toHaveBeenCalledWith(expect.objectContaining({
        itemId: 'item-film-a-backend-id',
        newStock: 300,
      }));
    });
  });

  describe('ReceivablesStore <-> API Sync', () => {
    it('sincroniza pagos registrados desde el backend', async () => {
      const mockPayment = {
        id: 'pay-uuid-1',
        paymentCode: 'PAY-2026-999',
        createdAt: '2026-10-20T12:00:00.000Z',
        orderId: 'KL-00041',
        order: { code: 'KL-00041', customerName: 'Barbería Vintage', customerPhone: '+502 5111-2233' },
        customerName: 'Barbería Vintage',
        amountPaidQ: 193.0,
        method: 'TRANSFER',
        bankReference: 'BI-112233',
        notes: 'Liquidación saldo',
        registeredBy: { name: 'Miguel Dubois' },
      };

      vi.spyOn(apiClient.receivables, 'listPayments').mockResolvedValueOnce({
        success: true,
        payments: [mockPayment],
      });

      const payments = await receivablesStore.syncWithApi();
      const found = payments.find(p => p.id === 'PAY-2026-999');
      expect(found).toBeDefined();
      expect(found.amountQ).toBe(193.0);
      expect(found.reference).toBe('BI-112233');
    });

    it('sincroniza con lista vacía de pagos', async () => {
      vi.spyOn(apiClient.receivables, 'listPayments').mockResolvedValueOnce({
        success: true,
        payments: [],
      });
      const payments = await receivablesStore.syncWithApi();
      expect(payments.length).toBeGreaterThanOrEqual(1);
    });

    it('maneja fallos de conexión en cuentas por cobrar', async () => {
      vi.spyOn(apiClient.receivables, 'listPayments').mockRejectedValueOnce(new Error('Rec fail'));
      const payments = await receivablesStore.syncWithApi();
      expect(payments.length).toBeGreaterThanOrEqual(1);
    });

    it('despacha registro y anulación de pagos a la API', async () => {
      const recordSpy = vi.spyOn(apiClient.receivables, 'recordPayment').mockResolvedValueOnce({
        success: true,
        payment: { id: 'pay-created-id', paymentCode: 'PAY-2026-777' },
      });
      const voidSpy = vi.spyOn(apiClient.receivables, 'voidPayment').mockResolvedValueOnce({ success: true });

      const result = receivablesStore.recordPayment({
        orderId: 'KL-00041',
        amountQ: 50,
        method: 'TRANSFER',
        reference: 'BI-888',
      });

      expect(recordSpy).toHaveBeenCalledWith(expect.objectContaining({
        amountPaidQ: 50,
        bankReference: 'BI-888',
      }));

      result.payment.backendId = 'pay-created-id';
      receivablesStore.deletePayment(result.payment.id);

      expect(voidSpy).toHaveBeenCalledWith('pay-created-id');
    });
  });

  describe('DispatchStore <-> API Sync', () => {
    it('sincroniza remisiones de taller desde backend mapeando couriers y estados', async () => {
      const mockDispatches = [
        {
          id: 'disp-uuid-1',
          folio: 'REM-2026-888',
          orderId: 'ord-1',
          order: { code: 'KL-00042', status: ORDER_STATUS.READY_FOR_DELIVERY },
          customerName: 'Rodrigo Méndez',
          customerPhone: '+502 5555-1234',
          customerAddress: 'San Cristóbal, Zona 8 de Mixco',
          deliveryMethod: 'FORZA_EXPRESS',
          packagesCount: 1,
          linearMeters: 1.58,
          totalAmountQ: 226.7,
          balanceDueQ: 0.0,
          status: DISPATCH_STATUS.PREPARED.id,
          createdAt: '2026-10-20T08:00:00.000Z',
        },
        {
          id: 'disp-uuid-2',
          folio: 'REM-2026-889',
          orderId: 'ord-2',
          customerName: 'Carlos Pickup',
          customerPhone: '+502 5555-0000',
          customerAddress: 'Taller',
          deliveryMethod: 'PICKUP',
          packagesCount: 1,
          linearMeters: 1.0,
          totalAmountQ: 140.0,
          status: 'DELIVERED',
          createdAt: '2026-10-20T09:00:00.000Z',
        },
        {
          id: 'disp-uuid-3',
          folio: 'REM-2026-890',
          orderId: 'ord-3',
          customerName: 'Guatex User',
          customerPhone: '+502 5555-2222',
          customerAddress: 'Cobán',
          deliveryMethod: 'GUATEX',
          packagesCount: 2,
          linearMeters: 3.0,
          totalAmountQ: 350.0,
          status: 'IN_TRANSIT',
          createdAt: '2026-10-20T09:30:00.000Z',
        },
      ];

      vi.spyOn(apiClient.dispatch, 'list').mockResolvedValueOnce({
        success: true,
        dispatchNotes: mockDispatches,
      });

      const notes = await dispatchStore.syncWithApi();
      const n1 = notes.find(n => n.id === 'REM-2026-888');
      expect(n1.deliveryMethod).toBe('FORZAGRO');

      const n2 = notes.find(n => n.id === 'REM-2026-889');
      expect(n2.deliveryMethod).toBe('PICKUP_TALLER');

      const n3 = notes.find(n => n.id === 'REM-2026-890');
      expect(n3.deliveryMethod).toBe('GUATEX');
    });

    it('sincroniza con lista vacía de remisiones', async () => {
      vi.spyOn(apiClient.dispatch, 'list').mockResolvedValueOnce({
        success: true,
        dispatchNotes: [],
      });
      const notes = await dispatchStore.syncWithApi();
      expect(notes.length).toBeGreaterThanOrEqual(1);
    });

    it('maneja errores en dispatchStore.syncWithApi', async () => {
      vi.spyOn(apiClient.dispatch, 'list').mockRejectedValueOnce(new Error('Dispatch fail'));
      const notes = await dispatchStore.syncWithApi();
      expect(notes.length).toBeGreaterThanOrEqual(1);
    });

    it('despacha creación y actualización de estado de remisión a la API', async () => {
      const createSpy = vi.spyOn(apiClient.dispatch, 'create').mockResolvedValueOnce({
        success: true,
        dispatchNote: { id: 'disp-created-1', folio: 'REM-2026-991' },
      });
      const updateStatusSpy = vi.spyOn(apiClient.dispatch, 'updateStatus').mockResolvedValueOnce({ success: true });

      const newNote = dispatchStore.createDispatchNote({
        orderId: 'KL-00042',
        clientName: 'Rodrigo Méndez',
        deliveryMethod: 'MOTO_LOCAL',
        packagesCount: 1,
      });

      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
        customerName: 'Rodrigo Méndez',
        deliveryMethod: 'MOTO_LOCAL',
      }));

      newNote.backendId = 'disp-created-1';
      dispatchStore.updateDispatchStatus(newNote.id, DISPATCH_STATUS.DELIVERED.id, {
        receivedBy: 'Rodrigo Méndez',
        receiverIdDoc: '1234567890101',
      });

      expect(updateStatusSpy).toHaveBeenCalledWith('disp-created-1', expect.objectContaining({
        status: DISPATCH_STATUS.DELIVERED.id,
        deliveryRecipientName: 'Rodrigo Méndez',
      }));
    });

    it('despacha creación con métodos FORZAGRO y PICKUP_TALLER', async () => {
      const createSpy = vi.spyOn(apiClient.dispatch, 'create').mockResolvedValue({
        success: true,
        dispatchNote: { id: 'disp-created-forza' },
      });

      dispatchStore.createDispatchNote({
        orderId: 'KL-00042',
        deliveryMethod: 'FORZAGRO',
      });
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ deliveryMethod: 'FORZA_EXPRESS' }));

      dispatchStore.createDispatchNote({
        orderId: 'KL-00042',
        deliveryMethod: 'PICKUP_TALLER',
      });
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ deliveryMethod: 'PICKUP' }));
    });
  });

  describe('UsersStore <-> API Sync', () => {
    it('sincroniza usuarios desde la API mapeando roles y estatus', async () => {
      const mockUsers = [
        {
          id: 'usr-backend-1',
          name: 'Carlos Taller',
          email: 'carlos.taller@kromalab.gt',
          phone: '+502 5555-0202',
          role: 'EMPLOYEE',
          department: 'Operador Audley',
          isVerified: true,
          createdAt: '2026-02-01T00:00:00.000Z',
        },
        {
          id: 'usr-backend-2',
          name: 'Usuario Inactivo',
          email: 'inactivo@kromalab.gt',
          isVerified: false,
          createdAt: '2026-02-01T00:00:00.000Z',
        },
      ];

      vi.spyOn(apiClient.auth, 'listUsers').mockResolvedValueOnce({
        success: true,
        users: mockUsers,
      });

      const users = await usersStore.syncWithApi();
      const u1 = users.find(u => u.email === 'carlos.taller@kromalab.gt');
      expect(u1).toBeDefined();
      expect(u1.role).toBe('EMPLOYEE');
      expect(u1.status).toBe('ACTIVE');

      const u2 = users.find(u => u.email === 'inactivo@kromalab.gt');
      expect(u2.status).toBe('INACTIVE');
    });

    it('sincroniza con lista vacía de usuarios', async () => {
      vi.spyOn(apiClient.auth, 'listUsers').mockResolvedValueOnce({
        success: true,
        users: [],
      });
      const users = await usersStore.syncWithApi();
      expect(users.length).toBeGreaterThanOrEqual(1);
    });

    it('maneja fallos de API en usersStore', async () => {
      vi.spyOn(apiClient.auth, 'listUsers').mockRejectedValueOnce(new Error('Users fail'));
      const users = await usersStore.syncWithApi();
      expect(users.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('App initBackendSync bootstrap', () => {
    it('inicializa backend y logea sesión de administrador si el token está ausente', async () => {
      vi.spyOn(apiClient, 'checkHealth').mockResolvedValueOnce({ status: 'ok' });
      apiClient.clearToken();
      const loginSpy = vi.spyOn(apiClient.auth, 'login').mockResolvedValueOnce({
        success: true,
        token: 'mock-jwt-token',
        user: { name: 'Miguel Dubois' },
      });

      vi.spyOn(ordersStore, 'syncWithApi').mockResolvedValueOnce([]);
      vi.spyOn(clientsStore, 'syncWithApi').mockResolvedValueOnce([]);
      vi.spyOn(inventoryStore, 'syncWithApi').mockResolvedValueOnce([]);
      vi.spyOn(receivablesStore, 'syncWithApi').mockResolvedValueOnce([]);
      vi.spyOn(dispatchStore, 'syncWithApi').mockResolvedValueOnce([]);
      vi.spyOn(usersStore, 'syncWithApi').mockResolvedValueOnce([]);

      await initBackendSync();

      expect(loginSpy).toHaveBeenCalledWith('miguel@kromalab.gt', 'Admin2026!');
      expect(ordersStore.syncWithApi).toHaveBeenCalled();
      expect(clientsStore.syncWithApi).toHaveBeenCalled();
      expect(inventoryStore.syncWithApi).toHaveBeenCalled();
      expect(receivablesStore.syncWithApi).toHaveBeenCalled();
      expect(dispatchStore.syncWithApi).toHaveBeenCalled();
      expect(usersStore.syncWithApi).toHaveBeenCalled();
    });

    it('utiliza token existente sin realizar nuevo login', async () => {
      vi.spyOn(apiClient, 'checkHealth').mockResolvedValueOnce({ status: 'ok' });
      apiClient.setToken('existing-jwt-token');
      const loginSpy = vi.spyOn(apiClient.auth, 'login');

      vi.spyOn(ordersStore, 'syncWithApi').mockResolvedValueOnce([]);
      vi.spyOn(clientsStore, 'syncWithApi').mockResolvedValueOnce([]);
      vi.spyOn(inventoryStore, 'syncWithApi').mockResolvedValueOnce([]);
      vi.spyOn(receivablesStore, 'syncWithApi').mockResolvedValueOnce([]);
      vi.spyOn(dispatchStore, 'syncWithApi').mockResolvedValueOnce([]);
      vi.spyOn(usersStore, 'syncWithApi').mockResolvedValueOnce([]);

      await initBackendSync();

      expect(loginSpy).not.toHaveBeenCalled();
      expect(ordersStore.syncWithApi).toHaveBeenCalled();
    });

    it('no sincroniza si health.status es diferente de ok', async () => {
      vi.spyOn(apiClient, 'checkHealth').mockResolvedValueOnce({ status: 'error' });
      const ordersSpy = vi.spyOn(ordersStore, 'syncWithApi');

      await initBackendSync();
      expect(ordersSpy).not.toHaveBeenCalled();
    });

    it('no falla si el backend está apagado o retorna error de conexión', async () => {
      vi.spyOn(apiClient, 'checkHealth').mockRejectedValueOnce(new Error('Connection refused'));
      await expect(initBackendSync()).resolves.not.toThrow();
    });
  });
});
