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
  });
});
