import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ordersView, formatOrderWhatsAppMessage, renderOrderReceiptSheetHtml } from '../src/js/views/orders-view.js';
import { ordersStore, PAYMENT_STATUS } from '../src/js/modules/orders-store.js';
import { clientsStore } from '../src/js/modules/clients-store.js';
import { store } from '../src/js/store.js';
import { ORDER_STATUS } from '../src/shared/business-config.js';
import * as fileUploader from '../src/js/modules/file-uploader.js';

describe('Orders View — Interfaz de Pedidos y Hoja de Taller Audley', () => {
  let cleanupFn = null;

  beforeEach(() => {
    localStorage.clear();
    ordersStore.resetToInitial();
    store.setUser({ id: '1', role: 'ADMIN' }, 'test-token');
    document.body.innerHTML = `
      <main id="app">
        ${ordersView.render()}
      </main>
    `;
    cleanupFn = ordersView.onMount();
  });

  afterEach(() => {
    if (cleanupFn) cleanupFn();
    document.body.innerHTML = '';
  });

  it('renderiza la interfaz para STAFF (ADMIN) con métricas y controles operativos', () => {
    const title = document.querySelector('h1');
    expect(title.textContent).toContain('Control General de Pedidos');

    const metricsContainer = document.getElementById('ordersMetricsContainer');
    expect(metricsContainer).not.toBeNull();
    expect(metricsContainer.textContent).toContain('Pedidos Activos');
    expect(metricsContainer.textContent).toContain('Metros en Taller');
    expect(metricsContainer.textContent).toContain('Total Facturación');

    const rows = document.querySelectorAll('#ordersTableBody tr');
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it('renderiza la interfaz para CUSTOMER con título de portal de clientes sin métricas de staff', () => {
    if (cleanupFn) cleanupFn();
    store.setUser({ id: '2', role: 'CUSTOMER' }, 'test-token');
    document.body.innerHTML = `
      <main id="app">
        ${ordersView.render()}
      </main>
    `;
    cleanupFn = ordersView.onMount();

    const title = document.querySelector('h1');
    expect(title.textContent).toContain('Mis Pedidos UV DTF');
    expect(document.getElementById('ordersMetricsContainer')).toBeNull();
  });

  it('filtra pedidos por texto de búsqueda en tiempo real', () => {
    const searchInput = document.getElementById('orderSearchInput');
    searchInput.value = 'Café San Cristóbal';
    searchInput.dispatchEvent(new Event('input'));

    const rows = document.querySelectorAll('#ordersTableBody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('KL-00042');

    // Búsqueda sin coincidencias muestra empty state
    searchInput.value = 'TextoInexistente12345';
    searchInput.dispatchEvent(new Event('input'));

    const emptyState = document.getElementById('ordersEmptyState');
    expect(emptyState.style.display).toBe('block');
  });

  it('filtra pedidos por estado de producción y estado de pago', () => {
    const filterProd = document.getElementById('filterProductionStatus');
    const filterPay = document.getElementById('filterPaymentStatus');

    filterProd.value = ORDER_STATUS.PRINTING;
    filterProd.dispatchEvent(new Event('change'));

    let rows = document.querySelectorAll('#ordersTableBody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('KL-00041');

    filterProd.value = 'ALL';
    filterPay.value = PAYMENT_STATUS.PAID;
    filterPay.dispatchEvent(new Event('change'));

    rows = document.querySelectorAll('#ordersTableBody tr');
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it('permite agregar el pedido a la cola de producción desde el botón de la tabla (Task 14)', () => {
    const btnAddProd = document.querySelector('.btn-add-to-production[data-order-id="KL-00042"]');
    expect(btnAddProd).not.toBeNull();

    btnAddProd.click();

    expect(ordersStore.getOrderById('KL-00042').productionStatus).toBe(ORDER_STATUS.IN_AUDLEY_QUEUE);
  });

  it('permite cambiar el estado de pago interactivamente desde el selector de la tabla', () => {
    const selectPay = document.querySelector('.select-pay-status[data-order-id="KL-00041"]');
    expect(selectPay).not.toBeNull();

    selectPay.value = PAYMENT_STATUS.PAID;
    selectPay.dispatchEvent(new Event('change'));

    expect(ordersStore.getOrderById('KL-00041').paymentStatus).toBe(PAYMENT_STATUS.PAID);
  });

  it('abre y cierra el modal de detalle del pedido', () => {
    const detailModal = document.getElementById('orderDetailModal');
    const btnView = document.querySelector('.btn-view-order[data-order-id="KL-00042"]');
    expect(btnView).not.toBeNull();

    btnView.click();
    expect(detailModal.style.display).toBe('block');
    expect(document.getElementById('modalDetailBadge').textContent).toBe('#KL-00042');

    const btnOk = document.getElementById('btnOkDetailModal');
    btnOk.click();
    expect(detailModal.style.display).toBe('none');
  });

  it('abre la Hoja de Taller Audley y dispara la impresión', () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const workshopModal = document.getElementById('workshopSheetModal');
    const btnSheet = document.querySelector('.btn-workshop-sheet[data-order-id="KL-00042"]');
    expect(btnSheet).not.toBeNull();

    btnSheet.click();
    expect(workshopModal.style.display).toBe('block');
    expect(document.getElementById('workshopSheetContainer').textContent).toContain('ORDEN DE TRABAJO');

    const btnPrint = document.getElementById('btnPrintWorkshopSheet');
    btnPrint.click();
    expect(printSpy).toHaveBeenCalled();

    const btnCancel = document.getElementById('btnCancelWorkshopModal');
    btnCancel.click();
    expect(workshopModal.style.display).toBe('none');

    printSpy.mockRestore();
  });

  it('permite a Staff registrar un pedido manual mediante el modal', () => {
    const createModal = document.getElementById('staffCreateOrderModal');
    const btnOpen = document.getElementById('btnOpenNewOrderModal');
    const form = document.getElementById('formStaffCreateOrder');

    btnOpen.click();
    expect(createModal.style.display).toBe('block');

    document.getElementById('manualCustName').value = 'Comercial La Paz';
    document.getElementById('manualCustCompany').value = 'La Paz S.A.';
    document.getElementById('manualCustPhone').value = '+502 5432-1098';
    document.getElementById('manualCustNit').value = '112233-4';
    document.getElementById('manualItemTitle').value = 'Logo Corporativo 10x10';
    document.getElementById('manualItemQty').value = '50';
    document.getElementById('manualItemWidth').value = '10';
    document.getElementById('manualItemHeight').value = '10';
    document.getElementById('manualMeters').value = '2.5';
    document.getElementById('manualTotalQ').value = '287.50';
    document.getElementById('manualPaymentStatus').value = PAYMENT_STATUS.PAID;
    document.getElementById('manualCheckCutting').checked = true;

    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    expect(createModal.style.display).toBe('none');
    const orders = ordersStore.getOrders();
    expect(orders[0].customer.company).toBe('La Paz S.A.');
    expect(orders[0].paymentStatus).toBe(PAYMENT_STATUS.PAID);
  });

  it('permite cancelar el modal de registrar pedido', () => {
    const createModal = document.getElementById('staffCreateOrderModal');
    const btnOpen = document.getElementById('btnOpenNewOrderModal');
    const btnCancel = document.getElementById('btnCancelCreateOrderModal');

    btnOpen.click();
    expect(createModal.style.display).toBe('block');

    btnCancel.click();
    expect(createModal.style.display).toBe('none');
  });

  it('permite a Staff autocompletar datos del cliente desde la cartera B2B y desvincularlo', () => {
    const btnOpen = document.getElementById('btnOpenNewOrderModal');
    btnOpen.click();

    const select = document.getElementById('manualClientAutofillSelect');
    const badgeContainer = document.getElementById('manualAutofillBadgeContainer');
    const btnClear = document.getElementById('btnManualClearAutofill');

    expect(select).not.toBeNull();
    expect(badgeContainer.style.display).toBe('none');

    // Seleccionar CLI-001 (Café San Cristóbal)
    select.value = 'CLI-001';
    select.dispatchEvent(new Event('change'));

    expect(document.getElementById('manualCustCompany').value).toBe('Café San Cristóbal');
    expect(document.getElementById('manualCustPhone').value).toBe('+502 5555-1234');
    expect(document.getElementById('manualCustNit').value).toBe('7845129-4');
    expect(badgeContainer.style.display).toBe('block');
    expect(badgeContainer.textContent).toContain('Café San Cristóbal');
    expect(btnClear.style.display).toBe('inline-flex');

    // Desvincular cliente
    btnClear.click();
    expect(select.value).toBe('');
    expect(badgeContainer.style.display).toBe('none');
    expect(btnClear.style.display).toBe('none');
    expect(document.getElementById('manualCustCompany').value).toBe('');
  });

  it('sincroniza y crea nuevo cliente en cartera B2B al registrar un pedido manual', () => {
    const btnOpen = document.getElementById('btnOpenNewOrderModal');
    btnOpen.click();

    const form = document.getElementById('formStaffCreateOrder');
    document.getElementById('manualCustName').value = 'Lucía Flores';
    document.getElementById('manualCustCompany').value = 'Boutique Flores';
    document.getElementById('manualCustPhone').value = '+502 4433-2211';
    document.getElementById('manualCustNit').value = '556677-8';
    document.getElementById('manualCustAddress').value = 'Zona 15, Vista Hermosa';
    document.getElementById('manualItemTitle').value = 'Etiquetas Doradas';

    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    const createdClient = clientsStore.getClientByNit('556677-8');
    expect(createdClient).not.toBeNull();
    expect(createdClient.company).toBe('Boutique Flores');

    const orders = ordersStore.getOrders();
    expect(orders[0].customer.clientId).toBe(createdClient.id);
  });

  it('actualiza cliente B2B existente al registrar un pedido manual con datos modificados', () => {
    const btnOpen = document.getElementById('btnOpenNewOrderModal');
    btnOpen.click();

    const select = document.getElementById('manualClientAutofillSelect');
    select.value = 'CLI-001';
    select.dispatchEvent(new Event('change'));

    document.getElementById('manualCustAddress').value = 'Nueva Carretera a El Salvador';

    const form = document.getElementById('formStaffCreateOrder');
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    const updated = clientsStore.getClientById('CLI-001');
    expect(updated.address).toBe('Nueva Carretera a El Salvador');

    const orders = ordersStore.getOrders();
    expect(orders[0].customer.clientId).toBe('CLI-001');
  });

  it('permite cambiar selector a opción vacía y enviar pedido manual sin sincronizar cuando el checkbox está desmarcado', () => {
    const btnOpen = document.getElementById('btnOpenNewOrderModal');
    btnOpen.click();

    const select = document.getElementById('manualClientAutofillSelect');
    select.value = 'CLI-001';
    select.dispatchEvent(new Event('change'));
    expect(document.getElementById('manualAutofillBadgeContainer').style.display).toBe('block');

    // Cambiar a opción vacía
    select.value = '';
    select.dispatchEvent(new Event('change'));
    expect(document.getElementById('manualAutofillBadgeContainer').style.display).toBe('none');

    // Desmarcar sincronización
    document.getElementById('manualCheckSaveClient').checked = false;
    document.getElementById('manualCustName').value = 'Comprador Anónimo';
    document.getElementById('manualCustPhone').value = '+502 5555-9999';

    const form = document.getElementById('formStaffCreateOrder');
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    const orders = ordersStore.getOrders();
    expect(orders[0].customer.name).toBe('Comprador Anónimo');
  });

  it('vincula automáticamente un pedido manual a un cliente existente por NIT si no se seleccionó del menú', () => {
    const btnOpen = document.getElementById('btnOpenNewOrderModal');
    btnOpen.click();

    document.getElementById('manualCustCompany').value = 'Café San Cristóbal';
    document.getElementById('manualCustNit').value = '7845129-4';
    document.getElementById('manualCustPhone').value = '+502 5555-1234';

    const form = document.getElementById('formStaffCreateOrder');
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    const orders = ordersStore.getOrders();
    expect(orders[0].customer.clientId).toBe('CLI-001');
  });

  it('renderiza la Hoja de Taller para una orden en rollo continuo sin notas', () => {
    // KL-00040 no tiene notas y no tiene corte
    const order40 = ordersStore.getOrderById('KL-00040');
    order40.workshopNotes = '';
    ordersStore._notify();

    const btnSheet = document.querySelector('.btn-workshop-sheet[data-order-id="KL-00040"]');
    btnSheet.click();

    const container = document.getElementById('workshopSheetContainer');
    expect(container.textContent).toContain('EN ROLLO CONTINUO');
    expect(container.textContent).toContain('Rebobinado en tubo rígido');
  });

  it('permite a un CUSTOMER ver sus pedidos y abrir el detalle', () => {
    if (cleanupFn) cleanupFn();
    store.setUser({ id: '2', role: 'CUSTOMER' }, 'test-token');
    document.body.innerHTML = `
      <main id="app">
        ${ordersView.render()}
      </main>
    `;
    cleanupFn = ordersView.onMount();

    const viewBtn = document.querySelector('.btn-view-order[data-order-id="KL-00042"]');
    expect(viewBtn).not.toBeNull();
    viewBtn.click();

    const detailModal = document.getElementById('orderDetailModal');
    expect(detailModal.style.display).toBe('block');
  });

  it('maneja el envío del formulario manual con campos vacíos usando fallbacks', () => {
    const createModal = document.getElementById('staffCreateOrderModal');
    const btnOpen = document.getElementById('btnOpenNewOrderModal');
    const form = document.getElementById('formStaffCreateOrder');

    btnOpen.click();

    document.getElementById('manualCustName').value = '';
    document.getElementById('manualCustCompany').value = '';
    document.getElementById('manualCustPhone').value = '';
    document.getElementById('manualCustNit').value = '';
    document.getElementById('manualCustAddress').value = '';
    document.getElementById('manualItemTitle').value = '';
    document.getElementById('manualItemQty').value = '';
    document.getElementById('manualItemWidth').value = '';
    document.getElementById('manualItemHeight').value = '';
    document.getElementById('manualMeters').value = '';
    document.getElementById('manualTotalQ').value = '';
    document.getElementById('manualPaymentStatus').value = '';
    document.getElementById('manualNotes').value = '';

    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    expect(createModal.style.display).toBe('none');
    const orders = ordersStore.getOrders();
    expect(orders[0].customer.name).toBe('Cliente');
  });

  it('renderiza pedidos con múltiples diseños y clientes particulares sin empresa', () => {
    const multiOrder = ordersStore.createOrder({
      customer: { name: 'Mario López', company: '', phone: '+502 4433-2211', nit: 'CF', notes: 'Sin notas taller' },
      items: [
        { title: 'Diseño A', widthCm: 5, heightCm: 5, qty: 50, actualLinearMeters: 0.5 },
        { title: 'Diseño B', widthCm: 10, heightCm: 10, qty: 25, actualLinearMeters: 1.2 },
      ],
      cartTotals: { totalBillableMeters: 1.7, grandTotalQ: 195.5 },
    });

    const searchInput = document.getElementById('orderSearchInput');
    searchInput.value = 'Mario López';
    searchInput.dispatchEvent(new Event('input'));

    const rows = document.querySelectorAll('#ordersTableBody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('+1 más');
    expect(rows[0].textContent).toContain('Mario López');

    // Ver detalles de esta orden
    const btnView = rows[0].querySelector('.btn-view-order');
    btnView.click();
    expect(document.getElementById('orderDetailModal').style.display).toBe('block');
    expect(document.getElementById('modalDetailContent').textContent).toContain('Diseño B');

    document.getElementById('btnOkDetailModal').click();

    // Ver hoja de taller de esta orden
    const btnSheet = rows[0].querySelector('.btn-workshop-sheet');
    btnSheet.click();
    expect(document.getElementById('workshopSheetModal').style.display).toBe('block');
    expect(document.getElementById('workshopSheetContainer').textContent).toContain('Mario López');

    document.getElementById('btnCancelWorkshopModal').click();
  });

  it('cubre fallbacks en modal de detalles y hoja de taller cuando faltan campos opcionales', () => {
    ordersStore.createOrder({
      customer: { name: 'Cliente Sin Empresa', company: '', phone: '', nit: '', address: '', notes: '' },
      items: [
        { title: 'Item Directo', widthCm: 5, heightCm: 5, qty: 10, actualLinearMeters: 0, finishType: '', fileInfo: null }
      ],
      cartTotals: { totalBillableMeters: 0, grandTotalQ: 0 },
      workshopNotes: '',
    });

    const searchInput = document.getElementById('orderSearchInput');
    searchInput.value = 'Cliente Sin Empresa';
    searchInput.dispatchEvent(new Event('input'));

    const rows = document.querySelectorAll('#ordersTableBody tr');
    expect(rows.length).toBe(1);

    // Abrir detalle
    const btnView = rows[0].querySelector('.btn-view-order');
    btnView.click();
    expect(document.getElementById('modalDetailContent').textContent).toContain('NIT: CF');

    // Abrir hoja de taller
    const btnSheet = rows[0].querySelector('.btn-workshop-sheet');
    btnSheet.click();
    expect(document.getElementById('workshopSheetContainer').textContent).toContain('Archivo RIP directo');
    expect(document.getElementById('workshopSheetContainer').textContent).toContain('Servicio de impresión UV DTF');
  });

  it('renderiza el snapshot técnico en el modal de detalle del pedido y permite ampliarlo en lightbox', () => {
    ordersStore.createOrder({
      customer: { name: 'Cliente Snapshot Detalle' },
      items: [
        {
          title: 'Stickers Detalle',
          widthCm: 8,
          heightCm: 5,
          qty: 100,
          canvasSnapshot: 'data:image/png;base64,snapshotDetalle',
          rotationDeg: 90,
          fileInfo: { name: 'arte_detalle.png', fileUrl: 'https://r2.dev/arte_detalle.png' },
        }
      ],
      cartTotals: {
        totalBillableMeters: 2.0,
        grandTotalQ: 280,
        canvasSnapshot: 'data:image/png;base64,snapshotDetalle',
      },
    });

    const searchInput = document.getElementById('orderSearchInput');
    searchInput.value = 'Cliente Snapshot Detalle';
    searchInput.dispatchEvent(new Event('input'));

    const rows = document.querySelectorAll('#ordersTableBody tr');
    expect(rows.length).toBe(1);

    const btnView = rows[0].querySelector('.btn-view-order');
    btnView.click();

    expect(document.getElementById('orderDetailModal').style.display).toBe('block');
    const snapshotBox = document.querySelector('.order-canvas-snapshot-box');
    expect(snapshotBox).not.toBeNull();
    expect(snapshotBox.textContent).toContain('Vista de Bobina (28 cm)');
    expect(snapshotBox.textContent).toContain('90°');

    const downloadLink = document.querySelector('.btn-download-r2');
    expect(downloadLink).not.toBeNull();
    expect(downloadLink.getAttribute('href')).toBe('https://r2.dev/arte_detalle.png');

    // Click en botón de ampliar snapshot
    const btnExpand = document.querySelector('.btn-expand-order-snapshot');
    expect(btnExpand).not.toBeNull();
    btnExpand.click();

    const lightbox = document.getElementById('orderSnapshotLightboxModal');
    expect(lightbox.style.display).toBe('block');
    const lightboxImg = document.getElementById('orderSnapshotLightboxImg');
    expect(lightboxImg.getAttribute('src')).toBe('data:image/png;base64,snapshotDetalle');

    // Cerrar lightbox
    document.getElementById('btnCloseOrderSnapshotLightbox').click();
    expect(lightbox.style.display).toBe('none');

    // Click en imagen thumbnail de snapshot
    const thumbImg = document.querySelector('.order-snapshot-img');
    thumbImg.click();
    expect(lightbox.style.display).toBe('block');

    document.getElementById('btnDismissOrderSnapshotLightbox').click();
    expect(lightbox.style.display).toBe('none');

    // Cerrar modal de detalle
    document.getElementById('btnOkDetailModal').click();
  });

  it('renderiza la sección de montaje técnico en la Hoja de Taller Audley y abre lightbox al hacer clic', () => {
    ordersStore.createOrder({
      customer: { name: 'Cliente Taller Audley' },
      items: [
        {
          title: 'Diseño Taller 1',
          widthCm: 5,
          heightCm: 5,
          qty: 50,
          canvasSnapshot: 'data:image/png;base64,snapshotTaller',
          rotationDeg: 0,
          fileInfo: { name: 'taller_rip.png', fileUrl: 'https://r2.dev/taller_rip.png' },
        }
      ],
      cartTotals: {
        totalBillableMeters: 1.0,
        grandTotalQ: 140,
        canvasSnapshot: 'data:image/png;base64,snapshotTaller',
      },
    });

    const searchInput = document.getElementById('orderSearchInput');
    searchInput.value = 'Cliente Taller Audley';
    searchInput.dispatchEvent(new Event('input'));

    const rows = document.querySelectorAll('#ordersTableBody tr');
    expect(rows.length).toBe(1);

    const btnSheet = rows[0].querySelector('.btn-workshop-sheet');
    btnSheet.click();

    const workshopContainer = document.getElementById('workshopSheetContainer');
    expect(workshopContainer.textContent).toContain('Montaje en Superficie de Impresión');

    const workshopThumb = document.querySelector('.workshop-snapshot-img');
    expect(workshopThumb).not.toBeNull();
    expect(workshopThumb.getAttribute('src')).toBe('data:image/png;base64,snapshotTaller');

    // Click en la imagen para abrir lightbox
    workshopThumb.click();
    const lightbox = document.getElementById('orderSnapshotLightboxModal');
    expect(lightbox.style.display).toBe('block');

    // Cerrar lightbox haciendo clic en el backdrop
    lightbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(lightbox.style.display).toBe('none');

    document.getElementById('btnCancelWorkshopModal').click();
  });

  it('cubre ramas adicionales de snapshot y lightbox en ordersView', () => {
    ordersStore.createOrder({
      customer: { name: 'Cliente Mixto' },
      items: [
        {
          title: 'Item Con Snapshot',
          widthCm: 5,
          heightCm: 5,
          qty: 20,
          canvasSnapshot: 'data:image/png;base64,snapMixto',
          rotationDeg: 90,
          fileUrl: 'https://r2.dev/direct_file.png',
        },
        {
          title: 'Item Sin Snapshot',
          widthCm: 5,
          heightCm: 5,
          qty: 10,
          canvasSnapshot: null,
          rotationDeg: 0,
        }
      ],
      cartTotals: {
        totalBillableMeters: 1.0,
        grandTotalQ: 140,
        canvasSnapshot: null,
      },
    });

    const searchInput = document.getElementById('orderSearchInput');
    searchInput.value = 'Cliente Mixto';
    searchInput.dispatchEvent(new Event('input'));

    const rows = document.querySelectorAll('#ordersTableBody tr');
    expect(rows.length).toBe(1);

    // Abrir detalle
    const btnView = rows[0].querySelector('.btn-view-order');
    btnView.click();

    const detailModal = document.getElementById('orderDetailModal');
    detailModal.click();

    // Abrir hoja de taller
    document.getElementById('btnOkDetailModal').click();
    const btnSheet = rows[0].querySelector('.btn-workshop-sheet');
    btnSheet.click();

    const workshopModal = document.getElementById('workshopSheetModal');
    workshopModal.click();

    const lightbox = document.getElementById('orderSnapshotLightboxModal');
    lightbox.style.display = 'block';
    const innerCard = lightbox.querySelector('.modal-card');
    innerCard.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(lightbox.style.display).toBe('block');

    lightbox.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(lightbox.style.display).toBe('none');

    document.getElementById('btnCancelWorkshopModal').click();
  });

  describe('formatOrderWhatsAppMessage', () => {
    it('retorna cadena vacía si order es nulo o indefinido', () => {
      expect(formatOrderWhatsAppMessage(null)).toBe('');
      expect(formatOrderWhatsAppMessage(undefined)).toBe('');
    });

    it('genera enlace de WhatsApp con enlaces al arte y al montaje de bobina si están disponibles', () => {
      const msg = formatOrderWhatsAppMessage({
        id: 'PED-FULL-WA',
        items: [
          {
            title: 'Sticker Full Links',
            fileUrl: 'https://pub-r2.dev/assets/orders/arte_cliente.png',
            canvasSnapshotUrl: 'https://pub-r2.dev/assets/orders/esquema_bobina.png',
          },
        ],
      });
      expect(msg).toContain('🖼️ *Arte:* https://pub-r2.dev/assets/orders/arte_cliente.png');
      expect(msg).toContain('📐 *Montaje:* https://pub-r2.dev/assets/orders/esquema_bobina.png');
    });

    it('utiliza fallback a order.fileUrl y order.canvasSnapshot a nivel raíz si items no tienen URLs', () => {
      const msg = formatOrderWhatsAppMessage({
        id: 'PED-ROOT-99',
        fileUrl: 'https://pub-r2.dev/arte_root.png',
        canvasSnapshot: 'https://pub-r2.dev/montaje_root.png',
        items: [],
      });
      expect(msg).toContain('🖼️ *Arte:* https://pub-r2.dev/arte_root.png');
      expect(msg).toContain('📐 *Montaje:* https://pub-r2.dev/montaje_root.png');
    });

    it('omite arte y montaje si no hay URLs válidas o si el snapshot es base64', () => {
      const msg = formatOrderWhatsAppMessage({
        id: 'PED-NO-URLS',
        canvasSnapshot: 'data:image/png;base64,localOnly',
        items: [
          { title: 'Sin URL', canvasSnapshot: 'data:image/png;base64,abc' },
        ],
      });
      expect(msg).not.toContain('🖼️ *Arte:*');
      expect(msg).not.toContain('📐 *Montaje:*');
      expect(msg).toContain('*KROMA LAB — Pedido #PED-NO-URLS*');
    });
  });
  describe('Comprobantes de Pago Bancario & Lightbox (Opción 2)', () => {
    it('muestra badges de estado de boleta en la tabla de pedidos', () => {
      // Crear una orden con boleta y otra sin boleta
      ordersStore.createOrder({
        customer: { name: 'Cliente Con Boleta' },
        paymentReceiptUrl: 'https://pub-r2.dev/assets/payments/boleta1.jpg',
        paymentReceiptFileName: 'boleta1.jpg',
      });
      ordersStore.createOrder({
        customer: { name: 'Cliente Sin Boleta' },
      });

      const tableBody = document.getElementById('ordersTableBody');
      expect(tableBody.textContent).toContain('📄 Boleta');
      expect(tableBody.textContent).toContain('⏳ Boleta Pendiente');
    });

    it('abre el lightbox de comprobante bancario para imágenes y permite cerrarlo', () => {
      const order = ordersStore.createOrder({
        customer: { name: 'Cliente Boleta Lightbox' },
        paymentReceiptUrl: 'https://pub-r2.dev/assets/payments/boleta_completa.jpg',
        paymentReceiptFileName: 'boleta_completa.jpg',
      });

      const viewBtn = document.querySelector(`.btn-view-order[data-order-id="${order.id}"]`);
      expect(viewBtn).not.toBeNull();
      viewBtn.click();

      const detailModal = document.getElementById('orderDetailModal');
      expect(detailModal.style.display).toBe('block');

      // Click en Ver Comprobante
      const btnViewReceipt = detailModal.querySelector('.btn-view-receipt-lightbox');
      expect(btnViewReceipt).not.toBeNull();
      btnViewReceipt.click();

      const receiptLightbox = document.getElementById('receiptLightboxModal');
      const receiptImg = document.getElementById('receiptLightboxImg');
      expect(receiptLightbox.style.display).toBe('block');
      expect(receiptImg.src).toContain('boleta_completa.jpg');
      expect(receiptImg.style.display).toBe('block');

      // Cerrar vía botón X
      const btnClose = document.getElementById('btnCloseReceiptLightbox');
      btnClose.click();
      expect(receiptLightbox.style.display).toBe('none');

      // Abrir de nuevo y cerrar con backdrop o botón dismiss
      btnViewReceipt.click();
      expect(receiptLightbox.style.display).toBe('block');
      const btnDismiss = document.getElementById('btnDismissReceiptLightbox');
      btnDismiss.click();
      expect(receiptLightbox.style.display).toBe('none');

      btnViewReceipt.click();
      receiptLightbox.click(); // backdrop click
      expect(receiptLightbox.style.display).toBe('none');
    });

    it('soporta visualización de PDF en el lightbox de comprobante', () => {
      const order = ordersStore.createOrder({
        customer: { name: 'Cliente Boleta PDF' },
        paymentReceiptUrl: 'https://pub-r2.dev/assets/payments/transferencia_bi.pdf',
        paymentReceiptFileName: 'transferencia_bi.pdf',
      });

      const viewBtn = document.querySelector(`.btn-view-order[data-order-id="${order.id}"]`);
      viewBtn.click();

      const detailModal = document.getElementById('orderDetailModal');
      const btnViewReceipt = detailModal.querySelector('.btn-view-receipt-lightbox');
      btnViewReceipt.click();

      const receiptLightbox = document.getElementById('receiptLightboxModal');
      const receiptPdf = document.getElementById('receiptLightboxPdf');
      const receiptPdfLink = document.getElementById('receiptLightboxPdfLink');
      expect(receiptLightbox.style.display).toBe('block');
      expect(receiptPdf.style.display).toBe('block');
      expect(receiptPdfLink.href).toContain('transferencia_bi.pdf');
    });

    it('permite a un cliente o staff adjuntar comprobante desde el modal de detalle', async () => {
      const uploadSpy = vi.spyOn(fileUploader, 'uploadFileToStorage').mockResolvedValueOnce({
        success: true,
        fileUrl: 'https://pub-r2.dev/assets/payments/boleta_adjuntada_modal.jpg',
      });

      const order = ordersStore.createOrder({
        customer: { name: 'Cliente Subir En Modal' },
      });

      const viewBtn = document.querySelector(`.btn-view-order[data-order-id="${order.id}"]`);
      viewBtn.click();

      const detailModal = document.getElementById('orderDetailModal');
      const btnTrigger = detailModal.querySelector('.btn-trigger-upload-receipt');
      expect(btnTrigger).not.toBeNull();

      const fileInput = document.getElementById(`modalReceiptFileInput_${order.id}`);
      const clickSpy = vi.spyOn(fileInput, 'click');
      btnTrigger.click();
      expect(clickSpy).toHaveBeenCalled();

      // Simular selección de archivo
      const file = new File(['fake-jpg'], 'boleta_modal.jpg', { type: 'image/jpeg' });
      Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));

      await new Promise(r => setTimeout(r, 60));

      const updatedOrder = ordersStore.getOrderById(order.id);
      expect(updatedOrder.paymentReceiptUrl).toBe('https://pub-r2.dev/assets/payments/boleta_adjuntada_modal.jpg');
      expect(updatedOrder.paymentReceiptFileName).toBe('boleta_modal.jpg');

      uploadSpy.mockRestore();
      clickSpy.mockRestore();
    });

    it('ejecuta acciones rápidas de cobranza y aprobación de producción para Staff', async () => {
      const order = ordersStore.createOrder({
        customer: { name: 'Cliente Acciones Staff' },
        cartTotals: { grandTotalQ: 200.0, totalBillableMeters: 1.5 },
      });
      expect(order.productionStatus).toBe(ORDER_STATUS.PENDING_REVIEW);
      expect(order.paymentStatus).toBe(PAYMENT_STATUS.PENDING);

      const viewBtn = document.querySelector(`.btn-view-order[data-order-id="${order.id}"]`);
      viewBtn.click();

      const detailModal = document.getElementById('orderDetailModal');

      // 1. Anticipo 50%
      const btnPartial = detailModal.querySelector('.btn-quick-pay-partial');
      expect(btnPartial).not.toBeNull();
      btnPartial.click();
      await new Promise(r => setTimeout(r, 30));

      let currentOrder = ordersStore.getOrderById(order.id);
      expect(currentOrder.paymentStatus).toBe(PAYMENT_STATUS.PARTIAL);
      expect(currentOrder.amountPaidQ).toBe(100.0);

      // 2. Pagado 100%
      const btnFull = detailModal.querySelector('.btn-quick-pay-full');
      expect(btnFull).not.toBeNull();
      btnFull.click();
      await new Promise(r => setTimeout(r, 30));

      currentOrder = ordersStore.getOrderById(order.id);
      expect(currentOrder.paymentStatus).toBe(PAYMENT_STATUS.PAID);
      expect(currentOrder.amountPaidQ).toBe(200.0);

      // 3. Aprobar para Producción (pasa a IN_AUDLEY_QUEUE)
      const btnApprove = detailModal.querySelector('.btn-quick-approve-production');
      expect(btnApprove).not.toBeNull();
      btnApprove.click();
      await new Promise(r => setTimeout(r, 30));

      currentOrder = ordersStore.getOrderById(order.id);
      expect(currentOrder.productionStatus).toBe(ORDER_STATUS.IN_AUDLEY_QUEUE);
    });

    it('incluye enlace a la boleta en el mensaje de WhatsApp si el pedido cuenta con boleta', () => {
      const msg = formatOrderWhatsAppMessage({
        id: 'KL-00099',
        paymentReceiptUrl: 'https://pub-r2.dev/assets/payments/boleta_99.jpg',
        items: [],
      });
      expect(msg).toContain('🧾 *Boleta:* https://pub-r2.dev/assets/payments/boleta_99.jpg');
    });
  });
describe('Tarjetas Responsivas Estilo Despacho (<= 1200px)', () => {
    it('renderiza tarjetas de pedidos con estructura similar a despacho en ordersCardsContainer', () => {
      const cardsContainer = document.getElementById('ordersCardsContainer');
      expect(cardsContainer).not.toBeNull();

      const cards = cardsContainer.querySelectorAll('.order-card');
      expect(cards.length).toBeGreaterThanOrEqual(4);

      const firstCard = cards[0];
      expect(firstCard.querySelector('.dispatch-card-folio')).not.toBeNull();
      expect(firstCard.querySelector('.dispatch-card-metrics-grid')).not.toBeNull();
      expect(firstCard.querySelector('.btn-view-order')).not.toBeNull();
      expect(firstCard.querySelector('.btn-workshop-sheet')).not.toBeNull();
    });

    it('permite abrir detalle y cambiar estados desde las tarjetas de pedidos', () => {
      const card = document.querySelector('.order-card[data-order-card="KL-00042"]');
      expect(card).not.toBeNull();

      // Abrir detalle desde tarjeta
      const btnView = card.querySelector('.btn-view-order');
      btnView.click();
      const detailModal = document.getElementById('orderDetailModal');
      expect(detailModal.style.display).toBe('block');
      document.getElementById('btnOkDetailModal').click();

      // Agregar a producción desde botón de tarjeta (Task 14)
      const btnAddProd = card.querySelector('.btn-add-to-production');
      expect(btnAddProd).not.toBeNull();
      btnAddProd.click();
      expect(ordersStore.getOrderById('KL-00042').productionStatus).toBe(ORDER_STATUS.IN_AUDLEY_QUEUE);
    });

    it('permite abrir el recibo imprimible directamente desde el modal de detalle del pedido', () => {
      const btnView = document.querySelector('.btn-view-order[data-order-id="KL-00042"]');
      btnView.click();

      const detailModal = document.getElementById('orderDetailModal');
      expect(detailModal.style.display).toBe('block');

      const btnOpenReceipt = detailModal.querySelector('.btn-open-receipt-from-detail');
      expect(btnOpenReceipt).not.toBeNull();
      btnOpenReceipt.click();

      expect(detailModal.style.display).toBe('none');
      const workshopModal = document.getElementById('workshopSheetModal');
      expect(workshopModal.style.display).toBe('block');
      expect(document.getElementById('workshopSheetContainer').textContent).toContain('RECIBO DE SERVICIO DE IMPRESIÓN UV DTF');
      expect(document.getElementById('workshopSheetContainer').textContent).toContain('RESUMEN DE LIQUIDACIÓN');
    });

    it('renderOrderReceiptSheetHtml maneja orden nula y órdenes sin items usando fallbacks seguros', () => {
      expect(renderOrderReceiptSheetHtml(null)).toBe('');

      const fallbackHtml = renderOrderReceiptSheetHtml({
        id: 'KL-FALLBACK-01',
        customer: { name: 'Arte Modelo Dubois', company: 'Arte Modelo Dubois' },
        metrics: { totalBillableMeters: 58.27, tierRate: 30.0, grandTotalQ: 1748.10, cuttingTotalQ: 0 },
        items: [],
      });

      expect(fallbackHtml).toContain('Arte Modelo Dubois');
      expect(fallbackHtml).toContain('Q30.00 por metro lineal');
      expect(fallbackHtml).toContain('58.27 m');
      expect(fallbackHtml).toContain('Q 1748.10');
      expect(fallbackHtml).toContain('Impresión UV DTF en Bobina Audley');

      const fullBranchHtml = renderOrderReceiptSheetHtml({
        id: 'KL-BRANCH-02',
        createdAt: new Date().toISOString(),
        workshopNotes: 'Empacar con cuidado',
        canvasSnapshot: 'data:image/png;base64,fallback',
        fileUrl: 'https://r2.kroma.gt/global.png',
        customer: { name: 'Lesly Rivera', company: '', phone: '5555-0000', nit: '' },
        metrics: { totalBillableMeters: 10, tierRate: 30.0, grandTotalQ: 325.0, cuttingTotalQ: 25.0, hasCutting: true },
        items: [
          {
            title: 'Sticker A',
            widthCm: 5,
            heightCm: 5,
            qty: 50,
            actualLinearMeters: 5,
            stickersPerRow: 5,
            rows: 10,
            rotationDeg: 90,
            finishType: '',
            canvasSnapshot: 'data:image/png;base64,item1',
            fileInfo: { name: 'arte1.png', fileUrl: 'https://r2.kroma.gt/arte1.png' },
          },
          {
            title: 'Sticker B',
            widthCm: 5,
            heightCm: 5,
            qty: 50,
            actualLinearMeters: 5,
            stickersPerRow: 5,
            rows: 10,
            canvasSnapshot: '',
            fileInfo: { name: 'arte2-local.png' },
          },
        ],
      });
      expect(fullBranchHtml).toContain('Servicio de corte individual:');
      expect(fullBranchHtml).toContain('Empacar con cuidado');
      expect(fullBranchHtml).toContain('🔄 90°');
    });
  });
  describe('Correcciones y Reglas de Negocio QA (Tasks 10, 11, 12, 13)', () => {
    it('filtra por estado de producción con textos "En cola de impresión" e "Imprimiendo" (Task 10)', () => {
      const select = document.getElementById('filterProductionStatus');
      const optAudley = Array.from(select.options).find(o => o.value === ORDER_STATUS.IN_AUDLEY_QUEUE);
      const optPrinting = Array.from(select.options).find(o => o.value === ORDER_STATUS.PRINTING);

      expect(optAudley.textContent).toBe('En cola de impresión');
      expect(optPrinting.textContent).toBe('Imprimiendo');
    });

    it('en modo CUSTOMER oculta checklist de control de calidad y aviso RIP en recibo (Task 11)', () => {
      store.setUser({ role: 'CUSTOMER', name: 'Cliente Particular', email: 'cliente@test.gt' }, 'token');
      const order = {
        ...ordersStore.getOrderById('KL-00042'),
        canvasSnapshot: 'data:image/png;base64,mockSnapshot',
      };
      const receiptHtml = renderOrderReceiptSheetHtml(order);

      // No debe contener el cuadro de control de calidad ni la advertencia de rotación RIP
      expect(receiptHtml).not.toContain('Control de Calidad del Operador');
      expect(receiptHtml).not.toContain('Orientar el archivo RIP idéntico a este esquema para evitar mermas o reclamos de rotación.');
    });

    it('en modo STAFF incluye checklist de control de calidad y aviso RIP en recibo (Task 11)', () => {
      store.setUser({ role: 'ADMIN', name: 'Miguel Dubois', email: 'admin@kromalab.gt' }, 'token');
      const order = {
        ...ordersStore.getOrderById('KL-00042'),
        canvasSnapshot: 'data:image/png;base64,mockSnapshot',
      };
      const receiptHtml = renderOrderReceiptSheetHtml(order);

      expect(receiptHtml).toContain('Control de Calidad del Operador');
      expect(receiptHtml).toContain('Orientar el archivo RIP idéntico a este esquema para evitar mermas o reclamos de rotación.');
    });

    it('aplica formato limpio en cabecera y textos de recibo de taller (Task 12)', () => {
      store.setUser({ role: 'ADMIN', name: 'Miguel Dubois' }, 'token');
      const order = {
        ...ordersStore.getOrderById('KL-00042'),
        canvasSnapshot: 'data:image/png;base64,mockSnapshot',
      };
      const receiptHtml = renderOrderReceiptSheetHtml(order);

      // Cabecera sin (BOBINA AUDLEY 28CM)
      expect(receiptHtml).not.toContain('(BOBINA AUDLEY 28CM)');
      expect(receiptHtml).toContain('KROMA LAB — IMPRESIÓN INDUSTRIAL UV DTF');

      // Modalidad sin paréntesis redundantes
      expect(receiptHtml).not.toContain('(únicamente impresión, sin cobro de material)');
      expect(receiptHtml).not.toContain('(Barniz con Relieve 3D)');

      // Montaje técnico renombrado
      expect(receiptHtml).toContain('📐 Montaje en Superficie de Impresión:');
      expect(receiptHtml).toContain('Disposición configurada sobre los 28 cm útiles');
    });

    it('en modal de imprimir oculta aviso de bobina para CUSTOMER y lo muestra para STAFF (Task 13)', () => {
      // 1. Como CUSTOMER
      if (cleanupFn) cleanupFn();
      store.setUser({ role: 'CUSTOMER', name: 'Cliente Particular' }, 'token');
      document.body.innerHTML = `
        <main id="app">
          ${ordersView.render()}
        </main>
      `;
      cleanupFn = ordersView.onMount(document.getElementById('app'));
      const btnView = document.querySelector('.btn-view-order[data-order-id="KL-00042"]');
      btnView.click();

      // Abrir recibo desde el modal
      const btnReceipt = document.getElementById('btnOpenOrderReceipt');
      if (btnReceipt) btnReceipt.click();

      const modalEl = document.getElementById('workshopSheetModal');
      expect(modalEl.textContent).not.toContain('💡 Imprime esta ficha o colócala junto a la bobina montada en la máquina.');

      // 2. Como STAFF
      if (cleanupFn) cleanupFn();
      store.setUser({ role: 'ADMIN', name: 'Miguel Dubois' }, 'token');
      document.body.innerHTML = `
        <main id="app">
          ${ordersView.render()}
        </main>
      `;
      cleanupFn = ordersView.onMount(document.getElementById('app'));
      const btnStaffSheet = document.querySelector('.btn-workshop-sheet[data-order-id="KL-00042"]');
      if (btnStaffSheet) btnStaffSheet.click();

      const modalStaff = document.getElementById('workshopSheetModal');
      expect(modalStaff.textContent).toContain('💡 Imprime esta ficha o colócala junto a la bobina montada en la máquina.');
    });
  });
});
