'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { triggerCelebration } from '@/components/ui/confetti';

function WelcomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const name = searchParams.get('name') || 'مستخدم';
  const username = searchParams.get('store');
  const profileCreated = searchParams.get('storeCreated') === 'true';

  useEffect(() => {
    if (profileCreated) {
      triggerCelebration();
    }
  }, [profileCreated]);

  return (
    <div dir="rtl" className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-zinc-900 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md text-center"
      >
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="text-2xl font-bold text-zinc-900 dark:text-white mb-2"
        >
          أهلاً وسهلاً، {name}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-zinc-500 dark:text-zinc-400 mb-8 text-base leading-relaxed"
        >
          {profileCreated && username
            ? <>تم إنشاء ملفك الشخصي <span className="font-semibold text-zinc-700 dark:text-zinc-200">@{username}</span> بنجاح! يمكنك الآن تخصيص ملفك الشخصي وإضافة روابطك.</>
            : 'تم إنشاء حسابك بنجاح! يمكنك الآن استكشاف المنصة.'}
        </motion.p>

        {/* Success badge */}
        {profileCreated && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400"
          >
            <CheckCircle2 className="h-4 w-4" />
            ملفك الشخصي جاهز
          </motion.div>
        )}

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <button
            onClick={() => router.push('/app')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-900 dark:bg-white px-6 py-3.5 text-sm font-medium text-white dark:text-zinc-900 transition-all hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-[0.98]"
          >
            الذهاب إلى لوحة التحكم
            <ArrowRight className="h-4 w-4 rtl:rotate-180" />
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-900">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      }
    >
      <WelcomeContent />
    </Suspense>
  );
}
