'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { handleOAuthCallback, verifyMagicLink } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const code = searchParams.get('code');
    const token = searchParams.get('token');

    const process = async () => {
      try {
        if (code) {
          const response = await handleOAuthCallback(code);
          if (response.needsProfileCompletion) {
            router.replace('/complete-profile');
          } else {
            router.replace('/dashboard');
          }
        } else if (token) {
          const response = await verifyMagicLink(token);
          if (response.needsProfileCompletion) {
            router.replace('/complete-profile');
          } else {
            router.replace('/dashboard');
          }
        } else {
          setError('رابط غير صالح');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
      }
    };

    process();
  }, [searchParams, handleOAuthCallback, verifyMagicLink, router]);

  if (error) {
    return (
      <div className="w-full py-10 flex flex-col items-center" dir="rtl">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 text-center">
          فشل التوثيق
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-center mb-8">
          {error}
        </p>
        <button
          onClick={() => router.push('/login')}
          className="flex items-center justify-center gap-2 w-full h-[48px] bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 text-[14px] rounded-full font-semibold transition-all"
        >
          <span>المحاولة مرة أخرى</span>
          <ArrowRight className="w-4 h-4 rotate-180" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full py-10 flex flex-col items-center" dir="rtl">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2 text-center">
        جاري تسجيل الدخول...
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 text-center">
        يرجى الانتظار بينما نكمل عملية التوثيق
      </p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
