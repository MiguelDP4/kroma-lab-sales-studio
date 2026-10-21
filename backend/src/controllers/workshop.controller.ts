import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';

const workshopConfigSchema = z.object({
  printableRollWidthCm: z.number().positive().optional(),
  rollWidthCm: z.number().positive().optional(),
  rateTier1: z.number().positive().optional(),
  rateTier2: z.number().positive().optional(),
  rateTier3: z.number().positive().optional(),
  rateTier4: z.number().positive().optional(),
  rateTier5: z.number().positive().optional(),
  cuttingFeePerPieceQ: z.number().nonnegative().optional(),
  bankBiAccount: z.string().optional(),
  bankBacAccount: z.string().optional(),
  bankGytAccount: z.string().optional(),
  bankBanruralAccount: z.string().optional(),
  whatsappNumber: z.string().optional(),
  filmACostPerM: z.number().positive().optional(),
  filmBCostPerM: z.number().positive().optional(),
  inkCostPerM: z.number().positive().optional(),
  monthlyNetTargetQ: z.number().positive().optional(),
});

export async function getWorkshopConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let config = await prisma.workshopConfig.findUnique({ where: { id: 'default' } });

    if (!config) {
      config = await prisma.workshopConfig.create({
        data: {
          id: 'default',
          printableRollWidthCm: 28.0,
          rollWidthCm: 30.0,
          rateTier1: 130.0,
          rateTier2: 120.0,
          rateTier3: 115.0,
          rateTier4: 105.0,
          rateTier5: 95.0,
          cuttingFeePerPieceQ: 0.08,
          bankBiAccount: '4422909',
          bankBacAccount: '972095707',
          bankGytAccount: '01080279685',
          bankBanruralAccount: '01080279685',
          whatsappNumber: '+502 5555-0000',
          filmACostPerM: 6.30,
          filmBCostPerM: 4.08,
          inkCostPerM: 8.25,
          monthlyNetTargetQ: 20000.0,
        },
      });
    }

    res.json({ success: true, config });
  } catch (error) {
    next(error);
  }
}

export async function updateWorkshopConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = workshopConfigSchema.parse(req.body);

    const updated = await prisma.workshopConfig.upsert({
      where: { id: 'default' },
      update: data,
      create: {
        id: 'default',
        ...data,
      },
    });

    res.json({
      success: true,
      message: 'Configuración de taller Audley actualizada exitosamente.',
      config: updated,
    });
  } catch (error) {
    next(error);
  }
}
