import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initCartDrawer,
  openCartDrawer,
  closeCartDrawer,
  updateCartBadge,
  renderCartDrawer,
} from '../src/js/components/cart-drawer.js';
import { openCheckoutModal, closeCheckoutModal } from '../src/js/components/checkout-modal.js';
import { cartStore } from '../src/js/modules/cart-store.js';
import { clientsStore } from '../src/js/modules/clients-store.js';
import { ordersStore } from '../src/js/modules/orders-store.js';
import { quotesStore } from '../src/js/modules/quotes-store.js';
import { store } from '../src/js/store.js';
import * as fileUploader from '../src/js/modules/file-uploader.js';

describe('Cart UI — Componentes de Carrito y Checkout', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <header>
        <button id="cartToggleBtn">
          <span id="cartCountBadge" style="display: none;">0</span>
        </button>
      </header>
      <div id="cartDrawerContainer"></div>
      <div id="checkoutModalContainer"></div>
    `;
    cartStore.clearCart();
    window.open = vi.fn();
    window.confirm = vi.fn(() => true);
  });

  describe('Badge y Apertura/Cierre del Drawer', () => {
    it('maneja renderCartDrawer cuando cartDrawerContainer no existe en el DOM', () => {
      document.getElementById('cartDrawerContainer').remove();
      expect(() => renderCartDrawer([], {})).not.toThrow();
    });

    it('renderiza el drawer preservando la clase open si ya estaba abierto', () => {
      document.body.innerHTML = '<div id="cartDrawerContainer"><div id="cartDrawer" class="open"></div></div>';
      renderCartDrawer([], {});
      expect(document.getElementById('cartDrawer').classList.contains('open')).toBe(true);
    });

    it('muestra etiqueta Piezas en el servicio de corte cuando no aplica mínimo', () => {
      const mockItems = [{ id: '1', title: 'Test', widthCm: 5, heightCm: 5, qty: 10, actualLinearMeters: 0.5, itemTotalQ: 50 }];
      renderCartDrawer(mockItems, {
        items: mockItems,
        totalBillableMeters: 5,
        isUnderMin: false,
        tierRate: 115,
        materialTotalQ: 575,
        hasCutting: true,
        isCuttingMinApplied: false,
        cuttingTotalQ: 50,
        grandTotalQ: 625,
      });
      expect(document.getElementById('cartDrawerContainer').innerHTML).toContain('Piezas');
    });

    it('actualiza el badge del carrito según la cantidad de ítems', () => {
      const badge = document.getElementById('cartCountBadge');
      updateCartBadge(3);
      expect(badge.textContent).toBe('3');
      expect(badge.style.display).toBe('inline-flex');

      updateCartBadge(0);
      expect(badge.style.display).toBe('none');
    });

    it('abre y cierra el drawer alternando clases y overflow del body', () => {
      initCartDrawer();
      openCartDrawer();

      const drawer = document.getElementById('cartDrawer');
      const backdrop = document.getElementById('cartBackdrop');

      expect(drawer.classList.contains('open')).toBe(true);
      expect(backdrop.classList.contains('open')).toBe(true);
      expect(document.body.style.overflow).toBe('hidden');

      closeCartDrawer();
      expect(drawer.classList.contains('open')).toBe(false);
      expect(backdrop.classList.contains('open')).toBe(false);
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Renderizado y Acciones del Carrito', () => {
    it('muestra el estado vacío cuando no hay ítems', () => {
      initCartDrawer();
      const container = document.getElementById('cartDrawerContainer');
      expect(container.innerHTML).toContain('Tu carrito está vacío');
    });

    it('renderiza la lista de ítems, totales consolidados y reacciona a cambios de cantidad', () => {
      initCartDrawer();

      const item = cartStore.addItem({
        title: 'Sticker Logo',
        widthCm: 5,
        heightCm: 5,
        qty: 50,
        includeCutting: true,
        fileInfo: { name: 'logo.png' },
      });

      const item2 = cartStore.addItem({
        title: 'Sticker Vaso',
        widthCm: 8,
        heightCm: 5,
        qty: 100,
        includeCutting: false,
        previewUrl: 'data:image/png;base64,123',
      });

      const container = document.getElementById('cartDrawerContainer');
      expect(container.innerHTML).toContain('Sticker Logo');
      expect(container.innerHTML).toContain('logo.png');
      expect(container.innerHTML).toContain('Sticker Vaso');
      expect(container.innerHTML).toContain('En rollo');
      expect(container.innerHTML).toContain('TOTAL ESTIMADO');

      // Incrementar cantidad
      const btnIncrease = document.querySelector(`.btn-qty-increase[data-qty-item="${item.id}"]`);
      btnIncrease.click();
      expect(cartStore.getItems()[0].qty).toBe(75);

      // Decrementar cantidad
      const btnDecrease = document.querySelector(`.btn-qty-decrease[data-qty-item="${item.id}"]`);
      btnDecrease.click();
      expect(cartStore.getItems()[0].qty).toBe(65);

      // Decrementar cuando qty <= 10
      cartStore.updateItemQty(item.id, 5);
      btnDecrease.click();
      expect(cartStore.getItems()[0].qty).toBe(4);

      // Eliminar ítem
      const btnRemove = document.querySelector(`.btn-remove-item[data-remove-id="${item.id}"]`);
      btnRemove.click();
      expect(cartStore.getItems().length).toBe(1);
    });

    it('cierra el drawer al hacer clic en btnCloseCart o en el backdrop', () => {
      initCartDrawer();
      openCartDrawer();
      const btnClose = document.getElementById('btnCloseCart');
      btnClose.click();
      expect(document.getElementById('cartDrawer').classList.contains('open')).toBe(false);

      openCartDrawer();
      const backdrop = document.getElementById('cartBackdrop');
      backdrop.click();
      expect(document.getElementById('cartDrawer').classList.contains('open')).toBe(false);
    });

    it('navega al cotizador desde el estado vacío al hacer clic en btnEmptyGoQuoter (Task 19)', () => {
      window.router = { navigate: vi.fn() };
      initCartDrawer();
      openCartDrawer();
      const btnGo = document.getElementById('btnEmptyGoQuoter');
      btnGo.click();
      expect(document.getElementById('cartDrawer').classList.contains('open')).toBe(false);
      expect(window.router.navigate).toHaveBeenCalledWith('/');
    });

    it('abre el modal de checkout al hacer clic en btnCartCheckout', () => {
      initCartDrawer();
      cartStore.addItem({ widthCm: 5, heightCm: 5, qty: 50 });

      const btnCheckout = document.getElementById('btnCartCheckout');
      btnCheckout.click();

      expect(document.getElementById('checkoutModal')).not.toBeNull();
    });

    it('vacía el carrito al hacer clic en btnClearCart y confirmar en el modal', () => {
      initCartDrawer();
      cartStore.addItem({ widthCm: 5, heightCm: 5, qty: 50 });
      expect(cartStore.getItems().length).toBe(1);

      const btnClear = document.getElementById('btnClearCart');
      btnClear.click();

      const modal = document.getElementById('clearCartConfirmModal');
      expect(modal.style.display).toBe('block');

      const btnConfirm = document.getElementById('btnConfirmClearCartModal');
      btnConfirm.click();

      expect(cartStore.getItems().length).toBe(0);
      expect(modal.style.display).toBe('none');
    });

    it('despacha pedido a WhatsApp desde el carrito', () => {
      initCartDrawer();
      cartStore.addItem({ widthCm: 5, heightCm: 5, qty: 100 });

      const btnWhatsApp = document.getElementById('btnCartWhatsApp');
      btnWhatsApp.click();

      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('whatsapp'), '_blank');
    });

    it('sube instantáneas de canvas a R2 y formatea pedido a WhatsApp con los enlaces de arte y bobina', async () => {
      initCartDrawer();
      const spy = vi.spyOn(fileUploader, 'uploadCanvasSnapshotToStorage').mockResolvedValue('https://pub-r2.dev/assets/orders/bobina_cart.png');
      cartStore.addItem({
        widthCm: 5,
        heightCm: 5,
        qty: 100,
        fileUrl: 'https://pub-r2.dev/arte.png',
        canvasSnapshot: 'data:image/png;base64,mockSnap',
      });

      const btnWhatsApp = document.getElementById('btnCartWhatsApp');
      await btnWhatsApp.click();

      expect(spy).toHaveBeenCalled();
      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('whatsapp'), '_blank');
      const calledUrl = window.open.mock.calls[window.open.mock.calls.length - 1][0];
      const decoded = decodeURIComponent(calledUrl);
      expect(decoded).toContain('🖼️ *Arte del cliente:* https://pub-r2.dev/arte.png');
      expect(decoded).toContain('📐 *Montaje en bobina:* https://pub-r2.dev/assets/orders/bobina_cart.png');
      spy.mockRestore();
    });

    it('maneja error en uploadCanvasSnapshotToStorage al presionar WhatsApp en el carrito sin bloquear el envío', async () => {
      initCartDrawer();
      const spy = vi.spyOn(fileUploader, 'uploadCanvasSnapshotToStorage').mockRejectedValue(new Error('Network error'));
      cartStore.addItem({
        widthCm: 5,
        heightCm: 5,
        qty: 50,
        canvasSnapshot: 'data:image/png;base64,mockSnap',
      });

      const btnWhatsApp = document.getElementById('btnCartWhatsApp');
      await btnWhatsApp.click();

      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('whatsapp'), '_blank');
      spy.mockRestore();
    });
  });

  describe('Checkout Modal', () => {
    beforeEach(() => {
      ordersStore.resetToInitial();
      store.setUser({ role: 'CUSTOMER', name: 'Carlos Rivera', phone: '55554444', email: 'carlos@rivera.gt', nit: '7890123-4' }, 'token-customer');
    });

    it('abre el modal de checkout y envía el formulario de confirmación con datos de usuario', () => {
      // Probar cuando no existe container previo en el DOM
      document.getElementById('checkoutModalContainer')?.remove();

      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      const modal = document.getElementById('checkoutModal');
      expect(modal).toBeDefined();
      expect(document.getElementById('checkoutModalTitle').textContent).toContain('Datos de Entrega y Facturación');

      const nameInput = document.getElementById('custName');
      const phoneInput = document.getElementById('custPhone');
      const nitInput = document.getElementById('custNit');
      const addressInput = document.getElementById('custAddress');
      const notesInput = document.getElementById('custNotes');

      nameInput.value = 'Carlos Rivera';
      phoneInput.value = '55554444';
      nitInput.value = '7890123-4';
      addressInput.value = 'Zona 10';
      notesInput.value = 'Barniz brillante';

      const form = document.getElementById('checkoutForm');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      const orders = ordersStore.getOrders();
      expect(orders.length).toBeGreaterThan(0);
      expect(orders[0].customer.name).toBe('Carlos Rivera');

      const formEl = document.getElementById('checkoutForm');
      expect(formEl.textContent).toContain('¡Tu pedido ha sido enviado exitosamente!');
      expect(formEl.textContent).toContain('Tu pedido será revisado y confirmado por nuestro equipo a la brevedad.');

      const waBtn = document.getElementById('btnWhatsAppConfirm');
      expect(waBtn).not.toBeNull();
      expect(waBtn.getAttribute('href')).toContain('Carlos%20Rivera');
    });

    it('sube instantáneas en base64 de ítems a R2 al enviar checkout form', async () => {
      const spy = vi.spyOn(fileUploader, 'uploadCanvasSnapshotToStorage').mockResolvedValue('https://pub-r2.dev/assets/orders/bobina_checkout.png');
      cartStore.clearCart();
      cartStore.addItem({
        widthCm: 5,
        heightCm: 5,
        qty: 50,
        canvasSnapshot: 'data:image/png;base64,sample',
      });
      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      const form = document.getElementById('checkoutForm');
      await form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      expect(spy).toHaveBeenCalled();
      expect(document.getElementById('checkoutForm').textContent).toContain('¡Tu pedido ha sido enviado exitosamente!');
      spy.mockRestore();
    });

    it('maneja error en uploadCanvasSnapshotToStorage al enviar checkout form de forma resiliente', async () => {
      const spy = vi.spyOn(fileUploader, 'uploadCanvasSnapshotToStorage').mockRejectedValue(new Error('Checkout upload fail'));
      cartStore.clearCart();
      cartStore.addItem({
        widthCm: 5,
        heightCm: 5,
        qty: 50,
        canvasSnapshot: 'data:image/png;base64,sample',
      });
      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      const form = document.getElementById('checkoutForm');
      await form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      expect(document.getElementById('checkoutForm').textContent).toContain('¡Tu pedido ha sido enviado exitosamente!');
      spy.mockRestore();
    });

    it('inicializa el modal de checkout con datos prellenados si el usuario ha iniciado sesión', () => {
      store.setUser({ role: 'CUSTOMER', name: 'Empresa Test', phone: '99887766', nit: '98765-4' }, 'token');

      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      expect(document.getElementById('custName').value).toBe('Empresa Test');
      expect(document.getElementById('custPhone').value).toBe('99887766');
      expect(document.getElementById('custNit').value).toBe('98765-4');

      const form = document.getElementById('checkoutForm');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      expect(document.getElementById('checkoutForm').textContent).toContain('¡Tu pedido ha sido enviado exitosamente!');
    });

    it('cierra el modal al hacer clic en btnCloseCheckout y no al hacer clic en el backdrop (Task 5)', () => {
      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      const btnClose = document.getElementById('btnCloseCheckout');
      btnClose.click();
      expect(document.getElementById('checkoutModal')).toBeNull();

      openCheckoutModal(totals);
      const backdrop = document.getElementById('checkoutBackdrop');
      backdrop.click();
      expect(document.getElementById('checkoutModal')).not.toBeNull();
    });

    it('permite autocompletar campos de checkout al seleccionar un cliente B2B y desvincularlo (Modo Staff)', () => {
      store.setUser({ role: 'ADMIN', name: 'Miguel Dubois' }, 'token');
      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      const select = document.getElementById('clientAutofillSelect');
      const badgeContainer = document.getElementById('autofillBadgeContainer');
      const btnClear = document.getElementById('btnClearAutofill');

      expect(select).not.toBeNull();
      expect(badgeContainer.style.display).toBe('none');

      // Seleccionar Café San Cristóbal (CLI-001)
      select.value = 'CLI-001';
      select.dispatchEvent(new Event('change'));

      expect(document.getElementById('custName').value).toContain('Café San Cristóbal');
      expect(document.getElementById('custPhone').value).toBe('+502 5555-1234');
      expect(document.getElementById('custNit').value).toBe('7845129-4');
      expect(document.getElementById('custAddress').value).toContain('San Cristóbal');
      expect(badgeContainer.style.display).toBe('block');
      expect(badgeContainer.textContent).toContain('Café San Cristóbal');
      expect(btnClear.style.display).toBe('inline-flex');

      // Desvincular cliente
      btnClear.click();
      expect(select.value).toBe('');
      expect(badgeContainer.style.display).toBe('none');
      expect(btnClear.style.display).toBe('none');
      expect(document.getElementById('custAddress').value).toBe('');
    });

    it('sincroniza y crea nuevo cliente en clientsStore al procesar checkout (Modo Staff)', () => {
      store.setUser({ role: 'ADMIN', name: 'Miguel Dubois' }, 'token');
      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      document.getElementById('custName').value = 'Diseños Creativos GT';
      document.getElementById('custPhone').value = '+502 5988-7766';
      document.getElementById('custNit').value = '9876543-2';
      document.getElementById('custAddress').value = 'Zona 14, La Villa';
      document.getElementById('custNotes').value = 'Entregar por la mañana';

      const form = document.getElementById('checkoutForm');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      // Verificar que el cliente se creó en clientsStore
      const createdClient = clientsStore.getClientByNit('9876543-2');
      expect(createdClient).not.toBeNull();
      expect(createdClient.company).toBe('Diseños Creativos GT');

      // Verificar que el último pedido quedó asociado al clientId
      const orders = ordersStore.getOrders();
      expect(orders[0].customer.clientId).toBe(createdClient.id);
    });

    it('actualiza cliente B2B existente y asocia el pedido al confirmar checkout (Modo Staff)', () => {
      store.setUser({ role: 'ADMIN', name: 'Miguel Dubois' }, 'token');
      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      const select = document.getElementById('clientAutofillSelect');
      select.value = 'CLI-002'; // Barbería Vintage
      select.dispatchEvent(new Event('change'));

      // Modificar dirección para verificar actualización
      document.getElementById('custAddress').value = 'Nueva Sucursal Zona 4';

      const form = document.getElementById('checkoutForm');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      const client = clientsStore.getClientById('CLI-002');
      expect(client.address).toBe('Nueva Sucursal Zona 4');

      const orders = ordersStore.getOrders();
      expect(orders[0].customer.clientId).toBe('CLI-002');
    });

    it('preselecciona automáticamente el cliente si el usuario en sesión tiene clientId asociado (Modo Staff)', () => {
      store.setUser({
        role: 'ADMIN',
        name: 'Rodrigo Méndez',
        email: 'rodrigo@cafesancristobal.gt',
        clientId: 'CLI-001',
      }, 'token');

      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      const select = document.getElementById('clientAutofillSelect');
      expect(select.value).toBe('CLI-001');

      const badgeContainer = document.getElementById('autofillBadgeContainer');
      expect(badgeContainer.style.display).toBe('block');
      expect(badgeContainer.textContent).toContain('Café San Cristóbal');

      // Reset user
      store.clearUser();
    });

    it('preselecciona cliente si el usuario coincide por NIT, teléfono o email (Modo Staff)', () => {
      // Coincidencia por NIT
      store.setUser({ role: 'ADMIN', nit: '7845129-4' }, 'token');
      openCheckoutModal(cartStore.getTotals());
      expect(document.getElementById('clientAutofillSelect').value).toBe('CLI-001');

      // Coincidencia por teléfono
      store.setUser({ role: 'ADMIN', phone: '+502 5111-2233' }, 'token');
      openCheckoutModal(cartStore.getTotals());
      expect(document.getElementById('clientAutofillSelect').value).toBe('CLI-002');

      // Coincidencia por email
      store.setUser({ role: 'ADMIN', email: 'ventas@elinjerto.gt' }, 'token');
      openCheckoutModal(cartStore.getTotals());
      expect(document.getElementById('clientAutofillSelect').value).toBe('CLI-003');

      store.clearUser();
    });

    it('resetea selección al cambiar select a opción vacía y procesa submit sin sincronizar cuando checkbox está desmarcado', () => {
      store.setUser({ role: 'ADMIN', name: 'Miguel Dubois' }, 'token');
      openCheckoutModal(cartStore.getTotals());
      const select = document.getElementById('clientAutofillSelect');
      select.value = 'CLI-001';
      select.dispatchEvent(new Event('change'));
      expect(document.getElementById('autofillBadgeContainer').style.display).toBe('block');

      // Cambiar a opción vacía
      select.value = '';
      select.dispatchEvent(new Event('change'));
      expect(document.getElementById('autofillBadgeContainer').style.display).toBe('none');

      // Desmarcar sincronización
      document.getElementById('checkSaveToClients').checked = false;
      document.getElementById('custName').value = 'Cliente Esporádico';
      document.getElementById('custPhone').value = '55550000';

      const form = document.getElementById('checkoutForm');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      expect(document.getElementById('checkoutForm').textContent).toContain('¡Tu pedido ha sido enviado exitosamente!');
    });

    it('vincula automáticamente a un cliente existente por NIT si no fue seleccionado en el dropdown', () => {
      store.setUser({ role: 'ADMIN', name: 'Miguel Dubois' }, 'token');
      openCheckoutModal(cartStore.getTotals());

      // Ingresar manualmente datos de Café San Cristóbal sin seleccionarlo
      document.getElementById('custName').value = 'Café San Cristóbal';
      document.getElementById('custNit').value = '7845129-4';
      document.getElementById('custPhone').value = '+502 5555-1234';
      document.getElementById('custAddress').value = 'Nueva Calle 3';

      const form = document.getElementById('checkoutForm');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      const orders = ordersStore.getOrders();
      expect(orders[0].customer.clientId).toBe('CLI-001');
    });

    it('muestra cuentas bancarias autorizadas y permite seleccionar, previsualizar y remover una boleta', async () => {
      openCheckoutModal(cartStore.getTotals());

      // Verificar cuentas bancarias
      const bankBox = document.querySelector('.checkout-bank-box');
      expect(bankBox).not.toBeNull();
      expect(bankBox.textContent).toContain('5371667253'); // BI Monetaria

      const dropzone = document.getElementById('checkoutReceiptDropzone');
      const input = document.getElementById('checkoutReceiptInput');
      const promptEl = document.getElementById('checkoutReceiptPrompt');
      const previewEl = document.getElementById('checkoutReceiptPreview');
      const nameEl = document.getElementById('checkoutReceiptFileName');
      const btnRemove = document.getElementById('btnRemoveCheckoutReceipt');

      expect(dropzone).not.toBeNull();
      expect(promptEl.style.display).not.toBe('none');
      expect(previewEl.style.display).toBe('none');

      // Clic en dropzone simula clic en input
      const clickSpy = vi.spyOn(input, 'click');
      dropzone.click();
      expect(clickSpy).toHaveBeenCalled();

      // Drag & drop events
      dropzone.dispatchEvent(new Event('dragover'));
      expect(dropzone.style.borderColor).toBe('var(--cerulean)');
      dropzone.dispatchEvent(new Event('dragleave'));
      expect(dropzone.style.borderColor).toBe('var(--border-color)');

      // Selección de imagen válida JPG
      const validFile = new File(['fake-jpg-content'], 'boleta_bi.jpg', { type: 'image/jpeg' });
      Object.defineProperty(input, 'files', { value: [validFile], configurable: true });
      input.dispatchEvent(new Event('change'));

      // Esperar microtasks para lectura asíncrona
      await new Promise(r => setTimeout(r, 50));
      expect(previewEl.style.display).toBe('flex');
      expect(nameEl.textContent).toBe('boleta_bi.jpg');

      // Remover comprobante seleccionado
      btnRemove.click();
      expect(previewEl.style.display).toBe('none');
      expect(promptEl.style.display).toBe('block');

      clickSpy.mockRestore();
    });

    it('valida formato inválido y soporta PDF o drop directo de archivo en checkout', async () => {
      openCheckoutModal(cartStore.getTotals());
      const dropzone = document.getElementById('checkoutReceiptDropzone');
      const input = document.getElementById('checkoutReceiptInput');
      const errorEl = document.getElementById('checkoutReceiptError');
      const iconEl = document.getElementById('checkoutReceiptIcon');
      const previewEl = document.getElementById('checkoutReceiptPreview');

      // Archivo inválido .exe
      const invalidFile = new File(['fake-exe'], 'virus.exe', { type: 'application/x-msdownload' });
      Object.defineProperty(input, 'files', { value: [invalidFile], configurable: true });
      input.dispatchEvent(new Event('change'));

      expect(errorEl.style.display).toBe('block');
      expect(errorEl.textContent).toContain('Formato de comprobante no soportado');

      // Drop de archivo PDF válido
      const pdfFile = new File(['fake-pdf'], 'transferencia.pdf', { type: 'application/pdf' });
      const dropEvent = new Event('drop');
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: { files: [pdfFile] }
      });
      dropzone.dispatchEvent(dropEvent);

      await new Promise(r => setTimeout(r, 50));
      expect(errorEl.style.display).toBe('none');
      expect(previewEl.style.display).toBe('flex');
      expect(iconEl.style.display).toBe('inline-block');
    });

    it('sube el comprobante a storage y lo envía en el pedido y mensaje de WhatsApp', async () => {
      const uploadSpy = vi.spyOn(fileUploader, 'uploadFileToStorage').mockResolvedValueOnce({
        success: true,
        fileUrl: 'https://pub-r2.dev/assets/payments/boleta_bancaria_ok.jpg',
      });

      openCheckoutModal(cartStore.getTotals());
      const input = document.getElementById('checkoutReceiptInput');
      const validFile = new File(['fake-jpg'], 'boleta_bancaria_ok.jpg', { type: 'image/jpeg' });
      Object.defineProperty(input, 'files', { value: [validFile], configurable: true });
      input.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 30));

      document.getElementById('custName').value = 'Juan Pérez';
      document.getElementById('custPhone').value = '+502 5555-9999';

      const form = document.getElementById('checkoutForm');
      await form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      expect(uploadSpy).toHaveBeenCalledWith(validFile, expect.objectContaining({ context: 'payments' }));

      const latestOrder = ordersStore.getOrders()[0];
      expect(latestOrder.paymentReceiptUrl).toBe('https://pub-r2.dev/assets/payments/boleta_bancaria_ok.jpg');
      expect(latestOrder.paymentReceiptFileName).toBe('boleta_bancaria_ok.jpg');

      const waBtn = document.getElementById('btnWhatsAppConfirm');
      expect(waBtn).not.toBeNull();
      expect(waBtn.getAttribute('href')).toContain('boleta_bancaria_ok.jpg');

      uploadSpy.mockRestore();
    });

    it('tolera fallos de red al subir comprobante continuando con la creación del pedido', async () => {
      const uploadSpy = vi.spyOn(fileUploader, 'uploadFileToStorage').mockRejectedValueOnce(new Error('R2 Network Fail'));

      openCheckoutModal(cartStore.getTotals());
      const input = document.getElementById('checkoutReceiptInput');
      const validFile = new File(['fake-jpg'], 'boleta_offline.jpg', { type: 'image/jpeg' });
      Object.defineProperty(input, 'files', { value: [validFile], configurable: true });
      input.dispatchEvent(new Event('change'));
      await new Promise(r => setTimeout(r, 30));

      const form = document.getElementById('checkoutForm');
      await form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      const latestOrder = ordersStore.getOrders()[0];
      expect(latestOrder.paymentReceiptFileName).toBe('boleta_offline.jpg');
      expect(document.getElementById('checkoutForm').textContent).toContain('¡Tu pedido ha sido enviado exitosamente!');

      uploadSpy.mockRestore();
    });

    it('en modo cliente oculta la sección de autocompletado B2B y auto-rellena los datos de la cuenta', () => {
      store.setUser({
        role: 'CUSTOMER',
        name: 'Cliente Juan Perez',
        phone: '50212345678',
        nit: '998877-6',
        address: 'Zona 11, Las Majadas',
        email: 'migueldp4@gmail.com',
      }, 'token');

      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      // 1. La sección B2B no debe mostrarse
      expect(document.getElementById('autofillBox')).toBeNull();
      expect(document.getElementById('clientAutofillSelect')).toBeNull();

      // 2. No debe mostrar el checkbox de guardar en cartera B2B
      const syncCheck = document.getElementById('checkSaveToClients');
      expect(syncCheck).not.toBeNull();
      expect(syncCheck.type).toBe('hidden');
      expect(syncCheck.value).toBe('false');

      // 3. Los datos deben estar prellenados automáticamente
      expect(document.getElementById('custName').value).toBe('Cliente Juan Perez');
      expect(document.getElementById('custPhone').value).toBe('50212345678');
      expect(document.getElementById('custNit').value).toBe('998877-6');
      expect(document.getElementById('custAddress').value).toBe('Zona 11, Las Majadas');

      // 4. Enviar el pedido
      const form = document.getElementById('checkoutForm');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      // 5. El pedido incluye el email del usuario cliente y mensaje de confirmación
      const latest = ordersStore.getOrders()[0];
      expect(latest.customer.email).toBe('migueldp4@gmail.com');
      expect(document.getElementById('checkoutForm').textContent).toContain('¡Tu pedido ha sido enviado exitosamente!');
      expect(document.getElementById('checkoutForm').textContent).toContain('Tu pedido será revisado y confirmado por nuestro equipo a la brevedad.');
    });
    it('elimina el placeholder del campo de notas y muestra botón de WhatsApp para VISITOR (Task 15)', () => {
      store.clearUser();
      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      const notesInput = document.getElementById('custNotes');
      expect(notesInput.placeholder).toBe('');

      // En modo VISITOR, no hay botón de submit directo sino botón de WhatsApp
      expect(document.getElementById('btnSubmitCheckout')).toBeNull();
      const btnWa = document.getElementById('btnVisitorWhatsApp');
      expect(btnWa).not.toBeNull();
      expect(btnWa.getAttribute('href')).toContain('api.whatsapp.com');

      // Si se dispara submit en el formulario como VISITOR, abre WhatsApp y no crea orden
      window.open = vi.fn();
      const initialOrdersCount = ordersStore.getOrders().length;
      const form = document.getElementById('checkoutForm');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('api.whatsapp.com'), '_blank');
      expect(ordersStore.getOrders().length).toBe(initialOrdersCount + 1);
    });

    it('guarda todos los ítems del carrito en la cotización como modelo unificado (Task 18)', () => {
      cartStore.clearCart();
      cartStore.addItem({
        title: 'Diseño A',
        widthCm: 5,
        heightCm: 5,
        qty: 100,
        includeCutting: true,
      });
      cartStore.addItem({
        title: 'Diseño B',
        widthCm: 10,
        heightCm: 10,
        qty: 50,
        includeCutting: false,
      });

      renderCartDrawer(cartStore.getItems(), cartStore.getTotals());
      const btnSave = document.getElementById('btnCartSaveQuote');
      expect(btnSave).not.toBeNull();
      btnSave.click();

      const modal = document.getElementById('saveQuoteModal');
      expect(modal).not.toBeNull();

      // Rellenar y guardar
      document.getElementById('saveQuoteProjectName').value = 'Proyecto Multidiseño';
      document.getElementById('saveQuoteLeadName').value = 'Carlos Test';
      document.getElementById('saveQuoteLeadPhone').value = '12345678';

      const saveForm = document.getElementById('formSaveQuote');
      saveForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      const quotes = quotesStore.getQuotes();
      const saved = quotes.find(q => q.projectName === 'Proyecto Multidiseño');
      expect(saved).toBeDefined();
      expect(saved.items.length).toBe(2);
      expect(saved.items[0].title).toBe('Diseño A');
      expect(saved.items[1].title).toBe('Diseño B');
    });

    it('agrega todos los ítems del carrito al pedido en checkout (Task 20)', () => {
      store.setUser({
        role: 'CUSTOMER',
        name: 'Cliente Registrado',
        phone: '12345678',
        email: 'cliente@test.com',
      }, 'token');

      cartStore.clearCart();
      cartStore.addItem({
        title: 'Logo 1',
        widthCm: 6,
        heightCm: 6,
        qty: 60,
      });
      cartStore.addItem({
        title: 'Logo 2',
        widthCm: 8,
        heightCm: 8,
        qty: 40,
      });

      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      const submitBtn = document.getElementById('btnSubmitCheckout');
      expect(submitBtn).not.toBeNull();

      const form = document.getElementById('checkoutForm');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      const latestOrder = ordersStore.getOrders()[0];
      expect(latestOrder.items.length).toBe(2);
      expect(latestOrder.items[0].title).toBe('Logo 1');
      expect(latestOrder.items[1].title).toBe('Logo 2');
    });
    it('crea orden en el sistema y abre WhatsApp con folio al pulsar btnCartWhatsApp en cart drawer', async () => {
      cartStore.clearCart();
      cartStore.addItem({
        title: 'Diseño para WhatsApp',
        widthCm: 5,
        heightCm: 5,
        qty: 50,
      });

      renderCartDrawer(cartStore.getItems(), cartStore.getTotals());
      const btnWa = document.getElementById('btnCartWhatsApp');
      expect(btnWa).not.toBeNull();

      window.open = vi.fn();
      const initialOrders = ordersStore.getOrders().length;
      btnWa.click();

      expect(ordersStore.getOrders().length).toBe(initialOrders + 1);
      const newOrder = ordersStore.getOrders()[0];
      expect(newOrder.productionStatus).toBe('PENDING_REVIEW');
      expect(window.open).toHaveBeenCalledWith(expect.stringContaining(newOrder.id), '_blank');
      expect(cartStore.getItems().length).toBe(0);
    });

    it('ejecuta validación y submit del formulario al pulsar btnVisitorWhatsApp directamente', () => {
      store.clearUser();
      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      document.getElementById('custName').value = 'Visitante Juan';
      document.getElementById('custPhone').value = '5555-1234';
      document.getElementById('custAddress').value = 'San José el Placer';

      const btnWa = document.getElementById('btnVisitorWhatsApp');
      expect(btnWa).not.toBeNull();

      window.open = vi.fn();
      const initialOrders = ordersStore.getOrders().length;
      btnWa.click();

      expect(ordersStore.getOrders().length).toBe(initialOrders + 1);
      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('api.whatsapp.com'), '_blank');
    });
  });
});