"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard,
  Key,
  MessageSquare,
  Wallet,
  Settings,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";

function buildItems(appBase: string) {
  return [
    { href: appBase, labelKey: "overview", icon: LayoutDashboard },
    { href: `${appBase}/api-keys`, labelKey: "apiKeys", icon: Key },
    { href: `${appBase}/whatsapp`, labelKey: "whatsapp", icon: MessageSquare },
    { href: `${appBase}/wallet`, labelKey: "wallet", icon: Wallet },
    { href: `${appBase}/settings`, labelKey: "settings", icon: Settings },
  ] as const;
}

export function MobileDock() {
  const pathname = usePathname();
  const params = useParams();
  const { t } = useLocale();
  const s = t.dashboard.sidebar;

  const appId = params.appId as string | undefined;

  // Don't show dock when no app is selected
  if (!appId) return null;

  const appBase = `/app/${appId}`;
  const items = buildItems(appBase);

  const isActive = (href: string) => {
    const p = href.split("?")[0];
    if (p === appBase) return pathname === appBase;
    return pathname === p || pathname.startsWith(p + "/");
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 md:hidden">
      <div className="flex items-center m-2 rounded-2xl justify-around border-t border-border/30 bg-background/90 backdrop-blur-xl px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = isActive(item.href);
          const label = (s as Record<string, string>)[item.labelKey] ?? item.labelKey;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-3 min-w-0",
                active ? "text-accent" : "text-muted",
              )}
            >
              <item.icon className="size-5" />
              <span className="text-[10px] font-medium truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
