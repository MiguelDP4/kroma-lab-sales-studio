import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { generateNextPaymentCode } from './receivables.controller';

const customerSchema = z.object({
  companyName: z.string().optional(),
  managerName: z.string().min(2, 'El nombre del contacto es requerido'),
  phone: z.string().min(8, 'El teléfono es requerido'),
  email: z.string().email('Correo electrónico inválido'),
  address: z.string().optional(),
  taxId: z.string().optional(),
  tier: z.enum(['VIP', 'RECURRENTE', 'NUEVO', 'INACTIVO']).default('NUEVO'),
  sector: z.string().default('COMERCIO_RETAIL'),
  notes: z.string().optional(),
  customRatePerMeterQ: z.number().positive('La tarifa especial debe ser mayor a cero').nullable().optional(),
  exemptFromMinimum: z.boolean().optional().default(false),
  allowCredit: z.boolean().optional().default(false),
});

const settleStatementSchema = z.object({
  orderIds: z.array(z.string().min(1)).optional(),
  method: z.enum(['TRANSFER', 'CASH', 'CARD', 'DEPOSIT', 'CHEQUE']).default('CASH'),
  bankName: z.enum(['BI', 'BAC', 'BANRURAL']).optional(),
  bankReference: z.string().optional(),
  notes: z.string().optional(),
});

export async function listCustomers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          select: {
            id: true,
            linearMeters: true,
            totalAmountQ: true,
            amountPaidQ: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enrichedCustomers = customers.map((c) => {
      const totalOrders = c.orders.length;
      const totalMeters = c.orders.reduce((sum, o) => sum + Number(o.linearMeters || 0), 0);
      const totalSpentQ = c.orders.reduce((sum, o) => sum + Number(o.totalAmountQ || 0), 0);
      const totalPaidQ = c.orders.reduce((sum, o) => sum + Number(o.amountPaidQ || 0), 0);
      const balanceDueQ = Math.max(0, totalSpentQ - totalPaidQ);

      return {
        id: c.id,
        companyName: c.companyName || c.managerName,
        managerName: c.managerName,
        phone: c.phone,
        email: c.email,
        address: c.address,
        taxId: c.taxId,
        tier: c.tier,
        sector: c.sector,
        notes: c.notes,
        customRatePerMeterQ: c.customRatePerMeterQ !== null && c.customRatePerMeterQ !== undefined ? Number(c.customRatePerMeterQ) : null,
        exemptFromMinimum: Boolean(c.exemptFromMinimum),
        allowCredit: Boolean(c.allowCredit),
        totalOrders,
        totalMeters: Number(totalMeters.toFixed(2)),
        totalSpentQ: Number(totalSpentQ.toFixed(2)),
        balanceDueQ: Number(balanceDueQ.toFixed(2)),
        createdAt: c.createdAt,
      };
    });

    res.json({ success: true, count: enrichedCustomers.length, customers: enrichedCustomers });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!customer) {
      res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
      return;
    }

    res.json({ success: true, customer });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = customerSchema.parse(req.body);

    const existing = await prisma.customer.findUnique({
      where: { email: data.email.toLowerCase().trim() },
    });

    if (existing) {
      res.status(409).json({ success: false, message: 'Ya existe un cliente con este correo electrónico.' });
      return;
    }

    const customer = await prisma.customer.create({
      data: {
        ...data,
        email: data.email.toLowerCase().trim(),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Cliente registrado exitosamente en Cartera B2B.',
      customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = customerSchema.partial().parse(req.body);

    const updated = await prisma.customer.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      message: 'Cliente actualizado exitosamente.',
      customer: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Cliente no encontrado en Cartera B2B.' });
      return;
    }

    // Desvincular órdenes y usuarios asociados
    await prisma.order.updateMany({
      where: { customerId: id },
      data: { customerId: null },
    });

    await prisma.user.updateMany({
      where: { customerId: id },
      data: { customerId: null },
    });

    await prisma.customer.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Cliente eliminado exitosamente de la Cartera B2B.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
      return;
    }

    const pendingOrders = await prisma.order.findMany({
      where: {
        customerId: id,
        status: { not: 'CANCELLED' },
        paymentStatus: { in: ['PENDING', 'PARTIAL'] },
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const lineItems: Array<{
      orderId: string;
      orderCode: string;
      orderDate: Date;
      orderStatus: string;
      paymentStatus: string;
      title: string;
      fileName: string | null;
      qty: number;
      linearMeters: number;
      unitRateQ: number;
      subtotalQ: number;
      includeCutting: boolean;
    }> = [];

    let totalPieces = 0;
    let totalMeters = 0;
    let totalBilledQ = 0;
    let totalPaidQ = 0;

    const orderSummaries = pendingOrders.map((o) => {
      const orderTotalQ = Number(o.totalAmountQ || 0);
      const orderPaidQ = Number(o.amountPaidQ || 0);
      const orderBalanceQ = Math.max(0, orderTotalQ - orderPaidQ);
      const unitRateQ = Number(o.unitRateQ || 0);
      const orderMeters = Number(o.linearMeters || 0);

      totalBilledQ += orderTotalQ;
      totalPaidQ += orderPaidQ;
      totalMeters += orderMeters;

      const itemsList = o.items && o.items.length > 0
        ? o.items
        : [{
            title: o.fileName || `Pedido #${o.code}`,
            fileName: o.fileName || null,
            qty: o.qty,
            actualLinearMeters: orderMeters,
            includeCutting: o.withCutting,
          }];

      itemsList.forEach((it) => {
        const itemQty = Number(it.qty || 0);
        const itemMeters = Number(it.actualLinearMeters || 0) > 0
          ? Number(it.actualLinearMeters)
          : (itemsList.length === 1 ? orderMeters : 0);
        const subtotalQ = Number((itemMeters * unitRateQ).toFixed(2));
        totalPieces += itemQty;

        lineItems.push({
          orderId: o.id,
          orderCode: o.code,
          orderDate: o.createdAt,
          orderStatus: o.status,
          paymentStatus: o.paymentStatus,
          title: it.title || it.fileName || `Pedido #${o.code}`,
          fileName: it.fileName || null,
          qty: itemQty,
          linearMeters: Number(itemMeters.toFixed(2)),
          unitRateQ: Number(unitRateQ.toFixed(2)),
          subtotalQ,
          includeCutting: Boolean(it.includeCutting),
        });
      });

      return {
        id: o.id,
        code: o.code,
        createdAt: o.createdAt,
        status: o.status,
        paymentStatus: o.paymentStatus,
        linearMeters: Number(orderMeters.toFixed(2)),
        unitRateQ: Number(unitRateQ.toFixed(2)),
        cuttingPriceQ: Number(o.cuttingPriceQ || 0),
        totalAmountQ: Number(orderTotalQ.toFixed(2)),
        amountPaidQ: Number(orderPaidQ.toFixed(2)),
        balanceDueQ: Number(orderBalanceQ.toFixed(2)),
        notes: o.notes,
        itemsCount: itemsList.length,
      };
    });

    const balanceDueQ = Math.max(0, totalBilledQ - totalPaidQ);

    res.json({
      success: true,
      statement: {
        generatedAt: new Date().toISOString(),
        customer: {
          id: customer.id,
          companyName: customer.companyName || customer.managerName,
          managerName: customer.managerName,
          phone: customer.phone,
          email: customer.email,
          taxId: customer.taxId || 'CF',
          address: customer.address || '',
          customRatePerMeterQ: customer.customRatePerMeterQ !== null && customer.customRatePerMeterQ !== undefined
            ? Number(customer.customRatePerMeterQ)
            : null,
          exemptFromMinimum: Boolean(customer.exemptFromMinimum),
          allowCredit: Boolean(customer.allowCredit),
        },
        ordersCount: orderSummaries.length,
        totalPieces,
        totalMeters: Number(totalMeters.toFixed(2)),
        totalBilledQ: Number(totalBilledQ.toFixed(2)),
        totalPaidQ: Number(totalPaidQ.toFixed(2)),
        balanceDueQ: Number(balanceDueQ.toFixed(2)),
        items: lineItems,
        orders: orderSummaries,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function settleCustomerStatement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = settleStatementSchema.parse(req.body || {});

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Cliente no encontrado.' });
      return;
    }

    const whereClause: any = {
      customerId: id,
      status: { not: 'CANCELLED' },
      paymentStatus: { in: ['PENDING', 'PARTIAL'] },
    };

    if (data.orderIds && data.orderIds.length > 0) {
      whereClause.id = { in: data.orderIds };
    }

    const pendingOrders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    });

    if (pendingOrders.length === 0) {
      res.status(400).json({
        success: false,
        message: 'No hay pedidos pendientes por liquidar para este cliente.',
      });
      return;
    }

    const baseCode = await generateNextPaymentCode();
    const yearPrefix = baseCode.slice(0, baseCode.lastIndexOf('-') + 1);
    const startSeq = parseInt(baseCode.slice(baseCode.lastIndexOf('-') + 1), 10) || 1;

    const txOps: any[] = [];
    let totalSettledQ = 0;
    const settledOrderIds: string[] = [];

    pendingOrders.forEach((order, index) => {
      const remainingQ = Number(Math.max(0, Number(order.totalAmountQ) - Number(order.amountPaidQ || 0)).toFixed(2));
      const paymentCode = `${yearPrefix}${String(startSeq + index).padStart(3, '0')}`;
      totalSettledQ += remainingQ;
      settledOrderIds.push(order.id);

      if (remainingQ > 0) {
        txOps.push(
          prisma.payment.create({
            data: {
              paymentCode,
              orderId: order.id,
              customerName: order.customerName,
              customerTaxId: order.customerTaxId,
              amountPaidQ: remainingQ,
              method: data.method,
              bankName: data.bankName,
              bankReference: data.bankReference,
              notes: data.notes || `Liquidación de corte de cuenta (${customer.companyName || customer.managerName})`,
              registeredById: req.user?.id,
            },
          })
        );
      }

      txOps.push(
        prisma.order.update({
          where: { id: order.id },
          data: {
            amountPaidQ: order.totalAmountQ,
            paymentStatus: 'PAID',
          },
        })
      );
    });

    await prisma.$transaction(txOps);

    res.status(201).json({
      success: true,
      message: `Corte liquidado exitosamente (${settledOrderIds.length} ${settledOrderIds.length === 1 ? 'pedido' : 'pedidos'}).`,
      settledOrdersCount: settledOrderIds.length,
      totalSettledQ: Number(totalSettledQ.toFixed(2)),
      settledOrderIds,
    });
  } catch (error) {
    next(error);
  }
}
