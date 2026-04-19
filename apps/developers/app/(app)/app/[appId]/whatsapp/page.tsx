"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { AlertDialog, Chip, Tooltip, Dropdown, Label, Button } from "@heroui/react";
import {
  MessageSquare,
  Plus,
  MoreHorizontal,
  RefreshCw,
  Unlink,
  Building2,
  Clock,
  Globe,
  Webhook,
  Loader2,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";
import {
  useWabaAccounts,
  useDisconnectWaba,
  useRefreshWaba,
  useEmbeddedSignupConfig,
  useConnectWaba,
} from "@/lib/hooks/use-whatsapp";
import type { WabaAccount, WabaStatus } from "@/lib/api/whatsapp";
import { cn } from "@/lib/utils";
import { loadFacebookSDK, launchEmbeddedSignup } from "@/lib/facebook-sdk";

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

const STATUS_CONFIG: Record<WabaStatus, { key: string; dotColor: string; bgColor: string; textColor: string }> = {
  CONNECTED: { key: "connected", dotColor: "bg-[#25D366]", bgColor: "bg-[#25D366]/10", textColor: "text-[#25D366]" },
  PENDING_SETUP: { key: "pendingSetup", dotColor: "bg-warning", bgColor: "bg-warning/10", textColor: "text-warning" },
  DISCONNECTED: { key: "disconnected", dotColor: "bg-gray-400", bgColor: "bg-default/60", textColor: "text-muted" },
  ERROR: { key: "error", dotColor: "bg-danger", bgColor: "bg-danger/10", textColor: "text-danger" },
  BANNED: { key: "banned", dotColor: "bg-danger", bgColor: "bg-danger/10", textColor: "text-danger" },
};

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between pb-5">
        <div className="space-y-2.5">
          <div className="h-7 w-48 rounded-lg bg-default/80" />
          <div className="h-4 w-72 rounded-lg bg-default/50" />
        </div>
        <div className="h-10 w-40 rounded-full bg-default/80" />
      </div>
      <div className="grid gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl sm:rounded-3xl bg-background border border-border/30 p-2 sm:p-3">
            <div className="aspect-[4/3] sm:aspect-[5/3] rounded-xl sm:rounded-2xl bg-default/40 mb-2 sm:mb-3" />
            <div className="px-0.5 sm:px-1 space-y-1.5 sm:space-y-2">
              <div className="h-3.5 sm:h-4 w-3/4 bg-default/60 rounded-lg" />
              <div className="h-2.5 sm:h-3 w-full bg-default/30 rounded" />
              <div className="flex gap-2 mt-2">
                <div className="h-2.5 w-10 bg-default/30 rounded" />
                <div className="h-2.5 w-10 bg-default/30 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Disconnect Dialog                                                  */
/* ------------------------------------------------------------------ */

function DisconnectDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  labels,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  labels: Record<string, string>;
}) {
  return (
    <AlertDialog isOpen={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{labels.disconnectTitle}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="text-sm text-muted">{labels.disconnectConfirm}</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="outline" onPress={onClose}>
                {labels.cancel}
              </Button>
              <Button variant="danger" onPress={onConfirm} isDisabled={isPending}>
                {isPending ? "..." : labels.disconnect}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ labels, onConnect, isConnecting, disabled }: {
  labels: Record<string, string>;
  onConnect: () => void;
  isConnecting: boolean;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="relative">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-[#25D366]/10 ring-1 ring-[#25D366]/20">
          <MessageSquare className="size-7 text-[#25D366]" />
        </div>
        <div className="absolute -bottom-1.5 -end-1.5 flex size-7 items-center justify-center rounded-full bg-[#25D366] text-white ring-2 ring-background">
          <Plus className="size-3.5" />
        </div>
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">{labels.noAccounts}</p>
        <p className="text-sm text-muted mt-1.5 max-w-sm leading-relaxed">{labels.noAccountsDesc}</p>
      </div>
      <Button
        onPress={onConnect}
        isDisabled={isConnecting || disabled}
        className="rounded-full bg-[#25D366] text-white hover:bg-[#25D366]/90"
      >
        {isConnecting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        {isConnecting ? labels.refreshing : labels.connect}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Account Card  (FormCard-inspired design)                           */
/* ------------------------------------------------------------------ */

function AccountCard({
  account,
  labels,
  onRefresh,
  onDisconnect,
  isRefreshing,
}: {
  account: WabaAccount;
  labels: Record<string, string>;
  onRefresh: (id: string) => void;
  onDisconnect: (account: WabaAccount) => void;
  isRefreshing: boolean;
}) {
  const sc = STATUS_CONFIG[account.status] ?? STATUS_CONFIG.DISCONNECTED;
  const statusLabel = labels[sc.key] ?? sc.key;

  const initials = account.businessName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="group relative bg-background rounded-2xl sm:rounded-3xl border border-border/40 p-2 sm:p-3 hover:shadow-xl hover:shadow-default/30 hover:border-border transition-all duration-300">
      {/* ── Hero area ── */}
      <div className="relative aspect-[4/3] sm:aspect-[5/3] rounded-xl sm:rounded-2xl overflow-hidden mb-2 sm:mb-3">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#25D366]/5 via-background to-[#25D366]/10" />

        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex size-9 sm:size-12 items-center justify-center rounded-lg sm:rounded-xl bg-background shadow-md shadow-default/40 group-hover:scale-110 transition-transform duration-300">
            <span className="text-xs sm:text-sm font-bold text-[#25D366]">{initials}</span>
          </div>
        </div>

        {/* Status badge — top right */}
        <span className={cn(
          "absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-bold",
          "backdrop-blur-md shadow-sm flex items-center gap-1",
          sc.bgColor, sc.textColor,
        )}>
          <span className={cn("size-1 sm:size-1.5 rounded-full", sc.dotColor)} />
          {statusLabel}
        </span>

        {/* Webhook badge — top left */}
        <span className={cn(
          "absolute top-1.5 left-1.5 sm:top-2.5 sm:left-2.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-bold",
          "backdrop-blur-md shadow-sm flex items-center gap-1",
          account.webhookSubscribed
            ? "bg-accent/10 text-accent"
            : "bg-default/60 text-muted",
        )}>
          <Webhook className="size-2.5 sm:size-3" />
          <span className="hidden sm:inline">{account.webhookSubscribed ? labels.webhookActive : labels.webhookInactive}</span>
        </span>

        {/* Currency — bottom left */}
        <span className="absolute bottom-1.5 left-1.5 sm:bottom-2.5 sm:left-2.5 size-5 sm:size-7 rounded-md sm:rounded-lg flex items-center justify-center bg-background/90 backdrop-blur-md shadow-sm text-[8px] sm:text-[10px] font-bold text-foreground">
          {account.currency || "$"}
        </span>

        {/* Actions dropdown — bottom right */}
        <div className="absolute bottom-1.5 right-1.5 sm:bottom-2.5 sm:right-2.5 z-30">
          <Dropdown>
            <Dropdown.Trigger>
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  "inline-flex items-center justify-center",
                  "size-5 sm:size-7 min-w-0 rounded-md sm:rounded-lg",
                  "bg-background/90 backdrop-blur-sm shadow-sm",
                  "text-muted hover:text-foreground hover:bg-background",
                  "sm:opacity-0 sm:group-hover:opacity-100 data-[pressed]:opacity-100",
                  "transition-all duration-200 cursor-pointer",
                )}
              >
                <MoreHorizontal className="size-3 sm:size-4" />
              </div>
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom end" className="min-w-[160px] rounded-xl">
              <Dropdown.Menu onAction={(key) => {
                if (key === "refresh") onRefresh(account.id);
                if (key === "disconnect") onDisconnect(account);
              }}>
                <Dropdown.Item id="refresh" textValue={labels.refresh}>
                  <RefreshCw className="size-4" />
                  <Label>{labels.refresh}</Label>
                </Dropdown.Item>
                <Dropdown.Item id="disconnect" textValue={labels.disconnect} variant="danger">
                  <Unlink className="size-4" />
                  <Label>{labels.disconnect}</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-0.5 sm:px-1">
        {/* Name + type chip */}
        <div className="flex items-center justify-between gap-1.5 mb-0.5 sm:mb-1">
          <h3 className="text-xs sm:text-sm font-bold text-foreground truncate flex-1 min-w-0">
            {account.businessName}
          </h3>
          <Chip size="sm" className="hidden sm:inline-flex text-[10px] font-semibold shrink-0 bg-[#25D366]/10 text-[#25D366]">
            <Chip.Label>WABA</Chip.Label>
          </Chip>
        </div>

        {/* WABA ID */}
        <p className="text-[9px] sm:text-[11px] text-muted font-mono mb-2 sm:mb-3 truncate">{account.wabaId}</p>

        {/* Stats row */}
        <div className="flex items-center gap-1.5 sm:gap-3 text-[9px] sm:text-[11px] text-muted">
          <Tooltip>
            <Tooltip.Trigger>
              <span className="flex items-center gap-0.5 sm:gap-1 cursor-default">
                <Clock className="size-2.5 sm:size-3 shrink-0" />
                <span className="truncate max-w-[40px] sm:max-w-none">{account.timezone || "—"}</span>
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content>{labels.timezone}</Tooltip.Content>
          </Tooltip>

          <span className="w-px h-2.5 sm:h-3 bg-border" />

          <Tooltip>
            <Tooltip.Trigger>
              <span className="flex items-center gap-0.5 sm:gap-1 cursor-default truncate">
                <Building2 className="size-2.5 sm:size-3 shrink-0" />
                <span className="truncate max-w-[40px] sm:max-w-[80px]">{account.businessId}</span>
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content>Business ID: {account.businessId}</Tooltip.Content>
          </Tooltip>

          <span className="w-px h-2.5 sm:h-3 bg-border hidden sm:block" />

          <span className="hidden sm:flex items-center gap-1">
            <Globe className="size-3" />
            {formatDate(account.createdAt)}
          </span>
        </div>
      </div>

      {/* Loading overlay while refreshing */}
      {isRefreshing && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-2xl sm:rounded-3xl">
          <RefreshCw className="size-4 sm:size-5 text-[#25D366] animate-spin" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function WhatsAppAccountsPage() {
  const { isLoading: authLoading } = useAuth();
  const { t } = useLocale();
  const params = useParams();
  const appId = params.appId as string;

  const labels = (t as any).whatsapp?.accounts as Record<string, string> | undefined;
  const s = {
    title: labels?.title ?? "WhatsApp Accounts",
    subtitle: labels?.subtitle ?? "Connect and manage your WhatsApp Business accounts",
    connect: labels?.connect ?? "Connect Account",
    noAccounts: labels?.noAccounts ?? "No WhatsApp accounts yet",
    noAccountsDesc: labels?.noAccountsDesc ?? "Connect your WhatsApp Business Account to start sending messages through the Rukny API.",
    disconnect: labels?.disconnect ?? "Disconnect",
    disconnectTitle: labels?.disconnectTitle ?? "Disconnect Account",
    disconnectConfirm: labels?.disconnectConfirm ?? "Are you sure you want to disconnect this WhatsApp account?",
    refresh: labels?.refresh ?? "Sync Status",
    refreshing: labels?.refreshing ?? "Syncing...",
    connected: labels?.connected ?? "Connected",
    pendingSetup: labels?.pendingSetup ?? "Pending Setup",
    disconnected: labels?.disconnected ?? "Disconnected",
    error: labels?.error ?? "Error",
    banned: labels?.banned ?? "Banned",
    currency: labels?.currency ?? "Currency",
    timezone: labels?.timezone ?? "Timezone",
    webhookActive: labels?.webhookActive ?? "Active",
    webhookInactive: labels?.webhookInactive ?? "Inactive",
    cancel: labels?.cancel ?? "Cancel",
    businessName: labels?.businessName ?? "Business Name",
    wabaId: labels?.wabaId ?? "WABA ID",
    created: labels?.created ?? "Connected",
    webhook: labels?.webhook ?? "Webhook",
    status: labels?.status ?? "Status",
  };

  const { data: accounts, isLoading: accountsLoading } = useWabaAccounts(appId);
  const { data: signupConfig } = useEmbeddedSignupConfig();
  const disconnectMutation = useDisconnectWaba(appId);
  const refreshMutation = useRefreshWaba(appId);
  const connectMutation = useConnectWaba(appId);

  const [disconnectTarget, setDisconnectTarget] = useState<WabaAccount | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const sdkReady = useRef(false);

  useEffect(() => {
    if (!signupConfig?.appId || sdkReady.current) return;
    loadFacebookSDK(signupConfig.appId).then(() => {
      sdkReady.current = true;
    });
  }, [signupConfig?.appId]);

  const handleConnect = useCallback(async () => {
    if (!signupConfig?.configId || !sdkReady.current) return;
    setIsConnecting(true);
    try {
      const code = await launchEmbeddedSignup(signupConfig.configId);
      if (code) {
        await connectMutation.mutateAsync({ code });
      }
    } finally {
      setIsConnecting(false);
    }
  }, [signupConfig, connectMutation]);

  const handleRefresh = useCallback(async (id: string) => {
    setRefreshingId(id);
    try {
      await refreshMutation.mutateAsync(id);
    } finally {
      setRefreshingId(null);
    }
  }, [refreshMutation]);

  const handleDisconnect = useCallback(async () => {
    if (!disconnectTarget) return;
    await disconnectMutation.mutateAsync(disconnectTarget.id);
    setDisconnectTarget(null);
  }, [disconnectTarget, disconnectMutation]);

  if (authLoading || accountsLoading) {
    return (
      <div className="mt-2 sm:mt-10">
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="mt-2 sm:mt-10">
      {/* ── Header ── */}
      <div className="pb-4 pt-2 border-b border-border/20 -mx-3 px-3 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[#25D366]/10">
                <MessageSquare className="size-4 text-[#25D366]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{s.title}</h1>
            </div>
            <p className="text-sm text-muted mt-1">{s.subtitle}</p>
          </div>
          <Button
            onPress={handleConnect}
            isDisabled={isConnecting || !signupConfig}
            className="rounded-full bg-[#25D366] text-white hover:bg-[#25D366]/90 shadow-sm shadow-[#25D366]/25 hover:shadow-md hover:shadow-[#25D366]/25 transition-all shrink-0"
          >
            {isConnecting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {isConnecting ? s.refreshing : s.connect}
          </Button>
        </div>
      </div>

      {/* ── Content ── */}
      {!accounts?.length ? (
        <EmptyState labels={s} onConnect={handleConnect} isConnecting={isConnecting} disabled={!signupConfig} />
      ) : (
        <div className="grid gap-2.5 sm:gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 mt-6">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              labels={s}
              onRefresh={handleRefresh}
              onDisconnect={setDisconnectTarget}
              isRefreshing={refreshingId === account.id}
            />
          ))}
        </div>
      )}

      {/* ── Disconnect dialog ── */}
      <DisconnectDialog
        open={!!disconnectTarget}
        onClose={() => setDisconnectTarget(null)}
        onConfirm={handleDisconnect}
        isPending={disconnectMutation.isPending}
        labels={s}
      />
    </div>
  );
}
