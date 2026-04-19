"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Chip,
  Modal,
  AlertDialog,
  Alert,
  Tooltip,
  Dropdown,
  Label,
  InputOTP,
  Button,
} from "@heroui/react";
import {
  Key,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Copy,
  Check,
  ShieldCheck,
  ShieldAlert,
  Globe,
  FlaskConical,
  Clock,
  Activity,
  CalendarDays,
  Shield,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";
import { useUsageSummary } from "@/lib/hooks/use-dashboard";
import { useApp } from "@/lib/hooks/use-apps";
import {
  useApiKeys,
  useRevokeApiKey,
  use2FAStatus,
  useRevealApiKey,
} from "@/lib/hooks/use-api-keys";
import { type ApiKey } from "@/lib/api/api-keys";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString("en");
}

const STATUS_MAP = {
  ACTIVE: { color: "success" as const, dot: "bg-success" },
  REVOKED: { color: "danger" as const, dot: "bg-danger" },
  EXPIRED: { color: "warning" as const, dot: "bg-warning" },
};

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ label, desc, appId }: { label: string; desc: string; appId: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="relative">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/20">
          <Key className="size-7 text-accent" />
        </div>
        <div className="absolute -bottom-1.5 -end-1.5 flex size-7 items-center justify-center rounded-full bg-accent text-accent-foreground ring-2 ring-background">
          <Plus className="size-3.5" />
        </div>
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted mt-1.5 max-w-sm leading-relaxed">{desc}</p>
      </div>
      <Link
        href={`/app/${appId}/api-keys/new`}
        className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/90 shadow-sm shadow-accent/20 transition-all hover:shadow-md hover:shadow-accent/20"
      >
        <Plus className="size-4" />
        {label}
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function TableSkeleton() {
  return (
    <div className="mt-2 sm:mt-10 animate-pulse">
      <div className="flex items-center justify-between pb-5">
        <div className="space-y-2.5">
          <div className="h-7 w-36 rounded-lg bg-default/80" />
          <div className="h-4 w-60 rounded-lg bg-default/50" />
        </div>
        <div className="h-10 w-40 rounded-full bg-default/80" />
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/30 bg-background dark:bg-overlay p-5">
            <div className="flex items-center gap-4">
              <div className="size-11 rounded-xl bg-default/70" />
              <div className="flex-1 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-32 rounded-lg bg-default/70" />
                  <div className="h-5 w-14 rounded-full bg-default/50" />
                  <div className="h-4 w-16 rounded-lg bg-default/40" />
                </div>
                <div className="h-3 w-44 rounded bg-default/40" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3.5 ms-[60px]">
              <div className="h-5 w-20 rounded-full bg-default/40" />
              <div className="h-5 w-24 rounded-full bg-default/40" />
              <div className="h-5 w-16 rounded-full bg-default/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Revoke Confirmation                                                */
/* ------------------------------------------------------------------ */

function RevokeDialog({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const { t } = useLocale();
  const s = t.dashboard.apiKeys as Record<string, any>;

  return (
    <AlertDialog isOpen={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{s.revokeTitle}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="text-sm text-muted">{s.revokeConfirm}</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-default transition-colors"
              >
                {s.cancel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className="rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-danger-foreground hover:bg-danger/90 transition-colors disabled:opacity-50"
              >
                {isPending ? s.revoking : s.revoke}
              </button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Reveal Key Dialog (2FA-gated)                                      */
/* ------------------------------------------------------------------ */

function RevealKeyDialog({
  apiKey,
  appId,
  onClose,
}: {
  apiKey: ApiKey | null;
  appId: string;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const s = t.dashboard.apiKeys as Record<string, any>;
  const r = s.revealKey as Record<string, string>;

  const { data: twoFAStatus, isLoading: twoFALoading } = use2FAStatus();
  const revealMutation = useRevealApiKey();

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const open = !!apiKey;
  const twoFAEnabled = twoFAStatus?.enabled ?? false;

  const handleVerify = useCallback(
    async (value: string) => {
      if (!apiKey || value.length !== 6) return;
      setError(null);
      try {
        const result = await revealMutation.mutateAsync({
          keySlug: apiKey.slug,
          token: value,
        });
        setRevealedKey(result.key);
      } catch {
        setError(r.invalidCode);
        setCode("");
      }
    },
    [apiKey, revealMutation, r.invalidCode],
  );

  const handleCopy = useCallback(async () => {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [revealedKey]);

  const handleClose = useCallback(() => {
    setCode("");
    setError(null);
    setRevealedKey(null);
    setCopied(false);
    onClose();
  }, [onClose]);

  // ── No 2FA enabled state ──
  if (open && !twoFALoading && !twoFAEnabled) {
    return (
      <Modal isOpen={open} onOpenChange={(v) => !v && handleClose()}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-md">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon>
                  <ShieldCheck className="size-5" />
                </Modal.Icon>
                <Modal.Heading>{r.no2faTitle}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted">{r.no2faDesc}</p>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="ghost"
                  onPress={handleClose}
                  className="rounded-xl"
                >
                  {s.cancel}
                </Button>
                <Button
                  variant="primary"
                  onPress={() => {
                    handleClose();
                    window.location.href = `/app/${appId}/settings/security`;
                  }}
                  className="rounded-xl"
                >
                  <ShieldCheck className="size-4" />
                  {r.enable2fa}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    );
  }

  // ── Revealed key state ──
  if (open && revealedKey) {
    return (
      <Modal isOpen={open} onOpenChange={(v) => !v && handleClose()}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-xl">
              <Modal.Header>
                <Modal.Heading>{r.revealedTitle}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <Alert status="warning" className="mb-4">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{r.revealedWarning}</Alert.Description>
                  </Alert.Content>
                </Alert>
                <div className="flex items-center gap-2 rounded-xl bg-default/60 p-3">
                  <code className="flex-1 text-xs font-mono text-foreground break-all select-all">
                    {revealedKey}
                  </code>
                  <Tooltip>
                    <Tooltip.Trigger>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background hover:bg-default transition-colors"
                      >
                        {copied ? (
                          <Check className="size-4 text-success" />
                        ) : (
                          <Copy className="size-4 text-muted" />
                        )}
                      </button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>{copied ? r.copied : r.copy}</Tooltip.Content>
                  </Tooltip>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="primary"
                  onPress={handleClose}
                  className="w-full rounded-xl"
                >
                  {r.done}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    );
  }

  // ── OTP verification state ──
  return (
    <Modal isOpen={open} onOpenChange={(v) => !v && handleClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon>
                <ShieldCheck className="size-5" />
              </Modal.Icon>
              <Modal.Heading>{r.title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm text-muted mb-6">{r.subtitle}</p>

              {error && (
                <Alert status="danger" className="mb-4">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{error}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              <div dir="ltr" className="flex justify-center p-6">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(val: string) => {
                    setCode(val);
                    setError(null);
                  }}
                  onComplete={handleVerify}
                  isDisabled={revealMutation.isPending}
                >
                  <InputOTP.Group>
                    <InputOTP.Slot index={0} />
                    <InputOTP.Slot index={1} />
                    <InputOTP.Slot index={2} />
                  </InputOTP.Group>
                  <InputOTP.Separator />
                  <InputOTP.Group>
                    <InputOTP.Slot index={3} />
                    <InputOTP.Slot index={4} />
                    <InputOTP.Slot index={5} />
                  </InputOTP.Group>
                </InputOTP>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="ghost"
                onPress={handleClose}
                className="rounded-xl"
              >
                {s.cancel}
              </Button>
              <Button
                variant="primary"
                onPress={() => handleVerify(code)}
                isDisabled={code.length !== 6 || revealMutation.isPending}
                isPending={revealMutation.isPending}
                className="rounded-xl"
              >
                {revealMutation.isPending ? r.verifying : r.verify}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ApiKeysPage() {
  const { isLoading: authLoading } = useAuth();
  const { t } = useLocale();
  const params = useParams();
  const appId = params.appId as string;
  const s = t.dashboard.apiKeys as Record<string, any>;
  const scopeLabels = s.scopeLabels as Record<string, string>;

  const { data: app, isLoading: appLoading } = useApp(appId);
  const developerAppId = app?.id;
  const { data: keys, isLoading: keysLoading } = useApiKeys(developerAppId);
  const { data: usage } = useUsageSummary(appId);
  const revokeMutation = useRevokeApiKey(developerAppId);

  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revealTarget, setRevealTarget] = useState<ApiKey | null>(null);

  const apiKeysUsed = usage?.subscription.apiKeysUsed ?? 0;
  const apiKeysLimit = usage?.subscription.apiKeysLimit ?? 1;
  const isAtLimit = apiKeysUsed >= apiKeysLimit;

  const handleRevoke = useCallback(async () => {
    if (!revokeTarget) return;
    await revokeMutation.mutateAsync(revokeTarget.slug);
    setRevokeTarget(null);
  }, [revokeTarget, revokeMutation]);

  const activeKeys = useMemo(() => (keys ?? []).filter((k) => k.status === "ACTIVE"), [keys]);
  const inactiveKeys = useMemo(() => (keys ?? []).filter((k) => k.status !== "ACTIVE"), [keys]);
  const sortedKeys = useMemo(() => [...activeKeys, ...inactiveKeys], [activeKeys, inactiveKeys]);

  if (authLoading || appLoading || keysLoading) return <TableSkeleton />;

  return (
    <div className="mt-2 sm:mt-10">
      {/* ── Header ── */}
      <div className="pb-4 pt-2 border-b border-border/20 -mx-3 px-3 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{s.title}</h1>
            <p className="text-sm text-muted mt-1">{s.subtitle}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Usage indicator */}
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-xs text-muted tabular-nums">
                {(s.usageCount as string)
                  .replace("{used}", String(apiKeysUsed))
                  .replace("{limit}", String(apiKeysLimit))}
              </span>
              <div className="w-24 h-1.5 rounded-full bg-default/60 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    isAtLimit ? "bg-danger" : apiKeysUsed / apiKeysLimit > 0.7 ? "bg-warning" : "bg-accent",
                  )}
                  style={{ width: `${Math.min((apiKeysUsed / apiKeysLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
            <Tooltip>
              <Tooltip.Trigger>
                {isAtLimit ? (
                  <span
                    className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground shadow-sm shadow-accent/25 opacity-50 cursor-not-allowed"
                  >
                    <Plus className="size-4" />
                    {s.createKey}
                  </span>
                ) : (
                  <Link
                    href={`/app/${appId}/api-keys/new`}
                    className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground shadow-sm shadow-accent/25 hover:bg-accent/90 hover:shadow-md hover:shadow-accent/25 transition-all"
                  >
                    <Plus className="size-4" />
                    {s.createKey}
                  </Link>
                )}
              </Tooltip.Trigger>
              {isAtLimit && (
                <Tooltip.Content>
                  {(s.limitReached as string)
                    .replace("{used}", String(apiKeysUsed))
                    .replace("{limit}", String(apiKeysLimit))}
                </Tooltip.Content>
              )}
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="space-y-4">

      {/* ── Limit Alert ── */}
      {isAtLimit && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{s.limitReached && <ShieldAlert className="inline size-4 me-1" />}
              {(s.limitReached as string)
                .replace("{used}", String(apiKeysUsed))
                .replace("{limit}", String(apiKeysLimit))}
            </Alert.Title>
          </Alert.Content>
        </Alert>
      )}

      {/* ── Keys List or Empty ── */}
      {sortedKeys.length === 0 ? (
        <EmptyState label={s.createKey} desc={s.noKeysDesc} appId={appId} />
      ) : (
        <div className="space-y-3 mt-4">
          {/* Active keys section */}
          {activeKeys.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <div className="size-1.5 rounded-full bg-success" />
                <span className="text-xs font-medium text-muted uppercase tracking-wider">
                  {s.active} ({activeKeys.length})
                </span>
                <div className="flex-1 h-px bg-border/30" />
              </div>
              {activeKeys.map((apiKey) => {
                const statusCfg = STATUS_MAP[apiKey.status] ?? STATUS_MAP.ACTIVE;
                const EnvIcon = apiKey.environment === "live" ? Globe : FlaskConical;
                return (
                  <div
                    key={apiKey.id}
                    className="group rounded-2xl border border-border/50 bg-background dark:bg-overlay p-4 sm:p-5 transition-all hover:border-accent/30 hover:shadow-sm hover:shadow-accent/5"
                  >
                    {/* ── Row 1: Name + status + actions ── */}
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Icon */}
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
                        <Key className="size-[18px] text-accent" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground truncate">
                            {apiKey.name}
                          </span>
                          <Chip
                            variant="soft"
                            className={cn(
                              "text-[10px] px-2 py-0.5 font-medium",
                              apiKey.environment === "live"
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning",
                            )}
                          >
                            <EnvIcon className="size-3 me-0.5" />
                            {apiKey.environment === "live" ? s.live : s.test}
                          </Chip>
                          <div className="flex items-center gap-1.5">
                            <div className={cn("size-1.5 rounded-full animate-pulse", statusCfg.dot)} />
                            <span className="text-[11px] font-medium text-muted">
                              {s[apiKey.status.toLowerCase()] ?? apiKey.status}
                            </span>
                          </div>
                        </div>

                        {/* Key display */}
                        <code className="text-[11px] font-mono text-muted/60 mt-1 block select-all">
                          {apiKey.keyPrefix}•••{apiKey.keySuffix}
                        </code>
                      </div>

                      {/* Actions */}
                      <Dropdown>
                        <Dropdown.Trigger>
                          <div
                            role="button"
                            tabIndex={0}
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted opacity-0 group-hover:opacity-100 hover:bg-default hover:text-foreground transition-all cursor-pointer"
                          >
                            <MoreHorizontal className="size-4" />
                          </div>
                        </Dropdown.Trigger>
                        <Dropdown.Popover placement="bottom end" className="min-w-[140px] rounded-xl">
                          <Dropdown.Menu
                            onAction={(key) => {
                              if (key === "reveal") setRevealTarget(apiKey);
                              if (key === "revoke") setRevokeTarget(apiKey);
                            }}
                          >
                            <Dropdown.Item id="reveal" textValue={(s.revealKey as Record<string, string>).menuLabel}>
                              <Eye className="size-4 text-muted" />
                              <Label>{(s.revealKey as Record<string, string>).menuLabel}</Label>
                            </Dropdown.Item>
                            <Dropdown.Item id="edit" textValue={s.edit} href={`/app/${appId}/api-keys/${apiKey.slug}/edit`}>
                              <Pencil className="size-4 text-muted" />
                              <Label>{s.edit}</Label>
                            </Dropdown.Item>
                            <Dropdown.Item id="revoke" textValue={s.revoke} variant="danger">
                              <Trash2 className="size-4" />
                              <Label>{s.revoke}</Label>
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
                    </div>

                    {/* ── Row 2: Meta info ── */}
                    <div className="flex items-center gap-3 mt-3.5 ms-[52px] sm:ms-[60px] flex-wrap text-muted">
                      {/* Scopes */}
                      <div className="flex items-center gap-1.5">
                        <Shield className="size-3 text-muted/60" />
                        {apiKey.scopes.slice(0, 3).map((scope) => (
                          <Tooltip key={scope}>
                            <Tooltip.Trigger>
                              <Chip variant="soft" className="text-[10px] bg-default/60 px-2 py-0.5 font-medium">
                                {scopeLabels[scope] ?? scope}
                              </Chip>
                            </Tooltip.Trigger>
                            <Tooltip.Content>{scopeLabels[scope] ?? scope}</Tooltip.Content>
                          </Tooltip>
                        ))}
                        {apiKey.scopes.length > 3 && (
                          <Tooltip>
                            <Tooltip.Trigger>
                              <Chip variant="soft" className="text-[10px] bg-default/60 px-2 py-0.5 font-medium">
                                +{apiKey.scopes.length - 3}
                              </Chip>
                            </Tooltip.Trigger>
                            <Tooltip.Content>
                              {apiKey.scopes.slice(3).map((sc) => scopeLabels[sc] ?? sc).join(", ")}
                            </Tooltip.Content>
                          </Tooltip>
                        )}
                      </div>

                      <div className="h-3.5 w-px bg-border/30" />

                      {/* Last used */}
                      <div className="flex items-center gap-1">
                        <Clock className="size-3 text-muted/60" />
                        <span className="text-[11px]">
                          {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : s.never}
                        </span>
                      </div>

                      <div className="h-3.5 w-px bg-border/30" />

                      {/* Request count */}
                      <div className="flex items-center gap-1">
                        <Activity className="size-3 text-muted/60" />
                        <span className="text-[11px] tabular-nums">
                          {formatNumber(apiKey.requestCount ?? 0)} {s.requests}
                        </span>
                      </div>

                      {/* Created */}
                      <div className="flex items-center gap-1 ms-auto hidden sm:flex">
                        <CalendarDays className="size-3 text-muted/60" />
                        <span className="text-[11px]">
                          {formatDate(apiKey.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Inactive keys section */}
          {inactiveKeys.length > 0 && (
            <div className="space-y-2.5 mt-4">
              <div className="flex items-center gap-2 px-1">
                <div className="size-1.5 rounded-full bg-muted/50" />
                <span className="text-xs font-medium text-muted/70 uppercase tracking-wider">
                  {s.revoked ?? "Inactive"} ({inactiveKeys.length})
                </span>
                <div className="flex-1 h-px bg-border/20" />
              </div>
              {inactiveKeys.map((apiKey) => {
                const statusCfg = STATUS_MAP[apiKey.status] ?? STATUS_MAP.ACTIVE;
                const EnvIcon = apiKey.environment === "live" ? Globe : FlaskConical;
                return (
                  <div
                    key={apiKey.id}
                    className="rounded-2xl border border-border/30 bg-background/60 dark:bg-overlay/40 p-4 sm:p-5 opacity-60"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-default/60">
                        <Key className="size-[18px] text-muted/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground/70 truncate line-through decoration-muted/30">
                            {apiKey.name}
                          </span>
                          <Chip
                            variant="soft"
                            className={cn(
                              "text-[10px] px-2 py-0.5 font-medium",
                              apiKey.environment === "live"
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning",
                            )}
                          >
                            <EnvIcon className="size-3 me-0.5" />
                            {apiKey.environment === "live" ? s.live : s.test}
                          </Chip>
                          <div className="flex items-center gap-1.5">
                            <div className={cn("size-1.5 rounded-full", statusCfg.dot)} />
                            <span className="text-[11px] font-medium text-muted">
                              {s[apiKey.status.toLowerCase()] ?? apiKey.status}
                            </span>
                          </div>
                        </div>
                        <code className="text-[11px] font-mono text-muted/40 mt-1 block">
                          {apiKey.keyPrefix}•••{apiKey.keySuffix}
                        </code>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-3 ms-[52px] sm:ms-[60px] flex-wrap text-muted/70">
                      <div className="flex items-center gap-1">
                        <Activity className="size-3" />
                        <span className="text-[11px] tabular-nums">
                          {formatNumber(apiKey.requestCount ?? 0)} {s.requests}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ms-auto hidden sm:flex">
                        <CalendarDays className="size-3" />
                        <span className="text-[11px]">
                          {formatDate(apiKey.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>

      {/* ── Revoke Dialog ── */}
      <RevokeDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        isPending={revokeMutation.isPending}
      />

      {/* ── Reveal Key Dialog ── */}
      <RevealKeyDialog
        apiKey={revealTarget}
        appId={appId}
        onClose={() => setRevealTarget(null)}
      />
    </div>
  );
}
