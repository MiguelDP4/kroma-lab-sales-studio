import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { orderItemSchema } from './orders.controller';

const syncCartSchema = z.object({
  items: z.array(orderItemSchema),
});

/**
 * Obtiene o crea el carrito activo del usuario autenticado (o por sessionId para invitados)
 */
async function getOrCreateCart(userId?: string, sessionId?: string) {
  if (userId) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: { items: true },
      });
    }
    return cart;
  }

  if (sessionId) {
    let cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { sessionId },
        include: { items: true },
      });
    }
    return cart;
  }

  return null;
}

export async function getCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const sessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string);

    if (!userId && !sessionId) {
      res.json({ success: true, cart: { id: null, items: [] } });
      return;
    }

    const cart = await getOrCreateCart(userId, sessionId);
    res.json({ success: true, cart });
  } catch (error) {
    next(error);
  }
}

export async function addCartItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const sessionId = (req.headers['x-session-id'] as string) || (req.body.sessionId as string);

    const it = orderItemSchema.parse(req.body.item || req.body);

    const cart = await getOrCreateCart(userId, sessionId);
    if (!cart) {
      res.status(400).json({ success: false, message: 'Se requiere usuario o sesión para agregar al carrito.' });
      return;
    }

    const createdItem = await prisma.orderItem.create({
      data: {
        cartId: cart.id,
        title: it.title || `Stickers ${it.widthCm} × ${it.heightCm} cm`,
        widthCm: it.widthCm,
        heightCm: it.heightCm,
        qty: it.qty,
        rotationDeg: it.rotationDeg || 0,
        rows: it.rows || 1,
        stickersPerRow: it.stickersPerRow || 1,
        includeCutting: it.includeCutting || false,
        fileUrl: it.fileUrl || null,
        fileName: it.fileName || null,
        fileInfo: it.fileInfo || null,
        previewUrl: it.previewUrl || null,
        canvasSnapshot: it.canvasSnapshot || null,
        canvasSnapshotUrl: it.canvasSnapshotUrl || null,
        actualLinearMeters: it.actualLinearMeters || 0.0,
      },
    });

    res.status(201).json({ success: true, item: createdItem });
  } catch (error) {
    next(error);
  }
}

export async function syncCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const sessionId = (req.headers['x-session-id'] as string) || (req.body.sessionId as string);

    const { items } = syncCartSchema.parse(req.body);

    const cart = await getOrCreateCart(userId, sessionId);
    if (!cart) {
      res.status(400).json({ success: false, message: 'Se requiere usuario o sesión para sincronizar el carrito.' });
      return;
    }

    // Reemplaza todos los items del carrito de forma transaccional
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { cartId: cart.id } });
      if (items.length > 0) {
        await tx.orderItem.createMany({
          data: items.map(it => ({
            cartId: cart.id,
            title: it.title || `Stickers ${it.widthCm} × ${it.heightCm} cm`,
            widthCm: it.widthCm,
            heightCm: it.heightCm,
            qty: it.qty,
            rotationDeg: it.rotationDeg || 0,
            rows: it.rows || 1,
            stickersPerRow: it.stickersPerRow || 1,
            includeCutting: it.includeCutting || false,
            fileUrl: it.fileUrl || null,
            fileName: it.fileName || null,
            fileInfo: it.fileInfo || null,
            previewUrl: it.previewUrl || null,
            canvasSnapshot: it.canvasSnapshot || null,
            canvasSnapshotUrl: it.canvasSnapshotUrl || null,
            actualLinearMeters: it.actualLinearMeters || 0.0,
          })),
        });
      }
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    });

    res.json({ success: true, cart: updatedCart });
  } catch (error) {
    next(error);
  }
}

export async function removeCartItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.orderItem.deleteMany({
      where: { id },
    });
    res.json({ success: true, message: 'Diseño eliminado del carrito.' });
  } catch (error) {
    next(error);
  }
}

export async function clearCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.id;
    const sessionId = (req.headers['x-session-id'] as string) || (req.query.sessionId as string);

    const cart = await getOrCreateCart(userId, sessionId);
    if (cart) {
      await prisma.orderItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    res.json({ success: true, message: 'Carrito vaciado exitosamente.' });
  } catch (error) {
    next(error);
  }
}
