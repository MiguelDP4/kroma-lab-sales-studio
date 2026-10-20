import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

export interface StorageConfig {
  accountId?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  bucketName?: string;
  publicUrl?: string;
}

export interface PresignedUploadRequest {
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  context?: 'orders' | 'quotes' | 'general';
  referenceCode?: string; // Ej. "KL-2026-001" o "COT-2026-001"
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
  fileName: string;
  fileSizeBytes: number;
  fileType: string;
  expiresIn: number;
  provider: 'cloudflare-r2' | 'local-storage';
}

export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/tiff',
  'image/x-tiff',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
  'image/svg+xml',
  'application/postscript',
  'image/vnd.adobe.photoshop',
  'application/octet-stream',
];

export const ALLOWED_EXTENSIONS = [
  '.png',
  '.tif',
  '.tiff',
  '.pdf',
  '.svg',
  '.ai',
  '.psd',
  '.jpg',
  '.jpeg',
];

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

export class StorageService {
  private s3Client: S3Client | null = null;
  private config: StorageConfig;
  private localUploadDir: string;

  constructor(customConfig?: StorageConfig) {
    this.config = customConfig || {
      accountId: process.env.R2_ACCOUNT_ID,
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      bucketName: process.env.R2_BUCKET_NAME || 'kroma-lab-assets',
      publicUrl: process.env.R2_PUBLIC_URL,
    };

    this.localUploadDir = path.resolve(process.cwd(), 'uploads');
    this.initClient();
  }

  private initClient(): void {
    if (this.config.accountId && this.config.accessKeyId && this.config.secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${this.config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      });
    } else {
      this.s3Client = null;
    }
  }

  public isR2Configured(): boolean {
    return Boolean(
      this.s3Client &&
      this.config.accountId &&
      this.config.accessKeyId &&
      this.config.secretAccessKey &&
      this.config.bucketName
    );
  }

  public getStatus() {
    const isConfigured = this.isR2Configured();
    return {
      provider: isConfigured ? 'cloudflare-r2' : 'local-storage',
      isConfigured,
      bucket: this.config.bucketName || 'kroma-lab-assets',
      publicUrlConfigured: Boolean(this.config.publicUrl),
      maxSizeBytes: MAX_FILE_SIZE_BYTES,
      allowedExtensions: ALLOWED_EXTENSIONS,
    };
  }

  public sanitizeFileName(fileName: string): string {
    const parsed = path.parse(fileName);
    const cleanName = parsed.name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
      .slice(0, 80);
    const ext = parsed.ext.toLowerCase();
    return `${cleanName}${ext}`;
  }

  public validateFile(fileName: string, fileType: string, fileSizeBytes: number): void {
    if (!fileName || typeof fileName !== 'string') {
      throw new Error('Nombre de archivo inválido o requerido.');
    }

    const ext = path.extname(fileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`Extensión no permitida (${ext || 'sin extensión'}). Formatos soportados: PNG, TIFF, PDF, SVG, AI, PSD.`);
    }

    if (fileSizeBytes <= 0) {
      throw new Error('El tamaño del archivo debe ser mayor a 0 bytes.');
    }

    if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
      throw new Error(`El archivo supera el límite máximo permitido de 100 MB (${(fileSizeBytes / 1024 / 1024).toFixed(1)} MB).`);
    }

    if (fileType && !ALLOWED_MIME_TYPES.includes(fileType.toLowerCase())) {
      throw new Error(`Tipo MIME no permitido (${fileType}).`);
    }
  }

  public async generatePresignedUploadUrl(
    req: PresignedUploadRequest,
    baseUrl = 'http://localhost:4000'
  ): Promise<PresignedUploadResponse> {
    this.validateFile(req.fileName, req.fileType, req.fileSizeBytes);

    const safeName = this.sanitizeFileName(req.fileName);
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const folder = req.context || 'general';
    const ref = req.referenceCode ? `${req.referenceCode.replace(/[^a-zA-Z0-9_\-]/g, '')}/` : '';
    const fileKey = `assets/${folder}/${ref}${timestamp}-${randomSuffix}-${safeName}`;

    // Si Cloudflare R2 está configurado con credenciales válidas
    if (this.isR2Configured() && this.s3Client) {
      const bucket = this.config.bucketName || 'kroma-lab-assets';
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: fileKey,
        ContentType: req.fileType || 'application/octet-stream',
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      const publicUrl = this.config.publicUrl
        ? `${this.config.publicUrl.replace(/\/$/, '')}/${fileKey}`
        : uploadUrl.split('?')[0];

      return {
        uploadUrl,
        fileKey,
        publicUrl,
        fileName: safeName,
        fileSizeBytes: req.fileSizeBytes,
        fileType: req.fileType,
        expiresIn: 3600,
        provider: 'cloudflare-r2',
      };
    }

    // Modo de desarrollo local / pruebas sin credenciales R2
    const uploadUrl = `${baseUrl}/api/storage/local-upload/${encodeURIComponent(fileKey)}`;
    const publicUrl = `${baseUrl}/api/storage/local-file/${encodeURIComponent(fileKey)}`;

    return {
      uploadUrl,
      fileKey,
      publicUrl,
      fileName: safeName,
      fileSizeBytes: req.fileSizeBytes,
      fileType: req.fileType,
      expiresIn: 3600,
      provider: 'local-storage',
    };
  }

  public async generatePresignedDownloadUrl(fileKey: string, expiresIn = 3600): Promise<string> {
    if (!fileKey) {
      throw new Error('Identificador fileKey requerido.');
    }

    if (this.isR2Configured() && this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.config.bucketName || 'kroma-lab-assets',
        Key: fileKey,
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn });
    }

    // Modo local
    return `http://localhost:4000/api/storage/local-file/${encodeURIComponent(fileKey)}`;
  }

  public async deleteObject(fileKey: string): Promise<boolean> {
    if (!fileKey) return false;

    if (this.isR2Configured() && this.s3Client) {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName || 'kroma-lab-assets',
        Key: fileKey,
      });
      await this.s3Client.send(command);
      return true;
    }

    // Modo local: eliminar del directorio de subidas
    const filePath = path.join(this.localUploadDir, fileKey.replace(/\//g, path.sep));
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }

  public saveLocalFile(fileKey: string, buffer: Buffer): string {
    const targetPath = path.join(this.localUploadDir, fileKey.replace(/\//g, path.sep));
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.writeFileSync(targetPath, buffer);
    return targetPath;
  }

  public getLocalFilePath(fileKey: string): string | null {
    const targetPath = path.join(this.localUploadDir, fileKey.replace(/\//g, path.sep));
    return fs.existsSync(targetPath) ? targetPath : null;
  }
}

export const storageService = new StorageService();
