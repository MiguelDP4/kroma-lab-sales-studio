import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

const recordPaymentSchema = z.object({
  orderId: z.string().min(1, 'La orden es requerida'),
  amountPaidQ: z.number().positive('El monto debe ser mayor a cero'),
  method: z.enum(['TRANSFER', 'CASH', 'CARD', 'DEPOSIT', 'CHEQUE']),
  bankName: z.enum(['BI', 'BAC', 'BANRURAL']).optional(),
  bankReference: z.string().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});

export async function listReceivables(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orders = await prisma.order.findMany({
      where: {
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
        status: { not: 'CANCELLED' },
      },
      include: {
        customer: { select: { id: true, companyName: true, tier: true } },
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const now = new Date();

    const receivables = orders.map((order) => {
      const balanceDueQ = Math.max(0, order.totalAmountQ - order.amountPaidQ);
      const daysDiff = Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24));

      let agingStatus = 'CURRENT'; // 0-7 días
      if (daysDiff > 15) {
        agingStatus = 'OVERDUE';
      } else if (daysDiff > 7) {
        agingStatus = 'WARNING';
      }

      return {
        id: order.id,
        code: order.code,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerTaxId: order.customerTaxId,
        companyName: order.customer?.companyName || order.customerName,
        totalAmountQ: order.totalAmountQ,
        amountPaidQ: order.amountPaidQ,
        balanceDueQ: Number(balanceDueQ.toFixed(2)),
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        daysAging: daysDiff,
        agingStatus,
      };
    });

    const totalBalanceDueQ = receivables.reduce((sum, r) => sum + r.balanceDueQ, 0);

    res.json({
      success: true,
      count: receivables.length,
      totalBalanceDueQ: Number(totalBalanceDueQ.toFixed(2)),
      receivables,
    });
  } catch (error) {
    next(error);
  }
}

export async function recordPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = recordPaymentSchema.parse(req.body);

    const order = await prisma.order.findUnique({ where: { id: data.orderId } });
    if (!order) {
      res.status(404).json({ success: false, message: 'Orden no encontrada.' });
      return;
    }

    const newAmountPaid = order.amountPaidQ + data.amountPaidQ;
    const isFullyPaid = newAmountPaid >= order.totalAmountQ - 0.01;
    const newPaymentStatus = isFullyPaid ? 'PAID' : 'PARTIAL';

    const count = await prisma.payment.count();
    const paymentCode = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;

    const [payment, updatedOrder] = await prisma.$transaction([
      prisma.payment.create({
        data: {
          paymentCode,
          orderId: order.id,
          customerName: order.customerName,
          customerTaxId: order.customerTaxId,
          amountPaidQ: data.amountPaidQ,
          method: data.method,
          bankName: data.bankName,
          bankReference: data.bankReference,
          receiptUrl: data.receiptUrl,
          notes: data.notes,
          registeredById: req.user?.id,
        },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          amountPaidQ: newAmountPaid,
          paymentStatus: newPaymentStatus,
        },
      }),
    ]);

    res.status(201).json({
      success: true,
      message: 'Abono registrado exitosamente.',
      payment,
      order: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
}

export async function listPayments(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        order: { select: { id: true, code: true, totalAmountQ: true } },
        registeredBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, count: payments.length, payments });
  } catch (error) {
    next(error);
  }
}

export async function voidPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!payment) {
      res.status(404).json({ success: false, message: 'Pago no encontrado.' });
      return;
    }

    const order = payment.order;
    const revertedAmount = Math.max(0, order.amountPaidQ - payment.amountPaidQ);
    const newPaymentStatus = revertedAmount <= 0.01 ? 'PENDING' : 'PARTIAL';

    await prisma.$transaction([
      prisma.payment.delete({ where: { id } }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          amountPaidQ: revertedAmount,
          paymentStatus: newPaymentStatus,
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Abono anulado exitosamente y saldo de orden restituido.',
    });
  } catch (error) {
    next(error);
  }
}
