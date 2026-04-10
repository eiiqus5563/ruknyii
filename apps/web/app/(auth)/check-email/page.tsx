'use client';

/**
 * صفحة تأكيد البريد - Check Email
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Mail, Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import { buildApiPath } from '@/lib/config';
import { motion } from 'framer-motion';
import { InlineErrorNotice, InlineNotice } from '@/components/ui/inline-notice';
import { useToast } from '@/components/ui/toast';

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const email = searchParams.get('email') || '';
  const type = searchParams.get('type') as 'LOGIN' | 'SIGNUP' || 'LOGIN';

  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  // Redirect if no email
  useEffect(() => {
    if (!email) {
      router.replace('/login');
    }
  }, [email, router]);

  const handleResend = async () => {
    if (!canResend || resending) return;

    setResending(true);
    setResendSuccess(false);
    setResendError('');

    try {
      const res = await fetch(buildApiPath('auth/quicksign/resend'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setResendSuccess(true);
        setCanResend(false);
        setCountdown(60);
        toast.success('تمت إعادة إرسال الرابط إلى بريدك الإلكتروني.');
      } else {
        const message = data.message || 'فشل إعادة الإرسال. يرجى المحاولة لاحقًا';
        setResendError(message);
        toast.error(message);
      }
    } catch (error) {
      const message = 'فشل إعادة الإرسال. يرجى المحاولة لاحقًا';
      setResendError(message);
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  const handleChangeEmail = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('quicksign_email');
    }
    router.replace('/login');
  };

  const handleTryAnotherMethod = () => {
    const q = new URLSearchParams();
    if (email) q.set('email', email);
    if (type) q.set('type', type);
    router.push(`/verify-identity?${q.toString()}`);
  };

  // Loading state
  if (!email) {
    return (
      <div className="w-full py-16 flex flex-col items-center justify-center" dir="rtl">
        <Loader2 className="animate-spin h-8 w-8 text-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full py-10" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center w-full"
      >
        <div className="mb-4 inline-flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 size-11">
          <Mail className="size-5 text-zinc-500 dark:text-zinc-300" />
        </div>

        {/* Header */}
        <div className="text-center mb-7">
          <h1 className="text-4xl font-light tracking-tight text-foreground mb-2">
            تحقق من بريدك
          </h1>
          <p className="text-sm text-muted-foreground mb-3">
            أرسلنا رابطاً تسجيل الدخول إلى
          </p>
          <p className="text-base font-medium text-foreground" dir="ltr">
            {email}
          </p>
        </div>

        {/* Info */}
        <div className="w-full space-y-4 mb-5">
          <div className="text-center p-4 bg-zinc-100/70 dark:bg-zinc-800/60 rounded-3xl">
            <p className="text-sm text-muted-foreground">
              {type === 'LOGIN'
                ? 'اضغط على الرابط في بريدك لتسجيل الدخول'
                : 'اضغط على الرابط في بريدك لإكمال التسجيل'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              الرابط صالح لمدة 10 دقائق فقط
            </p>
          </div>

          {/* Success Message */}
          {resendSuccess && (
            <InlineNotice
              title="تم الإرسال"
              message="أعدنا إرسال رابط الدخول إلى بريدك الإلكتروني بنجاح."
              className="animate-in fade-in-0 duration-300"
            />
          )}

          {/* Error Message */}
          {resendError && (
            <InlineErrorNotice message={resendError} className="animate-in fade-in-0 duration-300" />
          )}
        </div>

        {/* Buttons */}
        <div className="w-full space-y-3">
          {/* Resend Button */}
          <button
            onClick={handleResend}
            disabled={!canResend || resending}
            className="flex items-center justify-center gap-2 w-full h-[48px] border border-zinc-200 dark:border-zinc-700 bg-background hover:bg-muted/50 text-foreground font-medium rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Change Email Button */}
          <button
            onClick={handleChangeEmail}
            className="flex items-center justify-center gap-2 w-full h-[48px] text-muted-foreground hover:text-foreground font-medium rounded-full transition-all duration-300"
          >
            <ArrowRight className="h-4 w-4" />
            <span>تغيير البريد الإلكتروني</span>
          </button>

          <button
            onClick={handleTryAnotherMethod}
            className="flex items-center justify-center gap-2 w-full h-[40px] text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 text-[15px] font-medium rounded-full transition-all duration-300"
          >
            <span>جرّب طريقة أخرى</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full py-16 flex flex-col items-center justify-center" dir="rtl">
          <Loader2 className="animate-spin h-8 w-8 text-foreground" />
        </div>
      }
    >
      <CheckEmailContent />
    </Suspense>
  );
}
