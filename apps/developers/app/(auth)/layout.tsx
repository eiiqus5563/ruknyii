"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useLocale } from "@/providers/locale-provider";
import { Globe } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background px-4 py-6">
      {/* Header bar */}
      <div className="absolute top-4 flex w-full items-center justify-between px-4 sm:top-6 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Image
            src="/ruknylogo.svg"
            alt="Rukny"
            width={28}
            height={28}
            priority
          />
          <span className="text-sm font-semibold text-foreground">Rukny</span>
        </div>

        {/* Language toggle */}
        <button
          onClick={() => setLocale(locale === "en" ? "ar" : "en")}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-default hover:text-foreground"
        >
          <Globe className="size-3.5" />
          {locale === "en" ? "العربية" : "English"}
        </button>
      </div>

      {/* Content */}
      <div className="mt-8 w-full max-w-[400px] sm:mt-0">{children}</div>

      {/* Footer */}
      <div className="absolute bottom-4 flex items-center gap-3 text-xs text-muted sm:bottom-6">
        <a href="/terms" className="transition-colors hover:text-foreground">
          {t.common.termsOfUse}
        </a>
        <span className="text-border">|</span>
        <a href="/privacy" className="transition-colors hover:text-foreground">
          {t.common.privacyPolicy}
        </a>
      </div>
    </div>
  );
}
