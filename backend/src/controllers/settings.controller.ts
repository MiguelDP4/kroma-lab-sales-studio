import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';

export const createSettingSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'La clave es requerida')
    .regex(
      /^[A-Za-z0-9_.-]+$/,
      'La clave solo puede contener letras, números, puntos y guiones (sin espacios).'
    ),
  value: z.string().trim().min(1, 'El valor es requerido'),
  description: z.string().trim().optional().nullable(),
});

export const updateItemSchema = z.object({
  key: z.string().trim().min(1, 'La clave es requerida'),
  value: z.string().trim().min(1, 'El valor es requerido'),
  description: z.string().trim().optional().nullable(),
});

export const updateSettingsSchema = z.union([
  z.object({
    settings: z.array(updateItemSchema),
  }),
  z.array(updateItemSchema),
  z.record(z.string().trim().min(1), z.string().trim().min(1)),
]);

export const DEFAULT_PRICING_TIER_RATES = {
  rateTier1: 150,
  rateTier2: 125,
  rateTier3: 115,
  rateTier4: 105,
  rateTier5: 95,
};

function parsePositiveNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const num = Number(raw);
  return !isNaN(num) && num > 0 ? num : fallback;
}

/**
 * Obtener las configuraciones públicas de envío para el cotizador
 */
export async function getPublicShippingSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['FREE_SHIPPING_THRESHOLD', 'FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL'],
        },
      },
    });

    const settingMap = new Map<string, string>();
    for (const s of settings) {
      settingMap.set(s.key, s.value);
    }

    const capital = parsePositiveNumber(settingMap.get('FREE_SHIPPING_THRESHOLD'), 575);
    const interior = parsePositiveNumber(settingMap.get('FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL'), 1000);

    res.json({
      success: true,
      shipping: {
        capital,
        interior,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener todas las configuraciones públicas requeridas por el cotizador y carrito
 * (umbrales de envío gratis + escalas de tarifa rateTier1..rateTier5 con fallback)
 */
export async function getPublicQuoterSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const keys = [
      'FREE_SHIPPING_THRESHOLD',
      'FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL',
      'rateTier1',
      'rateTier2',
      'rateTier3',
      'rateTier4',
      'rateTier5',
    ];

    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { in: keys },
      },
    });

    const settingMap = new Map<string, string>();
    for (const s of settings) {
      settingMap.set(s.key, s.value);
    }

    const shipping = {
      capital: parsePositiveNumber(settingMap.get('FREE_SHIPPING_THRESHOLD'), 575),
      interior: parsePositiveNumber(settingMap.get('FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL'), 1000),
    };

    const pricingTiers = {
      rateTier1: parsePositiveNumber(settingMap.get('rateTier1'), DEFAULT_PRICING_TIER_RATES.rateTier1),
      rateTier2: parsePositiveNumber(settingMap.get('rateTier2'), DEFAULT_PRICING_TIER_RATES.rateTier2),
      rateTier3: parsePositiveNumber(settingMap.get('rateTier3'), DEFAULT_PRICING_TIER_RATES.rateTier3),
      rateTier4: parsePositiveNumber(settingMap.get('rateTier4'), DEFAULT_PRICING_TIER_RATES.rateTier4),
      rateTier5: parsePositiveNumber(settingMap.get('rateTier5'), DEFAULT_PRICING_TIER_RATES.rateTier5),
    };

    res.json({
      success: true,
      shipping,
      pricingTiers,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener todas las configuraciones del sistema (Solo ADMIN)
 */
export async function getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    res.json({
      success: true,
      settings,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Crear un nuevo parámetro del sistema (Solo ADMIN)
 */
export async function createSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createSettingSchema.parse(req.body);

    const existing = await prisma.systemSetting.findUnique({
      where: { key: parsed.key },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        message: `Ya existe un parámetro configurado con la clave "${parsed.key}".`,
      });
      return;
    }

    const setting = await prisma.systemSetting.create({
      data: {
        key: parsed.key,
        value: parsed.value,
        description: parsed.description ? parsed.description : null,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Parámetro creado exitosamente.',
      setting,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualizar configuraciones del sistema (Solo ADMIN)
 */
export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updateSettingsSchema.parse(req.body);

    let itemsToUpdate: Array<{ key: string; value: string; description?: string | null }> = [];

    if (Array.isArray(parsed)) {
      itemsToUpdate = parsed;
    } else if ('settings' in parsed && Array.isArray(parsed.settings)) {
      itemsToUpdate = parsed.settings;
    } else {
      itemsToUpdate = Object.entries(parsed).map(([key, value]) => ({
        key,
        value: String(value),
      }));
    }

    for (const item of itemsToUpdate) {
      const normalizedDescription =
        item.description !== undefined ? (item.description ? item.description : null) : undefined;

      await prisma.systemSetting.upsert({
        where: { key: item.key },
        update: {
          value: item.value,
          ...(normalizedDescription !== undefined ? { description: normalizedDescription } : {}),
        },
        create: {
          key: item.key,
          value: item.value,
          description: normalizedDescription ?? null,
        },
      });
    }

    const allSettings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    res.json({
      success: true,
      message: 'Configuraciones actualizadas exitosamente.',
      settings: allSettings,
    });
  } catch (error) {
    next(error);
  }
}
