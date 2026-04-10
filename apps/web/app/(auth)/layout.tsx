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
        <Image
          src="/ruknylogo.svg"
          alt="ركني"
          width={28}
          height={28}
          className="h-7 w-auto"
          priority
        />
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">ركني</span>
      </div>

      {/* Desktop: top-right brand */}
      <div className="absolute top-6 right-6 hidden sm:flex items-center gap-2">
        <Image
          src="/ruknylogo.svg"
          alt="ركني"
          width={28}
          height={28}
          className="h-7 w-auto"
          priority
        />
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">ركني</span>
      </div>

      <div className="w-full max-w-[360px] mt-2 sm:max-w-[380px]">{children}</div>
    </div>
  );
}
