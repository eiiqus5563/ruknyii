'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import { API_BACKEND_URL } from '@/lib/config';

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get('email') || '';
  const type = searchParams.get('type') as 'LOGIN' | 'SIGNUP' || 'LOGIN';

  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  useEffect(() => {
    if (!email) router.replace('/login');
  }, [email, router]);

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setResendSuccess(false);
    setResendError('');

    try {
      const res = await fetch('/api/auth/quicksign/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setResendSuccess(true);
        setCanResend(false);
        setCountdown(60);
      } else {
        const data = await res.json();
        setResendError(data.message || 'فشل إعادة الإرسال. يرجى المحاولة لاحقًا');
      }
    } catch {
      setResendError('فشل إعادة الإرسال. يرجى المحاولة لاحقًا');
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="w-full py-10" dir="rtl">
      <div className="flex flex-col items-center w-full">
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 size-11">
          <Mail className="size-5 text-zinc-500 dark:text-zinc-300" />
        </div>

        {/* Header */}
        <div className="text-center mb-7">
          <h1 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-white mb-2">
            تحقق من بريدك
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
            أرسلنا رابط تسجيل الدخول إلى
          </p>
          <p className="text-base font-medium text-zinc-900 dark:text-white" dir="ltr">
            {email}
          </p>
        </div>

        {/* Info */}
        <div className="w-full space-y-4 mb-5">
          <div className="text-center p-4 bg-zinc-100/70 dark:bg-zinc-800/60 rounded-3xl">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {type === 'LOGIN'
                ? 'اضغط على الرابط في بريدك لتسجيل الدخول'
                : 'اضغط على الرابط في بريدك لإكمال التسجيل'}
            </p>
            <p className="text-xs text-zinc-400/60 dark:text-zinc-500/60 mt-2">
              الرابط صالح لمدة 10 دقائق فقط
            </p>
          </div>

          {resendSuccess && (
            <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-green-600 dark:text-green-400 text-sm text-center">
              تم إعادة إرسال الرابط بنجاح
            </div>
          )}

          {resendError && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-red-600 dark:text-red-400 text-sm text-center">
              {resendError}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3">
          <button
            onClick={handleResend}
            disabled={!canResend || resending}
            className="flex items-center justify-center gap-2 w-full h-[48px] border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white font-medium rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري الإرسال...</span>
              </>
            ) : !canResend ? (
              <span>إعادة الإرسال ({countdown})</span>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                <span>إعادة إرسال الرابط</span>
              </>
            )}
          </button>

          <button
            onClick={() => router.replace('/login')}
            className="flex items-center justify-center gap-2 w-full h-[48px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white font-medium rounded-full transition-all duration-300"
          >
            <ArrowRight className="h-4 w-4" />
            <span>تغيير البريد الإلكتروني</span>
          </button>

          <button
            onClick={() => {
              const q = new URLSearchParams();
              if (email) q.set('email', email);
              if (type) q.set('type', type);
              router.push(`/verify-identity?${q.toString()}`);
            }}
            className="flex items-center justify-center gap-2 w-full h-[40px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 text-[15px] font-medium rounded-full transition-all duration-300"
          >
            <span>جرّب طريقة أخرى</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    }>
      <CheckEmailContent />
    </Suspense>
  );
}
