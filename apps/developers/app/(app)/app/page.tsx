"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { useApps } from "@/lib/hooks/use-apps";
import {
  Plus,
  AppWindow,
  Search,
  Building2,
  User,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Circle,
  LayoutGrid,
} from "lucide-react";
import type { DeveloperApp } from "@/lib/api/apps";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function AppCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-border/50 bg-background animate-pulse">
      <div className="h-1.5 w-full bg-default/80" />
      <div className="p-5 space-y-4 sm:p-6">
        <div className="flex items-center gap-3.5">
          <div className="size-12 rounded-2xl bg-default" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded-md bg-default" />
            <div className="h-3 w-20 rounded-md bg-default/70" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-18 rounded-full bg-default" />
          <div className="h-6 w-22 rounded-full bg-default/70" />
        </div>
        <div className="h-10 rounded-2xl bg-default/40" />
      </div>
      <div className="mx-3 mb-3 rounded-2xl border border-border/30 bg-default/20 px-5 py-3 sm:mx-4 sm:mb-4">
        <div className="h-3 w-24 rounded-md bg-default/70" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  App Card — Meta-style grid card                                    */
/* ------------------------------------------------------------------ */

function AppCard({ app, labels }: { app: DeveloperApp; labels: Record<string, string> }) {
  const initials = app.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const isActive = app.status === "ACTIVE";
  const statusLabel = isActive ? labels.active : labels.suspended;

  return (
    <Link
      href={`/app/${app.appId}`}
      className="group relative flex flex-col overflow-hidden rounded-[28px] border border-border/50 bg-background transition-all duration-300 hover:-translate-y-1 hover:border-accent/40"
    >
      <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_left,rgba(37,211,102,0.12),transparent_58%)] opacity-80" />

      {/* Body */}
      <div className="relative flex-1 p-5 space-y-4 sm:p-6">
        {/* Icon + name */}
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent font-bold text-sm ring-1 ring-accent/15">
            {app.icon ? (
              <img src={app.icon} alt={app.name} className="size-full rounded-xl object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-foreground truncate group-hover:text-accent transition-colors">
                {app.name}
              </h3>
              {app.verified && (
                <CheckCircle2 className="size-4 shrink-0 text-accent" />
              )}
            </div>
            <p className="text-[11px] text-muted mt-0.5 tabular-nums font-mono">
              {app.appId}
            </p>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-default/40 ring-1 ring-border/40 transition-all group-hover:bg-accent/10 group-hover:ring-accent/20">
            <ArrowUpRight className="size-4 text-muted/50 group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
            isActive
              ? "bg-success/15 text-success ring-1 ring-success/20"
              : "bg-warning/15 text-warning ring-1 ring-warning/20"
          }`}>
            <Circle className="size-2 fill-current" />
            {statusLabel}
          </span>

          {app.appType && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/8 px-3 py-1 text-[11px] font-medium text-accent/80 ring-1 ring-accent/10">
              {app.appType === "BUSINESS" ? (
                <Building2 className="size-3" />
              ) : (
                <User className="size-3" />
              )}
              {app.appType === "BUSINESS" ? labels.business : labels.consumer}
            </span>
          )}
        </div>

        {app.description && (
          <p className="text-xs text-muted/70 line-clamp-2 leading-relaxed">{app.description}</p>
        )}

        <div className="rounded-2xl border border-border/40 bg-default/15 px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <span className="font-medium text-muted">{labels.appId}</span>
            <span className="font-mono text-foreground/80">{app.appId}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mx-3 mb-3 flex items-center rounded-2xl border border-border/40 bg-default/20 px-5 py-3 sm:mx-4 sm:mb-4">
        <div className="flex items-center gap-1.5 text-[11px] text-muted font-medium">
          <Clock className="size-3" />
          {formatDate(app.createdAt)}
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Card                                                        */
/* ------------------------------------------------------------------ */

function CreateCard({ label }: { label: string }) {
  return (
    <Link
      href="/app/new"
      className="group relative flex min-h-[280px] flex-col items-center justify-center gap-4 overflow-hidden rounded-[28px] border border-dashed border-border/70 bg-[linear-gradient(180deg,rgba(37,211,102,0.05),transparent_55%)] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:bg-[linear-gradient(180deg,rgba(37,211,102,0.09),transparent_60%)]"
    >
      <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(37,211,102,0.45),transparent)] opacity-70" />
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20 transition-all group-hover:scale-105 group-hover:bg-accent/15 group-hover:ring-accent/35">
        <Plus className="size-5 text-accent/70 group-hover:text-accent transition-colors" />
      </div>
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs leading-relaxed text-muted group-hover:text-foreground/70 transition-colors">
          Create a clean workspace with isolated WhatsApp and wallet data.
        </p>
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted group-hover:text-accent transition-colors">
        {label}
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ labels }: { labels: Record<string, string> }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 rounded-[32px] border border-border/40 bg-[linear-gradient(180deg,rgba(37,211,102,0.06),transparent_60%)] px-6 py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-default/60 ring-1 ring-border/30">
        <AppWindow className="size-7 text-muted" />
      </div>
      <div className="max-w-xs space-y-1.5">
        <h2 className="text-base font-semibold text-foreground">{labels.noApps}</h2>
        <p className="text-sm text-muted/70 leading-relaxed">{labels.noAppsDesc}</p>
      </div>
      <Link
        href="/app/new"
        className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
      >
        <Plus className="size-4" />
        {labels.createApp}
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AppsPage() {
  const { isLoading: authLoading } = useAuth();
  const { t } = useLocale();
  const a = (t.dashboard as any).apps as Record<string, string> | undefined;

  const labels = {
    title: a?.title ?? "Apps",
    subtitle: a?.subtitle ?? "Manage your developer applications",
    createApp: a?.createApp ?? "Create App",
    noApps: a?.noApps ?? "No apps yet",
    noAppsDesc: a?.noAppsDesc ?? "Create your first app to get started with the Rukny API.",
    appCount: a?.appCount ?? "apps",
    searchPlaceholder: a?.searchPlaceholder ?? "Search by App Name or App ID",
    appId: a?.appIdLabel ?? "App ID",
    type: a?.typeLabel ?? "Type",
    business: a?.business ?? "Business",
    consumer: a?.consumer ?? "Consumer",
    active: a?.active ?? "Active",
    suspended: a?.suspended ?? "Suspended",
  };

  const { data: apps, isLoading: appsLoading } = useApps();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!apps) return [];
    if (!search.trim()) return apps;
    const q = search.toLowerCase();
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(q) ||
        app.appId.toLowerCase().includes(q),
    );
  }, [apps, search]);

  if (authLoading || appsLoading) {
    return (
      <div className="space-y-6 mt-2 sm:mt-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-24 rounded bg-default animate-pulse" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-64 rounded-xl bg-default animate-pulse" />
            <div className="h-10 w-28 rounded-xl bg-default animate-pulse" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <AppCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!apps?.length) {
    return (
      <div className="mt-2 sm:mt-6">
        <EmptyState labels={labels} />
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-2 sm:mt-6">
      {/* Header */}
      <div className="overflow-hidden rounded-[32px] border border-border/40 bg-[linear-gradient(135deg,rgba(37,211,102,0.10),rgba(37,211,102,0.03)_36%,transparent_72%)]">
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-background/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent backdrop-blur">
              Workspace Apps
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{labels.title}</h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted/80">{labels.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1 text-xs font-medium text-foreground ring-1 ring-border/40">
                <LayoutGrid className="size-3.5 text-accent" />
                {apps.length} {labels.appCount}
              </span>
              {search.trim() && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1 text-xs font-medium text-muted ring-1 ring-border/40">
                  <Search className="size-3.5" />
                  {filtered.length} results
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-muted/50" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={labels.searchPlaceholder}
                className="h-10 w-full rounded-2xl border border-border/50 bg-background/85 ps-9 pe-3 text-sm text-foreground placeholder:text-muted/50 backdrop-blur focus:border-accent/40 focus:outline-none transition-colors sm:w-72"
              />
            </div>

            <Link
              href="/app/new"
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-all hover:bg-accent/90 shrink-0"
            >
              <Plus className="size-3.5" />
              {labels.createApp}
            </Link>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((app) => (
          <AppCard key={app.id} app={app} labels={labels} />
        ))}
        <CreateCard label={labels.createApp} />
      </div>

      {/* No results */}
      {search && filtered.length === 0 && (
        <div className="rounded-[28px] border border-border/40 bg-background px-6 py-16 text-center">
          <Search className="mx-auto mb-3 size-5 text-muted/30" />
          <p className="text-sm text-muted/70">No apps match &quot;{search}&quot;</p>
        </div>
      )}
    </div>
  );
}

