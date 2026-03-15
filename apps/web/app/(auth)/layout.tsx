import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      dir="rtl"
      className="min-h-screen w-full overflow-hidden bg-#fff relative flex items-center justify-center px-4"
    >
      {/* Content wrapper */}
      <div className="relative z-10 w-full max-w-md">{children}</div>
    </div>
  );
}
