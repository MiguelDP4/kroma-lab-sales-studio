/**
 * Modal de Checkout y Confirmación de Pedido UV DTF
 * Recopila datos de facturación SAT (NIT), entrega y notas de producción.
 */

import { formatWhatsAppCartOrder } from '../modules/cart-engine.js';
import { cartStore } from '../modules/cart-store.js';
import { store } from '../store.js';
import { BUSINESS_CONFIG } from '../../shared/business-config.js';
import { ordersStore } from '../modules/orders-store.js';

export function openCheckoutModal(cartTotals) {
  let modalContainer = document.getElementById('checkoutModalContainer');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'checkoutModalContainer';
    document.body.appendChild(modalContainer);
  }

  const user = store.state.user || {};

  modalContainer.innerHTML = `
    <div class="modal-backdrop" id="checkoutBackdrop"></div>
    <div class="modal-card" id="checkoutModal" role="dialog" aria-modal="true" aria-labelledby="checkoutModalTitle">
      <div class="modal-header">
        <div>
          <span class="badge">Paso Final</span>
          <h3 id="checkoutModalTitle" style="font-size: 1.4rem; font-weight: 800; margin-top: 0.25rem;">
            Datos de Entrega y Facturación
          </h3>
        </div>
        <button class="btn-close-modal" id="btnCloseCheckout">✕</button>
      </div>

      <form id="checkoutForm" class="modal-body">
        <div class="form-group">
          <label class="form-label" for="custName">Nombre o Empresa / Marca *</label>
          <input type="text" id="custName" class="input-control" required placeholder="Ej. Rodrigo Méndez / Café San Cristóbal" value="${user.name || ''}">
        </div>

        <div class="input-row">
          <div class="form-group">
            <label class="form-label" for="custPhone">Teléfono de WhatsApp *</label>
            <input type="tel" id="custPhone" class="input-control" required placeholder="Ej. 5555-1234" value="${user.phone || ''}">
          </div>
          <div class="form-group">
            <label class="form-label" for="custNit">NIT (SAT Guatemala)</label>
            <input type="text" id="custNit" class="input-control" placeholder="Ej. 7845129-4 o CF" value="${user.nit || 'CF'}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="custAddress">Dirección de Entrega o Recolección *</label>
          <textarea id="custAddress" class="input-control" rows="2" required placeholder="Zona, Municipio (ej. Zona 10, Ciudad de Guatemala) o 'Recojo en taller San José el Placer / Villa Nueva'"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="custNotes">Instrucciones o Notas Especiales</label>
          <input type="text" id="custNotes" class="input-control" placeholder="Ej. Relieve pronunciado, barniz brillante, etc.">
        </div>

        <div class="checkout-summary-box">
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.35rem;">
            <span>Diseños a procesar:</span>
            <strong>${cartTotals.totalItemsCount} (${cartTotals.totalStickers} stickers)</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.9rem; margin-bottom: 0.35rem;">
            <span>Metros lineales facturables:</span>
            <strong>${cartTotals.totalBillableMeters.toFixed(2)} m</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 1.15rem; font-weight: 800; color: var(--text-primary); border-top: 1px solid var(--border-color); padding-top: 0.5rem; margin-top: 0.5rem;">
            <span>Total a Pagar:</span>
            <span style="color: var(--color-success); font-family: var(--font-mono);">Q${cartTotals.grandTotalQ.toFixed(2)}</span>
          </div>
        </div>

        <div class="modal-footer">
          <button type="submit" class="btn btn-whatsapp" style="width: 100%;">
            <span>Enviar Pedido Directo por WhatsApp</span>
            <span>💬</span>
          </button>
        </div>
      </form>
    </div>
  `;

  // Asignar listeners
  const backdrop = document.getElementById('checkoutBackdrop');
  const btnClose = document.getElementById('btnCloseCheckout');
  const form = document.getElementById('checkoutForm');

  if (backdrop) backdrop.addEventListener('click', closeCheckoutModal);
  if (btnClose) btnClose.addEventListener('click', closeCheckoutModal);

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const customer = {
        name: document.getElementById('custName')?.value || '',
        phone: document.getElementById('custPhone')?.value || '',
        nit: document.getElementById('custNit')?.value || 'CF',
        address: document.getElementById('custAddress')?.value || '',
        notes: document.getElementById('custNotes')?.value || '',
      };

      ordersStore.createOrder({
        customer,
        cartTotals,
        items: cartTotals.items || [],
        workshopNotes: customer.notes || '',
      });
      cartStore.clearCart();

      const text = formatWhatsAppCartOrder(cartTotals, customer);
      const url = `https://api.whatsapp.com/send?phone=${BUSINESS_CONFIG.phoneWhatsApp}&text=${encodeURIComponent(text)}`;
      
      closeCheckoutModal();
      window.open(url, '_blank');
    });
  }
}

export function closeCheckoutModal() {
  const container = document.getElementById('checkoutModalContainer');
  if (container) {
    container.innerHTML = '';
  }
}
