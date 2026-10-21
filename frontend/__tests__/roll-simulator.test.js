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

  it('dibuja la bobina y los stickers correctamente en drawRollCanvas sin imagen', () => {
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

  it('dibuja la imagen del usuario con recorte y brillo cuando imageElement está cargado', () => {
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
      save: vi.fn(),
      restore: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
    };

    const canvas = {
      getContext: vi.fn().mockReturnValue(ctx),
      getBoundingClientRect: vi.fn().mockReturnValue({ width: 580, height: 200 }),
      width: 0,
      height: 0,
    };

    const quote = {
      widthCm: 5,
      heightCm: 5,
      qty: 2,
      stickersPerRow: 2,
      rows: 1,
    };

    const mockImage = {
      complete: true,
      naturalWidth: 200,
      naturalHeight: 200,
    };

    drawRollCanvas(canvas, quote, true, mockImage);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.clip).toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledTimes(2);
    expect(ctx.restore).toHaveBeenCalled();
  });

  it('maneja excepciones al dibujar imagen en el canvas con fallback a fillRect', () => {
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
      save: vi.fn(),
      restore: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(() => {
        throw new Error('Canvas drawImage error');
      }),
    };

    const canvas = {
      getContext: vi.fn().mockReturnValue(ctx),
      getBoundingClientRect: vi.fn().mockReturnValue({ width: 580, height: 200 }),
      width: 0,
      height: 0,
    };

    const quote = {
      widthCm: 5,
      heightCm: 5,
      qty: 1,
      stickersPerRow: 1,
      rows: 1,
    };

    const mockImage = {
      complete: true,
      naturalWidth: 100,
    };

    expect(() => drawRollCanvas(canvas, quote, false, mockImage)).not.toThrow();
    expect(ctx.fillRect).toHaveBeenCalled();
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

    const quote = {
      widthCm: 12,
      heightCm: 8,
      qty: 2,
      stickersPerRow: 2,
      rows: 1,
    };

    drawRollCanvas(canvas, quote, true);

    expect(movedToCoords.length).toBeGreaterThanOrEqual(2);
    const firstStickerX = movedToCoords[0].x - 4;
    const leftMargin = firstStickerX - 20;

    expect(leftMargin).toBeGreaterThan(10);

    const quoteZero = {
      widthCm: 35,
      heightCm: 10,
      qty: 1,
      stickersPerRow: 0,
      rows: 0,
    };
    expect(() => drawRollCanvas(canvas, quoteZero, true)).not.toThrow();
  });

  it('maneja canvas sin getBoundingClientRect y con dimensiones fallback', () => {
    const ctx = {
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
    };

    const canvas = {
      getContext: vi.fn().mockReturnValue(ctx),
      width: 0,
      height: 0,
    };

    const quote = {
      widthCm: 5,
      heightCm: 5,
      qty: 1,
      stickersPerRow: 1,
      rows: 1,
    };

    // imageElement con naturalWidth undefined pero width > 0
    const mockImage = {
      complete: true,
      width: 50,
    };

    expect(() => drawRollCanvas(canvas, quote, true, mockImage)).not.toThrow();
    expect(ctx.drawImage).toHaveBeenCalled();
  });

  it('maneja canvas o quote nulo de forma segura sin lanzar errores', () => {
    expect(() => drawRollCanvas(null, null)).not.toThrow();
    expect(() => drawRollCanvas({}, null)).not.toThrow();
    expect(() => drawRollCanvas(null, {})).not.toThrow();
    expect(() => drawRollCanvas({ getContext: () => null }, {})).not.toThrow();
  });
});
