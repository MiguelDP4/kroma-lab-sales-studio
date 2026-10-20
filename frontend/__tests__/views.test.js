import { describe, it, expect, beforeEach } from 'vitest';
import { ordersView } from '../src/js/views/orders-view.js';
import { productionView } from '../src/js/views/production-view.js';
import { clientsView } from '../src/js/views/clients-view.js';
import { usersView } from '../src/js/views/users-view.js';
import { reportsView } from '../src/js/views/reports-view.js';
import { quoterView } from '../src/js/views/quoter-view.js';
import { profitabilityView } from '../src/js/views/profitability-view.js';
import { store } from '../src/js/store.js';

describe('Vistas Modulares SPA', () => {
  beforeEach(() => {
    store.clearUser();
  });

  describe('ordersView', () => {
    it('renderiza la vista para visitantes no autenticados por defecto con vista de cliente', () => {
      store.clearUser();
      const html = ordersView.render();
      expect(html).toContain('Portal de Clientes');
      expect(html).toContain('Mis Pedidos UV DTF');
    });

    it('renderiza la vista para clientes con título de portal de clientes', () => {
      store.setUser({ id: '1', role: 'CUSTOMER' }, 'tok');
      const html = ordersView.render();
      expect(html).toContain('Portal de Clientes');
      expect(html).toContain('Mis Pedidos UV DTF');
      expect(html).not.toContain('Gestión Operativa B2B');
    });

    it('renderiza la vista para staff (ADMIN/EMPLOYEE) con columnas operativas', () => {
      store.setUser({ id: '1', role: 'EMPLOYEE' }, 'tok');
      const html = ordersView.render();
      expect(html).toContain('Gestión Operativa B2B');
      expect(html).toContain('Control General de Pedidos');
      expect(html).toContain('Cliente');
    });
  });

  describe('productionView', () => {
    it('renderiza el tablero Kanban de producción con las 4 estaciones de trabajo', () => {
      const html = productionView.render();
      expect(html).toContain('Tablero de Producción — Impresora Audley');
      expect(html).toContain('1. En Cola Audley');
      expect(html).toContain('2. Imprimiendo UV');
      expect(html).toContain('3. Laminado y Corte');
      expect(html).toContain('4. Listo / Empaque');
    });
  });

  describe('clientsView', () => {
    it('renderiza el directorio B2B con tabla de clientes y botón de registro', () => {
      const html = clientsView.render();
      expect(html).toContain('Directorio de Clientes');
      expect(html).toContain('Cartera B2B');
      expect(html).toContain('Registrar Cliente');
      expect(html).toContain('NIT (SAT)');
    });
  });

  describe('usersView', () => {
    it('renderiza la administración de usuarios y permisos RBAC', () => {
      const html = usersView.render();
      expect(html).toContain('Administración de Usuarios');
      expect(html).toContain('Seguridad y Acceso RBAC');
      expect(html).toContain('Invitar Empleado');
      expect(html).toContain('Rol Asignado');
    });
  });

  describe('reportsView', () => {
    it('renderiza la interfaz de reportes con métricas y botones de exportación', () => {
      const html = reportsView.render();
      expect(html).toContain('Reportes y Analítica Comercial');
      expect(html).toContain('Bobina Audley 28cm');
      expect(html).toContain('btnExportOrdersCSV');
      expect(html).toContain('btnExportClientsCSV');
      expect(html).toContain('btnExportRollCSV');
    });
  });

  describe('profitabilityView', () => {
    it('renderiza la interfaz de costos industriales y rentabilidad unitaria', () => {
      const html = profitabilityView.render();
      expect(html).toContain('Costos y Rentabilidad Unitaria');
      expect(html).toContain('Simulador de Costo y Margen por Tiraje');
      expect(html).toContain('btnOpenCostsConfigModal');
      expect(html).toContain('costsConfigModal');
    });

    it('ejecuta onMount y retorna una función de limpieza (teardown)', () => {
      document.body.innerHTML = profitabilityView.render();
      expect(typeof profitabilityView.onMount).toBe('function');
      const cleanup = profitabilityView.onMount();
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });

  describe('quoterView', () => {
    it('renderiza la interfaz completa del cotizador con canvas y controles', () => {
      const html = quoterView.render();
      expect(html).toContain('rollCanvas');
      expect(html).toContain('stickerWidth');
      expect(html).toContain('stickerHeight');
      expect(html).toContain('stickerQty');
      expect(html).toContain('optCutting');
    });

    it('ejecuta onMount sin errores cuando el DOM contiene los elementos', () => {
      document.body.innerHTML = quoterView.render();
      expect(typeof quoterView.onMount).toBe('function');
      const cleanup = quoterView.onMount();
      if (typeof cleanup === 'function') {
        cleanup();
      }
    });
  });
});
