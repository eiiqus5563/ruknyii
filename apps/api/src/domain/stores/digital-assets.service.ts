import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import S3Service from '../../services/s3.service';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { readFileSync, unlinkSync, existsSync } from 'fs';

/**
 * خدمة إدارة الملفات الرقمية للمنتجات
 * رفع الملفات (PDF, EPUB, ZIP, MP3...) وحمايتها عبر S3 Private + Presigned URLs
 */
@Injectable()
export class DigitalAssetsService {
  private readonly logger = new Logger(DigitalAssetsService.name);
  private readonly bucket = process.env.S3_BUCKET || 'rukny-storage';

  // إعدادات الملفات الرقمية
  private readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly MAX_PREVIEW_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/epub+zip',
    'application/zip',
    'application/x-zip-compressed',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'video/mp4',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * التحقق من ملكية المنتج
   */
  private async verifyProductOwnership(productId: string, userId: string) {
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
      include: { stores: { select: { id: true, userId: true } } },
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }

    if (product.stores?.userId !== userId) {
      throw new ForbiddenException('ليس لديك صلاحية لتعديل هذا المنتج');
    }

    return product;
  }

  /**
   * التحقق من صحة الملف
   */
  private validateFile(file: Express.Multer.File, maxSize: number) {
    if (!file) {
      throw new BadRequestException('لم يتم توفير ملف');
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `نوع الملف غير مسموح: ${file.mimetype}. الأنواع المسموحة: PDF, EPUB, ZIP, MP3, MP4, DOCX, XLSX, PPTX, صور`,
      );
    }

    if (file.size > maxSize) {
      throw new BadRequestException(
        `حجم الملف كبير جداً. الحد الأقصى: ${maxSize / 1024 / 1024}MB`,
      );
    }
  }

  /**
   * بناء مفتاح S3 للملف الرقمي
   */
  private buildDigitalFileKey(storeId: string, productId: string, originalName: string): string {
    // 🔒 Use UUID filename with validated extension only
    const SAFE_EXTENSIONS = ['.pdf', '.epub', '.zip', '.mp3', '.wav', '.mp4', '.docx', '.xlsx', '.pptx', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = extname(originalName).toLowerCase();
    const safeExt = SAFE_EXTENSIONS.includes(ext) ? ext : '.bin';
    const uuid = uuidv4();
    return `stores/${storeId}/digital/${productId}/${uuid}${safeExt}`;
  }

  /**
   * قراءة الملف من القرص وحذفه بعد القراءة
   */
  private readAndCleanupTempFile(file: Express.Multer.File): Buffer {
    const filePath = file.path;
    if (!filePath || !existsSync(filePath)) {
      // Fallback to buffer if available (memoryStorage compatibility)
      if (file.buffer) return file.buffer;
      throw new BadRequestException('لم يتم العثور على الملف');
    }
    const buffer = readFileSync(filePath);
    // Cleanup temp file
    try { unlinkSync(filePath); } catch { /* ignore cleanup errors */ }
    return buffer;
  }

  /**
   * رفع ملف رقمي للمنتج
   */
  async uploadDigitalFile(
    userId: string,
    productId: string,
    file: Express.Multer.File,
  ) {
    const product = await this.verifyProductOwnership(productId, userId);
    this.validateFile(file, this.MAX_FILE_SIZE);

    // تحقق أن المنتج رقمي
    if (!product.isDigital) {
      throw new BadRequestException('هذا المنتج ليس رقمياً. قم بتفعيل خيار "منتج رقمي" أولاً');
    }

    // حذف الملف القديم إن وجد (ملف واحد فقط لكل منتج)
    const existingAssets = await this.prisma.digital_assets.findMany({
      where: { productId },
    });

    for (const asset of existingAssets) {
      await this.s3Service.deleteObject(this.bucket, asset.fileKey);
      await this.prisma.digital_assets.delete({ where: { id: asset.id } });
    }

    // رفع الملف الجديد
    const fileKey = this.buildDigitalFileKey(product.storeId, productId, file.originalname);

    // 🔒 Read from disk and cleanup temp file
    const buffer = this.readAndCleanupTempFile(file);

    await this.s3Service.uploadBuffer(
      this.bucket,
      fileKey,
      buffer,
      file.mimetype,
    );

    // حفظ في قاعدة البيانات
    const digitalAsset = await this.prisma.digital_assets.create({
      data: {
        productId,
        fileKey,
        fileName: file.originalname,
        fileSize: BigInt(file.size),
        mimeType: file.mimetype,
      },
    });

    this.logger.log(
      `Digital file uploaded for product ${productId}: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
    );

    return {
      id: digitalAsset.id,
      fileName: digitalAsset.fileName,
      fileSize: Number(digitalAsset.fileSize),
      mimeType: digitalAsset.mimeType,
    };
  }

  /**
   * رفع ملف معاينة (preview) للمنتج الرقمي
   */
  async uploadPreviewFile(
    userId: string,
    productId: string,
    file: Express.Multer.File,
  ) {
    const product = await this.verifyProductOwnership(productId, userId);
    this.validateFile(file, this.MAX_PREVIEW_SIZE);

    if (!product.isDigital) {
      throw new BadRequestException('هذا المنتج ليس رقمياً');
    }

    const asset = await this.prisma.digital_assets.findFirst({
      where: { productId },
    });

    if (!asset) {
      throw new BadRequestException('يرجى رفع الملف الرقمي أولاً قبل المعاينة');
    }

    // حذف المعاينة القديمة إن وجدت
    if (asset.previewKey) {
      await this.s3Service.deleteObject(this.bucket, asset.previewKey);
    }

    const previewKey = `stores/${product.storeId}/digital/${productId}/preview_${uuidv4()}${extname(file.originalname).toLowerCase() || '.pdf'}`;

    // 🔒 Read from disk and cleanup temp file
    const buffer = this.readAndCleanupTempFile(file);

    await this.s3Service.uploadBuffer(
      this.bucket,
      previewKey,
      buffer,
      file.mimetype,
    );

    await this.prisma.digital_assets.update({
      where: { id: asset.id },
      data: { previewKey },
    });

    this.logger.log(`Preview file uploaded for product ${productId}`);

    return { previewKey, fileName: file.originalname };
  }

  /**
   * الحصول على معلومات الملف الرقمي
   */
  async getDigitalAsset(productId: string) {
    const asset = await this.prisma.digital_assets.findFirst({
      where: { productId },
    });

    if (!asset) return null;

    return {
      id: asset.id,
      fileName: asset.fileName,
      fileSize: Number(asset.fileSize),
      mimeType: asset.mimeType,
      hasPreview: !!asset.previewKey,
      createdAt: asset.createdAt,
    };
  }

  /**
   * الحصول على رابط معاينة مؤقت (متاح للجميع)
   */
  async getPreviewUrl(productId: string): Promise<string | null> {
    const asset = await this.prisma.digital_assets.findFirst({
      where: { productId },
      select: { previewKey: true },
    });

    if (!asset?.previewKey) return null;

    return this.s3Service.getPresignedGetUrl(this.bucket, asset.previewKey, 3600); // 1 ساعة
  }

  /**
   * إنشاء رمز تحميل بعد الشراء
   */
  async createDownloadToken(orderItemId: string, maxDownloads = 5): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 يوم

    await this.prisma.download_tokens.create({
      data: {
        orderItemId,
        token,
        maxDownloads,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * تحميل الملف عبر رمز التحميل
   * يتحقق من: صحة الرمز، عدم انتهاء الصلاحية، عدد التحميلات
   */
  async getDownloadUrl(token: string): Promise<{ url: string; fileName: string }> {
    const downloadToken = await this.prisma.download_tokens.findUnique({
      where: { token },
      include: {
        orderItem: {
          include: {
            products: {
              include: {
                digitalAssets: true,
              },
            },
          },
        },
      },
    });

    if (!downloadToken) {
      throw new NotFoundException('رمز التحميل غير صالح');
    }

    if (new Date() > downloadToken.expiresAt) {
      throw new BadRequestException('انتهت صلاحية رابط التحميل');
    }

    if (downloadToken.downloadCount >= downloadToken.maxDownloads) {
      throw new BadRequestException(
        `تم استنفاد عدد التحميلات المسموحة (${downloadToken.maxDownloads})`,
      );
    }

    const digitalAsset = downloadToken.orderItem.products.digitalAssets[0];
    if (!digitalAsset) {
      throw new NotFoundException('الملف الرقمي غير موجود');
    }

    // تحديث عداد التحميلات
    await this.prisma.download_tokens.update({
      where: { id: downloadToken.id },
      data: { downloadCount: { increment: 1 } },
    });

    // إنشاء رابط تحميل مؤقت (15 دقيقة)
    const url = await this.s3Service.getPresignedGetUrl(
      this.bucket,
      digitalAsset.fileKey,
      900,
    );

    this.logger.log(
      `Download #${downloadToken.downloadCount + 1}/${downloadToken.maxDownloads} for token ${token}`,
    );

    return { url, fileName: digitalAsset.fileName };
  }

  /**
   * حذف الملف الرقمي
   */
  async deleteDigitalFile(userId: string, productId: string) {
    await this.verifyProductOwnership(productId, userId);

    const assets = await this.prisma.digital_assets.findMany({
      where: { productId },
    });

    for (const asset of assets) {
      await this.s3Service.deleteObject(this.bucket, asset.fileKey);
      if (asset.previewKey) {
        await this.s3Service.deleteObject(this.bucket, asset.previewKey);
      }
      await this.prisma.digital_assets.delete({ where: { id: asset.id } });
    }

    this.logger.log(`Digital files deleted for product ${productId}`);
    return { success: true };
  }

  /**
   * الحصول على رموز التحميل لطلب معين
   */
  async getOrderDownloadTokens(orderId: string, userId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        order_items: {
          include: {
            products: {
              select: { isDigital: true, name: true, nameAr: true },
            },
            downloadTokens: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('الطلب غير موجود');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('غير مصرح لك بالوصول لهذا الطلب');
    }

    return order.order_items
      .filter((item) => item.isDigital)
      .map((item) => ({
        orderItemId: item.id,
        productName: item.productNameAr || item.productName,
        token: item.downloadTokens[0]?.token || null,
        downloadCount: item.downloadTokens[0]?.downloadCount || 0,
        maxDownloads: item.downloadTokens[0]?.maxDownloads || 5,
        expiresAt: item.downloadTokens[0]?.expiresAt || null,
      }));
  }
}
