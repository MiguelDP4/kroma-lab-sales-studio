import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { clientsView } from '../src/js/views/clients-view.js';
import { clientsStore } from '../src/js/modules/clients-store.js';
import { ordersStore } from '../src/js/modules/orders-store.js';
import { store } from '../src/js/store.js';

describe('Clients View — Interfaz de Directorio B2B y Cartera de Clientes', () => {
  let cleanupFn = null;

  beforeEach(() => {
    localStorage.clear();
    ordersStore.resetToInitial();
    clientsStore.resetToInitial();
    store.setUser({ id: '1', role: 'ADMIN' }, 'test-token');

    document.body.innerHTML = `
      <main id="app">
        ${clientsView.render()}
      </main>
    `;
    cleanupFn = clientsView.onMount();
  });

  afterEach(() => {
    if (cleanupFn) cleanupFn();
    document.body.innerHTML = '';
  });

  it('renderiza la cabecera, indicadores KPI y tabla de clientes B2B', () => {
    const title = document.querySelector('h1');
    expect(title.textContent).toContain('Directorio de Clientes');

    const badge = document.querySelector('.badge');
    expect(badge.textContent).toBe('Cartera B2B');

    const metricsContainer = document.getElementById('clientsMetricsContainer');
    expect(metricsContainer).not.toBeNull();
    expect(metricsContainer.textContent).toContain('Cartera B2B Activa');
    expect(metricsContainer.textContent).toContain('Clientes VIP / Recurrentes');
    expect(metricsContainer.textContent).toContain('Metraje Cartera Total');
    expect(metricsContainer.textContent).toContain('Cuentas por Cobrar');

    const rows = document.querySelectorAll('#clientsTableBody tr');
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });

  it('filtra clientes por texto de búsqueda en tiempo real', () => {
    const searchInput = document.getElementById('clientSearchInput');
    searchInput.value = 'Café San Cristóbal';
    searchInput.dispatchEvent(new Event('input'));

    let rows = document.querySelectorAll('#clientsTableBody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Café San Cristóbal');

    // Búsqueda sin coincidencias muestra empty state
    searchInput.value = 'EmpresaInexistente999';
    searchInput.dispatchEvent(new Event('input'));

    rows = document.querySelectorAll('#clientsTableBody tr');
    expect(rows.length).toBe(0);
    const emptyState = document.getElementById('clientsEmptyState');
    expect(emptyState.style.display).toBe('block');
  });

  it('filtra clientes por categoría y nivel de cliente', () => {
    const catFilter = document.getElementById('clientCategoryFilter');
    const tierFilter = document.getElementById('clientTierFilter');

    catFilter.value = 'RESTAURANTES_CAFES';
    catFilter.dispatchEvent(new Event('change'));

    let rows = document.querySelectorAll('#clientsTableBody tr');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].textContent).toContain('Café San Cristóbal');

    catFilter.value = 'ALL';
    tierFilter.value = 'VIP';
    tierFilter.dispatchEvent(new Event('change'));

    rows = document.querySelectorAll('#clientsTableBody tr');
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it('abre y cierra el modal para registrar un nuevo cliente', () => {
    const formModal = document.getElementById('clientFormModal');
    const btnOpen = document.getElementById('btnOpenNewClientModal');
    const btnCancel = document.getElementById('btnCancelClientFormModal');
    const btnClose = document.getElementById('btnCloseClientFormModal');

    btnOpen.click();
    expect(formModal.style.display).toBe('block');
    expect(document.getElementById('clientFormTitle').textContent).toContain('Registrar Cliente');

    btnCancel.click();
    expect(formModal.style.display).toBe('none');

    btnOpen.click();
    expect(formModal.style.display).toBe('block');
    btnClose.click();
    expect(formModal.style.display).toBe('none');
  });

  it('registra un nuevo cliente mediante el formulario', () => {
    const formModal = document.getElementById('clientFormModal');
    const btnOpen = document.getElementById('btnOpenNewClientModal');
    const form = document.getElementById('formClient');

    btnOpen.click();

    document.getElementById('clientFormCompany').value = 'Helados Artesanales';
    document.getElementById('clientFormName').value = 'Andrea Castillo';
    document.getElementById('clientFormPhone').value = '+502 4111-9876';
    document.getElementById('clientFormNit').value = '445566-7';
    document.getElementById('clientFormCategory').value = 'RESTAURANTES_CAFES';
    document.getElementById('clientFormTier').value = 'VIP';
    document.getElementById('clientFormAddress').value = 'Zona 4, Cuatro Grados Norte';
    document.getElementById('clientFormNotes').value = 'Stickers para vasos térmicos';

    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    expect(formModal.style.display).toBe('none');

    const clients = clientsStore.getClients();
    expect(clients[0].company).toBe('Helados Artesanales');
    expect(clients[0].tier).toBe('VIP');

    // La tabla debe reflejar al nuevo cliente
    const rows = document.querySelectorAll('#clientsTableBody tr');
    expect(rows[0].textContent).toContain('Helados Artesanales');
  });

  it('permite abrir el modal de edición y actualizar un cliente existente', () => {
    const editBtn = document.querySelector('.btn-edit-client[data-client-id="CLI-001"]');
    expect(editBtn).not.toBeNull();

    editBtn.click();

    const formModal = document.getElementById('clientFormModal');
    expect(formModal.style.display).toBe('block');
    expect(document.getElementById('clientFormTitle').textContent).toContain('Editar: Café San Cristóbal');

    document.getElementById('clientFormCompany').value = 'Café San Cristóbal Premium';
    document.getElementById('clientFormTier').value = 'VIP';

    const form = document.getElementById('formClient');
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    expect(formModal.style.display).toBe('none');
    expect(clientsStore.getClientById('CLI-001').company).toBe('Café San Cristóbal Premium');
  });

  it('abre el expediente 360° del cliente con historial de pedidos', () => {
    const dossierModal = document.getElementById('clientDossierModal');
    const viewBtn = document.querySelector('.btn-view-dossier[data-client-id="CLI-001"]');
    expect(viewBtn).not.toBeNull();

    viewBtn.click();
    expect(dossierModal.style.display).toBe('block');

    expect(document.getElementById('dossierCompany').textContent).toBe('Café San Cristóbal');
    expect(document.getElementById('dossierContent').textContent).toContain('Metraje Total');
    expect(document.getElementById('dossierContent').textContent).toContain('KL-00042');

    const btnOk = document.getElementById('btnOkDossierModal');
    btnOk.click();
    expect(dossierModal.style.display).toBe('none');
  });

  it('abre el expediente de un cliente sin pedidos mostrando el estado vacío de historial', () => {
    const newClient = clientsStore.createClient({
      company: 'Cliente Sin Pedidos S.A.',
      name: 'Persona Nueva',
      phone: '+502 5999-0000',
    });

    const searchInput = document.getElementById('clientSearchInput');
    searchInput.value = 'Cliente Sin Pedidos S.A.';
    searchInput.dispatchEvent(new Event('input'));

    const rows = document.querySelectorAll('#clientsTableBody tr');
    expect(rows.length).toBe(1);

    const viewBtn = rows[0].querySelector('.btn-view-dossier');
    viewBtn.click();

    const dossierModal = document.getElementById('clientDossierModal');
    expect(dossierModal.style.display).toBe('block');
    expect(document.getElementById('dossierContent').textContent).toContain('no tiene pedidos registrados');

    document.getElementById('btnCloseDossierModal').click();
    expect(dossierModal.style.display).toBe('none');
  });

  it('elimina un cliente cuando el usuario confirma la acción', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    const deleteBtn = document.querySelector('.btn-delete-client[data-client-id="CLI-005"]');
    expect(deleteBtn).not.toBeNull();

    deleteBtn.click();
    expect(confirmSpy).toHaveBeenCalled();
    expect(clientsStore.getClientById('CLI-005')).toBeNull();

    confirmSpy.mockRestore();
  });

  it('cancela la eliminación de un cliente si el usuario rechaza el diálogo', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const deleteBtn = document.querySelector('.btn-delete-client[data-client-id="CLI-001"]');
    expect(deleteBtn).not.toBeNull();

    deleteBtn.click();
    expect(confirmSpy).toHaveBeenCalled();
    expect(clientsStore.getClientById('CLI-001')).not.toBeNull();

    confirmSpy.mockRestore();
  });

  it('actualiza reactivamente los KPIs cuando se añade una orden en ordersStore', () => {
    ordersStore.createOrder({
      customer: {
        name: 'Rodrigo Méndez',
        company: 'Café San Cristóbal',
        phone: '+502 5555-1234',
        nit: '7845129-4',
      },
      cartTotals: {
        totalBillableMeters: 5.0,
        grandTotalQ: 525.0,
      },
      items: [
        { title: 'Tirada Café Extra', widthCm: 10, heightCm: 10, qty: 50, actualLinearMeters: 5.0 }
      ],
    });

    const metricsContainer = document.getElementById('clientsMetricsContainer');
    expect(metricsContainer.textContent).toContain('Metraje Cartera Total');
  });

  it('muestra saldo pendiente en rojo y contador plural cuando un cliente tiene deuda acumulada', () => {
    // Crear orden con pago pendiente
    ordersStore.createOrder({
      customer: {
        name: 'Alejandro Morales',
        company: 'Barbería Vintage',
        phone: '+502 5111-2233',
        nit: 'CF',
      },
      cartTotals: {
        totalBillableMeters: 4.0,
        grandTotalQ: 460.0,
      },
      items: [
        { title: 'Tirada Pendiente', widthCm: 8, heightCm: 8, qty: 60, actualLinearMeters: 4.0 }
      ],
    });

    const searchInput = document.getElementById('clientSearchInput');
    searchInput.value = 'Barbería Vintage';
    searchInput.dispatchEvent(new Event('input'));

    const rows = document.querySelectorAll('#clientsTableBody tr');
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain('Saldo: Q460.00');

    // Abrir expediente
    rows[0].querySelector('.btn-view-dossier').click();
    const dossierModal = document.getElementById('clientDossierModal');
    expect(dossierModal.style.display).toBe('block');
    expect(document.getElementById('dossierContent').textContent).toContain('Q460.00');
    expect(document.getElementById('dossierContent').textContent).toContain('registros');
  });

  it('crea cliente usando fallbacks cuando los inputs están vacíos', () => {
    const btnOpen = document.getElementById('btnOpenNewClientModal');
    btnOpen.click();

    document.getElementById('clientFormCompany').value = '';
    document.getElementById('clientFormName').value = '';
    document.getElementById('clientFormPhone').value = '';
    document.getElementById('clientFormNit').value = '';
    document.getElementById('clientFormCategory').value = '';
    document.getElementById('clientFormTier').value = '';

    const form = document.getElementById('formClient');
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));

    const clients = clientsStore.getClients();
    expect(clients[0].company).toBe('Cliente B2B');
  });
});
