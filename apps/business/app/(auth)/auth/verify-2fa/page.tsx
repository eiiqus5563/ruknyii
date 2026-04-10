'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { setCsrfToken, resetRefreshState, scheduleSilentRefresh } from '@/lib/api-client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Verify2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawSessionId = searchParams.get('sessionId');
  const selectedMethod = searchParams.get('method');
  const sessionId = rawSessionId && UUID_REGEX.test(rawSessionId) ? rawSessionId : null;

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(selectedMethod === 'recovery');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedMethod === 'recovery') setUseBackupCode(true);
    if (selectedMethod === 'authenticator') setUseBackupCode(false);
  }, [selectedMethod]);

  useEffect(() => {
    if (!sessionId) {
      router.push('/login?session=expired');
    }
  }, [sessionId, router]);

  // Check session validity
  useEffect(() => {
    if (!sessionId) return;

    const checkSession = async (retryCount = 0) => {
      try {
        const response = await fetch(`/api/auth/2fa/check-session/${sessionId}`, {
          method: 'GET',
          credentials: 'include',
        });
        const data = await response.json();

        if (!response.ok || !data.valid) {
          if (retryCount < 2) {
            setTimeout(() => checkSession(retryCount + 1), 500);
            return;
          }
          router.push('/login?session=expired');
          return;
        }

        setSessionValid(true);
        setIsCheckingSession(false);
      } catch {
        if (retryCount < 2) {
          setTimeout(() => checkSession(retryCount + 1), 500);
          return;
        }
        setIsCheckingSession(false);
        router.push('/login?session=expired');
      }
    };

    checkSession();
  }, [sessionId, router]);

  const handleSubmit = async () => {
    if (code.length !== 6 && !useBackupCode) {
      setError('يرجى إدخال رمز مكوّن من 6 أرقام.');
      return;
    }
    if (useBackupCode && code.length < 8) {
      setError('يرجى إدخال رمز الاسترداد كاملًا.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token: code.replace(/-/g, ''),
          pendingSessionId: sessionId,
          rememberDevice: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.expired) {
          router.push('/login?session=expired');
          return;
        }
        throw new Error(data.error || data.message || 'رمز التحقق غير صحيح');
      }

      if (data.csrf_token) {
        setCsrfToken(data.csrf_token);
        resetRefreshState();
      }
      if (typeof data.expires_in === 'number') {
        scheduleSilentRefresh(data.expires_in);
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء التحقق');
      setCode('');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit when 6 digits entered (authenticator mode)
  useEffect(() => {
    if (!useBackupCode && code.length === 6) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (!sessionId || isCheckingSession) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-7 h-7 animate-spin text-zinc-400 mx-auto mb-3" />
          <p className="text-[15px] text-zinc-500 dark:text-zinc-400">جارٍ التحقق من الجلسة...</p>
        </div>
      </div>
    );
  }

  if (!sessionValid) return null;

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
      dir="rtl"
      className="w-full py-4"
    >
      {/* Icon */}
      <div className="flex justify-center mb-5">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800">
          {useBackupCode ? (
            <KeyRound className="w-7 h-7 text-zinc-600 dark:text-zinc-300" />
          ) : (
            <ShieldCheck className="w-7 h-7 text-zinc-600 dark:text-zinc-300" />
          )}
        </div>
      </div>

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-zinc-900 dark:text-white leading-[1.2]">
          تحقّق من هويتك
        </h1>
        <p className="mt-2 text-[15px] leading-7 text-zinc-500 dark:text-zinc-400">
          {useBackupCode
            ? 'أدخل أحد رموز الاسترداد التي احتفظت بها مسبقًا.'
            : 'افتح تطبيق المصادقة وأدخل الرمز المؤقت.'
          }
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-red-600 dark:text-red-400 text-sm text-center mb-5">
          {error}
        </div>
      )}

      {/* Input */}
      {useBackupCode ? (
        <div className="mb-6">
          <label className="block text-[14px] font-medium text-zinc-700 dark:text-zinc-300 mb-2 text-right">
            رمز الاسترداد
          </label>
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX"
            disabled={isLoading}
            className="w-full h-[52px] px-4 text-[18px] font-mono border border-zinc-200 dark:border-zinc-700 rounded-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20 transition-all disabled:opacity-60 tracking-wider text-center"
            dir="ltr"
            inputMode="text"
            maxLength={20}
            autoFocus
          />
        </div>
      ) : (
        <div className="mb-6">
          <label className="block text-[14px] font-medium text-zinc-700 dark:text-zinc-300 mb-2 text-right">
            رمز التحقق
          </label>
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(val);
            }}
            placeholder="000000"
            disabled={isLoading}
            className="w-full h-[52px] px-4 text-[24px] font-mono border border-zinc-200 dark:border-zinc-700 rounded-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20 transition-all disabled:opacity-60 tracking-[0.5em] text-center"
            dir="ltr"
            inputMode="numeric"
            maxLength={6}
            autoFocus
          />
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || (useBackupCode ? code.length < 8 : code.length !== 6)}
        className="flex items-center justify-center gap-2 h-[48px] w-full bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-zinc-900 text-[14px] rounded-full font-semibold transition-all"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>جارٍ التحقق...</span>
          </>
        ) : (
          <span>تأكيد</span>
        )}
      </button>

      {/* Alternative */}
      <div className="mt-5 flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const q = new URLSearchParams();
            if (sessionId) q.set('sessionId', sessionId);
            router.push(`/verify-identity?${q.toString()}`);
          }}
          className="text-[15px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white font-medium transition-colors"
        >
          جرّب طريقة أخرى
        </button>

        <button
          type="button"
          onClick={() => router.push('/login')}
          className="flex items-center justify-center gap-1 text-[13px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          العودة إلى تسجيل الدخول
        </button>
      </div>
    </form>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-zinc-400" />
      </div>
    }>
      <Verify2FAContent />
    </Suspense>
  );
}
