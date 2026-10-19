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

  it('maneja canvas o quote nulo de forma segura sin lanzar errores', () => {
    expect(() => drawRollCanvas(null, null)).not.toThrow();
    expect(() => drawRollCanvas({}, null)).not.toThrow();
    expect(() => drawRollCanvas(null, {})).not.toThrow();
    expect(() => drawRollCanvas({ getContext: () => null }, {})).not.toThrow();
  });
});
