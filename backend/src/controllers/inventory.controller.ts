import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

const restockSchema = z.object({
  itemId: z.string().min(1, 'El insumo es requerido'),
  quantity: z.number().positive('La cantidad debe ser positiva'),
  unitCostQ: z.number().positive('El costo unitario es requerido'),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

const adjustSchema = z.object({
  itemId: z.string().min(1, 'El insumo es requerido'),
  newStock: z.number().nonnegative('El nuevo stock no puede ser negativo'),
  reason: z.string().min(2, 'El motivo del ajuste es requerido'),
  notes: z.string().optional(),
});

export async function listInventory(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { code: 'asc' },
    });

    const enrichedItems = items.map((item) => {
      let status = 'OPTIMAL';
      const optimalThreshold = item.minStockThreshold * (item.optimalRatio || 1.5);

      if (item.currentStock < item.minStockThreshold) {
        status = 'CRITICAL';
      } else if (item.currentStock <= optimalThreshold) {
        status = 'LOW';
      }

      const totalValueQ = item.currentStock * item.unitCostQ;

      return {
        ...item,
        status,
        totalValueQ: Number(totalValueQ.toFixed(2)),
      };
    });

    res.json({ success: true, count: enrichedItems.length, items: enrichedItems });
  } catch (error) {
    next(error);
  }
}

export async function recordRestock(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = restockSchema.parse(req.body);

    const item = await prisma.inventoryItem.findUnique({ where: { id: data.itemId } });
    if (!item) {
      res.status(404).json({ success: false, message: 'Insumo no encontrado.' });
      return;
    }

    const newStock = item.currentStock + data.quantity;
    const totalCostQ = data.quantity * data.unitCostQ;

    const count = await prisma.inventoryMovement.count();
    const movCode = `MOV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const [updatedItem, movement] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: newStock, unitCostQ: data.unitCostQ },
      }),
      prisma.inventoryMovement.create({
        data: {
          movCode,
          itemId: item.id,
          type: 'IN_PURCHASE',
          qtyDelta: data.quantity,
          newStock,
          totalCostQ,
          reference: data.reference,
          notes: data.notes,
          performedById: req.user?.id,
        },
      }),
    ]);

    res.status(201).json({
      success: true,
      message: 'Reabastecimiento registrado exitosamente.',
      item: updatedItem,
      movement,
    });
  } catch (error) {
    next(error);
  }
}

export async function adjustStock(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = adjustSchema.parse(req.body);

    const item = await prisma.inventoryItem.findUnique({ where: { id: data.itemId } });
    if (!item) {
      res.status(404).json({ success: false, message: 'Insumo no encontrado.' });
      return;
    }

    const diff = data.newStock - item.currentStock;
    const count = await prisma.inventoryMovement.count();
    const movCode = `MOV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const [updatedItem, movement] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: data.newStock },
      }),
      prisma.inventoryMovement.create({
        data: {
          movCode,
          itemId: item.id,
          type: 'ADJUSTMENT',
          qtyDelta: diff,
          newStock: data.newStock,
          totalCostQ: Math.abs(diff) * item.unitCostQ,
          reference: data.reason,
          notes: data.notes,
          performedById: req.user?.id,
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Ajuste de inventario aplicado exitosamente.',
      item: updatedItem,
      movement,
    });
  } catch (error) {
    next(error);
  }
}

export async function listKardex(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const movements = await prisma.inventoryMovement.findMany({
      include: {
        item: { select: { id: true, code: true, name: true, unit: true } },
        performedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: movements.length, movements });
  } catch (error) {
    next(error);
  }
}
