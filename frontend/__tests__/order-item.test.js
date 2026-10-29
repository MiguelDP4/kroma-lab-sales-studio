import { describe, it, expect } from 'vitest';
import { mapOrderItem, cleanOrderItemForApi } from '../src/js/modules/order-item.js';

describe('order-item.js — Normalización Canónica de OrderItem', () => {
  it('normaliza un objeto vacío asignando valores por defecto seguros', () => {
    const item = mapOrderItem();
    expect(item).toBeDefined();
    expect(item.id).toMatch(/^item_/);
    expect(item.widthCm).toBe(5);
    expect(item.heightCm).toBe(5);
    expect(item.qty).toBe(1);
    expect(item.actualLinearMeters).toBe(0);
    expect(item.includeCutting).toBe(false);
    expect(item.fileUrl).toBeNull();
    expect(item.fileName).toBeNull();
    expect(item.rawFile).toBeNull();
    expect(item.canvasSnapshot).toBeNull();
    expect(item.canvasSnapshotUrl).toBeNull();
  });

  it('normaliza propiedades de cotización con withCutting y linearMeters legados', () => {
    const rawQuote = {
      id: 'item_123',
      widthCm: '10.5',
      heightCm: '15.2',
      qty: '100',
      linearMeters: '3.45',
      withCutting: true,
      rotationDeg: '90',
      fileName: 'logo.png',
      fileSizeBytes: 2097152,
      fileUrl: 'https://r2.kromalab.gt/logo.png',
      canvasSnapshot: 'https://r2.kromalab.gt/snapshot.png',
    };

    const normalized = mapOrderItem(rawQuote);
    expect(normalized.widthCm).toBe(10.5);
    expect(normalized.heightCm).toBe(15.2);
    expect(normalized.qty).toBe(100);
    expect(normalized.actualLinearMeters).toBe(3.45);
    expect(normalized.includeCutting).toBe(true);
    expect(normalized.rotationDeg).toBe(90);
    expect(normalized.fileUrl).toBe('https://r2.kromalab.gt/logo.png');
    expect(normalized.fileName).toBe('logo.png');
    expect(normalized.canvasSnapshotUrl).toBe('https://r2.kromalab.gt/snapshot.png');
    expect(normalized.fileInfo).toEqual({
      name: 'logo.png',
      fileUrl: 'https://r2.kromalab.gt/logo.png',
      size: 2097152,
      sizeFormatted: '2.00 MB',
    });
  });

  it('no utiliza data: base64 como canvasSnapshotUrl persistente', () => {
    const item = mapOrderItem({
      canvasSnapshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA...',
    });
    expect(item.canvasSnapshot).toContain('data:image/png;base64');
    expect(item.canvasSnapshotUrl).toBeNull();
  });

  it('prepara el payload limpio para la API con cleanOrderItemForApi omitiendo ids autogenerados de cliente', () => {
    const clientItem = mapOrderItem({
      title: 'Stickers Taza',
      widthCm: 8,
      heightCm: 8,
      qty: 25,
      actualLinearMeters: 0.8,
      includeCutting: false,
      fileUrl: 'https://r2.kromalab.gt/art.pdf',
      fileName: 'art.pdf',
      fileSizeBytes: 1048576,
      canvasSnapshot: 'data:image/png;base64,AAAA...',
      canvasSnapshotUrl: 'https://r2.kromalab.gt/snapshot.png',
      previewUrl: 'data:image/png;base64,AAAA...',
    });

    const apiPayload = cleanOrderItemForApi(clientItem);
    expect(apiPayload.id).toBeUndefined(); // Omite item_ temporal
    expect(apiPayload.title).toBe('Stickers Taza');
    expect(apiPayload.widthCm).toBe(8);
    expect(apiPayload.heightCm).toBe(8);
    expect(apiPayload.qty).toBe(25);
    expect(apiPayload.actualLinearMeters).toBe(0.8);
    expect(apiPayload.includeCutting).toBe(false);
    expect(apiPayload.fileUrl).toBe('https://r2.kromalab.gt/art.pdf');
    expect(apiPayload.fileName).toBe('art.pdf');
    expect(apiPayload.canvasSnapshotUrl).toBe('https://r2.kromalab.gt/snapshot.png');
    // data: URL en previewUrl se reemplaza por fileUrl
    expect(apiPayload.previewUrl).toBe('https://r2.kromalab.gt/art.pdf');
    expect(apiPayload.fileInfo).toEqual({
      name: 'art.pdf',
      fileUrl: 'https://r2.kromalab.gt/art.pdf',
      size: 1048576,
    });
  });

  it('preserva el id real de base de datos existente en cleanOrderItemForApi', () => {
    const existingItem = {
      id: 'orditem_abc123',
      title: 'Stickers Existentes',
      widthCm: 5,
      heightCm: 5,
      qty: 50,
    };
    const apiPayload = cleanOrderItemForApi(existingItem);
    expect(apiPayload.id).toBe('orditem_abc123');
  });
});
