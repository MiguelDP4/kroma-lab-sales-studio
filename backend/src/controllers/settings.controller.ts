import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';

export const updateItemSchema = z.object({
  key: z.string().trim().min(1, 'La clave es requerida'),
  value: z.string().trim().min(1, 'El valor es requerido'),
});

export const updateSettingsSchema = z.union([
  z.object({
    settings: z.array(updateItemSchema),
  }),
  z.array(updateItemSchema),
  z.record(z.string().trim().min(1), z.string().trim().min(1)),
]);

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

    const capitalRaw = settingMap.get('FREE_SHIPPING_THRESHOLD');
    const interiorRaw = settingMap.get('FREE_SHIPPING_THRESHOLD_OUTSIDE_CAPITAL');

    const capital = capitalRaw !== undefined && !isNaN(Number(capitalRaw)) ? Number(capitalRaw) : 575;
    const interior = interiorRaw !== undefined && !isNaN(Number(interiorRaw)) ? Number(interiorRaw) : 1000;

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
 * Actualizar configuraciones del sistema (Solo ADMIN)
 */
export async function updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = updateSettingsSchema.parse(req.body);

    let itemsToUpdate: Array<{ key: string; value: string }> = [];

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
      await prisma.systemSetting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: { key: item.key, value: item.value },
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
