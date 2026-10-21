/**
 * Componente Interactivo: Carrito de Compras (Drawer Lateral)
 * Gestiona la visualización de ítems agregados, despiece, cálculo consolidado y checkout.
 */

import { cartStore } from '../modules/cart-store.js';
import { formatWhatsAppCartOrder } from '../modules/cart-engine.js';
import { BUSINESS_CONFIG } from '../../shared/business-config.js';
import { openCheckoutModal } from './checkout-modal.js';
import { uploadCanvasSnapshotToStorage } from '../modules/file-uploader.js';

export function initCartDrawer() {
  let drawerContainer = document.getElementById('cartDrawerContainer');
  if (!drawerContainer) {
    drawerContainer = document.createElement('div');
    drawerContainer.id = 'cartDrawerContainer';
    document.body.appendChild(drawerContainer);
  }

  // Escuchar cambios reactivos en el almacén del carrito
  cartStore.subscribe(({ items, totals }) => {
    updateCartBadge(items.length);
    renderCartDrawer(items, totals);
  });

  // Render inicial
  const items = cartStore.getItems();
  const totals = cartStore.getTotals();
  updateCartBadge(items.length);
  renderCartDrawer(items, totals);

  // Vincular botón de apertura en el navbar
  const cartBtn = document.getElementById('cartToggleBtn');
  if (cartBtn) {
    cartBtn.addEventListener('click', openCartDrawer);
  }
}

export function updateCartBadge(count) {
  const badge = document.getElementById('cartCountBadge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

export function openCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');
  if (drawer && backdrop) {
    drawer.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

export function closeCartDrawer() {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');
  if (drawer && backdrop) {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
}

export function renderCartDrawer(items, totals) {
  const container = document.getElementById('cartDrawerContainer');
  if (!container) return;

  const isOpen = document.getElementById('cartDrawer')?.classList.contains('open');

  const itemsHtml = items.length === 0
    ? `
      <div class="cart-empty-state">
        <div class="cart-empty-icon">🛒</div>
        <h3>Tu carrito está vacío</h3>
        <p>Configura las medidas y cantidad de tus stickers en el cotizador y agrégalos a tu orden.</p>
        <button class="btn btn-primary" id="btnEmptyGoQuoter">Ir al Cotizador</button>
      </div>
    `
    : `
      <div class="cart-items-list">
        ${totals.items.map((item) => `
          <div class="cart-item-card" data-item-id="${item.id}">
            <div class="cart-item-preview">
              ${item.previewUrl 
                ? `<img src="${item.previewUrl}" alt="Arte" class="cart-thumb-img">`
                : `<div class="cart-thumb-placeholder">📄</div>`
              }
            </div>
            
            <div class="cart-item-info">
              <div class="cart-item-header">
                <h4 class="cart-item-title">${item.title}</h4>
                <button class="btn-remove-item" data-remove-id="${item.id}" title="Eliminar ítem">🗑️</button>
              </div>

              <div class="cart-item-meta">
                <span>${item.widthCm} × ${item.heightCm} cm</span>
                <span>•</span>
                <span>${item.actualLinearMeters.toFixed(2)} m lineales</span>
              </div>

              <div class="cart-item-tags">
                <span class="badge ${item.includeCutting ? 'badge-cut' : ''}">
                  ${item.includeCutting ? `✂️ Con corte (+Q${item.cuttingRawQ.toFixed(2)})` : `📜 En rollo`}
                </span>
                ${item.fileInfo 
                  ? `<span class="badge badge-file" title="${item.fileInfo.name}">📁 ${item.fileInfo.name}</span>`
                  : `<span class="badge badge-warning">⚠️ Sin archivo adjunto</span>`
                }
              </div>

              <div class="cart-item-footer">
                <div class="qty-selector">
                  <button class="btn-qty-decrease" data-qty-item="${item.id}">−</button>
                  <span class="qty-value">${item.qty}</span>
                  <button class="btn-qty-increase" data-qty-item="${item.id}">+</button>
                </div>
                <div class="cart-item-price-hint">
                  Acomodo: ${item.stickersPerRow} / fila
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

  container.innerHTML = `
    <div class="cart-backdrop ${isOpen ? 'open' : ''}" id="cartBackdrop"></div>
    <div class="cart-drawer ${isOpen ? 'open' : ''}" id="cartDrawer" role="dialog" aria-modal="true" aria-label="Carrito de compras">
      <div class="cart-header">
        <div class="cart-header-title">
          <h3>Carrito de Compras UV DTF</h3>
          <span class="badge">${items.length} ${items.length === 1 ? 'diseño' : 'diseños'}</span>
        </div>
        <button class="btn-close-cart" id="btnCloseCart" aria-label="Cerrar carrito">✕</button>
      </div>

      <div class="cart-body">
        ${itemsHtml}
      </div>

      ${items.length > 0 ? `
        <div class="cart-footer">
          <div class="cart-summary-card">
            <div class="summary-line">
              <span>Metros Totales Agrupados:</span>
              <strong>${totals.totalBillableMeters.toFixed(2)} m ${totals.isUnderMin ? '(Mínimo 1m)' : ''}</strong>
            </div>
            <div class="summary-line">
              <span>Escala Aplicada de Mayoreo:</span>
              <strong style="color: var(--cerulean);">Q${totals.tierRate.toFixed(2)} / metro</strong>
            </div>
            <div class="summary-line">
              <span>Subtotal Material:</span>
              <strong>Q${totals.materialTotalQ.toFixed(2)}</strong>
            </div>
            ${totals.hasCutting ? `
              <div class="summary-line">
                <span>Servicio de Corte (${totals.isCuttingMinApplied ? 'Mínimo' : 'Piezas'}):</span>
                <strong style="color: var(--color-success);">+Q${totals.cuttingTotalQ.toFixed(2)}</strong>
              </div>
            ` : ''}
            <div class="summary-total-line">
              <span>TOTAL ESTIMADO:</span>
              <span class="grand-total-amount">Q${totals.grandTotalQ.toFixed(2)}</span>
            </div>
          </div>

          <div class="cart-actions">
            <button class="btn btn-whatsapp" id="btnCartWhatsApp" style="width: 100%;">
              <span>Enviar Pedido Completo por WhatsApp</span>
              <span>💬</span>
            </button>
            <button class="btn btn-primary" id="btnCartCheckout" style="width: 100%;">
              <span>Confirmar Pedido y Datos de Entrega</span>
              <span>🚀</span>
            </button>
            <button class="btn-clear-cart" id="btnClearCart">Vaciar Carrito</button>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  // Asignar eventos del DOM
  attachCartEventListeners(items, totals);
}

function attachCartEventListeners(items, totals) {
  const backdrop = document.getElementById('cartBackdrop');
  const btnClose = document.getElementById('btnCloseCart');
  const btnEmptyGoQuoter = document.getElementById('btnEmptyGoQuoter');

  if (backdrop) backdrop.addEventListener('click', closeCartDrawer);
  if (btnClose) btnClose.addEventListener('click', closeCartDrawer);
  if (btnEmptyGoQuoter) {
    btnEmptyGoQuoter.addEventListener('click', () => {
      closeCartDrawer();
      window.location.hash = '#cotizador';
    });
  }

  // Eliminar ítem
  const removeButtons = document.querySelectorAll('.btn-remove-item');
  removeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.removeId;
      cartStore.removeItem(id);
    });
  });

  // Incrementar / Decrementar Cantidad
  const decreaseButtons = document.querySelectorAll('.btn-qty-decrease');
  decreaseButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.qtyItem;
      const item = items.find(i => i.id === id);
      if (item && item.qty > 10) {
        cartStore.updateItemQty(id, item.qty - 10);
      } else if (item && item.qty > 1) {
        cartStore.updateItemQty(id, item.qty - 1);
      }
    });
  });

  const increaseButtons = document.querySelectorAll('.btn-qty-increase');
  increaseButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.qtyItem;
      const item = items.find(i => i.id === id);
      if (item) {
        cartStore.updateItemQty(id, item.qty + 25);
      }
    });
  });

  // Vaciar carrito
  const btnClear = document.getElementById('btnClearCart');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (confirm('¿Deseas vaciar todos los diseños de tu carrito?')) {
        cartStore.clearCart();
      }
    });
  }

  // Enviar por WhatsApp
  const btnWhatsApp = document.getElementById('btnCartWhatsApp');
  if (btnWhatsApp) {
    btnWhatsApp.addEventListener('click', async () => {
      if (totals.items && Array.isArray(totals.items)) {
        for (const item of totals.items) {
          if (!item.canvasSnapshotUrl && item.canvasSnapshot && item.canvasSnapshot.startsWith('data:')) {
            try {
              const snapUrl = await uploadCanvasSnapshotToStorage(
                item.canvasSnapshot,
                `bobina_${item.widthCm}x${item.heightCm}cm.png`,
                { context: 'orders' }
              );
              if (snapUrl) {
                item.canvasSnapshotUrl = snapUrl;
              }
            } catch (err) {
              console.warn('[Storage] Error subiendo snapshot en cart drawer:', err);
            }
          }
        }
      }
      const text = formatWhatsAppCartOrder(totals);
      const url = `https://api.whatsapp.com/send?phone=${BUSINESS_CONFIG.phoneWhatsApp}&text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    });
  }

  // Checkout modal
  const btnCheckout = document.getElementById('btnCartCheckout');
  if (btnCheckout) {
    btnCheckout.addEventListener('click', () => {
      closeCartDrawer();
      openCheckoutModal(totals);
    });
  }
}
