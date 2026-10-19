/**
 * Almacén Reactivo de Carrito de Compras (CartStore)
 * Gestiona ítems en el carrito, persistencia en localStorage y notificación a componentes.
 */

import { calculateCartTotals } from './cart-engine.js';

class CartStore {
  constructor() {
    this.items = this.loadCartFromStorage();
    this.listeners = new Set();
  }

  loadCartFromStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const data = localStorage.getItem('kromalab_cart');
        if (data) {
          const parsed = JSON.parse(data);
          return Array.isArray(parsed) ? parsed : [];
        }
      }
    } catch (_) {}
    return [];
  }

  saveCartToStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('kromalab_cart', JSON.stringify(this.items));
      }
    } catch (_) {}
  }

  getItems() {
    return [...this.items];
  }

  getTotals() {
    return calculateCartTotals(this.items);
  }

  addItem(item) {
    const newItem = {
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: item.title || `Sticker ${item.widthCm}x${item.heightCm}cm`,
      widthCm: parseFloat(item.widthCm) || 5,
      heightCm: parseFloat(item.heightCm) || 5,
      qty: parseInt(item.qty, 10) || 50,
      includeCutting: Boolean(item.includeCutting),
      fileInfo: item.fileInfo || null,
      previewUrl: item.previewUrl || null,
      createdAt: item.createdAt || new Date().toISOString(),
    };

    this.items.push(newItem);
    this.saveCartToStorage();
    this.notify();
    return newItem;
  }

  removeItem(itemId) {
    this.items = this.items.filter(i => i.id !== itemId);
    this.saveCartToStorage();
    this.notify();
  }

  updateItemQty(itemId, newQty) {
    const qty = Math.max(1, parseInt(newQty, 10) || 1);
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.qty = qty;
      this.saveCartToStorage();
      this.notify();
    }
  }

  attachFileToItem(itemId, fileInfo, previewUrl = null) {
    const item = this.items.find(i => i.id === itemId);
    if (item) {
      item.fileInfo = fileInfo;
      if (previewUrl) {
        item.previewUrl = previewUrl;
      }
      this.saveCartToStorage();
      this.notify();
    }
  }

  clearCart() {
    this.items = [];
    this.saveCartToStorage();
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const totals = this.getTotals();
    const items = this.getItems();
    for (const listener of this.listeners) {
      listener({ items, totals });
    }
  }
}

export const cartStore = new CartStore();
