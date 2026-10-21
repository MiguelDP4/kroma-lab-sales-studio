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

    it('navega al cotizador desde el estado vacío al hacer clic en btnEmptyGoQuoter', () => {
      initCartDrawer();
      openCartDrawer();
      const btnGo = document.getElementById('btnEmptyGoQuoter');
      btnGo.click();
      expect(document.getElementById('cartDrawer').classList.contains('open')).toBe(false);
      expect(window.location.hash).toBe('#cotizador');
    });

    it('abre el modal de checkout al hacer clic en btnCartCheckout', () => {
      initCartDrawer();
      cartStore.addItem({ widthCm: 5, heightCm: 5, qty: 50 });

      const btnCheckout = document.getElementById('btnCartCheckout');
      btnCheckout.click();

      expect(document.getElementById('checkoutModal')).not.toBeNull();
    });

    it('vacía el carrito al hacer clic en btnClearCart', () => {
      initCartDrawer();
      cartStore.addItem({ widthCm: 5, heightCm: 5, qty: 50 });
      expect(cartStore.getItems().length).toBe(1);

      const btnClear = document.getElementById('btnClearCart');
      btnClear.click();

      expect(cartStore.getItems().length).toBe(0);
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
    it('abre el modal de checkout y envía el formulario de confirmación con datos de usuario', () => {
      // Probar cuando no existe container previo en el DOM
      document.getElementById('checkoutModalContainer').remove();

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

      expect(window.open).toHaveBeenCalledWith(expect.stringContaining('Carlos%20Rivera'), '_blank');
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
      expect(window.open).toHaveBeenCalled();
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

      expect(window.open).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('inicializa el modal de checkout con datos prellenados si el usuario ha iniciado sesión', () => {
      import('../src/js/store.js').then(({ store }) => {
        store.setUser({ name: 'Empresa Test', phone: '99887766', nit: '98765-4' }, 'token');
      });

      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      const form = document.getElementById('checkoutForm');
      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

      expect(window.open).toHaveBeenCalled();
    });

    it('cierra el modal al hacer clic en btnCloseCheckout o en el backdrop', () => {
      const totals = cartStore.getTotals();
      openCheckoutModal(totals);

      const btnClose = document.getElementById('btnCloseCheckout');
      btnClose.click();
      expect(document.getElementById('checkoutModal')).toBeNull();

      openCheckoutModal(totals);
      const backdrop = document.getElementById('checkoutBackdrop');
      backdrop.click();
      expect(document.getElementById('checkoutModal')).toBeNull();
    });

    it('permite autocompletar campos de checkout al seleccionar un cliente B2B y desvincularlo', () => {
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

    it('sincroniza y crea nuevo cliente en clientsStore al procesar checkout', () => {
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

    it('actualiza cliente B2B existente y asocia el pedido al confirmar checkout', () => {
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

    it('preselecciona automáticamente el cliente si el usuario en sesión tiene clientId asociado', () => {
      store.setUser({
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

    it('preselecciona cliente si el usuario coincide por NIT, teléfono o email', () => {
      // Coincidencia por NIT
      store.setUser({ nit: '7845129-4' }, 'token');
      openCheckoutModal(cartStore.getTotals());
      expect(document.getElementById('clientAutofillSelect').value).toBe('CLI-001');

      // Coincidencia por teléfono
      store.setUser({ phone: '+502 5111-2233' }, 'token');
      openCheckoutModal(cartStore.getTotals());
      expect(document.getElementById('clientAutofillSelect').value).toBe('CLI-002');

      // Coincidencia por email
      store.setUser({ email: 'ventas@elinjerto.gt' }, 'token');
      openCheckoutModal(cartStore.getTotals());
      expect(document.getElementById('clientAutofillSelect').value).toBe('CLI-003');

      store.clearUser();
    });

    it('resetea selección al cambiar select a opción vacía y procesa submit sin sincronizar cuando checkbox está desmarcado', () => {
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

      expect(window.open).toHaveBeenCalled();
    });

    it('vincula automáticamente a un cliente existente por NIT si no fue seleccionado en el dropdown', () => {
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
  });
});
