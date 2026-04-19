"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { useUsageSummary } from "@/lib/hooks/use-dashboard";
import {
  Wallet,
  MessageSquare,
  Key,
  Phone,
  Webhook,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Chip } from "@heroui/react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Stats Card                                                         */
/* ------------------------------------------------------------------ */

function StatsCard({
  icon: Icon,
  label,
  value,
  sub,
  action,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  action?: { label: string; href: string };
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-2xl p-4 sm:p-5 transition-colors",
      highlight
        ? "bg-accent/15 dark:bg-accent/10"
        : "bg-default/60 dark:bg-default/40",
    )}>
      <div className="flex items-start justify-between">
        <p className="text-[11px] sm:text-xs text-muted mb-2">{label}</p>
        {Icon && (
          <div className={cn(
            "flex size-8 items-center justify-center rounded-xl",
            highlight ? "bg-accent/20" : "bg-background/60",
          )}>
            <Icon className="size-4 text-muted" />
          </div>
        )}
      </div>

      <p className={cn(
        "text-xl sm:text-2xl font-bold tracking-tight tabular-nums text-foreground",
      )}>
        {value}
      </p>

      {(sub || action) && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {sub && (
            <>
              <TrendingUp className="size-3.5 text-success" />
              <span className="text-[11px] font-medium text-success">{sub}</span>
            </>
          )}
          {action && (
            <Link
              href={action.href}
              className="flex items-center gap-0.5 text-[11px] font-medium text-accent hover:text-accent/80 transition-colors ms-auto"
            >
              {action.label}
              <ArrowUpRight className="size-3" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl bg-default/60 p-4 sm:p-5 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-3 w-16 rounded bg-default" />
        <div className="size-8 rounded-xl bg-background/60" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-7 w-20 rounded bg-default" />
        <div className="h-3 w-28 rounded bg-default" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress Bar                                                       */
/* ------------------------------------------------------------------ */

function UsageBar({ used, limit, label, color }: { used: number; limit: number; label: string; color?: string }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isHigh = pct > 80;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className={cn("size-2 rounded-full", isHigh ? "bg-danger" : color ?? "bg-accent")} />
          <span className="text-muted">{label}</span>
        </div>
        <span className={cn("font-medium tabular-nums", isHigh ? "text-danger" : "text-foreground")}>
          {used.toLocaleString("en")} / {limit.toLocaleString("en")}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-default/80 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", isHigh ? "bg-danger" : color ?? "bg-accent")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Action                                                       */
/* ------------------------------------------------------------------ */

function QuickAction({
  icon: Icon,
  label,
  href,
  color,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl bg-default/60 dark:bg-default/40 p-3 sm:p-4 transition-colors hover:bg-default"
    >
      <div className={cn("flex size-9 items-center justify-center rounded-lg", color ?? "bg-accent/15")}>
        <Icon className={cn("size-4", color ? "text-white" : "text-accent")} />
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DashboardOverviewPage() {
  const { isLoading: authLoading } = useAuth();
  const { t } = useLocale();
  const o = t.dashboard.overview;
  const params = useParams();
  const appId = params.appId as string;

  const { data, isLoading: dataLoading } = useUsageSummary(appId);

  if (authLoading || dataLoading || !data) {
    return (
      <div className="space-y-4 mt-2 sm:mt-10">
        <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <StatsCardSkeleton key={i} />)}
        </div>
        <div className="rounded-2xl border border-border/40 bg-surface p-4 sm:p-5 h-[200px] animate-pulse" />
        <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-border/40 bg-surface animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const sub = data?.subscription;
  const wallet = data?.wallet;

  const formatIQD = (amount: number) => {
    return new Intl.NumberFormat("en", { style: "decimal", maximumFractionDigits: 0 }).format(amount) + " IQD";
  };

  return (
    <div className="space-y-4 mt-2 sm:mt-10">
      {/* ── Plan badge ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{o.title}</h1>
          <Chip variant="soft" className="text-xs">{sub?.plan ?? "FREE"}</Chip>
        </div>
        <Link href={`/app/${appId}/settings`} className="flex items-center gap-1 rounded-full border border-border px-3 h-8 text-xs font-medium text-foreground hover:bg-default transition-colors">
          {o.upgrade}
        </Link>
      </div>
      <p className="text-sm text-muted -mt-2">{o.subtitle}</p>

      {/* ── Stats cards ── */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          icon={Wallet}
          label={o.walletBalance}
          value={formatIQD(wallet?.balance ?? 0)}
          action={{ label: o.topUp, href: `/app/${appId}/wallet` }}
          highlight
        />
        <StatsCard
          icon={MessageSquare}
          label={o.messagesUsed}
          value={`${(sub?.messagesUsed ?? 0).toLocaleString("en")}`}
          sub={`${o.of} ${sub?.messagesLimit === -1 ? o.unlimited : (sub?.messagesLimit ?? 0).toLocaleString("en")}`}
        />
        <StatsCard
          icon={Key}
          label={o.apiKeysActive}
          value={`${sub?.apiKeysUsed ?? 0}`}
          sub={`${o.of} ${sub?.apiKeysLimit ?? 0}`}
          action={{ label: "+", href: `/app/${appId}/api-keys` }}
        />
        <StatsCard
          icon={Phone}
          label={o.whatsappAccounts}
          value={`${data?.whatsappAccountsCount ?? 0}`}
          action={{ label: "+", href: `/app/${appId}/whatsapp` }}
        />
      </div>

      {/* ── Usage bars ── */}
      <div className="rounded-2xl bg-default/60 dark:bg-default/40 p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">{o.resourceUsage}</h2>
        <UsageBar
          used={sub?.messagesUsed ?? 0}
          limit={sub?.messagesLimit ?? 1000}
          label={o.messagesUsed}
          color="bg-blue-500"
        />
        <UsageBar
          used={sub?.apiKeysUsed ?? 0}
          limit={sub?.apiKeysLimit ?? 1}
          label={o.apiKeysActive}
          color="bg-amber-500"
        />
        <UsageBar
          used={sub?.webhooksUsed ?? 0}
          limit={sub?.webhooksLimit ?? 2}
          label="Webhooks"
          color="bg-violet-500"
        />
        <UsageBar
          used={sub?.contactsUsed ?? 0}
          limit={sub?.contactsLimit ?? 500}
          label={t.dashboard.sidebar.contacts}
          color="bg-emerald-500"
        />
      </div>

      {/* ── Quick actions ── */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">{o.quickActions}</h2>
        <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
          <QuickAction icon={Key} label={o.createApiKey} href={`/app/${appId}/api-keys`} color="bg-amber-500" />
          <QuickAction icon={MessageSquare} label={o.connectWhatsApp} href={`/app/${appId}/whatsapp`} color="bg-emerald-500" />
          <QuickAction icon={Webhook} label={o.addWebhook} href={`/app/${appId}/webhooks`} color="bg-violet-500" />
          <QuickAction icon={BookOpen} label={o.viewDocs} href="https://docs.rukny.io" color="bg-blue-500" />
        </div>
      </div>
    </div>
  );
}
