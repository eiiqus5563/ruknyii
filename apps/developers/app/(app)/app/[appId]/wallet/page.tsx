"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Wallet, ArrowRightLeft, Landmark, MessageSquare, Plus, TrendingUp, Sparkles } from "lucide-react";
import { Alert } from "@heroui/react";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { useAllocateAppWallet, useAppWallet, useMasterWallet } from "@/lib/hooks/use-wallet";

function formatIQD(amount: number) {
  return `${new Intl.NumberFormat("en", {
    maximumFractionDigits: 0,
  }).format(amount)} IQD`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint: string;
  tone?: string;
}) {
  return (
    <div className="rounded-[28px] border border-border/50 bg-background p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="mt-2 text-sm text-muted">{hint}</p>
        </div>
        <div className={`flex size-11 items-center justify-center rounded-2xl ${tone ?? "bg-[#25D366]/10 text-[#25D366]"}`}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

export default function WalletPage() {
  const { isLoading: authLoading } = useAuth();
  const { t } = useLocale();
  const params = useParams();
  const appId = params.appId as string;

  const raw = (t as any).wallet as Record<string, string> | undefined;
  const s = {
    title: raw?.title ?? "Wallet",
    subtitle: raw?.subtitle ?? "Manage your main balance and allocate operating funds to this app.",
    appBalance: raw?.appBalance ?? "App Balance",
    mainBalance: raw?.mainBalance ?? "Main Wallet",
    allocatedTotal: raw?.allocatedTotal ?? "Allocated to this app",
    spentTotal: raw?.spentTotal ?? "Spent by this app",
    transferTitle: raw?.transferTitle ?? "Allocate Balance",
    transferDesc: raw?.transferDesc ?? "Move funds from your main wallet into this app before sending messages.",
    amount: raw?.amount ?? "Amount",
    transfer: raw?.transfer ?? "Transfer to App",
    transferring: raw?.transferring ?? "Transferring...",
    emptyApp: raw?.emptyApp ?? "This app is new and starts with zero balance until you fund it.",
    topUpMain: raw?.topUpMain ?? "Top-up main wallet",
    whatsappSetup: raw?.whatsappSetup ?? "Connect WhatsApp",
    insufficient: raw?.insufficient ?? "Main wallet balance is not enough for this transfer.",
    success: raw?.success ?? "Balance transferred successfully.",
    minAmount: raw?.minAmount ?? "Enter a valid amount greater than zero.",
  };

  const { data: masterWallet, isLoading: masterLoading } = useMasterWallet();
  const { data: appWallet, isLoading: appLoading } = useAppWallet(appId);
  const allocateMutation = useAllocateAppWallet(appId);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  const numericAmount = useMemo(() => Number(amount.replace(/[^\d]/g, "")), [amount]);
  const suggestedAmounts = [5000, 10000, 25000];
  const appShare = useMemo(() => {
    const total = (masterWallet?.balance ?? 0) + (appWallet?.balance ?? 0);
    if (!total) return 0;
    return Math.round(((appWallet?.balance ?? 0) / total) * 100);
  }, [appWallet?.balance, masterWallet?.balance]);

  const handleAllocate = useCallback(async () => {
    if (!numericAmount || numericAmount <= 0) {
      setMessage({ type: "danger", text: s.minAmount });
      return;
    }

    if ((masterWallet?.balance ?? 0) < numericAmount) {
      setMessage({ type: "danger", text: s.insufficient });
      return;
    }

    await allocateMutation.mutateAsync(numericAmount);
    setAmount("");
    setMessage({ type: "success", text: s.success });
  }, [allocateMutation, masterWallet?.balance, numericAmount, s]);

  if (authLoading || masterLoading || appLoading || !masterWallet || !appWallet) {
    return (
      <div className="mt-2 space-y-4 sm:mt-10">
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-3xl border border-border/40 bg-background" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-3xl border border-border/40 bg-background" />
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-6 sm:mt-10">
      <div className="overflow-hidden rounded-[32px] border border-border/40 bg-[linear-gradient(135deg,rgba(37,211,102,0.11),rgba(37,211,102,0.03)_42%,transparent_78%)]">
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-background/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              <Sparkles className="size-3.5" />
              App Funding
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#25D366]/10">
                <Wallet className="size-4 text-[#25D366]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{s.title}</h1>
                <p className="mt-1 text-sm text-muted">{s.subtitle}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-background/80 px-4 py-3 backdrop-blur">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">App share</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">{appShare}%</span>
              <span className="pb-1 text-sm text-muted">of combined funds</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          icon={Wallet}
          label={s.appBalance}
          value={formatIQD(appWallet.balance)}
          hint={appWallet.balance > 0 ? `${s.allocatedTotal}: ${formatIQD(appWallet.totalAllocated)}` : s.emptyApp}
        />
        <StatCard
          icon={Landmark}
          label={s.mainBalance}
          value={formatIQD(masterWallet.balance)}
          hint={`${s.spentTotal}: ${formatIQD(masterWallet.totalSpent)}`}
          tone="bg-accent/10 text-accent"
        />
      </div>

      <div className="rounded-[28px] border border-border/40 bg-background px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Balance distribution</p>
            <p className="mt-1 text-sm text-muted">See how much of your available balance is already allocated to this app.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-default/35 px-3 py-1 text-xs font-medium text-muted">
            <TrendingUp className="size-3.5 text-[#25D366]" />
            {formatIQD(appWallet.balance)} active in this app
          </div>
        </div>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-default/45">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#25D366,#7CE7A6)] transition-all"
            style={{ width: `${Math.max(appShare, appWallet.balance > 0 ? 8 : 0)}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#25D366]" />
            App balance: {formatIQD(appWallet.balance)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-default-foreground/40" />
            Main wallet: {formatIQD(masterWallet.balance)}
          </span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-border/50 bg-background p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#25D366]/10">
              <ArrowRightLeft className="size-4 text-[#25D366]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{s.transferTitle}</h2>
              <p className="text-sm text-muted">{s.transferDesc}</p>
            </div>
          </div>

          {message && (
            <Alert status={message.type} className="mb-4">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{message.text}</Alert.Description>
              </Alert.Content>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground">{s.amount}</label>
              <input
                type="text"
                inputMode="numeric"
                dir="ltr"
                value={amount}
                onChange={(event) => {
                  setMessage(null);
                  setAmount(event.target.value.replace(/[^\d]/g, ""));
                }}
                placeholder="5000"
                className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground font-mono transition-colors focus:border-[#25D366]/50 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestedAmounts.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setMessage(null);
                    setAmount(String(value));
                  }}
                  className="rounded-full border border-border/50 bg-default/15 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-[#25D366]/30 hover:bg-[#25D366]/8"
                >
                  {formatIQD(value)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAllocate}
              disabled={allocateMutation.isPending || !amount}
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#25D366]/90 disabled:opacity-50"
            >
              <Plus className="size-4" />
              {allocateMutation.isPending ? s.transferring : s.transfer}
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-border/50 bg-background p-6">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <MessageSquare className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{s.appBalance}</h2>
              <p className="text-sm text-muted">{s.emptyApp}</p>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href={`/app/${appId}/whatsapp`}
              className="flex items-center justify-between rounded-2xl border border-border/40 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-[#25D366]/20 hover:bg-default"
            >
              <span>{s.whatsappSetup}</span>
              <MessageSquare className="size-4 text-muted" />
            </Link>
            <div className="rounded-2xl border border-border/40 bg-default/15 px-4 py-3 text-sm text-muted">
              {s.mainBalance}: {formatIQD(masterWallet.balance)}
            </div>
            <div className="rounded-2xl border border-border/40 bg-default/15 px-4 py-3 text-sm text-muted">
              {s.allocatedTotal}: {formatIQD(appWallet.totalAllocated)}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}