'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { getGoogleAuthUrl, getLinkedInAuthUrl } from '@/lib/api/auth';
import { resetRefreshState } from '@/lib/api-client';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true" focusable="false" {...props}>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.655 32.656 29.255 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917Z" />
      <path fill="#FF3D00" d="M6.306 14.691 12.88 19.51C14.655 15.108 18.962 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.191-5.238C29.184 35.091 26.715 36 24 36c-5.234 0-9.62-3.318-11.282-7.946l-6.525 5.026C9.505 39.556 16.227 44 24 44Z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.08 12.08 0 0 1-4.085 5.565l.003-.002 6.191 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917Z" />
    </svg>
  );
}

function LinkedInIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false" {...props}>
      <path fill="#0077B5" d="M20.447 20.452h-3.554v-5.569c0-1.327-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.476-.9 1.637-1.85 3.369-1.85 3.602 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124Zm1.777 13.019H3.559V9h3.555v11.452Z" />
    </svg>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sendMagicLink, isLoading, error, clearError, isAuthenticated, isLoading: authLoading, isRateLimited } = useAuth();

  const [email, setEmail] = useState('');
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && !isRateLimited) {
      router.replace('/dashboard');
    }
  }, [authLoading, isAuthenticated, isRateLimited, router]);

  useEffect(() => {
    const sessionParam = searchParams.get('session');
    if (sessionParam === 'expired') {
      setSessionMessage('انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى.');
    } else if (sessionParam === 'invalid') {
      setSessionMessage('جلسة غير صالحة. يرجى تسجيل الدخول مرة أخرى.');
    }
    resetRefreshState();
  }, [searchParams]);

  if (authLoading || isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSessionMessage(null);
    try {
      const response = await sendMagicLink(email);
      router.push(`/check-email?email=${encodeURIComponent(email)}&type=${response.type}`);
    } catch {
      // Error handled by auth provider
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = getGoogleAuthUrl();
  };

  const handleLinkedInLogin = () => {
    window.location.href = getLinkedInAuthUrl();
  };

  const displayError = sessionMessage || error;

  return (
    <div className="w-full" dir="rtl">
      {/* Title */}
      <h1 className="text-center text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white mb-2 leading-tight">
        تسجيل الدخول إلى Rukny Developers
      </h1>
      <p className="text-center text-[13px] text-zinc-500 dark:text-zinc-400 mb-6">
        أدخل بريدك الإلكتروني للمتابعة
      </p>

      {/* Error */}
      {displayError && (
        <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-red-600 dark:text-red-400 text-sm text-center">
          {displayError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-[48px] px-4 text-[14px] border border-zinc-200 dark:border-zinc-700 rounded-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20 transition-all text-center"
            placeholder="البريد الإلكتروني"
            required
            disabled={isLoading}
            dir="ltr"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center gap-2 h-[48px] w-full bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 active:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-zinc-900 text-[14px] rounded-full font-semibold transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>جاري الإرسال...</span>
            </>
          ) : (
            <span>المتابعة</span>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium whitespace-nowrap">أو</span>
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700" />
      </div>

      {/* Social */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex items-center justify-center gap-3 h-[48px] w-full rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:bg-zinc-100 transition-all"
        >
          <GoogleIcon />
          <span className="text-[14px] font-medium text-zinc-700 dark:text-zinc-200">المتابعة مع Google</span>
        </button>

        <button
          type="button"
          onClick={handleLinkedInLogin}
          className="flex items-center justify-center gap-3 h-[48px] w-full rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 active:bg-zinc-100 transition-all"
        >
          <LinkedInIcon />
          <span className="text-[14px] font-medium text-zinc-700 dark:text-zinc-200">المتابعة مع LinkedIn</span>
        </button>
      </div>

      {/* Terms */}
      <div className="mt-8 pt-5 border-t border-zinc-100 dark:border-zinc-800">
        <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 leading-relaxed">
          <a href="/terms" className="text-zinc-500 dark:text-zinc-400 hover:underline">شروط الخدمة</a>
          <span className="mx-2">|</span>
          <a href="/privacy" className="text-zinc-500 dark:text-zinc-400 hover:underline">سياسة الخصوصية</a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
