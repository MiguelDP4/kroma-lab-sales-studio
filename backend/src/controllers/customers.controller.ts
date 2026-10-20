import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';

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
      const totalMeters = c.orders.reduce((sum, o) => sum + o.linearMeters, 0);
      const totalSpentQ = c.orders.reduce((sum, o) => sum + o.totalAmountQ, 0);
      const totalPaidQ = c.orders.reduce((sum, o) => sum + o.amountPaidQ, 0);
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
