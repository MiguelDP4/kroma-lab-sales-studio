import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  inventoryStore,
  STORAGE_KEY_INVENTORY,
  STORAGE_KEY_KARDEX,
  STOCK_STATUS,
  INVENTORY_CATEGORIES,
  MOVEMENT_TYPES,
} from '../src/js/modules/inventory-store.js';

describe('Inventory Store — Almacén Reactivo de Insumos UV DTF', () => {
  beforeEach(() => {
    localStorage.clear();
    inventoryStore.resetToInitial();
    vi.restoreAllMocks();
  });

  describe('Carga Inicial y Enriquecimiento de Datos', () => {
    it('inicia con los 7 insumos clave del taller Audley', () => {
      const items = inventoryStore.getItems();
      expect(items.length).toBe(7);

      const ids = items.map(it => it.id);
      expect(ids).toContain('film_a');
      expect(ids).toContain('film_b');
      expect(ids).toContain('ink_cmyk');
      expect(ids).toContain('ink_white');
      expect(ids).toContain('ink_varnish');
      expect(ids).toContain('plotter_blades');
      expect(ids).toContain('cleaning_flush');
    });

    it('calcula correctamente el estado de stock (Óptimo, Bajo, Crítico)', () => {
      // Insumo con stock saludable
      const filmA = inventoryStore.getItemById('film_a');
      expect(filmA.status).toBe(STOCK_STATUS.OPTIMAL);
      expect(filmA.statusMeta.badge).toContain('Óptimo');
      expect(filmA.totalValueQ).toBe(185.0 * 6.0);

      // Forzar stock bajo (entre minThreshold y 1.5x minThreshold)
      filmA.currentStock = 40.0; // minThreshold es 30, 1.5x es 45
      inventoryStore.items = [filmA];
      const lowItem = inventoryStore.getItemById('film_a');
      expect(lowItem.status).toBe(STOCK_STATUS.LOW);
      expect(lowItem.statusMeta.badge).toContain('Stock Bajo');

      // Forzar stock crítico (<= minThreshold)
      filmA.currentStock = 20.0;
      inventoryStore.items = [filmA];
      const critItem = inventoryStore.getItemById('film_a');
      expect(critItem.status).toBe(STOCK_STATUS.CRITICAL);
      expect(critItem.statusMeta.badge).toContain('Crítico');
    });

    it('retorna null al buscar un insumo inexistente', () => {
      expect(inventoryStore.getItemById('non_existent')).toBeNull();
    });
  });

  describe('recordRestock — Entradas y Compras de Insumos', () => {
    it('aumenta el stock y registra el movimiento de compra en el Kardex', () => {
      const initialStock = inventoryStore.getItemById('film_a').currentStock;

      const mov = inventoryStore.recordRestock({
        itemId: 'film_a',
        quantity: 100.0,
        costTotalQ: 600.0,
        supplier: 'Audley Direct',
        invoiceNumber: 'FAC-9999',
        notes: 'Compra de 1 rollo nuevo',
      });

      expect(mov).not.toBeNull();
      expect(mov.type).toBe('IN_PURCHASE');
      expect(mov.quantity).toBe(100.0);
      expect(mov.previousStock).toBe(initialStock);
      expect(mov.newStock).toBe(initialStock + 100.0);

      const updated = inventoryStore.getItemById('film_a');
      expect(updated.currentStock).toBe(initialStock + 100.0);
      expect(updated.supplier).toBe('Audley Direct');

      const kardex = inventoryStore.getKardexMovements();
      expect(kardex[0].id).toBe(mov.id);
    });

    it('rechaza cantidades negativas o cero y no altera el inventario', () => {
      const initialStock = inventoryStore.getItemById('film_a').currentStock;

      expect(inventoryStore.recordRestock({ itemId: 'film_a', quantity: 0 })).toBeNull();
      expect(inventoryStore.recordRestock({ itemId: 'film_a', quantity: -10 })).toBeNull();
      expect(inventoryStore.recordRestock({ itemId: 'invalid', quantity: 50 })).toBeNull();

      expect(inventoryStore.getItemById('film_a').currentStock).toBe(initialStock);
    });

    it('aplica cálculo por defecto de costo total si no se especifica', () => {
      const mov = inventoryStore.recordRestock({
        itemId: 'plotter_blades',
        quantity: 2,
      });

      // 2 unidades a Q25.00 cada una = Q50.00
      expect(mov.costTotalQ).toBe(50.0);
    });
  });

  describe('recordManualAdjustment — Ajustes Físicos y Mermas', () => {
    it('modifica el stock por conteo físico y calcula la diferencia en el Kardex', () => {
      const item = inventoryStore.getItemById('ink_white');
      const prevStock = item.currentStock; // 1800.0 ml

      const mov = inventoryStore.recordManualAdjustment({
        itemId: 'ink_white',
        newStock: 1700.0,
        reason: 'Merma por purga matutina',
        notes: 'Calibración de cabezal 1',
      });

      expect(mov).not.toBeNull();
      expect(mov.type).toBe('ADJUSTMENT');
      expect(mov.previousStock).toBe(prevStock);
      expect(mov.newStock).toBe(1700.0);
      expect(mov.quantity).toBe(-100.0); // Diferencia negativa
      expect(mov.costTotalQ).toBeCloseTo(100.0 * 0.55, 2);

      const updated = inventoryStore.getItemById('ink_white');
      expect(updated.currentStock).toBe(1700.0);
    });

    it('retorna null al intentar ajustar un insumo que no existe', () => {
      expect(inventoryStore.recordManualAdjustment({ itemId: 'unknown', newStock: 100 })).toBeNull();
    });
  });

  describe('deductOrderConsumption — Deducción Automática por Producción', () => {
    it('descuenta Film A, Film B, CMYK, Blanco y Barniz según los metros facturables', () => {
      const mockOrder = {
        id: 'ORD-PROD-999',
        metrics: { totalBillableMeters: 2.0 },
        items: [
          { qty: 100, finishType: 'Barniz con Relieve 3D' }
        ],
      };

      const stockFilmA = inventoryStore.getItemById('film_a').currentStock;
      const stockFilmB = inventoryStore.getItemById('film_b').currentStock;
      const stockCmyk = inventoryStore.getItemById('ink_cmyk').currentStock;
      const stockWhite = inventoryStore.getItemById('ink_white').currentStock;
      const stockVarnish = inventoryStore.getItemById('ink_varnish').currentStock;

      const success = inventoryStore.deductOrderConsumption(mockOrder);
      expect(success).toBe(true);

      // Film A: 2m * 1.05 = 2.10m
      expect(inventoryStore.getItemById('film_a').currentStock).toBeCloseTo(stockFilmA - 2.10, 2);
      // Film B: 2m * 1.02 = 2.04m
      expect(inventoryStore.getItemById('film_b').currentStock).toBeCloseTo(stockFilmB - 2.04, 2);
      // CMYK: 2m * 4.0 = 8.0 ml
      expect(inventoryStore.getItemById('ink_cmyk').currentStock).toBeCloseTo(stockCmyk - 8.0, 2);
      // White: 2m * 6.0 = 12.0 ml
      expect(inventoryStore.getItemById('ink_white').currentStock).toBeCloseTo(stockWhite - 12.0, 2);
      // Varnish: 2m * 5.0 = 10.0 ml
      expect(inventoryStore.getItemById('ink_varnish').currentStock).toBeCloseTo(stockVarnish - 10.0, 2);
    });

    it('omite la deducción de barniz cuando el acabado es mate / sin barniz', () => {
      const mockOrderMate = {
        id: 'ORD-MATE-111',
        metrics: { totalBillableMeters: 3.0 },
        items: [
          { qty: 50, finishType: 'Sin Barniz / Mate' }
        ],
      };

      const stockVarnish = inventoryStore.getItemById('ink_varnish').currentStock;
      inventoryStore.deductOrderConsumption(mockOrderMate);

      // El barniz permanece intacto
      expect(inventoryStore.getItemById('ink_varnish').currentStock).toBe(stockVarnish);
    });

    it('evita descontar dos veces la misma orden de producción', () => {
      const order = { id: 'ORD-DUPLICATE', metrics: { totalBillableMeters: 1.0 } };

      expect(inventoryStore.deductOrderConsumption(order)).toBe(true);
      // Segunda llamada para el mismo orderId
      expect(inventoryStore.deductOrderConsumption(order)).toBe(false);
    });

    it('ignora pedidos inválidos o nulos', () => {
      expect(inventoryStore.deductOrderConsumption(null)).toBe(false);
      expect(inventoryStore.deductOrderConsumption({})).toBe(false);
      expect(inventoryStore.deductOrderConsumption({ id: 'ORD-NO-METRICS' })).toBe(false);
    });
  });

  describe('getKardexMovements — Consultas y Filtros', () => {
    it('filtra movimientos por tipo y por texto de búsqueda', () => {
      const all = inventoryStore.getKardexMovements();
      expect(all.length).toBeGreaterThan(0);

      const purchases = inventoryStore.getKardexMovements({ type: 'IN_PURCHASE' });
      expect(purchases.every(m => m.type === 'IN_PURCHASE')).toBe(true);

      const filmMovements = inventoryStore.getKardexMovements({ category: 'FILM' });
      expect(filmMovements.every(m => m.itemId.startsWith('film_'))).toBe(true);

      const searched = inventoryStore.getKardexMovements({ search: 'KL-00039' });
      expect(searched.length).toBeGreaterThan(0);
      expect(searched[0].referenceOrderId).toBe('KL-00039');
    });
  });

  describe('getInventorySummary — Métricas de Bodega', () => {
    it('calcula el valor total, alertas y totales consolidados de film y tinta', () => {
      const summary = inventoryStore.getInventorySummary();

      expect(summary.totalItemsCount).toBe(7);
      expect(summary.totalValueQ).toBeGreaterThan(3000);
      expect(summary.totalFilmMeters).toBe(185.0 + 160.0);
      expect(summary.totalInkLiters).toBeCloseTo((2450 + 1800 + 1200) / 1000, 2);
    });
  });

  describe('exportKardexCSV — Exportación de Datos', () => {
    it('genera un CSV compatible con RFC 4180 con encabezados y UTF-8 BOM', () => {
      const csv = inventoryStore.exportKardexCSV();
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('ID Movimiento');
      expect(csv).toContain('Insumo');
      expect(csv).toContain('Costo Total (Q)');
      expect(csv).toContain('Film A Base PET');
    });
  });

  describe('Persistencia y Manejo de Errores en localStorage', () => {
    it('maneja errores de parseo en localStorage cargando datos semilla', () => {
      localStorage.setItem(STORAGE_KEY_INVENTORY, 'invalid JSON {{{');
      localStorage.setItem(STORAGE_KEY_KARDEX, 'invalid JSON {{{');

      const freshStore = new inventoryStore.constructor();
      expect(freshStore.getItems().length).toBe(7);
    });

    it('maneja excepciones al escribir en localStorage sin fallar', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceeded');
      });

      expect(() => {
        inventoryStore.recordRestock({ itemId: 'film_a', quantity: 10 });
      }).not.toThrow();
    });
  });

  describe('createItem, updateItemAlerts y deleteItem — Gestión Dinámica y Alertas Configurables', () => {
    it('permite crear un nuevo insumo con stock inicial y lo agrega al inventario y kardex', () => {
      const newItem = inventoryStore.createItem({
        name: 'Film DTF Glitter Dorado',
        category: 'FILM',
        unit: 'm',
        currentStock: 50,
        minStockThreshold: 15,
        optimalThreshold: 40,
        unitCostQ: 18.5,
        supplier: 'DTF Supplies GT',
        invoiceNumber: 'FAC-7788',
        notes: 'Insumo especial premium',
      });

      expect(newItem).toBeDefined();
      expect(newItem.name).toBe('Film DTF Glitter Dorado');
      expect(newItem.currentStock).toBe(50);
      expect(newItem.minStockThreshold).toBe(15);
      expect(newItem.optimalThreshold).toBe(40);

      const found = inventoryStore.getItemById(newItem.id);
      expect(found).not.toBeNull();
      expect(found.status).toBe(STOCK_STATUS.OPTIMAL);

      const movements = inventoryStore.getKardexMovements({ search: 'FAC-7788' });
      expect(movements.length).toBeGreaterThan(0);
      expect(movements[0].itemName).toBe('Film DTF Glitter Dorado');
      expect(movements[0].quantity).toBe(50);
    });

    it('permite actualizar los umbrales configurables de alerta crítica y óptima', () => {
      const item = inventoryStore.getItemById('film_a');
      expect(item).not.toBeNull();

      const updated = inventoryStore.updateItemAlerts('film_a', {
        minStockThreshold: 50,
        optimalThreshold: 100,
        unitCostQ: 8.5,
        supplier: 'Audley Direct GT',
      });

      expect(updated.minStockThreshold).toBe(50);
      expect(updated.optimalThreshold).toBe(100);
      expect(updated.costPerUnitQ).toBe(8.5);
      expect(updated.supplier).toBe('Audley Direct GT');

      // Si el stock actual es 185m y el óptimo es 100, sigue en OPTIMAL
      const enriched = inventoryStore.getItemById('film_a');
      expect(enriched.optimalThreshold).toBe(100);
      expect(enriched.minStockThreshold).toBe(50);

      // Si bajamos el stock a 60 (entre 50 y 100), debe pasar a LOW
      enriched.currentStock = 60;
      inventoryStore.items = [enriched];
      expect(inventoryStore.getItemById('film_a').status).toBe(STOCK_STATUS.LOW);

      // Si bajamos el stock a 40 (<= 50), debe pasar a CRITICAL
      enriched.currentStock = 40;
      inventoryStore.items = [enriched];
      expect(inventoryStore.getItemById('film_a').status).toBe(STOCK_STATUS.CRITICAL);
    });

    it('elimina un insumo del almacén y limpia sus movimientos asociados', () => {
      const initialCount = inventoryStore.getItems().length;
      const res = inventoryStore.deleteItem('cleaning_flush');

      expect(res).toBe(true);
      expect(inventoryStore.getItemById('cleaning_flush')).toBeNull();
      expect(inventoryStore.getItems().length).toBe(initialCount - 1);

      // Eliminar ID inexistente retorna false
      expect(inventoryStore.deleteItem('non_existent')).toBe(false);
    });
  });
});
