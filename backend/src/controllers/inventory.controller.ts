import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

const createItemSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(2, 'El nombre del insumo es requerido'),
  category: z.string().default('CONSUMABLES'),
  unit: z.string().default('uds'),
  currentStock: z.number().nonnegative('El stock inicial no puede ser negativo').default(0),
  minStockThreshold: z.number().nonnegative('El umbral crítico debe ser mayor o igual a 0').default(10),
  optimalThreshold: z.number().nonnegative('El umbral óptimo debe ser mayor o igual a 0').optional(),
  optimalRatio: z.number().positive().optional(),
  unitCostQ: z.number().nonnegative('El costo unitario no puede ser negativo').default(0),
  supplier: z.string().optional(),
  invoiceNumber: z.string().optional(),
  notes: z.string().optional(),
});

const updateItemSchema = z.object({
  name: z.string().min(2).optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  minStockThreshold: z.number().nonnegative().optional(),
  optimalThreshold: z.number().nonnegative().optional(),
  optimalRatio: z.number().positive().optional(),
  unitCostQ: z.number().nonnegative().optional(),
  supplier: z.string().optional(),
});

const restockSchema = z.object({
  itemId: z.string().min(1, 'El insumo es requerido'),
  quantity: z.number().positive('La cantidad debe ser positiva'),
  unitCostQ: z.number().nonnegative('El costo unitario debe ser mayor o igual a 0').optional(),
  reference: z.string().optional(),
  invoiceNumber: z.string().optional(),
  supplier: z.string().optional(),
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
      const criticalThreshold = Number(item.minStockThreshold);
      const optimalThreshold = criticalThreshold * (Number(item.optimalRatio) || 1.5);

      if (Number(item.currentStock) <= criticalThreshold) {
        status = 'CRITICAL';
      } else if (Number(item.currentStock) < optimalThreshold) {
        status = 'LOW';
      }

      const totalValueQ = Number(item.currentStock) * Number(item.unitCostQ);

      return {
        ...item,
        currentStock: Number(item.currentStock),
        minStockThreshold: criticalThreshold,
        unitCostQ: Number(item.unitCostQ),
        optimalRatio: Number(item.optimalRatio) || 1.5,
        criticalThreshold,
        optimalThreshold: Number(optimalThreshold.toFixed(2)),
        status,
        totalValueQ: Number(totalValueQ.toFixed(2)),
      };
    });

    res.json({ success: true, count: enrichedItems.length, items: enrichedItems });
  } catch (error) {
    next(error);
  }
}

export async function createInventoryItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createItemSchema.parse(req.body);

    // Calcular optimalRatio según la cantidad configurable deseada por el usuario
    const criticalThreshold = data.minStockThreshold;
    let optimalRatio = data.optimalRatio || 1.5;
    if (data.optimalThreshold !== undefined) {
      optimalRatio = criticalThreshold > 0 ? (data.optimalThreshold / criticalThreshold) : 1.5;
    }

    // Generar código único si no se provee
    let code = data.code?.trim().toUpperCase();
    if (!code) {
      const prefix = data.name.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
      const count = await prisma.inventoryItem.count();
      code = `${prefix}_${String(count + 1).padStart(3, '0')}`;
    }

    const item = await prisma.inventoryItem.create({
      data: {
        code,
        name: data.name,
        category: data.category,
        unit: data.unit,
        currentStock: data.currentStock,
        minStockThreshold: criticalThreshold,
        optimalRatio,
        unitCostQ: data.unitCostQ,
      },
    });

    let initialMovement = null;
    // Si se da de alta con existencias iniciales, crear el primer registro en Kardex
    if (data.currentStock > 0) {
      const count = await prisma.inventoryMovement.count();
      const movCode = `MOV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
      const totalCostQ = data.currentStock * data.unitCostQ;

      initialMovement = await prisma.inventoryMovement.create({
        data: {
          movCode,
          itemId: item.id,
          type: 'IN_PURCHASE',
          qtyDelta: data.currentStock,
          newStock: data.currentStock,
          totalCostQ,
          reference: data.invoiceNumber || data.supplier || 'Inventario Inicial',
          notes: data.notes || (data.supplier ? `Compra inicial a ${data.supplier}` : 'Alta inicial de inventario'),
          performedById: req.user?.id,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Insumo creado exitosamente en el inventario.',
      item: {
        ...item,
        currentStock: Number(item.currentStock),
        minStockThreshold: Number(item.minStockThreshold),
        unitCostQ: Number(item.unitCostQ),
        criticalThreshold: Number(item.minStockThreshold),
        optimalThreshold: Number(item.minStockThreshold) * optimalRatio,
      },
      movement: initialMovement,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateInventoryItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateItemSchema.parse(req.body);

    const existing = await prisma.inventoryItem.findFirst({
      where: { OR: [{ id }, { code: id }] },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Insumo no encontrado.' });
      return;
    }

    const criticalThreshold = data.minStockThreshold !== undefined ? data.minStockThreshold : Number(existing.minStockThreshold);
    let optimalRatio = data.optimalRatio !== undefined ? data.optimalRatio : Number(existing.optimalRatio);

    if (data.optimalThreshold !== undefined) {
      optimalRatio = criticalThreshold > 0 ? (data.optimalThreshold / criticalThreshold) : 1.5;
    }

    const updated = await prisma.inventoryItem.update({
      where: { id: existing.id },
      data: {
        name: data.name ?? existing.name,
        category: data.category ?? existing.category,
        unit: data.unit ?? existing.unit,
        minStockThreshold: criticalThreshold,
        optimalRatio,
        unitCostQ: data.unitCostQ !== undefined ? data.unitCostQ : existing.unitCostQ,
      },
    });

    res.json({
      success: true,
      message: 'Insumo y umbrales de alerta actualizados exitosamente.',
      item: {
        ...updated,
        currentStock: Number(updated.currentStock),
        minStockThreshold: Number(updated.minStockThreshold),
        unitCostQ: Number(updated.unitCostQ),
        criticalThreshold: Number(updated.minStockThreshold),
        optimalThreshold: Number(updated.minStockThreshold) * optimalRatio,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteInventoryItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const existing = await prisma.inventoryItem.findFirst({
      where: { OR: [{ id }, { code: id }] },
    });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Insumo no encontrado para eliminar.' });
      return;
    }

    await prisma.inventoryMovement.deleteMany({
      where: { itemId: existing.id },
    });

    await prisma.inventoryItem.delete({
      where: { id: existing.id },
    });

    res.json({
      success: true,
      message: 'Insumo eliminado exitosamente del inventario.',
    });
  } catch (error) {
    next(error);
  }
}

export async function recordRestock(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = restockSchema.parse(req.body);

    const item = await prisma.inventoryItem.findFirst({
      where: { OR: [{ id: data.itemId }, { code: data.itemId }] },
    });

    if (!item) {
      res.status(404).json({ success: false, message: 'Insumo no encontrado.' });
      return;
    }

    const unitCostQ = data.unitCostQ !== undefined ? data.unitCostQ : Number(item.unitCostQ);
    const newStock = Number(item.currentStock) + data.quantity;
    const totalCostQ = data.quantity * unitCostQ;

    const count = await prisma.inventoryMovement.count();
    const movCode = `MOV-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
    const ref = data.invoiceNumber || data.reference || data.supplier || 'Factura de Compra';

    const [updatedItem, movement] = await prisma.$transaction([
      prisma.inventoryItem.update({
        where: { id: item.id },
        data: { currentStock: newStock, unitCostQ },
      }),
      prisma.inventoryMovement.create({
        data: {
          movCode,
          itemId: item.id,
          type: 'IN_PURCHASE',
          qtyDelta: data.quantity,
          newStock,
          totalCostQ,
          reference: ref,
          notes: data.notes || (data.supplier ? `Proveedor: ${data.supplier}` : 'Entrada por compra'),
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

    const item = await prisma.inventoryItem.findFirst({
      where: { OR: [{ id: data.itemId }, { code: data.itemId }] },
    });

    if (!item) {
      res.status(404).json({ success: false, message: 'Insumo no encontrado.' });
      return;
    }

    const diff = data.newStock - Number(item.currentStock);
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
          totalCostQ: Math.abs(diff) * Number(item.unitCostQ),
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
