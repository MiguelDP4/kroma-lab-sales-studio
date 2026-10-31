/**
 * Almacén Reactivo de Cotizaciones Guardadas y Conversión a Orden (QuotesStore)
 * Administra presupuestos UV DTF por metro lineal para clientes B2B y maquila de taller,
 * permitiendo persistencia local, sincronización con backend REST y conversión directa
 * a órdenes de producción en 1 clic.
 */

import { apiClient } from './api-client.js';
import { ordersStore } from './orders-store.js';
import { mapOrderItem, cleanOrderItemForApi } from './order-item.js';
import { store } from '../store.js';

const IS_TEST_ENV = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

const STORAGE_KEY_QUOTES = 'kromalab_quotes';

export const INITIAL_SEED_QUOTES = [
  {
    id: 'qt_001',
    localCreated: true,
    code: 'COT-2026-001',
    projectName: 'Stickers Termos Stanley 8x5cm',
    leadName: 'Rodrigo Méndez',
    leadPhone: '+502 5555-1234',
    leadEmail: 'rodrigo@promoguate.gt',
    companyName: 'Café San Cristóbal',
    widthCm: 8.0,
    heightCm: 5.0,
    qty: 120,
    linearMeters: 2.0,
    stickersPerRow: 3,
    rows: 40,
    unitRateQ: 130.0,
    materialPriceQ: 260.0,
    cuttingPriceQ: 36.0,
    totalPriceQ: 296.0,
    withCutting: true,
    finishType: 'GLOSSY_VARNISH',
    status: 'SAVED',
    convertedOrderId: null,
    convertedOrderCode: null,
    notes: 'Barniz con relieve 3D sobre isotipo central. Entrega en Zona 10.',
    source: 'web',
    createdAt: '2026-10-18T10:30:00.000Z',
    updatedAt: '2026-10-18T10:30:00.000Z',
  },
  {
    id: 'qt_002',
    localCreated: true,
    code: 'COT-2026-002',
    projectName: 'Logos Acrílico 5x5cm (Maquila)',
    leadName: 'Ana Lucía Gómez',
    leadPhone: '+502 5555-0404',
    leadEmail: 'ana.diseno@kromalab.gt',
    companyName: 'Arte Modelo Dubois',
    widthCm: 5.0,
    heightCm: 5.0,
    qty: 250,
    linearMeters: 2.5,
    stickersPerRow: 5,
    rows: 50,
    unitRateQ: 120.0,
    materialPriceQ: 300.0,
    cuttingPriceQ: 0.0,
    totalPriceQ: 300.0,
    withCutting: false,
    finishType: 'GLOSSY_VARNISH',
    status: 'CONVERTED',
    convertedOrderId: 'ord_001',
    convertedOrderCode: 'KL-2026-001',
    notes: 'Rollo continuo para corte manual en taller con guillotina.',
    source: 'direct',
    createdAt: '2026-10-17T14:15:00.000Z',
    updatedAt: '2026-10-17T16:00:00.000Z',
  },
  {
    id: 'qt_003',
    localCreated: true,
    code: 'COT-2026-003',
    projectName: 'Etiquetas Botellas 4x4cm',
    leadName: 'Carlos Morales',
    leadPhone: '+502 5555-0202',
    leadEmail: 'carlos.taller@kromalab.gt',
    companyName: 'Barbería & Estilo Villa Nueva',
    widthCm: 4.0,
    heightCm: 4.0,
    qty: 180,
    linearMeters: 1.5,
    stickersPerRow: 6,
    rows: 30,
    unitRateQ: 130.0,
    materialPriceQ: 195.0,
    cuttingPriceQ: 54.0,
    totalPriceQ: 249.0,
    withCutting: true,
    finishType: 'GLOSSY_VARNISH',
    status: 'SAVED',
    convertedOrderId: null,
    convertedOrderCode: null,
    notes: 'Impresión de alta densidad con cama blanca reforzada.',
    source: 'whatsapp',
    createdAt: '2026-10-19T09:45:00.000Z',
    updatedAt: '2026-10-19T09:45:00.000Z',
  },
];

class QuotesStore {
  constructor() {
    this.quotes = [];
    this.listeners = new Set();
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_QUOTES);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            if (!IS_TEST_ENV) {
              const testEmails = [
                'rodrigo@promoguate.gt',
                'carlos@rivera.gt',
                'maria@mielgt.com',
                'admin@kromalab.gt',
                'testadmin@kromalab.gt',
                'taller@kromalab.gt',
                'carlos.taller@kromalab.gt',
                'sofia.ventas@kromalab.gt',
              ];
              const testNames = [
                'Carlos Test',
                'Administrador QA',
                'Juanito unpajote menchaca',
                'asdf',
                'Cliente Bobina',
                'Cliente WhatsApp',
              ];
              const clean = parsed.filter(q => {
                if (['qt_001', 'qt_002', 'qt_003'].includes(q.id)) return false;
                if (q.leadEmail && testEmails.includes(q.leadEmail.toLowerCase())) return false;
                if (q.leadName && testNames.includes(q.leadName)) return false;
                return true;
              });
              this.quotes = clean;
              this.saveToStorage();
              return;
            }
            if (parsed.length > 0) {
              this.quotes = parsed;
              return;
            }
          }
        }
      }
    } catch (_) {}
    this.quotes = IS_TEST_ENV ? JSON.parse(JSON.stringify(INITIAL_SEED_QUOTES)) : [];
    if (IS_TEST_ENV) {
      this.saveToStorage();
    }
  }

  saveToStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_QUOTES, JSON.stringify(this.quotes));
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
        listener(this.quotes);
      } catch (_) {}
    }
  }

  getQuotes() {
    const user = (typeof store !== 'undefined' && store?.state?.user) ? store.state.user : null;
    const role = user?.role || (IS_TEST_ENV && !user ? 'STAFF_TEST' : 'VISITOR');

    // 1. Administrador o Personal de taller (Staff): pueden ver todas las cotizaciones
    if (role === 'ADMIN' || role === 'EMPLOYEE' || role === 'STAFF_TEST') {
      return [...this.quotes];
    }

    // 2. Cliente Registrado: solo ve sus cotizaciones (por leadEmail o creadas por él)
    if (role === 'CUSTOMER' && user?.email) {
      const userEmail = user.email.toLowerCase();
      return this.quotes.filter(q => {
        if (q.leadEmail && q.leadEmail.toLowerCase() === userEmail) return true;
        if (!q.leadEmail && q.localCreated) return true;
        return false;
      });
    }

    // 3. Usuario Sin Cuenta (VISITOR): solo ve las cotizaciones creadas localmente en este dispositivo
    return this.quotes.filter(q => {
      if (q.localCreated) return true;
      if (!q.backendId && (!q.leadEmail || q.leadEmail === '')) return true;
      return false;
    });
  }

  getQuoteById(id) {
    if (!id) return null;
    return this.quotes.find(q => q.id === id || q.code === id || q.backendId === id) || null;
  }

  _mapBackendQuote(q) {
    return {
      id: q.id,
      backendId: q.id,
      code: q.code || `COT-2026-${String(Math.floor(Math.random() * 900 + 100))}`,
      projectName: q.projectName || `Cotización ${q.widthCm}x${q.heightCm} cm`,
      leadName: q.leadName || 'Cliente Cotización',
      leadPhone: q.leadPhone || '',
      leadEmail: q.leadEmail || '',
      companyName: q.companyName || '',
      widthCm: Number(q.widthCm),
      heightCm: Number(q.heightCm),
      qty: Number(q.qty),
      linearMeters: Number(q.linearMeters),
      stickersPerRow: Number(q.stickersPerRow || 1),
      rows: Number(q.rows || 1),
      unitRateQ: Number(q.unitRateQ || 140),
      materialPriceQ: Number(q.materialPriceQ || 0),
      cuttingPriceQ: Number(q.cuttingPriceQ || 0),
      totalPriceQ: Number(q.totalPriceQ || 0),
      withCutting: Boolean(q.withCutting),
      finishType: q.finishType || 'GLOSSY_VARNISH',
      status: q.status || 'SAVED',
      convertedOrderId: q.convertedOrderId || null,
      convertedOrderCode: q.convertedOrderCode || null,
      notes: q.notes || '',
      source: q.source || 'web',
      fileUrl: q.fileUrl || (this.quotes?.find(local => local.id === q.id || local.backendId === q.id || local.code === q.code)?.fileUrl) || null,
      fileName: q.fileName || (this.quotes?.find(local => local.id === q.id || local.backendId === q.id || local.code === q.code)?.fileName) || null,
      fileSizeBytes: q.fileSizeBytes || (this.quotes?.find(local => local.id === q.id || local.backendId === q.id || local.code === q.code)?.fileSizeBytes) || null,
      previewUrl: q.fileUrl || (this.quotes?.find(local => local.id === q.id || local.backendId === q.id || local.code === q.code)?.previewUrl) || (this.quotes?.find(local => local.id === q.id || local.backendId === q.id || local.code === q.code)?.fileUrl) || null,
      canvasSnapshot: q.canvasSnapshot || (this.quotes?.find(local => local.id === q.id || local.backendId === q.id || local.code === q.code)?.canvasSnapshot) || null,
      canvasSnapshotUrl: (q.canvasSnapshot && !q.canvasSnapshot.startsWith('data:') ? q.canvasSnapshot : null) || (this.quotes?.find(local => local.id === q.id || local.backendId === q.id || local.code === q.code)?.canvasSnapshotUrl) || null,
      rotationDeg: q.rotationDeg !== undefined && q.rotationDeg !== null ? Number(q.rotationDeg) : ((this.quotes?.find(local => local.id === q.id || local.backendId === q.id || local.code === q.code)?.rotationDeg) || 0),
      items: (() => {
        if (Array.isArray(q.items) && q.items.length > 0) {
          return q.items.map(it => mapOrderItem(it));
        }
        const local = this.quotes?.find(l => l.id === q.id || l.backendId === q.id || l.code === q.code);
        if (local?.items && Array.isArray(local.items) && local.items.length > 0) {
          return local.items.map(it => mapOrderItem(it));
        }
        if (q.notes && q.notes.includes('<!-- ITEMS_JSON:')) {
          try {
            const match = q.notes.match(/<!-- ITEMS_JSON:\s*(\[.*?\])\s*-->/s);
            if (match && match[1]) return JSON.parse(match[1]).map(it => mapOrderItem(it));
          } catch (_) {}
        }
        return [mapOrderItem({
          id: `item_${q.id || '0'}`,
          title: q.projectName || `Cotización ${q.widthCm}x${q.heightCm} cm`,
          widthCm: Number(q.widthCm),
          heightCm: Number(q.heightCm),
          qty: Number(q.qty),
          actualLinearMeters: Number(q.linearMeters),
          stickersPerRow: Number(q.stickersPerRow || 1),
          rows: Number(q.rows || 1),
          includeCutting: Boolean(q.withCutting),
          fileUrl: q.fileUrl || local?.fileUrl || null,
          fileName: q.fileName || local?.fileName || null,
          previewUrl: q.fileUrl || local?.previewUrl || null,
          canvasSnapshot: q.canvasSnapshot || local?.canvasSnapshot || null,
          canvasSnapshotUrl: (q.canvasSnapshot && !q.canvasSnapshot.startsWith('data:') ? q.canvasSnapshot : null) || local?.canvasSnapshotUrl || null,
          rotationDeg: q.rotationDeg || local?.rotationDeg || 0,
        })];
      })(),
      createdAt: q.createdAt,
      updatedAt: q.updatedAt || q.createdAt,
    };
  }

  async syncWithApi() {
    try {
      if (typeof apiClient !== 'undefined' && apiClient.quotes) {
        // Visitantes sin sesión iniciada no sincronizan cotizaciones del servidor
        if (!apiClient.token && !IS_TEST_ENV) {
          return this.getQuotes();
        }
        const res = await apiClient.quotes.list();
        if (res && res.success && Array.isArray(res.quotes)) {
          const apiQuotes = res.quotes.map(q => this._mapBackendQuote(q));
          const apiIds = new Set(apiQuotes.map(q => q.id));
          const apiCodes = new Set(apiQuotes.map(q => q.code));
          const localOnly = this.quotes.filter(q => !q.backendId && !apiIds.has(q.id) && !apiCodes.has(q.code));
          this.quotes = [...apiQuotes, ...localOnly];
          this.saveToStorage();
          this.notify();
          return this.getQuotes();
        }
      }
    } catch (err) {
      console.warn('[QuotesStore] Sincronización API no disponible:', err?.message || err);
    }
    return this.getQuotes();
  }

  createQuote(data) {
    const leadName = data?.leadName?.trim() || 'Cliente Cotización';
    const leadPhone = data?.leadPhone?.trim() || '';
    let leadEmail = data?.leadEmail?.trim()?.toLowerCase() || '';
    const companyName = data?.companyName?.trim() || '';
    const widthCm = Number(data?.widthCm) || 5;
    const heightCm = Number(data?.heightCm) || 5;
    const qty = Number(data?.qty) || 50;
    const linearMeters = Number(data?.linearMeters) || 1.0;
    const stickersPerRow = Number(data?.stickersPerRow) || 1;
    const rows = Number(data?.rows) || 1;
    const unitRateQ = Number(data?.unitRateQ) || 140.0;
    const materialPriceQ = Number(data?.materialPriceQ) || (linearMeters * unitRateQ);
    const cuttingPriceQ = Number(data?.cuttingPriceQ) || 0;
    const totalPriceQ = Number(data?.totalPriceQ) || (materialPriceQ + cuttingPriceQ);
    const withCutting = Boolean(data?.withCutting);
    const finishType = data?.finishType || 'GLOSSY_VARNISH';
    const notes = data?.notes?.trim() || '';
    const source = data?.source || 'web';

    // Autoasignar correo si el usuario activo es CUSTOMER y no se ingresó otro correo
    const activeUser = (typeof store !== 'undefined' && store?.state?.user) ? store.state.user : null;
    if (!leadEmail && activeUser?.role === 'CUSTOMER' && activeUser?.email) {
      leadEmail = activeUser.email.toLowerCase();
    }

    const projectName = data?.projectName?.trim() || `Cotización ${widthCm}×${heightCm} cm (${qty} pcs)`;
    const fileUrl = data?.fileUrl || null;
    const fileKey = data?.fileKey || null;
    const fileName = data?.fileName || null;
    const fileSizeBytes = data?.fileSizeBytes ? Number(data.fileSizeBytes) : null;
    const provider = data?.provider || (fileUrl ? 'cloudflare-r2' : (fileKey ? 'cloudflare-r2' : null));
    const canvasSnapshot = data?.canvasSnapshot || null;
    const canvasSnapshotUrl = data?.canvasSnapshotUrl || (canvasSnapshot && !canvasSnapshot.startsWith('data:') ? canvasSnapshot : null) || null;
    const rotationDeg = Number(data?.rotationDeg) || 0;

    let quoteItems = [];
    if (Array.isArray(data?.items) && data.items.length > 0) {
      quoteItems = data.items.map((it, idx) => mapOrderItem({
        ...it,
        id: it.id || `item_${Date.now()}_${idx}`,
        title: it.title || `Diseño #${idx + 1}`,
      }));
    } else {
      quoteItems = [mapOrderItem({
        id: `item_${Date.now()}_0`,
        title: projectName,
        widthCm,
        heightCm,
        qty,
        includeCutting: withCutting,
        actualLinearMeters: linearMeters,
        stickersPerRow,
        rows,
        fileInfo: fileUrl || fileName ? { name: fileName || 'diseño.png', fileUrl, size: fileSizeBytes || 0 } : null,
        fileUrl,
        fileName,
        fileSizeBytes,
        previewUrl: data?.previewUrl || fileUrl || null,
        canvasSnapshot,
        canvasSnapshotUrl,
        rotationDeg,
      })];
    }

    const count = this.quotes.length + 1;
    const code = `COT-2026-${String(count).padStart(3, '0')}`;
    const id = `qt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    const newQuote = {
      id,
      code,
      localCreated: true,
      projectName,
      leadName,
      leadPhone,
      leadEmail,
      companyName,
      widthCm,
      heightCm,
      qty,
      linearMeters,
      stickersPerRow,
      rows,
      unitRateQ,
      materialPriceQ,
      cuttingPriceQ,
      totalPriceQ,
      withCutting,
      finishType,
      status: 'SAVED',
      convertedOrderId: null,
      convertedOrderCode: null,
      notes,
      source,
      fileUrl,
      fileKey,
      fileName,
      fileSizeBytes,
      previewUrl: data?.previewUrl || fileUrl || null,
      provider,
      canvasSnapshot,
      canvasSnapshotUrl,
      rotationDeg,
      items: quoteItems,
      createdAt: now,
      updatedAt: now,
    };

    this.quotes.unshift(newQuote);
    this.saveToStorage();
    this.notify();

    // Sincronizar creación con Backend API si está disponible
    if (typeof apiClient !== 'undefined' && apiClient.quotes) {
      const cleanItems = quoteItems.map(it => cleanOrderItemForApi(it));

      apiClient.quotes.create({
        projectName,
        leadName,
        leadPhone,
        leadEmail,
        companyName,
        widthCm,
        heightCm,
        qty,
        linearMeters,
        stickersPerRow,
        rows,
        unitRateQ,
        materialPriceQ,
        cuttingPriceQ,
        totalPriceQ,
        withCutting,
        finishType,
        source,
        fileUrl,
        fileName,
        fileSizeBytes,
        items: cleanItems,
      }).then(res => {
        if (res && res.quote) {
          newQuote.backendId = res.quote.id;
          if (res.quote.code) newQuote.code = res.quote.code;
          if (Array.isArray(res.quote.items) && res.quote.items.length > 0) {
            newQuote.items = res.quote.items.map(it => mapOrderItem(it));
          }
          this.saveToStorage();
          this.notify();
        }
      }).catch(err => {
        console.warn('[QuotesStore] Guardado en backend no disponible:', err?.message || err);
      });
    }

    return newQuote;
  }

  updateQuote(id, updates) {
    const quote = this.getQuoteById(id);
    if (!quote) {
      throw new Error(`Cotización no encontrada con ID: ${id}`);
    }

    const index = this.quotes.findIndex(q => q.id === quote.id);
    const updated = {
      ...quote,
      ...updates,
      id: quote.id,
      code: quote.code,
      updatedAt: new Date().toISOString(),
    };

    if (updates.projectName) updated.projectName = updates.projectName.trim();
    if (updates.leadName) updated.leadName = updates.leadName.trim();
    if (updates.leadPhone) updated.leadPhone = updates.leadPhone.trim();
    if (updates.companyName !== undefined) updated.companyName = updates.companyName.trim();
    if (updates.notes !== undefined) updated.notes = updates.notes.trim();

    this.quotes[index] = updated;
    this.saveToStorage();
    this.notify();

    if (typeof apiClient !== 'undefined' && apiClient.quotes) {
      const targetId = quote.backendId || quote.id;
      apiClient.quotes.update(targetId, updates).catch(err => {
        console.warn('[QuotesStore] Actualización en backend no disponible:', err?.message || err);
      });
    }

    return updated;
  }

  deleteQuote(id) {
    const quote = this.getQuoteById(id);
    if (!quote) {
      throw new Error(`Cotización no encontrada con ID: ${id}`);
    }

    this.quotes = this.quotes.filter(q => q.id !== quote.id);
    this.saveToStorage();
    this.notify();

    if (typeof apiClient !== 'undefined' && apiClient.quotes) {
      const targetId = quote.backendId || quote.id;
      apiClient.quotes.delete(targetId).catch(err => {
        console.warn('[QuotesStore] Eliminación en backend no disponible:', err?.message || err);
      });
    }

    return true;
  }

  async convertToOrder(id) {
    const quote = this.getQuoteById(id);
    if (!quote) {
      throw new Error(`Cotización no encontrada con ID: ${id}`);
    }

    // 1. Intentar conversión oficial en Backend API si está disponible
    if (typeof apiClient !== 'undefined' && apiClient.quotes) {
      try {
        const targetId = quote.backendId || quote.id;
        const hasCustomItems = Array.isArray(quote.items) && quote.items.length > 0;
        const res = hasCustomItems
          ? await apiClient.quotes.convertToOrder(targetId, { items: quote.items.map(it => cleanOrderItemForApi(it)) })
          : await apiClient.quotes.convertToOrder(targetId);
        if (res && res.success && res.order) {
          quote.status = 'CONVERTED';
          quote.convertedOrderId = res.order.id;
          quote.convertedOrderCode = res.order.code;
          quote.updatedAt = new Date().toISOString();
          this.saveToStorage();
          this.notify();

          // Sincronizar ordersStore para que la orden aparezca en producción de inmediato
          if (typeof ordersStore !== 'undefined') {
            const mapped = ordersStore._mapBackendOrder(res.order);
            const idx = ordersStore.orders.findIndex(o => o.id === mapped.id || o.backendId === mapped.backendId);
            if (idx >= 0) {
              ordersStore.orders[idx] = mapped;
            } else {
              ordersStore.orders.unshift(mapped);
            }
            ordersStore._saveOrders();
            ordersStore._notify();
            ordersStore.syncWithApi().catch(() => {});
          }

          return {
            success: true,
            order: res.order,
            quote,
            message: `¡Cotización ${quote.code} convertida en orden de producción ${res.order.code}!`,
          };
        }
      } catch (err) {
        console.warn('[QuotesStore] Conversión vía API falló, procediendo con conversión local:', err?.message || err);
      }
    }

    // 2. Conversión local / fallback inmediato en ordersStore
    const newOrder = ordersStore.createOrder({
      customer: {
        name: quote.leadName || 'Cliente Cotización',
        phone: quote.leadPhone || '+502 0000-0000',
        email: quote.leadEmail,
        company: quote.companyName || '',
        address: 'Dirección de Entrega',
      },
      cartTotals: {
        totalBillableMeters: quote.linearMeters,
        tierRate: quote.unitRateQ,
        materialTotalQ: quote.materialPriceQ,
        cuttingTotalQ: quote.cuttingPriceQ,
        grandTotalQ: quote.totalPriceQ,
        hasCutting: quote.withCutting,
        canvasSnapshot: quote.canvasSnapshot || null,
        rotationDeg: quote.rotationDeg || 0,
      },
      items: (quote.items && quote.items.length > 0) ? quote.items.map(it => mapOrderItem(it)) : [{
        title: quote.projectName,
        widthCm: quote.widthCm,
        heightCm: quote.heightCm,
        qty: quote.qty,
        actualLinearMeters: quote.linearMeters,
        stickersPerRow: quote.stickersPerRow,
        rows: quote.rows,
        includeCutting: quote.withCutting,
        finishType: quote.finishType,
        fileInfo: quote.fileUrl ? { name: quote.fileName || 'diseño.png', fileUrl: quote.fileUrl } : null,
        fileUrl: quote.fileUrl || null,
        fileName: quote.fileName || null,
        canvasSnapshot: quote.canvasSnapshot || null,
        rotationDeg: quote.rotationDeg || 0,
      }],
      workshopNotes: quote.notes || '',
    });

    quote.status = 'CONVERTED';
    quote.convertedOrderId = newOrder.id;
    quote.convertedOrderCode = newOrder.code || newOrder.id;
    quote.updatedAt = new Date().toISOString();

    this.saveToStorage();
    this.notify();

    return {
      success: true,
      order: newOrder,
      quote,
      message: `¡Cotización ${quote.code} convertida en orden ${newOrder.code}!`,
    };
  }

  getMetrics() {
    const quotes = this.getQuotes();
    const totalQuotes = quotes.length;
    const savedCount = quotes.filter(q => q.status === 'SAVED').length;
    const convertedCount = quotes.filter(q => q.status === 'CONVERTED').length;
    const totalQuotedQ = quotes.reduce((acc, q) => acc + (Number(q.totalPriceQ) || 0), 0);
    const conversionRate = totalQuotes > 0 ? ((convertedCount / totalQuotes) * 100).toFixed(1) : '0.0';

    return {
      totalQuotes,
      savedCount,
      convertedCount,
      totalQuotedQ,
      conversionRate,
    };
  }

  filterQuotes(search = '', status = 'ALL') {
    let result = this.getQuotes();

    if (status && status !== 'ALL') {
      result = result.filter(q => q.status === status);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(item =>
        (item.code && item.code.toLowerCase().includes(q)) ||
        (item.projectName && item.projectName.toLowerCase().includes(q)) ||
        (item.leadName && item.leadName.toLowerCase().includes(q)) ||
        (item.companyName && item.companyName.toLowerCase().includes(q)) ||
        (item.leadPhone && item.leadPhone.includes(q))
      );
    }

    return result;
  }

  resetToDefaults() {
    this.quotes = JSON.parse(JSON.stringify(INITIAL_SEED_QUOTES));
    this.saveToStorage();
    this.notify();
  }
}

export const quotesStore = new QuotesStore();
export default quotesStore;
