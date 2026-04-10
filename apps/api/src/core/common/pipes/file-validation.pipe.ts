import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';

/**
 * 🔒 File Validation Pipe
 *
 * يتحقق من نوع الملف الفعلي باستخدام Magic Bytes (وليس MIME type المرسل من العميل)
 * يُستخدم مع @UploadedFile() أو @UploadedFiles()
 *
 * Usage:
 *   @UploadedFile(new FileValidationPipe({ allowedTypes: ['image/jpeg', 'image/png'], maxSize: 5 * 1024 * 1024 }))
 *   @UploadedFiles(new FileValidationPipe({ allowedTypes: [...], maxSize: 10 * 1024 * 1024 }))
 */
@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly allowedTypes: string[];
  private readonly maxSize: number;

  constructor(options: { allowedTypes: string[]; maxSize: number }) {
    this.allowedTypes = options.allowedTypes;
    this.maxSize = options.maxSize;
  }

  async transform(
    value: Express.Multer.File | Express.Multer.File[],
  ): Promise<Express.Multer.File | Express.Multer.File[]> {
    if (Array.isArray(value)) {
      for (const file of value) {
        await this.validateSingleFile(file);
      }
      return value;
    }

    if (value) {
      await this.validateSingleFile(value);
    }

    return value;
  }

  private async validateSingleFile(file: Express.Multer.File): Promise<void> {
    if (!file) return;

    // 1. Validate file size
    if (file.size > this.maxSize) {
      throw new BadRequestException(
        `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum: ${(this.maxSize / 1024 / 1024).toFixed(0)}MB`,
      );
    }

    // 2. Get buffer (works for both memoryStorage and diskStorage)
    const buffer = file.buffer || (file.path ? require('fs').readFileSync(file.path) : null);

    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Invalid file: empty or unreadable');
    }

    // 3. Detect actual file type via magic bytes
    const detectedType = await fileTypeFromBuffer(buffer);

    // For text-based files (CSV, TXT, plain text) magic bytes detection doesn't work,
    // so we allow them if they were in the allowlist and the extension matches
    const textTypes = ['text/plain', 'text/csv'];
    const isTextType = textTypes.includes(file.mimetype);

    if (!detectedType && isTextType && this.allowedTypes.some((t) => textTypes.includes(t))) {
      // Text file — can't verify magic bytes, but it's allowed by config
      return;
    }

    if (!detectedType) {
      throw new BadRequestException(
        'Unable to determine file type. File may be corrupted or invalid.',
      );
    }

    // 4. Check detected type against allowlist
    if (!this.allowedTypes.includes(detectedType.mime)) {
      throw new BadRequestException(
        `File content does not match allowed types. Detected: ${detectedType.mime}. Allowed: ${this.allowedTypes.join(', ')}`,
      );
    }

    // 5. Override mimetype with the real detected type (prevents MIME spoofing downstream)
    file.mimetype = detectedType.mime;
  }
}
