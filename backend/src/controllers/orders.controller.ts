import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { generateNextPaymentCode } from './receivables.controller';
import { emailService } from '../services/email.service';

const createOrderSchema = z.object({
  customerId: z.string().nullable().optional(),
  customerName: z.string().min(2, 'El nombre del cliente es requerido'),
  customerPhone: z.string().min(8, 'El número de teléfono es requerido'),
  customerEmail: z.string().email().optional().or(z.literal('')).or(z.null()),
  customerTaxId: z.string().nullable().optional().or(z.literal('')),
  customerAddress: z.string().nullable().optional().or(z.literal('')),

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

  fileUrl: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  fileSizeBytes: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  canvasSnapshot: z.string().nullable().optional(),
  rotationDeg: z.number().int().nullable().optional(),
  paymentReceiptUrl: z.string().nullable().optional(),
  paymentReceiptFileName: z.string().nullable().optional(),
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

const attachReceiptSchema = z.object({
  receiptUrl: z.string().min(1, 'La URL o archivo del comprobante es requerida.'),
  receiptFileName: z.string().optional(),
  amountPaidQ: z.number().positive().optional(),
  bankName: z.enum(['BI', 'BAC', 'BANRURAL']).optional(),
  bankReference: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Genera el siguiente correlativo secuencial de orden como entero de 10 dígitos con ceros a la izquierda.
 * La primera orden será 0000000001 y se incrementa en 1 por cada orden nueva.
 */
export async function generateNextOrderCode(): Promise<string> {
  const orders = await prisma.order.findMany({
    select: { code: true },
  });

  let maxNum = 0;
  for (const o of orders) {
    if (/^\d{10}$/.test(o.code)) {
      const num = parseInt(o.code, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return String(nextNum).padStart(10, '0');
}

export async function listOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, paymentStatus, search } = req.query;

    const where: any = {};

    // Si es cliente, solo ve sus propias órdenes buscando por customerId o email
    if (req.user && req.user.role === 'CUSTOMER') {
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { customerId: true, email: true },
      });
      const orConditions: any[] = [
        { customerEmail: req.user.email },
        { customerPhone: { contains: req.user.email } },
      ];
      if (dbUser?.customerId) {
        orConditions.push({ customerId: dbUser.customerId });
      }
      where.OR = orConditions;
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

    if (req.user && (!data.customerEmail || data.customerEmail === '')) {
      data.customerEmail = req.user.email;
    }

    const code = await generateNextOrderCode();

    const { canvasSnapshot, rotationDeg, ...orderData } = data;

    const order = await prisma.order.create({
      data: {
        code,
        ...orderData,
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

    if (status === 'IN_AUDLEY_QUEUE' && updated.customerEmail) {
      try {
        await emailService.sendOrderConfirmationEmail(
          updated.customerEmail,
          updated.customerName,
          updated.code,
          updated
        );
      } catch (emailErr) {
        console.warn('[OrdersController] Error enviando email de confirmación:', emailErr);
      }
    }

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

export async function attachPaymentReceipt(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = attachReceiptSchema.parse(req.body);

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      res.status(404).json({ success: false, message: 'Orden no encontrada.' });
      return;
    }

    if (req.user?.role === 'CUSTOMER' && order.customerEmail !== req.user.email) {
      res.status(403).json({ success: false, message: 'Acceso no autorizado a este pedido.' });
      return;
    }

    const updateData: any = {
      paymentReceiptUrl: data.receiptUrl,
      paymentReceiptFileName: data.receiptFileName || 'comprobante_bancario',
    };

    let payment = null;
    if (data.amountPaidQ) {
      const newAmountPaid = Number(order.amountPaidQ || 0) + data.amountPaidQ;
      const isFullyPaid = newAmountPaid >= Number(order.totalAmountQ) - 0.01;
      updateData.amountPaidQ = newAmountPaid;
      updateData.paymentStatus = isFullyPaid ? 'PAID' : 'PARTIAL';

      const paymentCode = await generateNextPaymentCode();

      payment = await prisma.payment.create({
        data: {
          paymentCode,
          orderId: order.id,
          customerName: order.customerName,
          customerTaxId: order.customerTaxId,
          amountPaidQ: data.amountPaidQ,
          method: 'TRANSFER',
          bankName: data.bankName || 'BI',
          bankReference: data.bankReference,
          receiptUrl: data.receiptUrl,
          notes: data.notes || 'Comprobante bancario adjuntado',
          registeredById: req.user?.id,
        },
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        dispatchNotes: true,
        payments: true,
      },
    });

    res.json({
      success: true,
      message: 'Comprobante de pago vinculado exitosamente a la orden.',
      order: updatedOrder,
      payment,
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
      .reduce((sum, o) => sum + Number(o.linearMeters || 0), 0);

    const totalBillingQ = orders.reduce((sum, o) => sum + Number(o.totalAmountQ || 0), 0);
    const totalPaidQ = orders.reduce((sum, o) => sum + Number(o.amountPaidQ || 0), 0);
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
