/**
 * Modal de Checkout y Confirmación de Pedido UV DTF
 * Recopila datos de facturación SAT (NIT), entrega y notas de producción.
 * Incorpora Autocompletado Inteligente sincronizado con la Cartera de Clientes B2B.
 */

import { formatWhatsAppCartOrder } from '../modules/cart-engine.js';
import { cartStore } from '../modules/cart-store.js';
import { store } from '../store.js';
import { BUSINESS_CONFIG } from '../../shared/business-config.js';
import { ordersStore } from '../modules/orders-store.js';
import { clientsStore, CLIENT_TIERS } from '../modules/clients-store.js';
import { uploadCanvasSnapshotToStorage, uploadFileToStorage, readFileAsDataURL, validateReceiptFile, formatFileSize } from '../modules/file-uploader.js';

export function openCheckoutModal(cartTotals) {
  let modalContainer = document.getElementById('checkoutModalContainer');
  if (!modalContainer) {
    modalContainer = document.createElement('div');
    modalContainer.id = 'checkoutModalContainer';
    document.body.appendChild(modalContainer);
  }

  const user = store.state.user || {};
  const clients = clientsStore.getClients();

  // Detección inicial de cliente registrado o perfil activo
  let initialClient = null;
  if (user.clientId) {
    initialClient = clientsStore.getClientById(user.clientId);
  } else if (user.nit && user.nit !== 'CF') {
    initialClient = clientsStore.getClientByNit(user.nit);
  } else if (user.phone) {
    initialClient = clientsStore.getClientByPhone(user.phone);
  } else if (user.email) {
    initialClient = clients.find(c => c.email && c.email.toLowerCase() === user.email.toLowerCase()) || null;
  }

  let selectedClientId = initialClient ? initialClient.id : null;

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
        <button class="btn-close-modal" id="btnCloseCheckout" aria-label="Cerrar modal">✕</button>
      </div>

      <form id="checkoutForm" class="modal-body">
        <!-- SECCIÓN DE AUTOCOMPLETADO INTELIGENTE B2B -->
        <div class="client-autofill-box" id="autofillBox">
          <div class="client-autofill-header">
            <label class="form-label" for="clientAutofillSelect" style="margin: 0; font-weight: 700; color: var(--cerulean); display: flex; align-items: center; gap: 0.35rem;">
              <span>⚡</span>
              <span>Autocompletar con Cartera B2B:</span>
            </label>
            <button type="button" id="btnClearAutofill" class="btn-clear-autofill" style="display: ${selectedClientId ? 'inline-flex' : 'none'};">
              Desvincular ✕
            </button>
          </div>
          <select id="clientAutofillSelect" class="input-control" aria-label="Seleccionar cliente B2B">
            <option value="">-- Seleccionar cliente registrado o escribir nuevo --</option>
            ${clients.map(c => `
              <option value="${c.id}" ${c.id === selectedClientId ? 'selected' : ''}>
                ${c.company} (${c.name}) • ${CLIENT_TIERS[c.tier]?.badge || c.tier}
              </option>
            `).join('')}
          </select>
          <div id="autofillBadgeContainer" style="display: ${selectedClientId ? 'block' : 'none'}; margin-top: 0.5rem;">
            ${initialClient ? `
              <div class="autofill-linked-badge" style="background: ${CLIENT_TIERS[initialClient.tier]?.bg || 'rgba(28, 114, 147, 0.15)'}; color: ${CLIENT_TIERS[initialClient.tier]?.color || 'var(--cerulean)'}; border: 1px solid ${CLIENT_TIERS[initialClient.tier]?.color || 'var(--cerulean)'};">
                <span>🏢 Cliente Vinculado: <strong>${initialClient.company}</strong></span>
                <span class="badge" style="background: ${CLIENT_TIERS[initialClient.tier]?.color || 'var(--cerulean)'}; color: #fff;">${CLIENT_TIERS[initialClient.tier]?.badge || initialClient.tier}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="custName">Nombre o Empresa / Marca *</label>
          <input type="text" id="custName" class="input-control" required placeholder="Ej. Rodrigo Méndez / Café San Cristóbal" value="${initialClient ? (initialClient.company || initialClient.name) : (user.name || '')}">
        </div>

        <div class="input-row">
          <div class="form-group">
            <label class="form-label" for="custPhone">Teléfono de WhatsApp *</label>
            <input type="tel" id="custPhone" class="input-control" required placeholder="Ej. 5555-1234" value="${initialClient ? initialClient.phone : (user.phone || '')}">
          </div>
          <div class="form-group">
            <label class="form-label" for="custNit">NIT (SAT Guatemala)</label>
            <input type="text" id="custNit" class="input-control" placeholder="Ej. 7845129-4 o CF" value="${initialClient ? initialClient.nit : (user.nit || 'CF')}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="custAddress">Dirección de Entrega o Recolección *</label>
          <textarea id="custAddress" class="input-control" rows="2" required placeholder="Zona, Municipio (ej. Zona 10, Ciudad de Guatemala) o 'Recojo en taller San José el Placer / Villa Nueva'">${initialClient ? initialClient.address : ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="custNotes">Instrucciones o Notas Especiales</label>
          <input type="text" id="custNotes" class="input-control" placeholder="Ej. Relieve pronunciado, barniz brillante, etc." value="${initialClient ? (initialClient.notes || '') : ''}">
        </div>

        <div class="form-group" style="margin: 0.65rem 0;">
          <label style="display: flex; align-items: center; gap: 0.6rem; font-size: 0.88rem; cursor: pointer; color: var(--text-secondary);">
            <input type="checkbox" id="checkSaveToClients" checked>
            <span>💾 Guardar / Sincronizar en Cartera de Clientes B2B</span>
          </label>
        </div>
        <!-- INFORMACIÓN DE PAGO BANCARIO Y SUBIDA DE BOLETA -->
        <div class="checkout-bank-box" style="margin: 0.85rem 0; padding: 0.85rem; background: var(--bg-surface-elevated); border: 1px solid var(--border-color); border-radius: var(--radius-sm, 6px);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem; flex-wrap: wrap; gap: 0.4rem;">
            <strong style="font-size: 0.88rem; color: var(--cerulean); display: flex; align-items: center; gap: 0.35rem;">
              <span>💳</span>
              <span>Cuentas para Transferencia / Depósito</span>
            </strong>
            <span class="badge" style="font-size: 0.72rem;">Anticipo 50% o Pago 100%</span>
          </div>
          <div style="font-size: 0.78rem; line-height: 1.5; color: var(--text-secondary); margin-bottom: 0.65rem;">
            <div>• <strong>Banco Industrial (Monetaria Q):</strong> <code style="user-select: all; font-weight: 700; color: var(--text-primary);">144-002931-2</code></div>
            <div>• <strong>BAC Credomatic (Monetaria Q):</strong> <code style="user-select: all; font-weight: 700; color: var(--text-primary);">90-341902-1</code></div>
            <div>• <strong>Banrural (Monetaria Q):</strong> <code style="user-select: all; font-weight: 700; color: var(--text-primary);">3033-09182-1</code></div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">Beneficiario: Miguel Angel Dubois / Kroma Lab</div>
          </div>

          <label class="form-label" for="checkoutReceiptInput" style="font-size: 0.82rem; margin-bottom: 0.25rem;">
            Adjuntar Boleta o Comprobante de Pago (Opcional):
          </label>
          <div class="checkout-receipt-dropzone" id="checkoutReceiptDropzone" style="border: 1px dashed var(--border-color); border-radius: 4px; padding: 0.65rem; text-align: center; cursor: pointer; background: rgba(28, 114, 147, 0.04); min-height: 44px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: border-color 0.2s;">
            <input type="file" id="checkoutReceiptInput" accept=".jpg,.jpeg,.png,.pdf" style="display: none;">
            <div id="checkoutReceiptPrompt" style="font-size: 0.82rem; color: var(--text-secondary);">
              <span>📎 Clic para seleccionar comprobante (JPG, PNG o PDF)</span>
            </div>
            <div id="checkoutReceiptPreview" style="display: none; align-items: center; justify-content: space-between; width: 100%; gap: 0.5rem; text-align: left;">
              <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
                <img id="checkoutReceiptThumb" src="" alt="Boleta" style="width: 36px; height: 36px; object-fit: cover; border-radius: 3px; display: none; border: 1px solid var(--border-color);">
                <span id="checkoutReceiptIcon" style="font-size: 1.5rem; display: none;">📄</span>
                <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  <strong id="checkoutReceiptFileName" style="font-size: 0.82rem; display: block; overflow: hidden; text-overflow: ellipsis;"></strong>
                  <span id="checkoutReceiptFileSize" style="font-size: 0.74rem; color: var(--text-muted);"></span>
                </div>
              </div>
              <button type="button" id="btnRemoveCheckoutReceipt" class="btn-action-icon" title="Quitar comprobante" style="min-width: 36px; min-height: 36px; color: #ef4444; font-size: 1rem;">✕</button>
            </div>
          </div>
          <div id="checkoutReceiptError" style="display: none; color: #ef4444; font-size: 0.75rem; margin-top: 0.35rem;"></div>
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
  const autofillSelect = document.getElementById('clientAutofillSelect');
  const btnClearAutofill = document.getElementById('btnClearAutofill');
  const badgeContainer = document.getElementById('autofillBadgeContainer');

  const receiptInput = document.getElementById('checkoutReceiptInput');
  const receiptDropzone = document.getElementById('checkoutReceiptDropzone');
  const receiptPrompt = document.getElementById('checkoutReceiptPrompt');
  const receiptPreview = document.getElementById('checkoutReceiptPreview');
  const receiptThumb = document.getElementById('checkoutReceiptThumb');
  const receiptIcon = document.getElementById('checkoutReceiptIcon');
  const receiptFileName = document.getElementById('checkoutReceiptFileName');
  const receiptFileSize = document.getElementById('checkoutReceiptFileSize');
  const btnRemoveReceipt = document.getElementById('btnRemoveCheckoutReceipt');
  const receiptError = document.getElementById('checkoutReceiptError');

  let selectedReceiptFile = null;

  function clearReceiptSelection() {
    selectedReceiptFile = null;
    if (receiptInput) receiptInput.value = '';
    if (receiptPreview) receiptPreview.style.display = 'none';
    if (receiptPrompt) receiptPrompt.style.display = 'block';
    if (receiptThumb) { receiptThumb.src = ''; receiptThumb.style.display = 'none'; }
    if (receiptIcon) receiptIcon.style.display = 'none';
    if (receiptFileName) receiptFileName.textContent = '';
    if (receiptFileSize) receiptFileSize.textContent = '';
    if (receiptError) { receiptError.textContent = ''; receiptError.style.display = 'none'; }
  }

  async function handleReceiptFileSelection(file) {
    if (!file) return;
    const validation = validateReceiptFile(file);
    if (!validation.valid) {
      if (receiptError) {
        receiptError.textContent = validation.error;
        receiptError.style.display = 'block';
      }
      return;
    }
    if (receiptError) {
      receiptError.textContent = '';
      receiptError.style.display = 'none';
    }
    selectedReceiptFile = file;
    if (receiptFileName) receiptFileName.textContent = file.name;
    if (receiptFileSize) receiptFileSize.textContent = formatFileSize(file.size);
    if (receiptPrompt) receiptPrompt.style.display = 'none';
    if (receiptPreview) receiptPreview.style.display = 'flex';

    const ext = (file.name || '').slice((file.name || '').lastIndexOf('.')).toLowerCase();
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      try {
        const dataUrl = await readFileAsDataURL(file);
        if (dataUrl && receiptThumb) {
          receiptThumb.src = dataUrl;
          receiptThumb.style.display = 'block';
          if (receiptIcon) receiptIcon.style.display = 'none';
        }
      } catch (e) {
        if (receiptIcon) receiptIcon.style.display = 'inline-block';
      }
    } else {
      if (receiptThumb) receiptThumb.style.display = 'none';
      if (receiptIcon) receiptIcon.style.display = 'inline-block';
    }
  }

  if (receiptDropzone && receiptInput) {
    receiptDropzone.addEventListener('click', (e) => {
      if (e.target.closest('#btnRemoveCheckoutReceipt')) return;
      receiptInput.click();
    });

    receiptDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      receiptDropzone.style.borderColor = 'var(--cerulean)';
    });

    receiptDropzone.addEventListener('dragleave', () => {
      receiptDropzone.style.borderColor = 'var(--border-color)';
    });

    receiptDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      receiptDropzone.style.borderColor = 'var(--border-color)';
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleReceiptFileSelection(e.dataTransfer.files[0]);
      }
    });
  }

  if (receiptInput) {
    receiptInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleReceiptFileSelection(e.target.files[0]);
      }
    });
  }

  if (btnRemoveReceipt) {
    btnRemoveReceipt.addEventListener('click', (e) => {
      e.stopPropagation();
      clearReceiptSelection();
    });
  }

  const nameInput = document.getElementById('custName');
  const phoneInput = document.getElementById('custPhone');
  const nitInput = document.getElementById('custNit');
  const addressInput = document.getElementById('custAddress');
  const notesInput = document.getElementById('custNotes');

  function updateBadge(client) {
    if (!badgeContainer) return;
    if (!client) {
      badgeContainer.style.display = 'none';
      badgeContainer.innerHTML = '';
      if (btnClearAutofill) btnClearAutofill.style.display = 'none';
      return;
    }
    const tier = CLIENT_TIERS[client.tier] || { badge: client.tier, bg: 'rgba(28, 114, 147, 0.15)', color: 'var(--cerulean)' };
    badgeContainer.style.display = 'block';
    badgeContainer.innerHTML = `
      <div class="autofill-linked-badge" style="background: ${tier.bg}; color: ${tier.color}; border: 1px solid ${tier.color};">
        <span>🏢 Cliente Vinculado: <strong>${client.company}</strong></span>
        <span class="badge" style="background: ${tier.color}; color: #fff;">${tier.badge}</span>
      </div>
    `;
    if (btnClearAutofill) btnClearAutofill.style.display = 'inline-flex';
  }

  if (autofillSelect) {
    autofillSelect.addEventListener('change', (e) => {
      const id = e.target.value;
      if (id) {
        const c = clientsStore.getClientById(id);
        if (c) {
          selectedClientId = c.id;
          if (nameInput) nameInput.value = c.company || c.name;
          if (phoneInput) phoneInput.value = c.phone || '';
          if (nitInput) nitInput.value = c.nit || 'CF';
          if (addressInput) addressInput.value = c.address || '';
          if (notesInput && c.notes) notesInput.value = c.notes;
          updateBadge(c);
        }
      } else {
        selectedClientId = null;
        updateBadge(null);
      }
    });
  }

  if (btnClearAutofill) {
    btnClearAutofill.addEventListener('click', () => {
      selectedClientId = null;
      if (autofillSelect) autofillSelect.value = '';
      updateBadge(null);
      if (nameInput) nameInput.value = user.name || '';
      if (phoneInput) phoneInput.value = user.phone || '';
      if (nitInput) nitInput.value = user.nit || 'CF';
      if (addressInput) addressInput.value = '';
      if (notesInput) notesInput.value = '';
    });
  }

  if (backdrop) backdrop.addEventListener('click', closeCheckoutModal);
  if (btnClose) btnClose.addEventListener('click', closeCheckoutModal);

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nameVal = nameInput?.value?.trim() || '';
      const phoneVal = phoneInput?.value?.trim() || '';
      const nitVal = nitInput?.value?.trim() || 'CF';
      const addressVal = addressInput?.value?.trim() || '';
      const notesVal = notesInput?.value?.trim() || '';
      const shouldSync = Boolean(document.getElementById('checkSaveToClients')?.checked);

      let linkedClientId = selectedClientId;

      if (shouldSync) {
        if (linkedClientId) {
          // Si ya está vinculado, sincronizamos posibles actualizaciones
          clientsStore.updateClient(linkedClientId, {
            phone: phoneVal || undefined,
            nit: nitVal || undefined,
            address: addressVal || undefined,
          });
        } else {
          // Si no está seleccionado de la lista, verificamos si existe por NIT o Teléfono
          const existing = (nitVal && nitVal !== 'CF' ? clientsStore.getClientByNit(nitVal) : null) || clientsStore.getClientByPhone(phoneVal);
          if (existing) {
            linkedClientId = existing.id;
            clientsStore.updateClient(existing.id, {
              address: addressVal || existing.address,
              name: nameVal || existing.name,
            });
          } else if (nameVal) {
            // Registrar nuevo cliente en la Cartera B2B
            const created = clientsStore.createClient({
              name: nameVal,
              company: nameVal,
              phone: phoneVal || '+502 5555-0000',
              nit: nitVal,
              address: addressVal || 'Ciudad de Guatemala',
              notes: notesVal,
              tier: 'NUEVO',
            });
            linkedClientId = created.id;
          }
        }
      }

      const linkedClient = linkedClientId ? clientsStore.getClientById(linkedClientId) : null;
      const companyName = linkedClient ? linkedClient.company : nameVal;

      const customer = {
        name: nameVal,
        company: companyName,
        phone: phoneVal,
        nit: nitVal,
        address: addressVal,
        notes: notesVal,
        clientId: linkedClientId || null,
      };

      if (cartTotals.items && Array.isArray(cartTotals.items)) {
        for (const item of cartTotals.items) {
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
              console.warn('[Storage] Error subiendo snapshot en checkout:', err);
            }
          }
        }
      }

      let paymentReceiptUrl = null;
      let paymentReceiptFileName = null;

      if (selectedReceiptFile) {
        try {
          const receiptRes = await uploadFileToStorage(selectedReceiptFile, { context: 'payments' });
          if (receiptRes && receiptRes.fileUrl) {
            paymentReceiptUrl = receiptRes.fileUrl;
            paymentReceiptFileName = selectedReceiptFile.name;
          }
        } catch (rErr) {
          console.warn('[Checkout] Error subiendo comprobante a storage:', rErr);
          paymentReceiptFileName = selectedReceiptFile.name;
        }
      }

      customer.paymentReceiptUrl = paymentReceiptUrl;
      customer.paymentReceiptFileName = paymentReceiptFileName;
      cartTotals.paymentReceiptUrl = paymentReceiptUrl;
      cartTotals.paymentReceiptFileName = paymentReceiptFileName;

      ordersStore.createOrder({
        customer,
        cartTotals,
        items: cartTotals.items || [],
        workshopNotes: customer.notes || '',
        paymentReceiptUrl,
        paymentReceiptFileName,
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
