import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { AuthenticatedRequest } from '../middlewares/auth';
import { generateNextOrderCode, orderItemSchema } from './orders.controller';

export const createQuoteSchema = z.object({
  items: z.array(orderItemSchema).optional(),
  projectName: z.string().optional().default('Cotización UV DTF'),
  leadName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  leadPhone: z.string().min(8, 'El teléfono debe tener al menos 8 dígitos'),
  leadEmail: z.string().email('Correo electrónico inválido').optional().or(z.literal('')).or(z.null()),
  companyName: z.string().nullable().optional(),
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
  notes: z.string().nullable().optional(),
  source: z.string().optional().default('web'),
  fileUrl: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  fileSizeBytes: z.number().int().nullable().optional(),
  canvasSnapshot: z.string().nullable().optional(),
  canvasSnapshotUrl: z.string().nullable().optional(),
  rotationDeg: z.number().int().nullable().optional(),
});

export const updateQuoteSchema = z.object({
  items: z.array(orderItemSchema).optional(),
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
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'No autenticado. Token requerido para listar cotizaciones.',
      });
      return;
    }

    const { status, search } = req.query as { status?: string; search?: string };

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    const searchConditions: any[] = [];
    if (search && search.trim()) {
      const q = search.trim();
      searchConditions.push(
        { code: { contains: q, mode: 'insensitive' } },
        { projectName: { contains: q, mode: 'insensitive' } },
        { leadName: { contains: q, mode: 'insensitive' } },
        { leadPhone: { contains: q, mode: 'insensitive' } },
        { leadEmail: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
      );
    }

    // Si es cliente autenticado, filtrar estrictamente por sus cotizaciones (por email o customerId)
    if (req.user.role === 'CUSTOMER') {
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { customerId: true, email: true },
      });
      const customerConditions: any[] = [
        { leadEmail: { equals: req.user.email, mode: 'insensitive' } },
      ];
      if (dbUser?.customerId) {
        const customer = await prisma.customer.findUnique({
          where: { id: dbUser.customerId },
          select: { email: true },
        });
        if (customer?.email && customer.email.toLowerCase() !== req.user.email.toLowerCase()) {
          customerConditions.push({ leadEmail: { equals: customer.email, mode: 'insensitive' } });
        }
      }

      where.AND = [{ OR: customerConditions }];
      if (searchConditions.length > 0) {
        where.AND.push({ OR: searchConditions });
      }
    } else if (req.user.role === 'ADMIN' || req.user.role === 'EMPLOYEE') {
      if (searchConditions.length > 0) {
        where.OR = searchConditions;
      }
    } else {
      res.status(403).json({
        success: false,
        message: 'Rol no autorizado para listar cotizaciones.',
      });
      return;
    }

    const quotes = await prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
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
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!quote) {
      res.status(404).json({ success: false, message: 'Cotización no encontrada.' });
      return;
    }

    // Si es Administrador o Personal de Taller, acceso completo permitido
    if (req.user?.role === 'ADMIN' || req.user?.role === 'EMPLOYEE') {
      res.json({ success: true, quote });
      return;
    }

    // Si la cotización tiene correo de cliente asignado (pertenece a una cuenta)
    if (quote.leadEmail && quote.leadEmail.trim() !== '') {
      if (!req.user) {
        res.status(401).json({ success: false, message: 'No autenticado. Inicia sesión para ver esta cotización.' });
        return;
      }
      if (req.user.role === 'CUSTOMER') {
        const isOwner = quote.leadEmail.toLowerCase() === req.user.email.toLowerCase();
        let isCustomerOwner = false;
        if (!isOwner) {
          const dbUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { customerId: true },
          });
          if (dbUser?.customerId) {
            const customer = await prisma.customer.findUnique({
              where: { id: dbUser.customerId },
              select: { email: true },
            });
            if (customer?.email && customer.email.toLowerCase() === quote.leadEmail.toLowerCase()) {
              isCustomerOwner = true;
            }
          }
        }

        if (!isOwner && !isCustomerOwner) {
          res.status(403).json({ success: false, message: 'Acceso no autorizado a esta cotización.' });
          return;
        }
      }
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

    const { items, canvasSnapshot, canvasSnapshotUrl, rotationDeg, ...quoteData } = data;

    const snapshotUrl = canvasSnapshotUrl || (canvasSnapshot && !canvasSnapshot.startsWith('data:') ? canvasSnapshot : null) || null;

    const quote = await prisma.quote.create({
      data: {
        code,
        projectName: quoteData.projectName || `Cotización ${quoteData.widthCm}x${quoteData.heightCm} cm (${quoteData.qty} pcs)`,
        leadName: quoteData.leadName,
        leadPhone: quoteData.leadPhone,
        leadEmail: quoteData.leadEmail || (req.user?.email || null),
        companyName: quoteData.companyName || null,
        widthCm: quoteData.widthCm,
        heightCm: quoteData.heightCm,
        qty: quoteData.qty,
        linearMeters: quoteData.linearMeters,
        stickersPerRow: quoteData.stickersPerRow,
        rows: quoteData.rows,
        unitRateQ: quoteData.unitRateQ,
        materialPriceQ: quoteData.materialPriceQ,
        cuttingPriceQ: quoteData.cuttingPriceQ,
        totalPriceQ: quoteData.totalPriceQ,
        withCutting: quoteData.withCutting,
        finishType: quoteData.finishType,
        notes: quoteData.notes || '',
        source: quoteData.source || 'web',
        status: 'SAVED',
        fileUrl: quoteData.fileUrl || null,
        fileName: quoteData.fileName || null,
        fileSizeBytes: quoteData.fileSizeBytes || null,
        items: items && items.length > 0 ? {
          create: items.map(it => ({
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
            previewUrl: it.previewUrl || it.fileUrl || null,
            canvasSnapshotUrl: it.canvasSnapshotUrl || snapshotUrl || null,
            actualLinearMeters: it.actualLinearMeters || 0.0,
          }))
        } : {
          create: [{
            title: quoteData.projectName || `Stickers ${quoteData.widthCm} × ${quoteData.heightCm} cm`,
            widthCm: quoteData.widthCm,
            heightCm: quoteData.heightCm,
            qty: quoteData.qty,
            rotationDeg: rotationDeg || 0,
            rows: quoteData.rows || 1,
            stickersPerRow: quoteData.stickersPerRow || 1,
            includeCutting: quoteData.withCutting || false,
            fileUrl: quoteData.fileUrl || null,
            fileName: quoteData.fileName || null,
            previewUrl: quoteData.fileUrl || null,
            canvasSnapshotUrl: snapshotUrl,
            actualLinearMeters: quoteData.linearMeters || 0.0,
          }]
        },
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
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

    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado. Token requerido.' });
      return;
    }

    if (req.user.role === 'CUSTOMER') {
      const isOwner = existing.leadEmail && existing.leadEmail.toLowerCase() === req.user.email.toLowerCase();
      if (!isOwner) {
        res.status(403).json({ success: false, message: 'No tienes permiso para modificar esta cotización.' });
        return;
      }
    }

    const { items, ...scalarData } = data;

    if (items) {
      await prisma.orderItem.deleteMany({ where: { quoteId: id } });
      if (items.length > 0) {
        await prisma.orderItem.createMany({
          data: items.map(it => ({
            quoteId: id,
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
            previewUrl: it.previewUrl || it.fileUrl || null,
            canvasSnapshotUrl: it.canvasSnapshotUrl || null,
            actualLinearMeters: it.actualLinearMeters || 0.0,
          })),
        });
      }
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: scalarData,
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
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

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!quote) {
      res.status(404).json({ success: false, message: 'Cotización no encontrada para convertir.' });
      return;
    }

    // Generar correlativo de orden como entero de 10 dígitos (ej: 0000000001)
    const orderCode = await generateNextOrderCode();

    // Buscar si existe cliente vinculado por email
    let customerId: string | null = req.body?.customerId || null;
    if (!customerId && quote.leadEmail) {
      const customer = await prisma.customer.findUnique({
        where: { email: quote.leadEmail },
      });
      if (customer) {
        customerId = customer.id;
      }
    }

    // Las notas de la orden deben contener exclusivamente las notas de cliente/taller (sin embutir items ni descripciones sintéticas)
    const orderNotes = quote.notes || null;

    // Obtener items: de la cotización en BD o del body como fallback
    const candidateItems = (quote.items && quote.items.length > 0)
      ? quote.items
      : (req.body && Array.isArray(req.body.items) && req.body.items.length > 0 ? req.body.items : []);

    // Crear orden de producción en base de datos clonando los items de la cotización
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
        items: candidateItems && candidateItems.length > 0 ? {
          create: candidateItems.map((it: any) => ({
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
            previewUrl: it.previewUrl || it.fileUrl || null,
            canvasSnapshot: it.canvasSnapshot || null,
            canvasSnapshotUrl: it.canvasSnapshotUrl || null,
            actualLinearMeters: it.actualLinearMeters || 0.0,
          }))
        } : {
          create: [{
            title: `Stickers ${quote.widthCm} × ${quote.heightCm} cm`,
            widthCm: quote.widthCm,
            heightCm: quote.heightCm,
            qty: quote.qty,
            rotationDeg: 0,
            rows: quote.rows || 1,
            stickersPerRow: quote.stickersPerRow || 1,
            includeCutting: quote.withCutting || false,
            fileUrl: quote.fileUrl || null,
            fileName: quote.fileName || null,
            actualLinearMeters: quote.linearMeters || 0.0,
          }]
        },
      },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
        customer: true,
        dispatchNotes: true,
        payments: true,
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
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
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

    if (!req.user) {
      res.status(401).json({ success: false, message: 'No autenticado. Token requerido.' });
      return;
    }

    if (req.user.role === 'CUSTOMER') {
      const isOwner = existing.leadEmail && existing.leadEmail.toLowerCase() === req.user.email.toLowerCase();
      if (!isOwner) {
        res.status(403).json({ success: false, message: 'No tienes permiso para eliminar esta cotización.' });
        return;
      }
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
