import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../core/common/guards/auth/jwt-auth.guard';
import { PlanGuard } from '../../core/common/guards/plan.guard';
import { CheckFeature } from '../../core/common/decorators/auth/plan.decorator';
import { DigitalAssetsService } from './digital-assets.service';
import { FileValidationPipe } from '../../core/common/pipes/file-validation.pipe';

@ApiTags('Digital Assets')
@Controller('stores/products')
export class DigitalAssetsController {
  constructor(private readonly digitalAssetsService: DigitalAssetsService) {}

  /**
   * رفع ملف رقمي للمنتج
   */
  @Post(':id/digital-file')
  @UseGuards(JwtAuthGuard, PlanGuard)
  @CheckFeature('digitalProducts')
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(process.cwd(), 'uploads', 'digital-temp');
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `${uuidv4()}${ext}`);
      },
    }),
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  }))
  @ApiOperation({ summary: 'رفع ملف رقمي للمنتج' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'تم رفع الملف بنجاح' })
  uploadDigitalFile(
    @Param('id') productId: string,
    @Request() req,
    @UploadedFile(new FileValidationPipe({
      allowedTypes: [
        'application/pdf', 'application/epub+zip', 'application/zip', 'application/x-zip-compressed',
        'audio/mpeg', 'audio/wav', 'video/mp4',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg', 'image/png', 'image/webp',
      ],
      maxSize: 100 * 1024 * 1024,
    })) file: Express.Multer.File,
  ) {
    return this.digitalAssetsService.uploadDigitalFile(req.user.id, productId, file);
  }

  /**
   * رفع ملف معاينة
   */
  @Post(':id/digital-preview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(process.cwd(), 'uploads', 'digital-temp');
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `${uuidv4()}${ext}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  }))
  @ApiOperation({ summary: 'رفع ملف معاينة للمنتج الرقمي' })
  @ApiConsumes('multipart/form-data')
  uploadPreviewFile(
    @Param('id') productId: string,
    @Request() req,
    @UploadedFile(new FileValidationPipe({
      allowedTypes: [
        'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
        'audio/mpeg', 'video/mp4',
      ],
      maxSize: 10 * 1024 * 1024,
    })) file: Express.Multer.File,
  ) {
    return this.digitalAssetsService.uploadPreviewFile(req.user.id, productId, file);
  }

  /**
   * الحصول على معلومات الملف الرقمي
   */
  @Get(':id/digital-file')
  @ApiOperation({ summary: 'معلومات الملف الرقمي' })
  getDigitalAsset(@Param('id') productId: string) {
    return this.digitalAssetsService.getDigitalAsset(productId);
  }

  /**
   * الحصول على رابط المعاينة
   */
  @Get(':id/digital-preview')
  @ApiOperation({ summary: 'رابط معاينة المنتج الرقمي' })
  async getPreviewUrl(@Param('id') productId: string) {
    const url = await this.digitalAssetsService.getPreviewUrl(productId);
    return { url };
  }

  /**
   * حذف الملف الرقمي
   */
  @Delete(':id/digital-file')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف الملف الرقمي' })
  deleteDigitalFile(@Param('id') productId: string, @Request() req) {
    return this.digitalAssetsService.deleteDigitalFile(req.user.id, productId);
  }
}

/**
 * Controller لتحميل الملفات الرقمية (عام)
 */
@ApiTags('Downloads')
@Controller('downloads')
export class DownloadsController {
  constructor(private readonly digitalAssetsService: DigitalAssetsService) {}

  /**
   * تحميل ملف رقمي عبر رمز التحميل
   */
  @Get(':token')
  @ApiOperation({ summary: 'تحميل ملف رقمي' })
  @ApiResponse({ status: 200, description: 'رابط التحميل المؤقت' })
  @ApiResponse({ status: 404, description: 'رمز التحميل غير صالح' })
  getDownloadUrl(@Param('token') token: string) {
    return this.digitalAssetsService.getDownloadUrl(token);
  }

  /**
   * الحصول على رموز التحميل لطلب معين
   */
  @Get('order/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'رموز التحميل لطلب' })
  getOrderDownloads(@Param('orderId') orderId: string, @Request() req) {
    return this.digitalAssetsService.getOrderDownloadTokens(orderId, req.user.id);
  }
}
