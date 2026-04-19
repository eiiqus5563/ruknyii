import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * 🔐 خدمة تشفير Access Tokens
 *
 * تشفير AES-256-GCM لحماية tokens المخزّنة في قاعدة البيانات
 */
@Injectable()
export class TokenEncryptionService {
  private readonly logger = new Logger(TokenEncryptionService.name);
  private readonly encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    const masterKey = this.configService.get<string>('ENCRYPTION_KEY', '');
    if (!masterKey || masterKey.length < 32) {
      this.logger.warn('ENCRYPTION_KEY not set or too short. Token encryption will use fallback.');
    }
    // اشتقاق مفتاح 32 بايت من المفتاح الرئيسي
    this.encryptionKey = scryptSync(
      masterKey || 'default-dev-key-change-in-production',
      'rukny-whatsapp-salt',
      32,
    );
  }

  /**
   * تشفير نص
   * يُرجع: base64(iv:encrypted:authTag)
   */
  encrypt(plaintext: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return Buffer.from(`${iv.toString('hex')}:${encrypted}:${authTag}`).toString(
      'base64',
    );
  }

  /**
   * فك تشفير نص
   */
  decrypt(ciphertext: string): string {
    const decoded = Buffer.from(ciphertext, 'base64').toString('utf8');
    const [ivHex, encryptedHex, authTagHex] = decoded.split(':');

    if (!ivHex || !encryptedHex || !authTagHex) {
      throw new Error('Invalid encrypted format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
