import type { ReactNode } from 'react';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      dir="rtl"
      className="min-h-screen w-full bg-white dark:bg-zinc-900 flex items-center justify-center px-4 py-6"
    >
      {/* Mobile: centered brand */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:hidden">
        <Image src="/rukny-logo.svg" alt="Rukny" width={28} height={28} className="dark:invert" />
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Rukny Developers</span>
      </div>

      {/* Desktop: top-right brand */}
      <div className="absolute top-6 right-6 hidden sm:flex items-center gap-2">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Rukny Developers</span>
        <Image src="/rukny-logo.svg" alt="Rukny" width={32} height={32} className="dark:invert" />
      </div>

      <div className="w-full max-w-[360px] mt-2 sm:max-w-[380px]">{children}</div>
    </div>
  );
}
