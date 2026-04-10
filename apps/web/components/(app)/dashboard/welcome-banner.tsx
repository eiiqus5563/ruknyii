'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket, Link2, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface WelcomeBannerProps {
  hasLinks: boolean;
  hasForms: boolean;
}

export function WelcomeBanner({ hasLinks, hasForms }: WelcomeBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('rukny_welcome_dismissed');
    if (stored === 'true') setDismissed(true);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('rukny_welcome_dismissed', 'true');
  };

  // Don't show if already has content or dismissed
  if (dismissed || (hasLinks && hasForms)) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/10 via-mint/5 to-background border border-primary/15 p-5 sm:p-6"
      >
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 start-3 p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="إغلاق"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex-1 min-w-0 mr-6">
            <h2 className="text-base sm:text-lg font-bold text-foreground mb-1">
              ابدأ الآن 🚀
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              أكمل إعداد صفحتك في خطوتين بسيطتين وابدأ باستقبال الزوار
            </p>

            <div className="flex flex-wrap gap-2 sm:gap-3">
              {!hasLinks && (
                <button
                  onClick={() => router.push('/app/links')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  <Link2 className="size-4" />
                  أضف أول رابط
                </button>
              )}
              {!hasForms && (
                <button
                  onClick={() => router.push('/app/forms/create?new=true')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-sm font-medium active:scale-[0.98] transition-all border border-border/50"
                >
                  <FileText className="size-4" />
                  فعّل نموذج التواصل
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
