import { describe, it, expect, vi } from 'vitest';
import { roundRect, drawRollCanvas } from '../src/js/modules/roll-simulator.js';

describe('Roll Simulator — Canvas y Gráficos', () => {
  it('ejecuta roundRect trazando las esquinas en el contexto 2D', () => {
    const ctx = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
    };

    roundRect(ctx, 10, 10, 50, 50, 4, true, true);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.arcTo).toHaveBeenCalledTimes(4);

    // Probar dimensiones donde el radio excede ancho o alto asimétricamente
    roundRect(ctx, 0, 0, 100, 4, 10, true, true);
    roundRect(ctx, 0, 0, 4, 100, 10, true, true);
    expect(ctx.closePath).toHaveBeenCalled();
  });


  it('dibuja la bobina y los stickers correctamente en drawRollCanvas', () => {
    const ctx = {
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      setLineDash: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
    };

    const canvas = {
      getContext: vi.fn().mockReturnValue(ctx),
      getBoundingClientRect: vi.fn().mockReturnValue({ width: 580, height: 200 }),
      width: 0,
      height: 0,
    };

    // Caso con más stickers que piezas por fila
    const quote1 = {
      widthCm: 5,
      heightCm: 5,
      qty: 20,
      stickersPerRow: 5,
      rows: 4,
    };
    drawRollCanvas(canvas, quote1, true);

    expect(canvas.getContext).toHaveBeenCalledWith('2d');
    expect(ctx.clearRect).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.strokeRect).toHaveBeenCalled();

    // Caso con corte prematuro (qty menor a stickersPerRow para probar break)
    const quote2 = {
      widthCm: 5,
      heightCm: 5,
      qty: 2,
      stickersPerRow: 5,
      rows: 1,
    };
    drawRollCanvas(canvas, quote2, false);
    expect(ctx.fillText).toHaveBeenCalledWith('28 cm útiles', expect.any(Number), expect.any(Number));
  });

  it('centra horizontalmente los stickers dentro del ancho útil de 28 cm', () => {
    const movedToCoords = [];
    const ctx = {
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      setLineDash: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn((x, y) => movedToCoords.push({ x, y })),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
    };

    const canvas = {
      getContext: vi.fn().mockReturnValue(ctx),
      getBoundingClientRect: vi.fn().mockReturnValue({ width: 580, height: 200 }),
      width: 0,
      height: 0,
    };

    // Caso de 2 stickers de 12 cm en ancho de 28 cm
    const quote = {
      widthCm: 12,
      heightCm: 8,
      qty: 2,
      stickersPerRow: 2,
      rows: 1,
    };

    drawRollCanvas(canvas, quote, true);

    // moveTo es llamado por roundRect con x + r (donde r = 4)
    // El primer sticker debe comenzar desplazado del padding izquierdo (paddingX = 20)
    expect(movedToCoords.length).toBeGreaterThanOrEqual(2);
    const firstStickerX = movedToCoords[0].x - 4; // restar radio
    const leftMargin = firstStickerX - 20;

    // Con centrado, el margen izquierdo debe ser mayor que cero
    expect(leftMargin).toBeGreaterThan(10);

    // Comprobar caso con stickersPerRow = 0
    const quoteZero = {
      widthCm: 35,
      heightCm: 10,
      qty: 1,
      stickersPerRow: 0,
      rows: 0,
    };
    expect(() => drawRollCanvas(canvas, quoteZero, true)).not.toThrow();
  });

  it('maneja canvas o quote nulo de forma segura sin lanzar errores', () => {
    expect(() => drawRollCanvas(null, null)).not.toThrow();
    expect(() => drawRollCanvas({}, null)).not.toThrow();
    expect(() => drawRollCanvas(null, {})).not.toThrow();
    expect(() => drawRollCanvas({ getContext: () => null }, {})).not.toThrow();
  });
});
