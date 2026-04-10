'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Shield, KeyRound, Mail } from 'lucide-react';
import { InlineErrorNotice } from '@/components/ui/inline-notice';
import { useToast } from '@/components/ui/toast';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function VerifyIdentityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState<null | 'authenticator' | 'recovery'>(null);

  const email = searchParams.get('email') || '';
  const type = (searchParams.get('type') as 'LOGIN' | 'SIGNUP' | null) || 'LOGIN';
  const sessionId = searchParams.get('sessionId') || '';
  const hasValidSessionId = useMemo(() => UUID_REGEX.test(sessionId), [sessionId]);

  const startAlternativeSession = async (): Promise<string | null> => {
    if (!email) {
      const message = 'لا يوجد بريد مرتبط بهذه المحاولة. ارجع إلى صفحة تسجيل الدخول أولًا.';
      setError(message);
      toast.error(message);
      return null;
    }

    const response = await fetch('/api/auth/2fa/start-verify-identity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok || !data?.success) {
      const message = 'تعذر استخدام هذه الطريقة الآن. استخدم البريد الإلكتروني أو حاول لاحقًا.';
      setError(message);
      toast.error(message);
      return null;
    }

    if (!data?.pendingSessionId) {
      const message = 'تعذر استخدام هذه الطريقة الآن. استخدم البريد الإلكتروني أو حاول لاحقًا.';
      setError(message);
      toast.error(message);
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
      toast.info('سيتم التحقق عبر تطبيق المصادقة.');
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
      toast.info('سيتم التحقق باستخدام رمز الاسترداد.');
      router.push(`/auth/verify-2fa?sessionId=${encodeURIComponent(effectiveSessionId)}&method=recovery`);
    } finally {
      setIsStarting(null);
    }
  };

  return (
    <div className="w-full py-6" dir="rtl">
      <h1 className="text-center text-[34px] sm:text-[42px] leading-[1.15] font-light text-zinc-900 dark:text-zinc-100 mb-8">
        اختر طريقة
        <br />
        للتحقق من هويتك
      </h1>

      {error && (
        <InlineErrorNotice message={error} className="mb-5" />
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={goToAuthenticator}
          disabled={isStarting !== null}
          className="w-full h-[62px] rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 transition-colors px-6 flex items-center gap-3 text-right hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isStarting === 'authenticator' ? (
            <Loader2 className="w-5 h-5 text-zinc-700 dark:text-zinc-200 animate-spin" />
          ) : (
            <Shield className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
          )}
          <span className="text-[18px] sm:text-[19px] font-medium text-zinc-900 dark:text-zinc-100">
            تطبيق المصادقة أو ما يشابهه
          </span>
        </button>

        <button
          type="button"
          onClick={goToRecovery}
          disabled={isStarting !== null}
          className="w-full h-[62px] rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 transition-colors px-6 flex items-center gap-3 text-right hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isStarting === 'recovery' ? (
            <Loader2 className="w-5 h-5 text-zinc-700 dark:text-zinc-200 animate-spin" />
          ) : (
            <KeyRound className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
          )}
          <span className="text-[18px] sm:text-[19px] font-medium text-zinc-900 dark:text-zinc-100">رمز الاسترداد</span>
        </button>

        <button
          type="button"
          onClick={goToEmailMethod}
          className="w-full h-[62px] rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors px-6 flex items-center gap-3 text-right"
        >
          <Mail className="w-5 h-5 text-zinc-700 dark:text-zinc-200" />
          <span className="text-[18px] sm:text-[19px] font-medium text-zinc-900 dark:text-zinc-100">البريد الإلكتروني</span>
        </button>
      </div>

      <div className="mt-8 text-center text-sm text-zinc-500" dir="rtl">
        <a href="/terms" className="hover:underline">شروط الاستخدام</a>
        <span className="mx-3">|</span>
        <a href="/privacy" className="hover:underline">سياسة الخصوصية</a>
      </div>
    </div>
  );
}

export default function VerifyIdentityPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <VerifyIdentityContent />
    </Suspense>
  );
}
