import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { storageService } from '../services/storage.service';
import { AuthenticatedRequest } from '../middlewares/auth';
import path from 'path';

const presignedUrlSchema = z.object({
  fileName: z.string().min(1, 'El nombre de archivo es requerido.'),
  fileType: z.string().min(1, 'El tipo MIME es requerido.'),
  fileSizeBytes: z.number().positive('El tamaño debe ser mayor a 0 bytes.'),
  context: z.enum(['orders', 'quotes', 'general']).optional().default('general'),
  referenceCode: z.string().optional(),
});

const confirmUploadSchema = z.object({
  fileKey: z.string().min(1, 'El fileKey es requerido.'),
  fileUrl: z.string().min(1, 'La URL del archivo es requerida.'),
  fileName: z.string().min(1, 'El nombre del archivo es requerido.'),
  fileSizeBytes: z.number().nonnegative().optional(),
  orderId: z.string().optional(),
  quoteId: z.string().optional(),
});

export async function getPresignedUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = presignedUrlSchema.parse(req.body);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.get('host') || 'localhost:4000';
    const baseUrl = `${protocol}://${host}`;

    const result = await storageService.generatePresignedUploadUrl(data, baseUrl);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function confirmUpload(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = confirmUploadSchema.parse(req.body);

    // Si se vincula a una orden existente
    if (data.orderId) {
      const order = await prisma.order.findUnique({ where: { id: data.orderId } });
      if (order) {
        await prisma.order.update({
          where: { id: data.orderId },
          data: {
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileSizeBytes: data.fileSizeBytes,
          },
        });
      }
    }

    // Si se vincula a una cotización existente
    if (data.quoteId) {
      const quote = await prisma.quote.findUnique({ where: { id: data.quoteId } });
      if (quote) {
        await prisma.quote.update({
          where: { id: data.quoteId },
          data: {
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileSizeBytes: data.fileSizeBytes,
          },
        });
      }
    }

    res.json({
      success: true,
      message: 'Archivo de impresión vinculado exitosamente.',
      asset: {
        fileKey: data.fileKey,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSizeBytes: data.fileSizeBytes,
        orderId: data.orderId || null,
        quoteId: data.quoteId || null,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDownloadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const fileKey = (req.query.fileKey as string) || (req.params.key as string);
    if (!fileKey) {
      res.status(400).json({ success: false, message: 'Parámetro fileKey requerido.' });
      return;
    }

    const downloadUrl = await storageService.generatePresignedDownloadUrl(fileKey);

    res.json({
      success: true,
      downloadUrl,
      fileKey,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAsset(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const fileKey = req.params.key || (req.query.fileKey as string);
    if (!fileKey) {
      res.status(400).json({ success: false, message: 'fileKey es requerido para eliminar el archivo.' });
      return;
    }

    const deleted = await storageService.deleteObject(fileKey);

    res.json({
      success: true,
      message: deleted ? 'Archivo eliminado de almacenamiento.' : 'El archivo no fue encontrado o ya fue eliminado.',
      fileKey,
    });
  } catch (error) {
    next(error);
  }
}

export function getStatus(_req: Request, res: Response): void {
  const status = storageService.getStatus();
  res.json({
    success: true,
    storage: status,
  });
}

export function handleLocalUpload(req: Request, res: Response, next: NextFunction): void {
  try {
    const fileKey = req.params.key;
    if (!fileKey) {
      res.status(400).json({ success: false, message: 'fileKey requerido para subida local.' });
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      storageService.saveLocalFile(decodeURIComponent(fileKey), buffer);
      res.status(200).json({
        success: true,
        message: 'Archivo guardado en almacenamiento local simulado.',
        fileKey,
        bytesReceived: buffer.length,
      });
    });

    req.on('error', (err) => {
      next(err);
    });
  } catch (error) {
    next(error);
  }
}

export function serveLocalFile(req: Request, res: Response): void {
  const fileKey = req.params.key;
  if (!fileKey) {
    res.status(400).json({ success: false, message: 'fileKey requerido.' });
    return;
  }

  const localPath = storageService.getLocalFilePath(decodeURIComponent(fileKey));
  if (!localPath) {
    res.status(404).json({ success: false, message: 'Archivo no encontrado en almacenamiento local.' });
    return;
  }

  res.sendFile(localPath);
}
