"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Bell,
  ArrowLeft,
  ArrowRight,
  Sun,
  Moon,
  Globe,
} from "lucide-react";
import { Avatar, Dropdown, Label, Header, Separator, Tooltip } from "@heroui/react";
import { useTheme } from "next-themes";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { cn } from "@/lib/utils";
import { useUnreadCount } from "@/components/activity-panel";
import { useApps } from "@/lib/hooks/use-apps";

/* ------------------------------------------------------------------ */
/*  Breadcrumb helpers                                                 */
/* ------------------------------------------------------------------ */

function buildBreadcrumbs(pathname: string, labelMap: Record<string, string>) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: labelMap[seg] ?? seg,
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));
}

function getParentInfo(pathname: string, labelMap: Record<string, string>) {
  const segments = pathname.split("/").filter(Boolean);
  const parent = segments.slice(0, -1);
  if (parent.length === 0) return null;
  const slug = parent[parent.length - 1];
  return { label: labelMap[slug] ?? slug, href: "/" + parent.join("/") };
}

/* ------------------------------------------------------------------ */
/*  DashboardNav                                                       */
/* ------------------------------------------------------------------ */

export function DashboardNav({
  onBellClick,
  onMobileBellClick,
}: {
  onBellClick?: () => void;
  onMobileBellClick?: () => void;
}) {
  const pathname = usePathname();
  const params = useParams();
  const appId = params.appId as string | undefined;
  const { data: apps } = useApps();
  const { user, logout } = useAuth();
  const { t, dir, locale, setLocale } = useLocale();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const n = t.dashboard.nav;
  const isRTL = dir === "rtl";

  const labelMap: Record<string, string> = {
    app: n.app,
    "api-keys": n.apiKeys,
    whatsapp: n.whatsapp,
    accounts: n.accounts,
    templates: n.templates,
    "phone-numbers": n.phoneNumbers,
    contacts: n.contacts,
    webhooks: n.webhooks,
    usage: n.usage,
    wallet: n.wallet,
    settings: n.settings,
    new: (n as any).new ?? "New",
    ...(appId ? { [appId]: apps?.find((a) => a.appId === appId)?.name ?? appId } : {}),
  };

  const breadcrumbs = buildBreadcrumbs(pathname, labelMap);
  const parent = getParentInfo(pathname, labelMap);
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <header className="absolute top-0 inset-x-0 z-20 pointer-events-none">
      <div className="flex items-center justify-center md:justify-between gap-2 lg:gap-4 px-3 pt-2.5 lg:pt-4 pb-1.5 sm:px-6 pointer-events-auto">
        {/* ═══ Breadcrumbs ═══ */}
        <nav
          className="hidden md:flex items-center gap-1.5 rounded-full 
           border border-white/20 
           bg-[rgba(255,255,255,0.08)] 
           px-3 lg:px-4 py-2 lg:py-2.5 
           backdrop-blur-[20px] 
           shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_10px_40px_rgba(0,0,0,0.15)] 
           hover:bg-[rgba(255,255,255,0.15)] 
           hover:scale-[1.02] 
           transition-all duration-300"
          aria-label="Breadcrumb"
        >
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <span className="text-muted/30 select-none" aria-hidden>/</span>}
              {crumb.isLast ? (
                <span className="truncate font-semibold text-foreground text-sm">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="truncate text-muted/70 text-sm transition-colors hover:text-foreground"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>

        {/* ═══ Actions bar ═══ */}
        <div className="flex items-center gap-1 
          sm:gap-1.5 rounded-full border border-white/20 
          bg-[rgba(255,255,255,0.08)] px-1.5 sm:px-2 py-1 sm:py-1.5 backdrop-blur-[20px] 
          shadow-[0_8px_32px_rgba(0,0,0,0.15)] 
          hover:bg-[rgba(255,255,255,0.15)] 
          transition-all duration-300"
          >
          {/* Notifications */}
          <NotificationBell onDesktopClick={onBellClick} onMobileClick={onMobileBellClick} />

          <div className="h-5 w-px bg-border/20" aria-hidden />

          {/* Theme toggle */}
          <Tooltip>
            <Tooltip.Trigger>
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground"
                aria-label="Toggle theme"
              >
                {mounted ? (theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />) : <div className="size-4" />}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content placement="bottom">{theme === "dark" ? n.lightMode : n.darkMode}</Tooltip.Content>
          </Tooltip>

          {/* Language toggle */}
          <Tooltip>
            <Tooltip.Trigger>
              <button
                type="button"
                onClick={() => setLocale(locale === "en" ? "ar" : "en")}
                className="flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground"
                aria-label="Toggle language"
              >
                <Globe className="size-3.5" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content placement="bottom">{locale === "en" ? "العربية" : "English"}</Tooltip.Content>
          </Tooltip>

          <div className="h-5 w-px bg-border/20" aria-hidden />

          {/* User avatar */}
          <Dropdown>
            <Dropdown.Trigger>
              <div role="button" tabIndex={0} className="flex size-8 text-right items-center justify-center rounded-full cursor-pointer">
                <Avatar className="size-7">
                  {user?.avatar ? <Avatar.Image src={user.avatar} alt={user?.name || ""} /> : null}
                  <Avatar.Fallback className="bg-accent text-[10px] font-bold text-accent-foreground">
                    {user?.name?.charAt(0)?.toUpperCase() ?? "D"}
                  </Avatar.Fallback>
                </Avatar>
              </div>
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom end" className="min-w-[200px] text-right justify-end rounded-xl flex justify-end">
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === "logout") logout();
                }}
              >
                <Dropdown.Section>
                  <Header>
                    <div className="flex flex-col justify-items-end  text-right">
                      <span className="text-sm font-medium text-foreground">{user?.name ?? "Developer"}</span>
                      <span className="text-xs text-muted">{user?.email ?? user?.username ?? ""}</span>
                    </div>
                  </Header>
                  <Dropdown.Item id="settings" textValue={n.settings} href="/app/settings">
                    <Label>{n.settings}</Label>
                  </Dropdown.Item>
                </Dropdown.Section>
                <Separator />
                <Dropdown.Item id="logout" textValue={t.dashboard.sidebar.logout} variant="danger">
                  <Label>{t.dashboard.sidebar.logout}</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>

          {/* Back link */}
          {parent && (
            <>
              <div className="h-5 w-px bg-border/20" aria-hidden />
              <Link
                href={parent.href}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted hover:bg-default hover:text-foreground transition-colors"
              >
                <span>{n.backTo} {parent.label}</span>
                <BackArrow className="size-3" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Notification bell                                                  */
/* ------------------------------------------------------------------ */

function NotificationBell({
  onDesktopClick,
  onMobileClick,
}: {
  onDesktopClick?: () => void;
  onMobileClick?: () => void;
}) {
  const { t } = useLocale();
  const n = t.dashboard.nav;
  const unread = useUnreadCount();

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <button
          type="button"
          onClick={() => {
            // xl+ → toggle desktop panel, <xl → toggle mobile sheet
            if (window.innerWidth >= 1280) {
              onDesktopClick?.();
            } else {
              onMobileClick?.();
            }
          }}
          className="relative flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-default hover:text-foreground"
          aria-label={n.notifications}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute top-0.5 end-0.5 flex size-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-danger-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content placement="bottom">{n.notifications}</Tooltip.Content>
    </Tooltip>
  );
}
