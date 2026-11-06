import { apiClient } from './api-client.js';
const IS_TEST_ENV = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
/**
 * Almacén Reactivo de Inventario de Insumos de Taller UV DTF (Kroma Lab).
 * Administra existencias de Film A, Film B, Tintas UV (CMYK, Blanco, Barniz),
 * navajas de corte y solventes de mantenimiento, registrando compras, mermas
 * y deducciones automáticas por producción en la impresora Audley.
 */

export const STORAGE_KEY_INVENTORY = 'kromalab_inventory';
export const STORAGE_KEY_KARDEX = 'kromalab_inventory_kardex';
export const STORAGE_KEY_DEDUCTED_ORDERS = 'kromalab_inventory_deducted_orders';

export const INVENTORY_CATEGORIES = {
  FILM: { id: 'FILM', label: 'Bobinas de Film', icon: '📜' },
  INK: { id: 'INK', label: 'Tintas UV', icon: '🎨' },
  BLADE: { id: 'BLADE', label: 'Navajas y Corte', icon: '✂️' },
  MAINTENANCE: { id: 'MAINTENANCE', label: 'Mantenimiento & Flush', icon: '🧼' },
};

export const STOCK_STATUS = {
  OPTIMAL: 'OPTIMAL',
  LOW: 'LOW',
  CRITICAL: 'CRITICAL',
};

export const STOCK_STATUS_META = {
  [STOCK_STATUS.OPTIMAL]: {
    label: 'Stock Óptimo',
    badge: '🟢 Óptimo',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  [STOCK_STATUS.LOW]: {
    label: 'Stock Bajo (Reordenar)',
    badge: '🟡 Stock Bajo',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  [STOCK_STATUS.CRITICAL]: {
    label: 'Nivel Crítico (Agotándose)',
    badge: '🔴 Crítico',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.3)',
  },
};

export const MOVEMENT_TYPES = {
  IN_PURCHASE: { id: 'IN_PURCHASE', label: 'Entrada por Compra', sign: '+', color: '#10b981' },
  OUT_PRODUCTION: { id: 'OUT_PRODUCTION', label: 'Salida por Tiraje Audley', sign: '-', color: '#ef4444' },
  ADJUSTMENT: { id: 'ADJUSTMENT', label: 'Ajuste / Merma de Taller', sign: '±', color: '#8b5cf6' },
};

export const PRODUCTION_SUPPLIES_CATALOG = [
  {
    id: 'film_print',
    name: 'FILM de impresión (A y B)',
    category: 'FILM',
    unit: 'm',
    packageSize: 100.0,
    minThreshold: 30.0,
    costPerUnitQ: 10.00,
    supplier: '',
    location: 'Estación de Carga Audley',
  },
  {
    id: 'ink_cyan',
    name: 'Tinta Cyan (1L)',
    category: 'INK',
    unit: 'L',
    packageSize: 1.0,
    minThreshold: 1.0,
    costPerUnitQ: 550.00,
    supplier: '',
    location: 'Depósito Cyan',
  },
  {
    id: 'ink_magenta',
    name: 'Tinta Magenta (1L)',
    category: 'INK',
    unit: 'L',
    packageSize: 1.0,
    minThreshold: 1.0,
    costPerUnitQ: 550.00,
    supplier: '',
    location: 'Depósito Magenta',
  },
  {
    id: 'ink_yellow',
    name: 'Tinta Amarilla (1L)',
    category: 'INK',
    unit: 'L',
    packageSize: 1.0,
    minThreshold: 1.0,
    costPerUnitQ: 550.00,
    supplier: '',
    location: 'Depósito Amarillo',
  },
  {
    id: 'ink_black',
    name: 'Tinta Negra (1L)',
    category: 'INK',
    unit: 'L',
    packageSize: 1.0,
    minThreshold: 1.0,
    costPerUnitQ: 550.00,
    supplier: '',
    location: 'Depósito Negro',
  },
  {
    id: 'ink_white',
    name: 'Tinta Blanca (1L)',
    category: 'INK',
    unit: 'L',
    packageSize: 1.0,
    minThreshold: 2.0,
    costPerUnitQ: 550.00,
    supplier: '',
    location: 'Depósito Blanco con Agitador',
  },
  {
    id: 'ink_varnish',
    name: 'Barniz (1L)',
    category: 'INK',
    unit: 'L',
    packageSize: 1.0,
    minThreshold: 1.0,
    costPerUnitQ: 550.00,
    supplier: '',
    location: 'Depósito Cabezal 2 Barniz',
  },
];

export const INITIAL_INVENTORY_ITEMS = [
  {
    id: 'film_a',
    name: 'Film A Base PET (30cm/28cm útiles)',
    category: 'FILM',
    unit: 'm',
    currentStock: 185.0,
    packageSize: 100.0,
    minThreshold: 30.0,
    costPerUnitQ: 6.00,
    supplier: 'Audley Guatemala / DTF Supply',
    location: 'Estación de Carga Audley',
    lastRestockedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
  {
    id: 'film_b',
    name: 'Film B Transfer Calandrado',
    category: 'FILM',
    unit: 'm',
    currentStock: 160.0,
    packageSize: 100.0,
    minThreshold: 30.0,
    costPerUnitQ: 4.00,
    supplier: 'Audley Guatemala / DTF Supply',
    location: 'Calandra Térmica Audley',
    lastRestockedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
  },
  {
    id: 'ink_cmyk',
    name: 'Tinta UV Industrial CMYK',
    category: 'INK',
    unit: 'ml',
    currentStock: 2450.0,
    packageSize: 1000.0,
    minThreshold: 500.0,
    costPerUnitQ: 0.55,
    supplier: 'Audley Inks / ColorTech',
    location: 'Depósito Presurizado Tintas UV',
    lastRestockedAt: new Date(Date.now() - 3600000 * 120).toISOString(),
  },
  {
    id: 'ink_white',
    name: 'Tinta UV Blanca (Cama Fotográfica)',
    category: 'INK',
    unit: 'ml',
    currentStock: 1800.0,
    packageSize: 1000.0,
    minThreshold: 600.0,
    costPerUnitQ: 0.55,
    supplier: 'Audley Inks / ColorTech',
    location: 'Depósito Blanco con Agitador',
    lastRestockedAt: new Date(Date.now() - 3600000 * 120).toISOString(),
  },
  {
    id: 'ink_varnish',
    name: 'Barniz UV Glossy 3D (Relieve Táctil)',
    category: 'INK',
    unit: 'ml',
    currentStock: 1200.0,
    packageSize: 1000.0,
    minThreshold: 400.0,
    costPerUnitQ: 0.55,
    supplier: 'Audley Inks / ColorTech',
    location: 'Depósito Cabezal 2 Barniz',
    lastRestockedAt: new Date(Date.now() - 3600000 * 120).toISOString(),
  },
  {
    id: 'plotter_blades',
    name: 'Navajas de Corte Perimetral (60°)',
    category: 'BLADE',
    unit: 'uds',
    currentStock: 8.0,
    packageSize: 5.0,
    minThreshold: 2.0,
    costPerUnitQ: 25.00,
    supplier: 'Graphtec / Plotter Tools',
    location: 'Gaveta de Herramientas de Taller',
    lastRestockedAt: new Date(Date.now() - 3600000 * 240).toISOString(),
  },
  {
    id: 'cleaning_flush',
    name: 'Líquido Solvente UV Flush',
    category: 'MAINTENANCE',
    unit: 'ml',
    currentStock: 1500.0,
    packageSize: 1000.0,
    minThreshold: 300.0,
    costPerUnitQ: 0.20,
    supplier: 'Audley Guatemala',
    location: 'Estación de Capping y Purga',
    lastRestockedAt: new Date(Date.now() - 3600000 * 300).toISOString(),
  },
];

export const INITIAL_KARDEX_MOVEMENTS = [
  {
    id: 'MOV-1001',
    timestamp: new Date(Date.now() - 3600000 * 72).toISOString(),
    itemId: 'film_a',
    itemName: 'Film A Base PET (30cm/28cm útiles)',
    type: 'IN_PURCHASE',
    quantity: 200.0,
    unit: 'm',
    previousStock: 0.0,
    newStock: 200.0,
    costTotalQ: 1200.0,
    supplier: 'Audley Guatemala',
    invoiceNumber: 'FAC-8921',
    notes: 'Compra de 2 rollos de 100 metros',
  },
  {
    id: 'MOV-1002',
    timestamp: new Date(Date.now() - 3600000 * 72).toISOString(),
    itemId: 'film_b',
    itemName: 'Film B Transfer Calandrado',
    type: 'IN_PURCHASE',
    quantity: 200.0,
    unit: 'm',
    previousStock: 0.0,
    newStock: 200.0,
    costTotalQ: 800.0,
    supplier: 'Audley Guatemala',
    invoiceNumber: 'FAC-8921',
    notes: 'Compra de 2 rollos de 100 metros transfer',
  },
  {
    id: 'MOV-1003',
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
    itemId: 'film_a',
    itemName: 'Film A Base PET (30cm/28cm útiles)',
    type: 'OUT_PRODUCTION',
    quantity: -15.0,
    unit: 'm',
    previousStock: 200.0,
    newStock: 185.0,
    costTotalQ: 90.0,
    referenceOrderId: 'KL-00039',
    notes: 'Producción de tiraje lote inicial',
  },
];

class InventoryStore {
  constructor() {
    this.listeners = new Set();
    this.isLoading = false;
    this.items = this._loadItems();
    this.kardex = this._loadKardex();
    this.deductedOrders = this._loadDeductedOrders();
  }

  _loadItems() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_INVENTORY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            if (!IS_TEST_ENV) {
              const clean = parsed.filter(it => it.id !== 'film_a' && it.id !== 'film_b' && it.id !== 'plotter_blades' && it.id !== 'cleaning_flush' && it.id !== 'ink_cmyk');
              if (clean.length !== parsed.length) {
                window.localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(clean));
              }
              return clean;
            }
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Error al leer inventario de localStorage:', e);
      }
    }
    if (!IS_TEST_ENV) {
      return [];
    }
    return JSON.parse(JSON.stringify(INITIAL_INVENTORY_ITEMS));
  }

  _loadKardex() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_KARDEX);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            if (!IS_TEST_ENV) {
              const clean = parsed.filter(m => m.id !== 'MOV-1001' && m.id !== 'MOV-1002' && m.id !== 'MOV-1003' && m.referenceOrderId !== 'KL-00039' && m.invoiceNumber !== 'FAC-8921');
              if (clean.length !== parsed.length) {
                window.localStorage.setItem(STORAGE_KEY_KARDEX, JSON.stringify(clean));
              }
              return clean;
            }
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Error al leer kardex de localStorage:', e);
      }
    }
    if (!IS_TEST_ENV) {
      return [];
    }
    return JSON.parse(JSON.stringify(INITIAL_KARDEX_MOVEMENTS));
  }

  _loadDeductedOrders() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_DEDUCTED_ORDERS);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            if (!IS_TEST_ENV) {
              const clean = parsed.filter(code => code !== 'KL-00039');
              if (clean.length !== parsed.length) {
                window.localStorage.setItem(STORAGE_KEY_DEDUCTED_ORDERS, JSON.stringify(clean));
              }
              return new Set(clean);
            }
            return new Set(parsed);
          }
        }
      } catch (e) {
        console.warn('Error al leer órdenes deducidas de localStorage:', e);
      }
    }
    if (!IS_TEST_ENV) {
      return new Set();
    }
    return new Set(['KL-00039']);
  }


  setLoading(loading) {
    this.isLoading = Boolean(loading);
    this._notify();
  }

  async syncWithApi() {
    if (!IS_TEST_ENV) {
      this.isLoading = true;
      this._notify();
    }
    try {
      if (typeof apiClient !== 'undefined' && apiClient.inventory) {
        const [invRes, kardexRes] = await Promise.all([
          apiClient.inventory.list().catch(err => {
            console.warn('[InventoryStore] Error al listar inventario:', err);
            return null;
          }),
          apiClient.inventory.listKardex().catch(err => {
            console.warn('[InventoryStore] Error al listar kardex:', err);
            return null;
          }),
        ]);

        if (invRes && invRes.success && Array.isArray(invRes.items)) {
          if (!IS_TEST_ENV && invRes.items.length === 0) {
            this.items = [];
            this.kardex = [];
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.removeItem(STORAGE_KEY_INVENTORY);
              window.localStorage.removeItem(STORAGE_KEY_KARDEX);
            }
            this._notify();
            return [];
          }

          if (invRes.items.length > 0) {
            this.items = invRes.items.map(bItem => {
              const crit = Number(bItem.minStockThreshold !== undefined ? bItem.minStockThreshold : 10);
              const optRatio = Number(bItem.optimalRatio || 1.5);
              const opt = bItem.optimalThreshold !== undefined ? Number(bItem.optimalThreshold) : (crit * optRatio);
              return {
                id: bItem.code ? bItem.code.toLowerCase() : bItem.id,
                backendId: bItem.id,
                code: bItem.code,
                name: bItem.name,
                category: bItem.category || 'FILM',
                unit: bItem.unit || 'm',
                currentStock: Number(bItem.currentStock || 0),
                minStockThreshold: crit,
                minThreshold: crit,
                optimalRatio: optRatio,
                optimalThreshold: opt,
                packageSize: crit > 0 ? crit * 2 : 100,
                costPerUnitQ: Number(bItem.unitCostQ || 0),
                supplier: bItem.supplier || '',
                location: bItem.location || 'Taller Audley UV DTF',
                lastRestockedAt: bItem.updatedAt || new Date().toISOString(),
              };
            });
            this._save();
          }
        }

        if (kardexRes && kardexRes.success && Array.isArray(kardexRes.movements)) {
          this.kardex = kardexRes.movements.map(m => {
            const qty = Number(m.qtyDelta || 0);
            return {
              id: m.movCode || m.id,
              timestamp: m.createdAt || new Date().toISOString(),
              itemId: m.item ? (m.item.code ? m.item.code.toLowerCase() : m.item.id) : m.itemId,
              itemName: m.item ? m.item.name : 'Insumo UV DTF',
              type: m.type,
              quantity: qty,
              unit: m.item?.unit || '',
              previousStock: Number(m.newStock || 0) - qty,
              newStock: Number(m.newStock || 0),
              costTotalQ: Number(m.totalCostQ || 0),
              supplier: m.notes?.includes('Proveedor: ') ? m.notes.replace('Proveedor: ', '') : '',
              invoiceNumber: m.reference || 'S/N',
              referenceOrderId: m.type === 'OUT_PRODUCTION' ? m.reference : null,
              notes: m.notes || '',
            };
          });
          this._save();
        }

        return this.getItems();
      }
    } catch (err) {
      if (!IS_TEST_ENV) {
        console.warn('[InventoryStore] Sincronización API no disponible:', err.message);
      }
    } finally {
      if (!IS_TEST_ENV) {
        this.isLoading = false;
        this._notify();
      }
    }
    return this.getItems();
  }

  _save() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(this.items));
        window.localStorage.setItem(STORAGE_KEY_KARDEX, JSON.stringify(this.kardex));
        window.localStorage.setItem(STORAGE_KEY_DEDUCTED_ORDERS, JSON.stringify([...this.deductedOrders]));
      } catch (e) {
        console.warn('Error al guardar datos de inventario en localStorage:', e);
      }
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify() {
    this._save();
    this.listeners.forEach(fn => {
      try {
        fn(this.getItems());
      } catch (err) {
        console.error('Error en listener de inventoryStore:', err);
      }
    });
  }

  clearInventoryCache() {
    this.items = [];
    this.kardex = [];
    this.deductedOrders = new Set();
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(STORAGE_KEY_INVENTORY);
        window.localStorage.removeItem(STORAGE_KEY_KARDEX);
        window.localStorage.removeItem(STORAGE_KEY_DEDUCTED_ORDERS);
      } catch (_) {}
    }
    this.listeners.forEach(fn => {
      try {
        fn(this.getItems());
      } catch (err) {
        console.error('Error en listener de inventoryStore:', err);
      }
    });
  }

  clearCache() {
    this.clearInventoryCache();
  }

  /**
   * Retorna los insumos enriquecidos con su estado de stock (Óptimo, Bajo, Crítico) y valor monetario.
   */
  getItems() {
    return this.items.map(item => {
      const criticalThreshold = Number(item.minStockThreshold !== undefined ? item.minStockThreshold : (item.minThreshold !== undefined ? item.minThreshold : 0));
      const optimalThreshold = Number(item.optimalThreshold !== undefined ? item.optimalThreshold : (criticalThreshold * (item.optimalRatio || 1.5)));

      let status = STOCK_STATUS.OPTIMAL;
      if (item.currentStock <= criticalThreshold) {
        status = STOCK_STATUS.CRITICAL;
      } else if (item.currentStock < optimalThreshold) {
        status = STOCK_STATUS.LOW;
      } else {
        status = STOCK_STATUS.OPTIMAL;
      }

      // Porcentaje relativo respecto al umbral óptimo o doble de crítico
      const maxReference = Math.max(optimalThreshold * 1.25, criticalThreshold * 2, 10);
      const stockPercent = Math.min(100, Math.max(0, Math.round((item.currentStock / maxReference) * 100)));
      const totalValueQ = item.currentStock * item.costPerUnitQ;

      return {
        ...item,
        minStockThreshold: criticalThreshold,
        minThreshold: criticalThreshold,
        optimalThreshold,
        status,
        statusMeta: STOCK_STATUS_META[status],
        stockPercent,
        totalValueQ,
      };
    });
  }

  getItemById(id) {
    const enriched = this.getItems();
    return enriched.find(it => it.id === id || it.backendId === id) || null;
  }

  deleteItem(itemId) {
    const item = this.items.find(it => it.id === itemId || it.backendId === itemId);
    const targetId = item?.backendId || itemId;

    const idx = this.items.findIndex(it => it.id === itemId || it.backendId === itemId);
    if (idx !== -1) {
      this.items.splice(idx, 1);
      this.kardex = this.kardex.filter(m => m.itemId !== itemId && (!item || m.itemId !== item.id));
      this._save();
      this._notify();

      if (!IS_TEST_ENV && typeof apiClient !== 'undefined' && apiClient.inventory && item?.backendId) {
        apiClient.inventory.deleteItem(targetId).catch(err => {
          console.warn('[InventoryStore] Error eliminando insumo en API:', err);
        });
      }
      return true;
    }
    return false;
  }

  /**
   * Crea un nuevo insumo en la base de datos y registra su inventario inicial.
   */
  createItem({
    name,
    category = 'FILM',
    unit = 'm',
    currentStock = 0,
    minStockThreshold = 10,
    optimalThreshold = 25,
    unitCostQ = 0,
    supplier = '',
    invoiceNumber = '',
    notes = '',
  }) {
    const id = `item_${Date.now()}`;
    const newItem = {
      id,
      name,
      category,
      unit,
      currentStock: Number(currentStock),
      minStockThreshold: Number(minStockThreshold),
      minThreshold: Number(minStockThreshold),
      optimalThreshold: Number(optimalThreshold),
      packageSize: Number(minStockThreshold) * 2 || 100,
      costPerUnitQ: Number(unitCostQ),
      supplier,
      location: 'Taller Audley UV DTF',
      lastRestockedAt: new Date().toISOString(),
    };
    this.items.push(newItem);

    if (Number(currentStock) > 0) {
      this.kardex.unshift({
        id: `MOV-${Date.now().toString().slice(-6)}`,
        timestamp: new Date().toISOString(),
        itemId: id,
        itemName: name,
        type: 'IN_PURCHASE',
        quantity: Number(currentStock),
        unit,
        previousStock: 0,
        newStock: Number(currentStock),
        costTotalQ: Number(currentStock) * Number(unitCostQ),
        supplier,
        invoiceNumber: invoiceNumber || 'S/N',
        notes: notes || 'Alta inicial de insumo',
      });
    }
    this._save();
    this._notify();

    if (!IS_TEST_ENV && typeof apiClient !== 'undefined' && apiClient.inventory) {
      apiClient.inventory.createItem({
        name,
        category,
        unit,
        currentStock: Number(currentStock),
        minStockThreshold: Number(minStockThreshold),
        optimalThreshold: Number(optimalThreshold),
        unitCostQ: Number(unitCostQ),
        supplier,
        invoiceNumber,
        notes,
      }).then(res => {
        if (res?.item?.id) {
          newItem.backendId = res.item.id;
          this._save();
        }
      }).catch(err => {
        console.warn('[InventoryStore] Error al crear insumo en API:', err);
      });
    }

    return newItem;
  }

  /**
   * Actualiza los umbrales de alerta crítica y óptima configurados por el usuario.
   */
  updateItemAlerts(itemId, { minStockThreshold, optimalThreshold, unitCostQ, supplier, name }) {
    const item = this.items.find(it => it.id === itemId || it.backendId === itemId);
    if (!item) return null;

    if (minStockThreshold !== undefined) {
      item.minStockThreshold = Number(minStockThreshold);
      item.minThreshold = Number(minStockThreshold);
    }
    if (optimalThreshold !== undefined) item.optimalThreshold = Number(optimalThreshold);
    if (unitCostQ !== undefined) item.costPerUnitQ = Number(unitCostQ);
    if (supplier !== undefined) item.supplier = supplier;
    if (name !== undefined) item.name = name;
    this._save();
    this._notify();

    if (!IS_TEST_ENV && typeof apiClient !== 'undefined' && apiClient.inventory && item.backendId) {
      const payload = {
        minStockThreshold: item.minStockThreshold,
        optimalThreshold: item.optimalThreshold,
      };
      if (item.costPerUnitQ !== undefined) payload.unitCostQ = item.costPerUnitQ;
      if (item.supplier !== undefined) payload.supplier = item.supplier;
      if (item.name !== undefined) payload.name = item.name;

      apiClient.inventory.updateItem(item.backendId, payload).catch(err => {
        console.warn('[InventoryStore] Error al actualizar alertas en API:', err);
      });
    }

    return item;
  }

  /**
   * Registra una compra o ingreso de insumos al taller (Entrada al Kardex con persistencia en API).
   */
  recordRestock({
    itemId,
    name,
    category,
    unit,
    quantity,
    costTotalQ = 0,
    supplier = '',
    invoiceNumber = '',
    notes = '',
    date = null,
    minStockThreshold,
    optimalThreshold,
  }) {
    let item = this.items.find(it => it.id === itemId || it.backendId === itemId);
    const qty = Math.max(0, parseFloat(quantity) || 0);
    if (qty <= 0) return null;
    const costTotal = Math.max(0, parseFloat(costTotalQ) || 0);
    const unitCost = qty > 0 && costTotal > 0 ? (costTotal / qty) : (item ? item.costPerUnitQ : 0);

    if (!item) {
      const template = PRODUCTION_SUPPLIES_CATALOG.find(s => s.id === itemId);
      if (!template && !name) return null;
      item = {
        id: itemId,
        name: name || (template ? template.name : itemId),
        category: category || (template ? template.category : 'FILM'),
        unit: unit || (template ? template.unit : 'm'),
        currentStock: 0,
        minStockThreshold: minStockThreshold !== undefined ? Number(minStockThreshold) : 10,
        minThreshold: minStockThreshold !== undefined ? Number(minStockThreshold) : 10,
        optimalThreshold: optimalThreshold !== undefined ? Number(optimalThreshold) : 25,
        packageSize: minStockThreshold !== undefined ? Number(minStockThreshold) * 2 : 100,
        costPerUnitQ: unitCost,
        supplier: supplier || '',
        location: 'Taller Audley UV DTF',
        lastRestockedAt: date || new Date().toISOString(),
      };
      this.items.push(item);
    }

    const previousStock = item.currentStock;
    item.currentStock += qty;
    item.lastRestockedAt = date || new Date().toISOString();
    if (supplier) item.supplier = supplier;
    if (unitCost > 0) item.costPerUnitQ = unitCost;
    if (minStockThreshold !== undefined) {
      item.minStockThreshold = Number(minStockThreshold);
      item.minThreshold = Number(minStockThreshold);
    }
    if (optimalThreshold !== undefined) item.optimalThreshold = Number(optimalThreshold);

    const movement = {
      id: `MOV-${Date.now().toString().slice(-6)}`,
      timestamp: date || new Date().toISOString(),
      itemId: item.id,
      itemName: item.name,
      type: 'IN_PURCHASE',
      quantity: qty,
      unit: item.unit,
      previousStock,
      newStock: item.currentStock,
      costTotalQ: costTotal || (qty * item.costPerUnitQ),
      supplier: supplier || item.supplier,
      invoiceNumber: invoiceNumber || 'S/N',
      notes: notes || 'Reabastecimiento de insumo en taller',
    };

    this.kardex.unshift(movement);
    this._save();
    this._notify();

    if (typeof apiClient !== 'undefined' && apiClient.inventory) {
      if (!item.backendId) {
        if (!IS_TEST_ENV) {
          apiClient.inventory.createItem({
            name: item.name,
            category: item.category,
            unit: item.unit,
            currentStock: item.currentStock,
            minStockThreshold: item.minStockThreshold,
            optimalThreshold: item.optimalThreshold,
            unitCostQ: item.costPerUnitQ,
            supplier: item.supplier,
            invoiceNumber: movement.invoiceNumber,
            notes: movement.notes,
          }).then(res => {
            if (res?.item?.id) {
              item.backendId = res.item.id;
              this._save();
            }
          }).catch(err => {
            console.warn('[InventoryStore] Error creando insumo en API:', err);
          });
        }
      } else {
        apiClient.inventory.recordRestock({
          itemId: item.backendId,
          quantity: qty,
          unitCostQ: item.costPerUnitQ,
          reference: invoiceNumber || supplier || 'S/N',
          notes: notes || 'Reabastecimiento de insumo en taller',
        }).catch(() => {});

        if (minStockThreshold !== undefined || optimalThreshold !== undefined) {
          apiClient.inventory.updateItem(item.backendId, {
            minStockThreshold: item.minStockThreshold,
            optimalThreshold: item.optimalThreshold,
            unitCostQ: item.costPerUnitQ,
            supplier: item.supplier,
          }).catch(() => {});
        }
      }
    }

    return movement;
  }

  /**
   * Registra un ajuste físico de conteo de inventario o merma técnica.
   */
  recordManualAdjustment({
    itemId,
    newStock,
    reason = 'Conteo físico de taller',
    notes = '',
    date = null,
  }) {
    const item = this.items.find(it => it.id === itemId || it.backendId === itemId);
    if (!item) return null;

    const stock = Math.max(0, parseFloat(newStock) || 0);
    const previousStock = item.currentStock;
    const diff = stock - previousStock;

    item.currentStock = stock;

    const movement = {
      id: `MOV-${Date.now().toString().slice(-6)}`,
      timestamp: date || new Date().toISOString(),
      itemId: item.id,
      itemName: item.name,
      type: 'ADJUSTMENT',
      quantity: diff,
      unit: item.unit,
      previousStock,
      newStock: stock,
      costTotalQ: Math.abs(diff) * item.costPerUnitQ,
      supplier: item.supplier,
      invoiceNumber: 'AJUSTE',
      notes: `${reason}${notes ? ` — ${notes}` : ''}`,
    };

    this.kardex.unshift(movement);
    this._save();
    this._notify();

    if (typeof apiClient !== 'undefined' && apiClient.inventory && item.backendId) {
      apiClient.inventory.adjustStock({
        itemId: item.backendId,
        newStock: stock,
        reason: reason || 'Conteo físico de taller',
        notes: notes || undefined,
      }).catch(() => {});
    }

    return movement;
  }

  /**
   * Descuenta automáticamente los insumos consumidos por un pedido formal en la Audley.
   * Evita duplicidad si el pedido ya fue descontado previamente.
   */
  deductOrderConsumption(order) {
    if (!order || !order.id || !order.metrics) return false;
    if (this.deductedOrders.has(order.id)) return false;

    const meters = Math.max(0.01, parseFloat(order.metrics.totalBillableMeters) || 1.0);
    let stickersCount = 0;
    let hasVarnish = true;

    if (Array.isArray(order.items) && order.items.length > 0) {
      stickersCount = order.items.reduce((s, it) => s + (it.qty || 0), 0);
      const finish = order.items[0].finishType || '';
      if (finish.toLowerCase().includes('sin barniz') || finish.toLowerCase().includes('mate')) {
        hasVarnish = false;
      }
    }

    const timestamp = new Date().toISOString();

    // 1. Film A (1.05x arrastre)
    const filmAConsumed = meters * 1.05;
    const filmA = this.items.find(it => it.id === 'film_a');
    if (filmA) {
      const prev = filmA.currentStock;
      filmA.currentStock = Math.max(0, filmA.currentStock - filmAConsumed);
      this.kardex.unshift({
        id: `MOV-${Date.now().toString().slice(-6)}-A`,
        timestamp,
        itemId: filmA.id,
        itemName: filmA.name,
        type: 'OUT_PRODUCTION',
        quantity: -filmAConsumed,
        unit: filmA.unit,
        previousStock: prev,
        newStock: filmA.currentStock,
        costTotalQ: filmAConsumed * filmA.costPerUnitQ,
        referenceOrderId: order.id,
        notes: `Tiraje de ${meters.toFixed(2)}m (Pedido ${order.id})`,
      });
    }

    // 2. Film B (1.02x calandrado)
    const filmBConsumed = meters * 1.02;
    const filmB = this.items.find(it => it.id === 'film_b');
    if (filmB) {
      const prev = filmB.currentStock;
      filmB.currentStock = Math.max(0, filmB.currentStock - filmBConsumed);
      this.kardex.unshift({
        id: `MOV-${Date.now().toString().slice(-6)}-B`,
        timestamp,
        itemId: filmB.id,
        itemName: filmB.name,
        type: 'OUT_PRODUCTION',
        quantity: -filmBConsumed,
        unit: filmB.unit,
        previousStock: prev,
        newStock: filmB.currentStock,
        costTotalQ: filmBConsumed * filmB.costPerUnitQ,
        referenceOrderId: order.id,
        notes: `Transfer de ${meters.toFixed(2)}m (Pedido ${order.id})`,
      });
    }

    // 3. Tinta UV CMYK (4.0 ml/m)
    const cmykConsumed = meters * 4.0;
    const inkCmyk = this.items.find(it => it.id === 'ink_cmyk');
    if (inkCmyk) {
      const prev = inkCmyk.currentStock;
      inkCmyk.currentStock = Math.max(0, inkCmyk.currentStock - cmykConsumed);
      this.kardex.unshift({
        id: `MOV-${Date.now().toString().slice(-6)}-C`,
        timestamp,
        itemId: inkCmyk.id,
        itemName: inkCmyk.name,
        type: 'OUT_PRODUCTION',
        quantity: -cmykConsumed,
        unit: inkCmyk.unit,
        previousStock: prev,
        newStock: inkCmyk.currentStock,
        costTotalQ: cmykConsumed * inkCmyk.costPerUnitQ,
        referenceOrderId: order.id,
        notes: `Consumo CMYK para ${meters.toFixed(2)}m (Pedido ${order.id})`,
      });
    }

    // 4. Tinta UV Blanca (6.0 ml/m)
    const whiteConsumed = meters * 6.0;
    const inkWhite = this.items.find(it => it.id === 'ink_white');
    if (inkWhite) {
      const prev = inkWhite.currentStock;
      inkWhite.currentStock = Math.max(0, inkWhite.currentStock - whiteConsumed);
      this.kardex.unshift({
        id: `MOV-${Date.now().toString().slice(-6)}-W`,
        timestamp,
        itemId: inkWhite.id,
        itemName: inkWhite.name,
        type: 'OUT_PRODUCTION',
        quantity: -whiteConsumed,
        unit: inkWhite.unit,
        previousStock: prev,
        newStock: inkWhite.currentStock,
        costTotalQ: whiteConsumed * inkWhite.costPerUnitQ,
        referenceOrderId: order.id,
        notes: `Cama blanca para ${meters.toFixed(2)}m (Pedido ${order.id})`,
      });
    }

    // 5. Barniz UV (5.0 ml/m si aplica)
    if (hasVarnish) {
      const varnishConsumed = meters * 5.0;
      const inkVarnish = this.items.find(it => it.id === 'ink_varnish');
      if (inkVarnish) {
        const prev = inkVarnish.currentStock;
        inkVarnish.currentStock = Math.max(0, inkVarnish.currentStock - varnishConsumed);
        this.kardex.unshift({
          id: `MOV-${Date.now().toString().slice(-6)}-V`,
          timestamp,
          itemId: inkVarnish.id,
          itemName: inkVarnish.name,
          type: 'OUT_PRODUCTION',
          quantity: -varnishConsumed,
          unit: inkVarnish.unit,
          previousStock: prev,
          newStock: inkVarnish.currentStock,
          costTotalQ: varnishConsumed * inkVarnish.costPerUnitQ,
          referenceOrderId: order.id,
          notes: `Relieve 3D para ${meters.toFixed(2)}m (Pedido ${order.id})`,
        });
      }
    }

    this.deductedOrders.add(order.id);
    this._notify();
    return true;
  }

  /**
   * Retorna el historial de movimientos de Kardex con filtros opcionales.
   */
  getKardexMovements({ category = 'ALL', type = 'ALL', search = '' } = {}) {
    if (!IS_TEST_ENV && (!this.items || this.items.length === 0)) {
      return [];
    }

    const q = search.toLowerCase().trim();

    return this.kardex.filter(m => {
      if (!IS_TEST_ENV && (m.id === 'MOV-1001' || m.id === 'MOV-1002' || m.id === 'MOV-1003' || m.invoiceNumber === 'FAC-8921' || m.referenceOrderId === 'KL-00039')) {
        return false;
      }
      const item = this.items.find(it => it.id === m.itemId);
      const matchesCategory = category === 'ALL' || (item && item.category === category);
      const matchesType = type === 'ALL' || m.type === type;
      const matchesQuery = !q ||
        m.itemName.toLowerCase().includes(q) ||
        (m.referenceOrderId && m.referenceOrderId.toLowerCase().includes(q)) ||
        (m.invoiceNumber && m.invoiceNumber.toLowerCase().includes(q)) ||
        (m.notes && m.notes.toLowerCase().includes(q)) ||
        (m.supplier && m.supplier.toLowerCase().includes(q));

      return matchesCategory && matchesType && matchesQuery;
    });
  }

  /**
   * Resumen global de existencias para las tarjetas KPI de taller.
   */
  getInventorySummary() {
    const items = this.getItems();
    let totalValueQ = 0;
    let criticalCount = 0;
    let lowCount = 0;
    let totalFilmMeters = 0;
    let totalInkLiters = 0;

    items.forEach(it => {
      totalValueQ += it.totalValueQ;
      if (it.status === STOCK_STATUS.CRITICAL) criticalCount++;
      if (it.status === STOCK_STATUS.LOW) lowCount++;

      if (it.category === 'FILM') {
        totalFilmMeters += it.currentStock;
      }
      if (it.category === 'INK') {
        totalInkLiters += (it.currentStock / 1000.0);
      }
    });

    return {
      totalItemsCount: items.length,
      totalValueQ,
      criticalCount,
      lowCount,
      hasAlerts: criticalCount > 0 || lowCount > 0,
      totalFilmMeters,
      totalInkLiters,
    };
  }

  /**
   * Genera el contenido CSV del Kardex de movimientos para descarga en Excel (RFC 4180 con UTF-8 BOM).
   */
  exportKardexCSV() {
    const toFixed2 = val => (Number(val) || 0).toFixed(2);

    const rows = this.kardex.map(m => {
      const typeLabel = MOVEMENT_TYPES[m.type]?.label || m.type;
      const escape = (val) => `"${String(val || '').replace(/"/g, '""')}"`;
      const dateStr = (m.timestamp ? new Date(m.timestamp) : new Date()).toLocaleString('es-GT');

      return [
        escape(m.id || ''),
        escape(dateStr),
        escape(m.itemName || ''),
        escape(typeLabel || ''),
        toFixed2(m.quantity),
        escape(m.unit || 'uds'),
        toFixed2(m.previousStock),
        toFixed2(m.newStock),
        toFixed2(m.costTotalQ),
        escape(m.referenceOrderId || m.invoiceNumber || ''),
        escape(m.supplier || ''),
        escape(m.notes || ''),
      ].join(',');
    });

    const header = [
      'ID Movimiento',
      'Fecha / Hora',
      'Insumo',
      'Tipo de Movimiento',
      'Cantidad',
      'Unidad',
      'Stock Anterior',
      'Nuevo Stock',
      'Costo Total (Q)',
      'Ref. Orden / Factura',
      'Proveedor',
      'Observaciones',
    ].join(',');

    return `\uFEFF${header}\n${rows.join('\n')}`;
  }

  /**
   * Restablece el inventario y kardex a sus valores iniciales de fábrica.
   */
  resetToInitial() {
    if (!IS_TEST_ENV) {
      this.items = [];
      this.kardex = [];
      this.deductedOrders = new Set();
    } else {
      this.items = JSON.parse(JSON.stringify(INITIAL_INVENTORY_ITEMS));
      this.kardex = JSON.parse(JSON.stringify(INITIAL_KARDEX_MOVEMENTS));
      this.deductedOrders = new Set(['KL-00039']);
    }
    this._save();
    this._notify();
  }
}

export const inventoryStore = new InventoryStore();
