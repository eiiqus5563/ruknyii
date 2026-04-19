"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useParams } from "next/navigation";
import {
  LayoutDashboard,
  Key,
  MessageSquare,
  Users,
  Webhook,
  BarChart3,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
  PanelRightOpen,
  PanelLeftOpen,
  AppWindow,
  ChevronsUpDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tooltip, Dropdown, Label, Header, Separator } from "@heroui/react";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { useApps } from "@/lib/hooks/use-apps";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  children?: { href: string; labelKey: string }[];
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

function useIsLargeScreen() {
  const [isLg, setIsLg] = useState(true);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    setIsLg(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsLg(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isLg;
}

/* ------------------------------------------------------------------ */
/*  Navigation data builder                                            */
/* ------------------------------------------------------------------ */

function buildNavItems(appBase: string): NavItem[] {
  return [
    { href: appBase, labelKey: "overview", icon: LayoutDashboard },
    { href: `${appBase}/api-keys`, labelKey: "apiKeys", icon: Key },
    {
      href: `${appBase}/whatsapp`,
      labelKey: "whatsapp",
      icon: MessageSquare,
      children: [
        { href: `${appBase}/whatsapp`, labelKey: "whatsappAccounts" },
        { href: `${appBase}/whatsapp/templates`, labelKey: "whatsappTemplates" },
        { href: `${appBase}/whatsapp/phone-numbers`, labelKey: "whatsappPhoneNumbers" },
      ],
    },
    { href: `${appBase}/contacts`, labelKey: "contacts", icon: Users },
    { href: `${appBase}/webhooks`, labelKey: "webhooks", icon: Webhook },
    { href: `${appBase}/usage`, labelKey: "usage", icon: BarChart3 },
    { href: `${appBase}/wallet`, labelKey: "wallet", icon: Wallet },
  ];
}

function buildBottomItems(appBase: string): NavItem[] {
  return [
    { href: `${appBase}/settings`, labelKey: "settings", icon: Settings },
  ];
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const params = useParams();
  const { user, logout } = useAuth();
  const { t, dir } = useLocale();
  const s = t.dashboard.sidebar;

  const appId = params.appId as string | undefined;
  const appBase = appId ? `/app/${appId}` : "/app";
  const NAV_ITEMS = useMemo(() => buildNavItems(appBase), [appBase]);
  const BOTTOM_ITEMS = useMemo(() => buildBottomItems(appBase), [appBase]);

  const { data: apps } = useApps();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const isLg = useIsLargeScreen();
  const [isManualCollapsed, setIsManualCollapsed] = useState(false);
  const isExpanded = isLg && !isManualCollapsed;
  const isRTL = dir === "rtl";

  const getLabel = (key: string) => (s as Record<string, string>)[key] ?? key;

  /* ---- Active detection ------------------------------------------ */
  const isItemActive = useCallback(
    (href: string): boolean => {
      const p = href.split("?")[0];
      if (p === appBase) return pathname === appBase;
      return pathname === p;
    },
    [pathname],
  );

  const isParentActive = useCallback(
    (item: NavItem): boolean => {
      if (!item.children) return false;
      const p = item.href.split("?")[0];
      return pathname === p || pathname.startsWith(p + "/");
    },
    [pathname],
  );

  // Auto-expand active section
  useEffect(() => {
    const active = NAV_ITEMS.find((i) => i.children && (isItemActive(i.href) || isParentActive(i)));
    if (active) setExpandedItem(active.href);
  }, [pathname, isItemActive, isParentActive]);

  // Close mobile on route change
  useEffect(() => setIsMobileOpen(false), [pathname]);

  // Lock body scroll for mobile overlay
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobileOpen]);

  /* ---- Chevron icon for RTL/LTR ---- */
  const CollapseChevron = isRTL ? ChevronRight : ChevronLeft;

  /* ================================================================ */
  /*  Collapsed nav item (icon-only with tooltip)                     */
  /* ================================================================ */

  const CollapsedNavItem = ({ item }: { item: NavItem }) => {
    const hasChildren = !!item.children?.length;
    const active = isItemActive(item.href);
    const parentActive = isParentActive(item);

    if (hasChildren) {
      return (
        <Dropdown>
          <Dropdown.Trigger>
            <div
              role="button"
              tabIndex={0}
              className={cn(
                "flex size-10 items-center justify-center rounded-xl transition-colors cursor-pointer",
                parentActive
                  ? "bg-accent/10 text-accent"
                  : "text-foreground/70 hover:bg-default hover:text-foreground",
              )}
            >
              <item.icon className="size-[18px]" />
            </div>
          </Dropdown.Trigger>
          <Dropdown.Popover placement={isRTL ? "right" : "left"} className="min-w-[160px] rounded-xl">
            <Dropdown.Menu onAction={(key) => { window.location.href = String(key); }}>
              <Dropdown.Section>
                <Header>{getLabel(item.labelKey)}</Header>
                {item.children!.map((child) => (
                  <Dropdown.Item key={child.href} id={child.href} textValue={getLabel(child.labelKey)} href={child.href}>
                    <Label>{getLabel(child.labelKey)}</Label>
                  </Dropdown.Item>
                ))}
              </Dropdown.Section>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      );
    }

    return (
      <Tooltip>
        <Tooltip.Trigger>
          <Link
            href={item.href}
            tabIndex={0}
            className={cn(
              "relative flex size-10 items-center justify-center rounded-xl transition-colors",
              active
                ? "bg-accent/10 text-accent ring-1 ring-accent/20"
                : "text-foreground/70 hover:bg-default hover:text-foreground",
            )}
          >
            <item.icon className="size-[18px]" />
          </Link>
        </Tooltip.Trigger>
        <Tooltip.Content placement={isRTL ? "right" : "left"}>{getLabel(item.labelKey)}</Tooltip.Content>
      </Tooltip>
    );
  };

  /* ================================================================ */
  /*  Expanded nav item                                                */
  /* ================================================================ */

  const ExpandedNavItem = ({ item }: { item: NavItem }) => {
    const hasChildren = !!item.children?.length;
    const active = isItemActive(item.href);
    const parentActive = isParentActive(item);
    const isOpen = expandedItem === item.href;

    if (hasChildren) {
      return (
        <div>
          <button
            type="button"
            onClick={() => setExpandedItem((v) => (v === item.href ? null : item.href))}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[13px] transition-colors border-s-2",
              parentActive || isOpen
                ? "bg-accent/5 font-semibold text-foreground border-s-accent"
                : "text-foreground/80 hover:bg-default hover:text-foreground border-s-transparent",
            )}
          >
            <div className="flex items-center gap-2.5">
              <item.icon className={cn("size-4", parentActive ? "text-accent" : "text-muted")} />
              <span>{getLabel(item.labelKey)}</span>
            </div>
            <CollapseChevron
              className={cn(
                "size-3.5 transition-transform duration-200",
                isOpen ? "text-accent -rotate-90" : "text-muted",
              )}
            />
          </button>
          <div
            className={cn(
              "overflow-hidden transition-all duration-200 ease-in-out",
              isOpen ? "max-h-40 opacity-100" : "max-h-0 opacity-0",
            )}
          >
            <div className="ms-3 border-s border-accent/20 space-y-0.5 py-1">
              {item.children!.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-[12px] transition-colors",
                    isItemActive(child.href)
                      ? "bg-accent/10 font-semibold text-accent"
                      : "text-muted hover:bg-default hover:text-foreground",
                  )}
                >
                  {getLabel(child.labelKey)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] transition-colors border-s-2",
          active
            ? "bg-accent/10 font-semibold text-accent border-s-accent"
            : "text-foreground/80 hover:bg-default hover:text-foreground border-s-transparent",
        )}
      >
        <item.icon className={cn("size-4", active ? "text-accent" : "text-muted")} />
        <span>{getLabel(item.labelKey)}</span>
      </Link>
    );
  };

  /* ================================================================ */
  /*  User section                                                     */
  /* ================================================================ */

  const UserSection = ({ compact = false }: { compact?: boolean }) => (
    <Dropdown>
      <Dropdown.Trigger>
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "flex items-center rounded-xl transition-colors hover:bg-default w-full cursor-pointer",
            compact ? "size-10 justify-center" : "gap-3 p-2",
          )}
        >
          <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-accent ring-1 ring-accent/10">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name || ""} className="size-full object-cover" />
            ) : null}
            <span
              className={cn(
                "absolute inset-0 flex items-center justify-center text-xs font-bold text-accent-foreground",
                user?.avatar && "hidden",
              )}
            >
              {(user?.name || "D").charAt(0).toUpperCase()}
            </span>
          </div>
          {!compact && (
            <div className="flex flex-col min-w-0 overflow-hidden text-start">
              <span className="truncate text-[13px] font-semibold text-foreground leading-tight">
                {user?.name || "Developer"}
              </span>
              <span className="truncate text-[11px] text-muted leading-tight mt-0.5">
                {user?.email || ""}
              </span>
            </div>
          )}
        </div>
      </Dropdown.Trigger>
      <Dropdown.Popover placement={isRTL ? "left" : "right"} className="min-w-[180px] rounded-xl">
        <Dropdown.Menu
          onAction={(key) => {
            if (key === "logout") logout();
          }}
        >
          <Dropdown.Section>
            <Header>{user?.name || "Developer"}</Header>
            <Dropdown.Item id="profile" textValue={s.profile} href="/app/settings">
              <User className="size-4 shrink-0 text-muted" />
              <Label>{s.profile}</Label>
            </Dropdown.Item>
            <Dropdown.Item id="settings" textValue={s.settings} href="/app/settings">
              <Settings className="size-4 shrink-0 text-muted" />
              <Label>{s.settings}</Label>
            </Dropdown.Item>
          </Dropdown.Section>
          <Separator />
          <Dropdown.Item id="logout" textValue={s.logout} variant="danger">
            <LogOut className="size-4 shrink-0" />
            <Label>{s.logout}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );

  /* ================================================================ */
  /*  Desktop sidebar                                                  */
  /* ================================================================ */

  const desktopSidebar = (
    <aside
      className={cn(
        "relative flex h-screen flex-col bg-background shrink-0 transition-[width] duration-300 ease-in-out",
        isExpanded ? "w-[240px]" : "w-[68px]",
        className,
      )}
    >

      {/* ═══ Logo + Toggle ═══ */}
      <div className={cn(
        "flex items-center pt-4 pb-2 transition-all duration-300",
        isExpanded ? "justify-between px-5" : "justify-center px-2",
      )}>
        <div className={cn("flex items-center", isExpanded ? "gap-2.5" : "")}>
          <Image src="/ruknylogo.svg" alt="Rukny" width={28} height={28} priority />
          {isExpanded && <span className="text-[15px] font-bold text-foreground">Rukny</span>}
        </div>
        {isLg && (
          <button
            type="button"
            onClick={() => setIsManualCollapsed((v) => !v)}
            className="flex size-7 items-center justify-center rounded-lg text-muted hover:bg-default hover:text-foreground transition-colors"
            aria-label={isExpanded ? s.collapse : s.expand}
          >
            {isExpanded
              ? (isRTL ? <PanelLeftOpen className="size-4" /> : <PanelRightOpen className="size-4" />)
              : (isRTL ? <PanelRightOpen className="size-4" /> : <PanelLeftOpen className="size-4" />)}
          </button>
        )}
      </div>

      {/* ═══ User ═══ */}
      <div className={cn(
        "transition-all duration-300",
        isExpanded ? "px-2 pb-3" : "px-2 pb-3 flex justify-center",
      )}>
        <UserSection compact={!isExpanded} />
      </div>

      <div className={cn("h-px bg-border/40", isExpanded ? "mx-5" : "mx-2")} />

      {/* ═══ App Switcher ═══ */}
      {appId && (
        <div className={cn(
          "transition-all duration-300",
          isExpanded ? "px-2 py-2" : "px-2 py-2 flex justify-center",
        )}>
          {(() => {
            const currentApp = apps?.find((a) => a.appId === appId);
            const appInitials = currentApp?.name
              ?.split(" ")
              .map((w: string) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() ?? "AP";

            if (!isExpanded) {
              return (
                <Dropdown>
                  <Dropdown.Trigger>
                    <div
                      role="button"
                      tabIndex={0}
                      className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent text-xs font-bold cursor-pointer hover:bg-accent/20 transition-colors"
                    >
                      {appInitials}
                    </div>
                  </Dropdown.Trigger>
                  <Dropdown.Popover placement={isRTL ? "left" : "right"} className="min-w-[200px] rounded-xl">
                    <Dropdown.Menu onAction={(key) => { window.location.href = String(key); }}>
                      <Dropdown.Section>
                        <Header>{(s as Record<string, string>).switchApp ?? "Switch App"}</Header>
                        {(apps ?? []).map((a) => (
                          <Dropdown.Item key={`/app/${a.appId}`} id={`/app/${a.appId}`} textValue={a.name} href={`/app/${a.appId}`}>
                            <Label>{a.name}</Label>
                          </Dropdown.Item>
                        ))}
                      </Dropdown.Section>
                      <Separator />
                      <Dropdown.Item id="/app" textValue={(s as Record<string, string>).allApps ?? "All Apps"} href="/app">
                        <AppWindow className="size-4 shrink-0 text-muted" />
                        <Label>{(s as Record<string, string>).allApps ?? "All Apps"}</Label>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              );
            }

            return (
              <Dropdown>
                <Dropdown.Trigger>
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex items-center gap-2.5 w-full rounded-xl p-2 cursor-pointer hover:bg-default transition-colors"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent text-xs font-bold">
                      {appInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[12px] font-semibold text-foreground leading-tight">
                        {currentApp?.name ?? "App"}
                      </p>
                      <p className="truncate text-[10px] text-muted leading-tight">
                        {appId}
                      </p>
                    </div>
                    <ChevronsUpDown className="size-3.5 text-muted shrink-0" />
                  </div>
                </Dropdown.Trigger>
                <Dropdown.Popover placement={isRTL ? "left" : "right"} className="min-w-[220px] rounded-xl">
                  <Dropdown.Menu onAction={(key) => { window.location.href = String(key); }}>
                    <Dropdown.Section>
                      <Header>{(s as Record<string, string>).switchApp ?? "Switch App"}</Header>
                      {(apps ?? []).map((a) => (
                        <Dropdown.Item key={`/app/${a.appId}`} id={`/app/${a.appId}`} textValue={a.name} href={`/app/${a.appId}`}>
                          <Label>{a.name}</Label>
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Section>
                    <Separator />
                    <Dropdown.Item id="/app" textValue={(s as Record<string, string>).allApps ?? "All Apps"} href="/app">
                      <AppWindow className="size-4 shrink-0 text-muted" />
                      <Label>{(s as Record<string, string>).allApps ?? "All Apps"}</Label>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            );
          })()}
        </div>
      )}

      {appId && <div className={cn("h-px bg-border/40", isExpanded ? "mx-5" : "mx-2")} />}

      {/* ═══ Navigation ═══ */}
      <nav className={cn(
        "flex-1 overflow-y-auto py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] transition-all duration-300",
        isExpanded ? "px-2" : "px-2",
      )}>
        {appId ? (
          <>
            {isExpanded && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted/60">{s.menu}</p>
            )}

            <div className={cn(
              "w-full",
              isExpanded ? "space-y-0.5" : "flex flex-col items-center gap-1",
            )}>
              {isExpanded
                ? NAV_ITEMS.map((item) => <ExpandedNavItem key={item.href} item={item} />)
                : NAV_ITEMS.map((item) => <CollapsedNavItem key={item.href} item={item} />)}
            </div>
          </>
        ) : (
          <div className={cn("flex flex-col items-center justify-center flex-1 gap-3 px-3 text-center", isExpanded ? "" : "hidden")}>
            <AppWindow className="size-8 text-muted/50" />
            <p className="text-xs text-muted">{(s as Record<string, string>).selectApp ?? "Select an app to get started"}</p>
          </div>
        )}
      </nav>

      {/* ═══ Bottom ═══ */}
      <div className={cn("pb-3 transition-all duration-300", isExpanded ? "px-5" : "px-2")}>
        <div className={cn("mb-2 h-px bg-border/40")} />
        {appId && BOTTOM_ITEMS.map((item) =>
          isExpanded ? (
            <ExpandedNavItem key={item.href} item={item} />
          ) : (
            <div key={item.href} className="flex justify-center">
              <CollapsedNavItem item={item} />
            </div>
          ),
        )}
      </div>
    </aside>
  );

  /* ================================================================ */
  /*  Mobile sidebar                                                   */
  /* ================================================================ */

  const mobileSidebar = (
    <aside className={cn("relative flex h-screen w-[260px] flex-col bg-background shrink-0", className)}>
      <div className={cn("absolute top-0 bottom-0 w-px bg-border/40", isRTL ? "start-0" : "end-0")} />

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-2">
        <Image src="/ruknylogo.svg" alt="Rukny" width={28} height={28} priority />
        <span className="text-[15px] font-bold text-foreground">Rukny</span>
      </div>

      {/* User */}
      <div className="px-5 pb-3">
        <UserSection />
      </div>

      <div className="h-px bg-border/40 mx-5" />

      {/* App Switcher (mobile) */}
      {appId && (
        <div className="px-3 py-2">
          <Link
            href="/app"
            className="flex items-center gap-2.5 w-full rounded-xl p-2 hover:bg-default transition-colors"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent text-xs font-bold">
              {apps?.find((a) => a.appId === appId)?.name
                ?.split(" ")
                .map((w: string) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase() ?? "AP"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[12px] font-semibold text-foreground leading-tight">
                {apps?.find((a) => a.appId === appId)?.name ?? "App"}
              </p>
              <p className="truncate text-[10px] text-muted leading-tight">{appId}</p>
            </div>
            <ChevronsUpDown className="size-3.5 text-muted shrink-0" />
          </Link>
        </div>
      )}

      {appId && <div className="h-px bg-border/40 mx-5" />}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-5 py-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {appId ? (
          <>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted/60">{s.menu}</p>
            <div className="space-y-0.5 w-full">
              {NAV_ITEMS.map((item) => <ExpandedNavItem key={item.href} item={item} />)}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 px-3 text-center">
            <AppWindow className="size-8 text-muted/50" />
            <p className="text-xs text-muted">{(s as Record<string, string>).selectApp ?? "Select an app to get started"}</p>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-5 pb-3">
        <div className="mb-2 h-px bg-border/40" />
        {appId && BOTTOM_ITEMS.map((item) => <ExpandedNavItem key={item.href} item={item} />)}
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-4 start-4 z-50 flex size-10 items-center justify-center rounded-xl bg-background border border-border/30 shadow-sm md:hidden"
        aria-label={s.openMenu}
      >
        <Menu className="size-5 text-foreground" />
      </button>

      {/* Desktop */}
      <div className="hidden md:block sticky top-0 h-screen">{desktopSidebar}</div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className={cn(
            "fixed top-0 z-50 h-screen md:hidden animate-in duration-300",
            isRTL ? "end-0 slide-in-from-right" : "start-0 slide-in-from-left",
          )}>
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 end-3 z-10 flex size-8 items-center justify-center rounded-lg hover:bg-default transition-colors"
              aria-label={s.closeMenu}
            >
              <X className="size-4 text-muted" />
            </button>
            {mobileSidebar}
          </div>
        </>
      )}
    </>
  );
}
