import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  REPORT_PERIODS,
  filterOrdersByPeriod,
  calculateCommercialReport,
  generateOrdersCSV,
  generateClientsPortfolioCSV,
  generateRollConsumptionCSV,
  downloadCSV,
} from '../src/js/modules/reports-engine.js';
import { ORDER_STATUS } from '../src/shared/business-config.js';
import { PAYMENT_STATUS } from '../src/js/modules/orders-store.js';

describe('Reports Engine — Cálculos Comerciales, Consumo Audley y Exportador CSV', () => {
  const refDate = new Date('2026-10-19T12:00:00Z');

  const mockOrders = [
    {
      id: 'KL-0001',
      createdAt: '2026-10-19T10:00:00Z', // Hoy
      customer: {
        clientId: 'CLI-001',
        name: 'Rodrigo Méndez',
        company: 'Café San Cristóbal',
        phone: '+502 5555-1234',
        nit: '7845129-4',
        address: 'San Cristóbal, Mixco',
      },
      items: [
        { title: 'Logo Tazas 5x5', qty: 100, widthCm: 5, heightCm: 5 },
        { title: 'Sticker Vaso', qty: 50, widthCm: 6, heightCm: 6 },
      ],
      metrics: {
        totalBillableMeters: 2.5,
        tierRate: 115.0,
        materialTotalQ: 287.5,
        cuttingTotalQ: 25.0,
        grandTotalQ: 312.5,
        hasCutting: true,
      },
      productionStatus: ORDER_STATUS.COMPLETED,
      paymentStatus: PAYMENT_STATUS.PAID,
      workshopNotes: 'Barniz con "relieve 3D", secado UV;\nEntrega urgente',
    },
    {
      id: 'KL-0002',
      createdAt: '2026-10-16T15:00:00Z', // Hace 3 días (esta semana, este mes)
      customer: {
        clientId: 'CLI-002',
        name: 'Alejandro Morales',
        company: 'Barbería Vintage',
        phone: '+502 5111-2233',
        nit: 'CF',
        address: 'Zona 1, Centro',
      },
      items: [
        { title: 'Logos Espejo', qty: 80, widthCm: 8, heightCm: 5 },
      ],
      metrics: {
        totalBillableMeters: 3.0,
        tierRate: 115.0,
        materialTotalQ: 345.0,
        cuttingTotalQ: 0.0,
        grandTotalQ: 345.0,
        hasCutting: false,
      },
      productionStatus: ORDER_STATUS.PRINTING,
      paymentStatus: PAYMENT_STATUS.PARTIAL,
      workshopNotes: '',
    },
    {
      id: 'KL-0003',
      createdAt: '2026-10-02T11:00:00Z', // Hace 17 días (este mes, últimos 30 días)
      customer: {
        clientId: null,
        name: 'Claudia Ramos',
        company: 'Emprende Pack GT',
        phone: '+502 4444-9988',
        nit: '1238974-5',
        address: 'Zona 10',
      },
      items: [
        { title: 'Empaques Lujo', qty: 200, widthCm: 4, heightCm: 4 },
      ],
      metrics: {
        totalBillableMeters: 1.5,
        tierRate: 115.0,
        materialTotalQ: 172.5,
        cuttingTotalQ: 0.0,
        grandTotalQ: 172.5,
        hasCutting: false,
      },
      productionStatus: ORDER_STATUS.IN_AUDLEY_QUEUE,
      paymentStatus: PAYMENT_STATUS.PENDING,
      workshopNotes: 'En bobina continua',
    },
    {
      id: 'KL-0004',
      createdAt: '2026-08-15T09:00:00Z', // Hace 2 meses (fuera de mes y 30 días)
      customer: {
        clientId: 'CLI-001',
        name: 'Rodrigo Méndez',
        company: 'Café San Cristóbal',
        phone: '+502 5555-1234',
        nit: '7845129-4',
        address: 'San Cristóbal, Mixco',
      },
      items: [
        { title: 'Prueba Logo', qty: 20, widthCm: 5, heightCm: 5 },
      ],
      metrics: {
        totalBillableMeters: 1.0,
        tierRate: 140.0,
        materialTotalQ: 140.0,
        cuttingTotalQ: 0.0,
        grandTotalQ: 140.0,
        hasCutting: false,
      },
      productionStatus: ORDER_STATUS.CANCELLED,
      paymentStatus: PAYMENT_STATUS.CANCELLED,
      workshopNotes: 'Cancelado por diseño incorrecto',
    },
  ];

  const mockClients = [
    {
      id: 'CLI-001',
      company: 'Café San Cristóbal',
      name: 'Rodrigo Méndez',
      phone: '+502 5555-1234',
      nit: '7845129-4',
      email: 'rodrigo@cafesancristobal.gt',
      address: 'San Cristóbal, Mixco',
      category: 'RESTAURANTES_CAFES',
      tier: 'VIP',
    },
    {
      id: 'CLI-002',
      company: 'Barbería Vintage',
      name: 'Alejandro Morales',
      phone: '+502 5111-2233',
      nit: 'CF',
      email: 'contacto@barberiavintage.com',
      address: 'Zona 1, Centro',
      category: 'BARBERIAS_ESTETICA',
      tier: 'RECURRENTE',
    },
    {
      id: 'CLI-003',
      company: 'Emprende Pack GT',
      name: 'Claudia Ramos',
      phone: '+502 4444-9988',
      nit: '1238974-5',
      email: 'info@emprendepack.gt',
      address: 'Zona 10',
      category: 'PROMOCIONALES_MERCH',
      tier: 'NUEVO',
    },
    {
      id: 'CLI-004',
      company: 'Cliente Sin Pedidos',
      name: 'Juan Perez',
      phone: '+502 5000-0000',
      nit: 'CF',
      email: 'juan@test.com',
      address: 'Zona 1',
      category: 'OTRO_CUSTOM',
      tier: 'CUSTOM_TIER',
    },
  ];

  describe('Filtro de Órdenes por Período (filterOrdersByPeriod)', () => {
    it('retorna todas las órdenes cuando el período es ALL', () => {
      const result = filterOrdersByPeriod(mockOrders, 'ALL', refDate);
      expect(result.length).toBe(4);
    });

    it('filtra órdenes creadas en TODAY (mismo día de referencia)', () => {
      const result = filterOrdersByPeriod(mockOrders, 'TODAY', refDate);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('KL-0001');
    });

    it('filtra órdenes de THIS_WEEK (últimos 7 días)', () => {
      const result = filterOrdersByPeriod(mockOrders, 'THIS_WEEK', refDate);
      expect(result.length).toBe(2);
      expect(result.map(o => o.id)).toEqual(['KL-0001', 'KL-0002']);
    });

    it('filtra órdenes de THIS_MONTH (mes actual de referencia)', () => {
      const result = filterOrdersByPeriod(mockOrders, 'THIS_MONTH', refDate);
      expect(result.length).toBe(3);
      expect(result.map(o => o.id)).toEqual(['KL-0001', 'KL-0002', 'KL-0003']);
    });

    it('filtra órdenes de LAST_30_DAYS (últimos 30 días)', () => {
      const result = filterOrdersByPeriod(mockOrders, 'LAST_30_DAYS', refDate);
      expect(result.length).toBe(3);
    });

    it('maneja entradas inválidas, arreglos vacíos y fechas mal formateadas', () => {
      expect(filterOrdersByPeriod(null)).toEqual([]);
      expect(filterOrdersByPeriod([])).toEqual([]);
      const dirty = [
        { id: 'BAD-1', createdAt: 'fecha-invalida' },
        null,
        { id: 'NO-DATE' },
        { id: 'BAD-2', createdAt: null },
      ];
      expect(filterOrdersByPeriod(dirty, 'TODAY', refDate)).toEqual([]);
      expect(filterOrdersByPeriod(mockOrders, 'DESCONOCIDO', refDate).length).toBe(4);
    });
  });

  describe('Cálculo Consolidado de Métricas (calculateCommercialReport)', () => {
    it('calcula métricas financieras exactas ignorando pedidos cancelados', () => {
      const report = calculateCommercialReport(mockOrders, mockClients, 'ALL', refDate);

      // Órdenes activas: KL-0001 (Q312.50), KL-0002 (Q345.00), KL-0003 (Q172.50) = Q830.00
      expect(report.financials.grossRevenueQ).toBe(830.0);

      // Pagado: KL-0001 (100% = Q312.50) + KL-0002 (50% = Q172.50) = Q485.00
      expect(report.financials.paidRevenueQ).toBe(485.0);

      // Pendiente: KL-0002 (50% = Q172.50) + KL-0003 (100% = Q172.50) = Q345.00
      expect(report.financials.pendingDebtQ).toBe(345.0);

      // Efectividad de cobro: 485 / 830 = ~58%
      expect(report.financials.collectionRatePercent).toBe(58);

      // Ticket promedio: Q830 / 3 órdenes activas = Q276.67
      expect(report.financials.averageTicketQ).toBeCloseTo(276.67, 1);

      // Corte opcional: Q25.00
      expect(report.financials.cuttingRevenueQ).toBe(25.0);
    });

    it('calcula métricas industriales de bobina Audley (Film A, Film B, Tinta UV)', () => {
      const report = calculateCommercialReport(mockOrders, mockClients, 'ALL', refDate);

      // Metros activos: 2.5 + 3.0 + 1.5 = 7.0 metros
      expect(report.audleyRoll.totalMeters).toBe(7.0);
      expect(report.audleyRoll.completedMeters).toBe(2.5);
      expect(report.audleyRoll.inQueueMeters).toBe(4.5);

      // Bobinas equivalentes de 100m: 7.0 / 100 = 0.07
      expect(report.audleyRoll.rollsEquivalent100m).toBe(0.07);

      // Film A (1.05x): 7.35m
      expect(report.audleyRoll.estimatedFilmAMeters).toBeCloseTo(7.35, 2);

      // Film B (1.02x): 7.14m
      expect(report.audleyRoll.estimatedFilmBMeters).toBeCloseTo(7.14, 2);

      // Tinta UV (0.015 L/m): 0.105 L
      expect(report.audleyRoll.estimatedInkLiters).toBeCloseTo(0.105, 3);

      // Stickers producidos: (100 + 50) + 80 + 200 = 430 piezas
      expect(report.audleyRoll.totalStickersCount).toBe(430);
    });

    it('calcula fidelización de cartera B2B y meta de clientes', () => {
      const report = calculateCommercialReport(mockOrders, mockClients, 'ALL', refDate);

      expect(report.b2bPortfolio.totalClients).toBe(4);
      // Clientes VIP y RECURRENTE: CLI-001 (VIP), CLI-002 (RECURRENTE) = 2
      expect(report.b2bPortfolio.activeRecurringClients).toBe(2);
      expect(report.b2bPortfolio.targetClients).toBe(25);
      // Meta: 2 / 25 = 8%
      expect(report.b2bPortfolio.goalProgressPercent).toBe(8);

      // Ranking de clientes
      const ranking = report.b2bPortfolio.topClientsRanking;
      expect(ranking.length).toBe(3);
      // Barbería Vintage gastó Q345, Café San Cristóbal Q312.50
      expect(ranking[0].company).toBe('Barbería Vintage');
      expect(ranking[0].totalSpentQ).toBe(345.0);
      expect(ranking[0].rank).toBe(1);

      expect(ranking[1].company).toBe('Café San Cristóbal');
      expect(ranking[1].totalSpentQ).toBe(312.5);
      expect(ranking[1].rank).toBe(2);

      // Emprende Pack GT (asociado por nombre) gastó Q172.50
      expect(ranking[2].company).toBe('Emprende Pack GT');
      expect(ranking[2].totalSpentQ).toBe(172.5);
    });

    it('correlaciona órdenes por nombre de contacto cuando la empresa no coincide', () => {
      const orderByName = [
        {
          id: 'KL-999',
          createdAt: '2026-10-19T10:00:00Z',
          customer: {
            clientId: null,
            name: 'Alejandro Morales',
            company: 'Diferente Nombre',
            phone: '+502 5111-2233',
          },
          metrics: { grandTotalQ: 100, totalBillableMeters: 1 },
          productionStatus: ORDER_STATUS.PRINTING,
          paymentStatus: PAYMENT_STATUS.PAID,
        },
      ];
      const rep = calculateCommercialReport(orderByName, mockClients, 'ALL', refDate);
      expect(rep.b2bPortfolio.topClientsRanking[0].id).toBe('CLI-002');
      expect(rep.b2bPortfolio.topClientsRanking[0].totalSpentQ).toBe(100);
    });

    it('ignora órdenes de clientes walk-in que no existen en la cartera registrada', () => {
      const walkInOrders = [
        {
          id: 'KL-WALK',
          createdAt: '2026-10-19T10:00:00Z',
          customer: { clientId: 'NON-EXISTENT', name: 'Desconocido', company: 'Inexistente S.A.' },
          metrics: { grandTotalQ: 200, totalBillableMeters: 2 },
          productionStatus: ORDER_STATUS.PRINTING,
          paymentStatus: PAYMENT_STATUS.PENDING,
        },
      ];
      const rep = calculateCommercialReport(walkInOrders, mockClients, 'ALL', refDate);
      expect(rep.financials.grossRevenueQ).toBe(200);
      // El cliente no estaba en mockClients, así que ranking no lo incluye
      expect(rep.b2bPortfolio.topClientsRanking.length).toBe(0);
    });

    it('maneja listas vacías y reporte sin órdenes', () => {
      const report = calculateCommercialReport([], [], 'ALL', refDate);
      expect(report.financials.grossRevenueQ).toBe(0);
      expect(report.financials.paidRevenueQ).toBe(0);
      expect(report.financials.collectionRatePercent).toBe(0);
      expect(report.financials.averageTicketQ).toBe(0);
      expect(report.audleyRoll.totalMeters).toBe(0);
      expect(report.b2bPortfolio.topClientsRanking).toEqual([]);
    });

    it('maneja órdenes con campos undefined o estructuras mínimas', () => {
      const sparseOrders = [
        {
          id: 'KL-MIN',
          createdAt: '2026-10-19T10:00:00Z',
          // Sin customer, sin metrics, sin items
        },
      ];
      const report = calculateCommercialReport(sparseOrders, [], 'ALL', refDate);
      expect(report.financials.grossRevenueQ).toBe(0);
      expect(report.audleyRoll.totalStickersCount).toBe(0);
    });
  });

  describe('Generador de CSV de Pedidos (generateOrdersCSV)', () => {
    it('genera archivo CSV con cabecera UTF-8 BOM y datos formateados', () => {
      const csv = generateOrdersCSV(mockOrders);

      // Verificar BOM UTF-8
      expect(csv.startsWith('\uFEFF')).toBe(true);

      // Encabezados
      expect(csv).toContain('"No. Pedido"');
      expect(csv).toContain('"Metros Facturables (m)"');
      expect(csv).toContain('"Total (Q)"');

      // Filas y escape de comillas/saltos
      expect(csv).toContain('"KL-0001"');
      expect(csv).toContain('"Café San Cristóbal"');
      expect(csv).toContain('"312.50"');
      expect(csv).toContain('"SI"'); // Tiene corte
      expect(csv).toContain('""relieve 3D""'); // Comillas escapadas
    });

    it('maneja pedidos con campos nulos o vacíos', () => {
      const sparse = [{ id: null, createdAt: null, customer: null, metrics: null }];
      const csv = generateOrdersCSV(sparse);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('"0.00"');
      expect(csv).toContain('"NO"');
    });
  });

  describe('Generador de CSV de Cartera de Clientes B2B (generateClientsPortfolioCSV)', () => {
    it('genera archivo CSV con resumen por cliente, metraje y saldo pendiente', () => {
      const csv = generateClientsPortfolioCSV(mockClients, mockOrders);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('"ID Cliente"');
      expect(csv).toContain('"Metros Acumulados (m)"');
      expect(csv).toContain('"Total Facturado (Q)"');

      expect(csv).toContain('"CLI-001"');
      expect(csv).toContain('"Café San Cristóbal"');
      expect(csv).toContain('"VIP (Alto Volumen)"');
      expect(csv).toContain('"CLI-004"'); // Cliente sin órdenes
    });
  });

  describe('Generador de CSV de Consumo de Bobina Audley (generateRollConsumptionCSV)', () => {
    it('genera archivo CSV con estimación de Film A, Film B y tinta UV', () => {
      const csv = generateRollConsumptionCSV(mockOrders);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('"Metros Bobina 28cm (m)"');
      expect(csv).toContain('"Film A Estimado (m)"');
      expect(csv).toContain('"Film B Estimado (m)"');
      expect(csv).toContain('"Tinta UV Est. (ml)"');

      // No incluye el pedido cancelado KL-0004
      expect(csv).not.toContain('"KL-0004"');
      expect(csv).toContain('"KL-0001"');
      expect(csv).toContain('"Corte Perimetral"');
      expect(csv).toContain('"Rollo Continuo"');
    });

    it('maneja órdenes sin items ni customer', () => {
      const emptyOrder = [{ id: 'KL-EMPTY', createdAt: null }];
      const csv = generateRollConsumptionCSV(emptyOrder);
      expect(csv).toContain('"KL-EMPTY"');
      expect(csv).toContain('"Stickers UV DTF"');
    });
  });

  describe('Función de Descarga en Navegador (downloadCSV)', () => {
    let originalURL;

    beforeEach(() => {
      originalURL = window.URL;
      window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test-uuid');
      window.URL.revokeObjectURL = vi.fn();
    });

    afterEach(() => {
      window.URL = originalURL;
    });

    it('crea un elemento anchor y descarga el archivo correctamente', () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const result = downloadCSV('test.csv', 'col1,col2\nval1,val2');

      expect(result).toBe(true);
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).toHaveBeenCalled();

      clickSpy.mockRestore();
    });

    it('retorna false si ocurre un error o createObjectURL no está disponible', () => {
      window.URL.createObjectURL = null;
      const result = downloadCSV('test.csv', 'data');
      expect(result).toBe(false);
    });

    it('captura excepciones y retorna false cuando la descarga falla', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      window.URL.createObjectURL = vi.fn(() => {
        throw new Error('Disk quota exceeded');
      });

      const result = downloadCSV('test.csv', 'data');
      expect(result).toBe(false);
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });
});
