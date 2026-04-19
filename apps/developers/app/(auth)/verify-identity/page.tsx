'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, KeyRound, Mail } from 'lucide-react';
import { Alert, Spinner } from '@heroui/react';
import { useLocale } from '@/providers/locale-provider';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function VerifyIdentityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState<null | 'authenticator' | 'recovery'>(null);

  const email = searchParams.get('email') || '';
  const type = (searchParams.get('type') as 'LOGIN' | 'SIGNUP' | null) || 'LOGIN';
  const sessionId = searchParams.get('sessionId') || '';
  const hasValidSessionId = useMemo(() => UUID_REGEX.test(sessionId), [sessionId]);

  const startAlternativeSession = async (): Promise<string | null> => {
    if (!email) {
      setError('لا يوجد بريد مرتبط بهذه المحاولة. ارجع إلى صفحة تسجيل الدخول أولًا.');
      return null;
    }

    const response = await fetch('/api/auth/2fa/start-verify-identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });

    let data: any;
    try {
      data = await response.json();
    } catch {
      setError('تعذر استخدام هذه الطريقة الآن. استخدم البريد الإلكتروني أو حاول لاحقًا.');
      return null;
    }
    if (!response.ok || !data?.success || !data?.pendingSessionId) {
      setError('تعذر استخدام هذه الطريقة الآن. استخدم البريد الإلكتروني أو حاول لاحقًا.');
      return null;
    }

    return String(data.pendingSessionId);
  };

  const goToEmailMethod = () => {
    const q = new URLSearchParams();
    if (email) q.set('email', email);
    if (type) q.set('type', type);
    router.push(`/check-email?${q.toString()}`);
  };

  const goToAuthenticator = async () => {
    try {
      setError(null);
      setIsStarting('authenticator');
      const effectiveSessionId = hasValidSessionId ? sessionId : await startAlternativeSession();
      if (!effectiveSessionId) return;
      router.push(`/auth/verify-2fa?sessionId=${encodeURIComponent(effectiveSessionId)}&method=authenticator`);
    } finally {
      setIsStarting(null);
    }
  };

  const goToRecovery = async () => {
    try {
      setError(null);
      setIsStarting('recovery');
      const effectiveSessionId = hasValidSessionId ? sessionId : await startAlternativeSession();
      if (!effectiveSessionId) return;
      router.push(`/auth/verify-2fa?sessionId=${encodeURIComponent(effectiveSessionId)}&method=recovery`);
    } finally {
      setIsStarting(null);
    }
  };

  return (
    <div className="w-full py-6">
      <h1 className="text-center text-[34px] sm:text-[42px] leading-[1.15] font-light text-foreground mb-8">
        {t.auth.verifyIdentity.title}
        <br />
        {t.auth.verifyIdentity.subtitle}
      </h1>

      {error && (
        <Alert status="danger" className="mb-5">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={goToAuthenticator}
          disabled={isStarting !== null}
          className="w-full h-[62px] rounded-full border border-border bg-background transition-colors px-6 flex items-center gap-3 hover:bg-default disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isStarting === 'authenticator' ? (
            <Spinner className="size-5" />
          ) : (
            <Shield className="size-5 text-foreground" />
          )}
          <span className="text-[18px] sm:text-[19px] font-medium text-foreground">
            {t.auth.verifyIdentity.authenticator}
          </span>
        </button>

        <button
          type="button"
          onClick={goToRecovery}
          disabled={isStarting !== null}
          className="w-full h-[62px] rounded-full border border-border bg-background transition-colors px-6 flex items-center gap-3 hover:bg-default disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isStarting === 'recovery' ? (
            <Spinner className="size-5" />
          ) : (
            <KeyRound className="size-5 text-foreground" />
          )}
          <span className="text-[18px] sm:text-[19px] font-medium text-foreground">{t.auth.verifyIdentity.recoveryCode}</span>
        </button>

        <button
          type="button"
          onClick={goToEmailMethod}
          className="w-full h-[62px] rounded-full border border-border bg-background hover:bg-default transition-colors px-6 flex items-center gap-3"
        >
          <Mail className="size-5 text-foreground" />
          <span className="text-[18px] sm:text-[19px] font-medium text-foreground">{t.auth.verifyIdentity.email}</span>
        </button>
      </div>

      <div className="mt-8 text-center text-sm text-muted">
        <a href="/terms" className="hover:underline hover:text-foreground transition-colors">{t.common.termsOfUse}</a>
        <span className="mx-3 text-border">|</span>
        <a href="/privacy" className="hover:underline hover:text-foreground transition-colors">{t.common.privacyPolicy}</a>
      </div>
    </div>
  );
}

export default function VerifyIdentityPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>}>
      <VerifyIdentityContent />
    </Suspense>
  );
}
