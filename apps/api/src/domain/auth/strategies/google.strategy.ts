import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

/**
 * 🔒 Google OAuth Strategy
 *
 * تحسينات أمنية:
 * - التحقق من email_verified من Google
 * - استخدام Google ID للتحقق من الهوية
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    // 🔒 التحقق من أن البريد موجود ومُتحقق منه
    if (!emails || emails.length === 0) {
      return done(
        new UnauthorizedException('لا يوجد بريد إلكتروني مرتبط بحساب Google'),
        null,
      );
    }

    const primaryEmail = emails[0];

    // 🔒 التحقق من email_verified من Google (مقارنة صريحة)
    // Google يوفر هذه المعلومة ويجب استخدامها
    if (primaryEmail.verified !== true) {
      return done(
        new UnauthorizedException('البريد الإلكتروني غير مُتحقق منه في Google'),
        null,
      );
    }

    const user = {
      googleId: id,
      email: primaryEmail.value,
      emailVerified: true, // 🔒 نصل هنا فقط إذا كان verified === true
      name: `${name.givenName} ${name.familyName}`,
      avatar: photos?.[0]?.value || null,
      accessToken,
      refreshToken,
    };

    done(null, user);
  }
}
