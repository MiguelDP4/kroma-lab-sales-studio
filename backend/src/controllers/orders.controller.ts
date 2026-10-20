import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

const createOrderSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(2, 'El nombre del cliente es requerido'),
  customerPhone: z.string().min(8, 'El número de teléfono es requerido'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  customerTaxId: z.string().optional().or(z.literal('')),
  customerAddress: z.string().optional().or(z.literal('')),

  widthCm: z.number().positive(),
  heightCm: z.number().positive(),
  qty: z.number().int().positive(),
  linearMeters: z.number().positive(),
  unitRateQ: z.number().positive().default(105.0),
  materialPriceQ: z.number().positive(),
  withCutting: z.boolean().default(false),
  cuttingPriceQ: z.number().nonnegative().default(0.0),
  totalAmountQ: z.number().positive(),
  finishType: z.string().default('GLOSSY_VARNISH'),

  stickersPerRow: z.number().int().positive().default(1),
  rows: z.number().int().positive().default(1),

  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSizeBytes: z.number().int().optional(),
  notes: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.enum([
    'PENDING_REVIEW',
    'IN_AUDLEY_QUEUE',
    'PRINTING',
    'LAMINATING_CUTTING',
    'READY_FOR_DELIVERY',
    'COMPLETED',
    'CANCELLED',
  ]),
});

const updatePaymentSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'PARTIAL', 'PAID', 'CANCELLED']),
  amountPaidQ: z.number().nonnegative().optional(),
});

export async function listOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, paymentStatus, search } = req.query;

    const where: any = {};

    // Si es cliente, solo ve sus propias órdenes
    if (req.user && req.user.role === 'CUSTOMER') {
      where.OR = [
        { customerEmail: req.user.email },
        { customerPhone: { contains: req.user.email } },
      ];
    }

    if (status && typeof status === 'string') {
      where.status = status;
    }

    if (paymentStatus && typeof paymentStatus === 'string') {
      where.paymentStatus = paymentStatus;
    }

    if (search && typeof search === 'string') {
      const q = search.trim();
      where.OR = [
        { code: { contains: q } },
        { customerName: { contains: q } },
        { customerTaxId: { contains: q } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, companyName: true, tier: true } },
        dispatchNotes: { select: { id: true, folio: true, status: true } },
        payments: { select: { id: true, paymentCode: true, amountPaidQ: true } },
      },
    });

    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    next(error);
  }
}

export async function getOrderById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        dispatchNotes: true,
        payments: true,
      },
    });

    if (!order) {
      res.status(404).json({ success: false, message: 'Orden no encontrada.' });
      return;
    }

    if (req.user?.role === 'CUSTOMER' && order.customerEmail !== req.user.email) {
      res.status(403).json({ success: false, message: 'Acceso no autorizado a este pedido.' });
      return;
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
}

export async function createOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createOrderSchema.parse(req.body);

    const year = new Date().getFullYear();
    const count = await prisma.order.count();
    const code = `KL-${year}-${String(count + 1).padStart(3, '0')}`;

    const order = await prisma.order.create({
      data: {
        code,
        ...data,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Orden creada exitosamente.',
      order,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = updateStatusSchema.parse(req.body);

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
    });

    res.json({
      success: true,
      message: `Estado de orden actualizado a ${status}.`,
      order: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { paymentStatus, amountPaidQ } = updatePaymentSchema.parse(req.body);

    const updateData: any = { paymentStatus };
    if (amountPaidQ !== undefined) {
      updateData.amountPaidQ = amountPaidQ;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Estado de pago actualizado.',
      order: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderStats(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orders = await prisma.order.findMany();

    const totalOrders = orders.length;
    const activeOrders = orders.filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status)).length;
    const totalMetersInWorkshop = orders
      .filter((o) => !['COMPLETED', 'CANCELLED'].includes(o.status))
      .reduce((sum, o) => sum + o.linearMeters, 0);

    const totalBillingQ = orders.reduce((sum, o) => sum + o.totalAmountQ, 0);
    const totalPaidQ = orders.reduce((sum, o) => sum + o.amountPaidQ, 0);
    const totalBalanceDueQ = Math.max(0, totalBillingQ - totalPaidQ);

    res.json({
      success: true,
      stats: {
        totalOrders,
        activeOrders,
        totalMetersInWorkshop: Number(totalMetersInWorkshop.toFixed(2)),
        totalBillingQ: Number(totalBillingQ.toFixed(2)),
        totalPaidQ: Number(totalPaidQ.toFixed(2)),
        totalBalanceDueQ: Number(totalBalanceDueQ.toFixed(2)),
      },
    });
  } catch (error) {
    next(error);
  }
}
