import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cartStore } from '../src/js/modules/cart-store.js';

describe('Cart Store — Almacén Reactivo de Carrito', () => {
  beforeEach(() => {
    localStorage.clear();
    cartStore.clearCart();
  });

  it('agrega ítems al carrito con id generado y actualiza totales', () => {
    const item = cartStore.addItem({
      title: 'Stickers Taza',
      widthCm: 5,
      heightCm: 5,
      qty: 100,
      includeCutting: true,
    });

    expect(item.id).toBeDefined();
    expect(cartStore.getItems().length).toBe(1);

    const totals = cartStore.getTotals();
    expect(totals.totalStickers).toBe(100);
    expect(totals.hasCutting).toBe(true);
  });

  it('elimina un ítem por id', () => {
    const item1 = cartStore.addItem({ widthCm: 5, heightCm: 5, qty: 50 });
    const item2 = cartStore.addItem({ widthCm: 8, heightCm: 5, qty: 50 });

    expect(cartStore.getItems().length).toBe(2);

    cartStore.removeItem(item1.id);
    expect(cartStore.getItems().length).toBe(1);
    expect(cartStore.getItems()[0].id).toBe(item2.id);
  });

  it('actualiza la cantidad de un ítem existente', () => {
    const item = cartStore.addItem({ widthCm: 5, heightCm: 5, qty: 50 });
    cartStore.updateItemQty(item.id, 200);

    expect(cartStore.getItems()[0].qty).toBe(200);
  });

  it('asocia información de archivo al ítem en el carrito', () => {
    const item = cartStore.addItem({ widthCm: 5, heightCm: 5, qty: 50 });
    cartStore.attachFileToItem(item.id, { name: 'diseno.png', sizeFormatted: '1.2 MB' }, 'data:image/png;base64,abc');

    const updated = cartStore.getItems()[0];
    expect(updated.fileInfo.name).toBe('diseno.png');
    expect(updated.previewUrl).toContain('base64');
  });

  it('notifica a los suscriptores cuando cambia el estado del carrito', () => {
    const listener = vi.fn();
    const unsubscribe = cartStore.subscribe(listener);

    cartStore.addItem({ widthCm: 5, heightCm: 5, qty: 50 });
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    cartStore.clearCart();
    expect(listener).toHaveBeenCalledTimes(1); // No vuelve a ser llamado tras unsubscribe
  });

  it('persiste y recupera el carrito desde localStorage', () => {
    cartStore.addItem({ widthCm: 5, heightCm: 5, qty: 100 });
    const stored = JSON.parse(localStorage.getItem('kromalab_cart'));
    expect(stored.length).toBe(1);
    expect(stored[0].qty).toBe(100);
  });

  it('maneja datos corruptos o no-array en localStorage retornando array vacío', () => {
    localStorage.setItem('kromalab_cart', '{"not":"an array"}');
    expect(cartStore.loadCartFromStorage()).toEqual([]);

    localStorage.setItem('kromalab_cart', 'invalid-json-{[(');
    expect(cartStore.loadCartFromStorage()).toEqual([]);
  });

  it('tolera fallos al guardar en localStorage', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    expect(() => cartStore.saveCartToStorage()).not.toThrow();
    setItemSpy.mockRestore();
  });
});
