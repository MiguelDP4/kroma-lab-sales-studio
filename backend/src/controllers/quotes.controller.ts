import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';

export const createQuoteSchema = z.object({
  projectName: z.string().optional().default('Cotización UV DTF'),
  leadName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  leadPhone: z.string().min(8, 'El teléfono debe tener al menos 8 dígitos'),
  leadEmail: z.string().email('Correo electrónico inválido').optional().or(z.literal('')),
  companyName: z.string().optional(),
  widthCm: z.number().positive('El ancho debe ser mayor a 0').max(28, 'El ancho máximo útil es 28 cm'),
  heightCm: z.number().positive('El alto debe ser mayor a 0'),
  qty: z.number().int().positive('La cantidad debe ser mayor a 0'),
  linearMeters: z.number().positive('Los metros lineales deben ser mayores a 0'),
  stickersPerRow: z.number().int().positive().optional().default(1),
  rows: z.number().int().positive().optional().default(1),
  unitRateQ: z.number().positive('La tarifa por metro debe ser mayor a 0'),
  materialPriceQ: z.number().min(0, 'El precio de material no puede ser negativo'),
  cuttingPriceQ: z.number().min(0, 'El precio de corte no puede ser negativo').optional().default(0),
  totalPriceQ: z.number().positive('El total debe ser mayor a 0'),
  withCutting: z.boolean().optional().default(false),
  finishType: z.string().optional().default('GLOSSY_VARNISH'),
  notes: z.string().optional(),
  source: z.string().optional().default('web'),
  fileUrl: z.string().optional(),
  fileName: z.string().optional(),
  fileSizeBytes: z.number().int().optional(),
  canvasSnapshot: z.string().optional(),
  rotationDeg: z.number().int().optional(),
});

export const updateQuoteSchema = z.object({
  projectName: z.string().optional(),
  leadName: z.string().optional(),
  leadPhone: z.string().optional(),
  leadEmail: z.string().email().optional().or(z.literal('')),
  companyName: z.string().optional(),
  widthCm: z.number().positive().max(28).optional(),
  heightCm: z.number().positive().optional(),
  qty: z.number().int().positive().optional(),
  linearMeters: z.number().positive().optional(),
  stickersPerRow: z.number().int().positive().optional(),
  rows: z.number().int().positive().optional(),
  unitRateQ: z.number().positive().optional(),
  materialPriceQ: z.number().min(0).optional(),
  cuttingPriceQ: z.number().min(0).optional(),
  totalPriceQ: z.number().positive().optional(),
  withCutting: z.boolean().optional(),
  finishType: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['DRAFT', 'SAVED', 'CONVERTED', 'EXPIRED']).optional(),
});

export async function listQuotes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, search } = req.query as { status?: string; search?: string };

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { code: { contains: q } },
        { projectName: { contains: q } },
        { leadName: { contains: q } },
        { leadPhone: { contains: q } },
        { leadEmail: { contains: q } },
        { companyName: { contains: q } },
      ];
    }

    // Si es cliente autenticado, filtrar por sus cotizaciones
    if (req.user?.role === 'CUSTOMER') {
      where.leadEmail = req.user.email;
    }

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      count: quotes.length,
      quotes,
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuoteById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
    });

    if (!quote) {
      res.status(404).json({ success: false, message: 'Cotización no encontrada.' });
      return;
    }

    if (req.user?.role === 'CUSTOMER' && quote.leadEmail && quote.leadEmail !== req.user.email) {
      res.status(403).json({ success: false, message: 'Acceso no autorizado a esta cotización.' });
      return;
    }

    res.json({ success: true, quote });
  } catch (error) {
    next(error);
  }
}

export async function createQuote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = createQuoteSchema.parse(req.body);

    const year = new Date().getFullYear();
    const count = await prisma.quote.count();
    const code = `COT-${year}-${String(count + 1).padStart(3, '0')}`;

    const quote = await prisma.quote.create({
      data: {
        code,
        projectName: data.projectName || `Cotización ${data.widthCm}x${data.heightCm} cm (${data.qty} pcs)`,
        leadName: data.leadName,
        leadPhone: data.leadPhone,
        leadEmail: data.leadEmail || (req.user?.email || null),
        companyName: data.companyName || null,
        widthCm: data.widthCm,
        heightCm: data.heightCm,
        qty: data.qty,
        linearMeters: data.linearMeters,
        stickersPerRow: data.stickersPerRow,
        rows: data.rows,
        unitRateQ: data.unitRateQ,
        materialPriceQ: data.materialPriceQ,
        cuttingPriceQ: data.cuttingPriceQ,
        totalPriceQ: data.totalPriceQ,
        withCutting: data.withCutting,
        finishType: data.finishType,
        notes: data.notes || '',
        source: data.source || 'web',
        status: 'SAVED',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Cotización guardada exitosamente.',
      quote,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateQuote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateQuoteSchema.parse(req.body);

    const existing = await prisma.quote.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Cotización no encontrada.' });
      return;
    }

    if (req.user?.role === 'CUSTOMER' && existing.leadEmail && existing.leadEmail !== req.user.email) {
      res.status(403).json({ success: false, message: 'No tienes permiso para modificar esta cotización.' });
      return;
    }

    const updated = await prisma.quote.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      message: 'Cotización actualizada exitosamente.',
      quote: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function convertToOrder(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      res.status(404).json({ success: false, message: 'Cotización no encontrada para convertir.' });
      return;
    }

    // Generar correlativo de orden KL-YYYY-XXX
    const year = new Date().getFullYear();
    const orderCount = await prisma.order.count();
    const orderCode = `KL-${year}-${String(orderCount + 1).padStart(3, '0')}`;

    // Buscar si existe cliente vinculado por email
    let customerId: string | null = null;
    if (quote.leadEmail) {
      const customer = await prisma.customer.findUnique({
        where: { email: quote.leadEmail },
      });
      if (customer) {
        customerId = customer.id;
      }
    }

    const orderNotes = [
      quote.projectName ? `Proyecto: ${quote.projectName}` : '',
      quote.notes ? `Notas: ${quote.notes}` : '',
      `Convertido desde cotización ${quote.code || quote.id}`,
    ]
      .filter(Boolean)
      .join(' | ');

    // Crear orden de producción en base de datos
    const order = await prisma.order.create({
      data: {
        code: orderCode,
        status: 'PENDING_REVIEW',
        paymentStatus: 'PENDING',
        customerId,
        customerName: quote.leadName || 'Cliente Cotización',
        customerPhone: quote.leadPhone || '+502 0000-0000',
        customerEmail: quote.leadEmail,
        customerAddress: 'Dirección por confirmar',
        widthCm: quote.widthCm,
        heightCm: quote.heightCm,
        qty: quote.qty,
        linearMeters: quote.linearMeters,
        withCutting: quote.withCutting,
        finishType: quote.finishType,
        stickersPerRow: quote.stickersPerRow,
        rows: quote.rows,
        unitRateQ: quote.unitRateQ,
        materialPriceQ: quote.materialPriceQ,
        cuttingPriceQ: quote.cuttingPriceQ,
        totalAmountQ: quote.totalPriceQ,
        amountPaidQ: 0,
        fileUrl: quote.fileUrl,
        fileName: quote.fileName,
        fileSizeBytes: quote.fileSizeBytes,
        notes: orderNotes,
      },
    });

    // Actualizar cotización a estado CONVERTED
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedOrderId: order.id,
        convertedOrderCode: order.code,
      },
    });

    res.status(201).json({
      success: true,
      message: `¡Cotización convertida exitosamente a la orden de producción ${order.code}!`,
      order,
      quote: updatedQuote,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.quote.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, message: 'Cotización no encontrada.' });
      return;
    }

    if (req.user?.role === 'CUSTOMER' && existing.leadEmail && existing.leadEmail !== req.user.email) {
      res.status(403).json({ success: false, message: 'No tienes permiso para eliminar esta cotización.' });
      return;
    }

    await prisma.quote.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Cotización eliminada exitosamente.',
    });
  } catch (error) {
    next(error);
  }
}
