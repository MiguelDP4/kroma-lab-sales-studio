import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';

const createDispatchSchema = z.object({
  orderId: z.string().min(1, 'El ID del pedido es requerido'),
  customerName: z.string().min(2),
  customerPhone: z.string().min(8),
  customerAddress: z.string().min(2),
  customerTaxId: z.string().optional().or(z.literal('')),
  deliveryMethod: z.enum(['MOTO_LOCAL', 'CARGO_EXPRESO', 'GUATEX', 'FORZA_EXPRESS', 'PICKUP']).default('MOTO_LOCAL'),
  trackingNumber: z.string().optional(),
  packagesCount: z.number().int().positive().default(1),
  linearMeters: z.number().positive(),
  totalAmountQ: z.number().positive(),
  balanceDueQ: z.number().nonnegative().default(0.0),
  checklistPassed: z.boolean().default(true),
  notes: z.string().optional(),
});

const updateDispatchStatusSchema = z.object({
  status: z.enum(['PREPARED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED']),
  deliveryRecipientName: z.string().optional(),
  deliveryRecipientDpi: z.string().optional(),
  trackingNumber: z.string().optional(),
});

export async function listDispatchNotes(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const notes = await prisma.dispatchNote.findMany({
      include: {
        order: {
          select: {
            id: true,
            code: true,
            status: true,
            paymentStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: notes.length, dispatchNotes: notes });
  } catch (error) {
    next(error);
  }
}

export async function getDispatchNoteById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const note = await prisma.dispatchNote.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!note) {
      res.status(404).json({ success: false, message: 'Remisión no encontrada.' });
      return;
    }

    res.json({ success: true, dispatchNote: note });
  } catch (error) {
    next(error);
  }
}

export async function createDispatchNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createDispatchSchema.parse(req.body);

    const year = new Date().getFullYear();
    const count = await prisma.dispatchNote.count();
    const folio = `REM-${year}-${String(count + 1).padStart(3, '0')}`;

    const dispatchNote = await prisma.dispatchNote.create({
      data: {
        folio,
        ...data,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Remisión de taller generada exitosamente.',
      dispatchNote,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDispatchStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status, deliveryRecipientName, deliveryRecipientDpi, trackingNumber } =
      updateDispatchStatusSchema.parse(req.body);

    const note = await prisma.dispatchNote.findUnique({ where: { id } });
    if (!note) {
      res.status(404).json({ success: false, message: 'Remisión no encontrada.' });
      return;
    }

    const updateData: any = { status };
    if (deliveryRecipientName) updateData.deliveryRecipientName = deliveryRecipientName;
    if (deliveryRecipientDpi) updateData.deliveryRecipientDpi = deliveryRecipientDpi;
    if (trackingNumber) updateData.trackingNumber = trackingNumber;
    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    const updated = await prisma.dispatchNote.update({
      where: { id },
      data: updateData,
    });

    // Si la remisión se marca como entregada, sincronizar orden a COMPLETED
    if (status === 'DELIVERED') {
      await prisma.order.update({
        where: { id: note.orderId },
        data: { status: 'COMPLETED' },
      });
    }

    res.json({
      success: true,
      message: `Remisión actualizada a ${status}.`,
      dispatchNote: updated,
    });
  } catch (error) {
    next(error);
  }
}
