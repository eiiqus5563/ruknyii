'use client';

/**
 * 🔐 Verify 2FA Page - Two-factor authentication verification
 * 
 * يُستخدم عند تسجيل الدخول عندما يكون المستخدم لديه 2FA مفعل
 * يتطلب pendingSessionId من الـ URL parameters
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import { InputOTP, REGEXP_ONLY_DIGITS } from '@heroui/react';
import { setCsrfToken, resetRefreshState, scheduleSilentRefresh } from '@/lib/api/client';
import { InlineErrorNotice } from '@/components/ui/inline-notice';
import { useToast } from '@/components/ui/toast';

// UUID v4 format validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function Verify2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const rawSessionId = searchParams.get('sessionId');
  const selectedMethod = searchParams.get('method');
  // 🔒 Validate sessionId format to prevent path traversal/injection
  const sessionId = rawSessionId && UUID_REGEX.test(rawSessionId) ? rawSessionId : null;
  
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackupCode, setUseBackupCode] = useState(selectedMethod === 'recovery');
  const [rememberDevice] = useState(true);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);

  useEffect(() => {
    if (selectedMethod === 'recovery') setUseBackupCode(true);
    if (selectedMethod === 'authenticator') setUseBackupCode(false);
  }, [selectedMethod]);

  // Redirect if no session ID
  useEffect(() => {
    if (!sessionId) {
      toast.warning('انتهت الجلسة الحالية. سجّل الدخول مرة أخرى.');
      router.push('/login?session=expired');
    }
  }, [sessionId, router, toast]);

  // 🔒 التحقق من صلاحية الجلسة عند تحميل الصفحة (مع retry)
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
          // إذا كانت المحاولة الأولى وفشلت، جرب مرة أخرى (قد تكون الجلسة لم تُنشأ بعد)
          if (retryCount < 2) {
            console.log(`[2FA] Session check failed, retrying... (${retryCount + 1}/2)`);
            setTimeout(() => checkSession(retryCount + 1), 500);
            return;
          }
          
          // الجلسة منتهية - إعادة التوجيه إلى تسجيل الدخول
          console.error('[2FA] Session invalid or expired:', data.error);
          toast.warning('انتهت صلاحية جلسة التحقق. ابدأ تسجيل الدخول من جديد.');
          router.push('/login?session=expired');
          return;
        }

        console.log('[2FA] Session valid, proceeding...');
        setSessionValid(true);
        setIsCheckingSession(false);
      } catch (err) {
        console.error('[2FA] Failed to check session:', err);
        // إذا كانت المحاولة الأولى وفشلت، جرب مرة أخرى
        if (retryCount < 2) {
          setTimeout(() => checkSession(retryCount + 1), 500);
          return;
        }
        setIsCheckingSession(false);
        toast.error('تعذر التحقق من الجلسة حاليًا. حاول مرة أخرى.');
        router.push('/login?session=expired');
      }
    };

    checkSession();
  }, [sessionId, router, toast]);

  const handleSubmit = async () => {
    if (code.length !== 6 && !useBackupCode) {
      const message = 'يرجى إدخال رمز مكوّن من 6 أرقام.';
      setError(message);
      toast.error(message);
      return;
    }

    if (useBackupCode && code.length < 8) {
      const message = 'يرجى إدخال رمز الاسترداد كاملًا.';
      setError(message);
      toast.error(message);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 🔒 Use Route Handler for proper cookie forwarding
      const response = await fetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          token: code.replace(/-/g, ''),
          pendingSessionId: sessionId,
          rememberDevice,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // إذا انتهت الجلسة، إعادة التوجيه إلى تسجيل الدخول
        if (data.expired) {
          toast.warning('انتهت الجلسة الحالية. سجّل الدخول مرة أخرى.');
          router.push('/login?session=expired');
          return;
        }
        throw new Error(data.error || data.message || 'رمز التحقق غير صحيح');
      }

      // 🔒 Store CSRF token (access token is in httpOnly cookie)
      if (data.csrf_token) {
        setCsrfToken(data.csrf_token);
        resetRefreshState(); // Reset any failed refresh state
      }
      if (typeof data.expires_in === 'number') {
        scheduleSilentRefresh(data.expires_in);
      }

      // Show message if backup code was used
      if (data.usedBackupCode) {
        toast.info('تم تسجيل الدخول باستخدام رمز استرداد.');
      }

      // Redirect to dashboard
      toast.success('تم التحقق من هويتك بنجاح.');
      router.push('/app');
    } catch (err: any) {
      const message = err.message || 'حدث خطأ أثناء التحقق';
      setError(message);
      toast.error(message);
      setCode(''); // Clear code on error to prevent infinite loop
    } finally {
      setIsLoading(false);
    }
  };

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

  if (!sessionValid) {
    return null;
  }

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
      dir="rtl"
      className="w-full py-4"
      style={{ fontFamily: '"IBM Plex Sans Arabic", sans-serif' }}
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

      {/* Error Message */}
      {error && (
        <InlineErrorNotice message={error} className="mb-5" />
      )}

      {/* OTP Input */}
      {useBackupCode ? (
        <div className="mb-6">
          <label className="block text-[14px] font-medium text-zinc-700 dark:text-zinc-300 mb-2 text-right">
            رمز الاسترداد
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX"
            disabled={isLoading}
            className="w-full h-[52px] px-4 text-[18px] font-mono border border-zinc-200 dark:border-zinc-700 rounded-2xl bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-zinc-400 dark:focus:border-zinc-500 transition-all disabled:opacity-60 tracking-wider text-center"
            dir="ltr"
            inputMode="text"
            maxLength={20}
            autoFocus
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 mb-6" dir="ltr">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={(val) => setCode(val)}
            onComplete={() => handleSubmit()}
            pattern={REGEXP_ONLY_DIGITS}
            isDisabled={isLoading}
            isInvalid={!!error}
            autoFocus
          >
            <InputOTP.Group className="gap-2">
              <InputOTP.Slot className="size-[52px] rounded-xl text-lg font-semibold" index={0} />
              <InputOTP.Slot className="size-[52px] rounded-xl text-lg font-semibold" index={1} />
              <InputOTP.Slot className="size-[52px] rounded-xl text-lg font-semibold" index={2} />
            </InputOTP.Group>
            <InputOTP.Separator className="mx-1" />
            <InputOTP.Group className="gap-2">
              <InputOTP.Slot className="size-[52px] rounded-xl text-lg font-semibold" index={3} />
              <InputOTP.Slot className="size-[52px] rounded-xl text-lg font-semibold" index={4} />
              <InputOTP.Slot className="size-[52px] rounded-xl text-lg font-semibold" index={5} />
            </InputOTP.Group>
          </InputOTP>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading || (useBackupCode ? code.length < 8 : code.length !== 6)}
        className="flex items-center justify-center gap-2 h-[52px] w-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[16px] rounded-2xl font-medium transition-all dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-[18px] h-[18px] animate-spin" />
            <span>جارٍ التحقق...</span>
          </>
        ) : (
          <span>تأكيد</span>
        )}
      </button>

      {/* Alternative method */}
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
