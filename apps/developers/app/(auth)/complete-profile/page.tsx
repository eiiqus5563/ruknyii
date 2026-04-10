'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { checkUsername } from '@/lib/api/auth';

function CompleteProfileContent() {
  const router = useRouter();
  const { user, completeUserProfile, completeOAuthProfile, error, clearError } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const sanitizeUsername = (text: string): string => {
    return text.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30);
  };

  const sanitizeName = (text: string): string => {
    return text.replace(/[<>{}[\]\\]/g, '').replace(/\s{2,}/g, ' ').slice(0, 50);
  };

  const handleUsernameChange = async (value: string) => {
    const sanitized = sanitizeUsername(value);
    setUsername(sanitized);
    setUsernameError('');
    setUsernameAvailable(null);

    if (sanitized.length >= 3) {
      setCheckingUsername(true);
      try {
        const { available } = await checkUsername(sanitized);
        setUsernameAvailable(available);
        if (!available) setUsernameError('اسم المستخدم غير متاح');
      } catch {
        // Ignore check errors
      } finally {
        setCheckingUsername(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    setUsernameError('');
    clearError();

    if (!name.trim()) {
      setNameError('يرجى إدخال الاسم');
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      setUsernameError('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    if (usernameAvailable === false) {
      setUsernameError('اسم المستخدم غير متاح');
      return;
    }

    setIsSubmitting(true);
    try {
      if (user?.emailVerified) {
        await completeOAuthProfile({ name: name.trim(), username: username.trim() });
      } else {
        await completeUserProfile({ name: name.trim(), username: username.trim() });
      }
      router.replace('/dashboard');
    } catch {
      // Error handled by auth provider
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full py-10" dir="rtl">
      <div className="flex flex-col items-center w-full">
        {/* Header */}
        <div className="text-center mb-7">
          <h1 className="text-4xl font-light tracking-tight text-zinc-900 dark:text-white mb-2">
            أكمل ملفك الشخصي
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            أدخل بياناتك للمتابعة
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full mb-5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              الاسم الكامل
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(sanitizeName(e.target.value))}
              className="w-full h-[48px] px-4 text-[14px] border border-zinc-200 dark:border-zinc-700 rounded-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20 transition-all"
              placeholder="مثال: أحمد محمد"
              required
            />
            {nameError && (
              <p className="mt-1.5 text-sm text-red-500">{nameError}</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              اسم المستخدم
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="w-full h-[48px] px-4 pe-10 text-[14px] border border-zinc-200 dark:border-zinc-700 rounded-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20 transition-all"
                placeholder="username"
                dir="ltr"
                required
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                {checkingUsername && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />}
                {!checkingUsername && usernameAvailable === true && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                {!checkingUsername && usernameAvailable === false && <XCircle className="w-4 h-4 text-red-500" />}
              </div>
            </div>
            {usernameError && (
              <p className="mt-1.5 text-sm text-red-500">{usernameError}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || usernameAvailable === false}
            className="flex items-center justify-center gap-2 h-[48px] w-full bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 active:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-zinc-900 text-[14px] rounded-full font-semibold transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <span>حفظ ومتابعة</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    }>
      <CompleteProfileContent />
    </Suspense>
  );
}
