"use client";

import { useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Alert, Avatar, Modal, Tooltip } from "@heroui/react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  Circle,
  Clock3,
  Edit3,
  FileText,
  Globe,
  Hash,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Signal,
} from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import {
  usePhoneNumber,
  useRegisterPhoneNumber,
  useSendTestMessage,
} from "@/lib/hooks/use-whatsapp";
import type {
  PhoneNumber,
  PhoneQuality,
  PhoneStatus,
} from "@/lib/api/whatsapp";
import { cn } from "@/lib/utils";

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

const QUALITY_CONFIG: Record<
  PhoneQuality,
  { color: string; bg: string; ring: string }
> = {
  GREEN: {
    color: "text-success",
    bg: "bg-success/15",
    ring: "ring-success/20",
  },
  YELLOW: {
    color: "text-warning",
    bg: "bg-warning/15",
    ring: "ring-warning/20",
  },
  RED: {
    color: "text-danger",
    bg: "bg-danger/15",
    ring: "ring-danger/20",
  },
  UNKNOWN: {
    color: "text-muted",
    bg: "bg-default/60",
    ring: "ring-border",
  },
};

const STATUS_CONFIG: Record<
  PhoneStatus,
  { color: string; bg: string; ring: string }
> = {
  ACTIVE: {
    color: "text-success",
    bg: "bg-success/15",
    ring: "ring-success/20",
  },
  VERIFIED: {
    color: "text-accent",
    bg: "bg-accent/10",
    ring: "ring-accent/20",
  },
  PENDING: {
    color: "text-warning",
    bg: "bg-warning/15",
    ring: "ring-warning/20",
  },
  DISABLED: {
    color: "text-muted",
    bg: "bg-default/60",
    ring: "ring-border",
  },
  BANNED: {
    color: "text-danger",
    bg: "bg-danger/15",
    ring: "ring-danger/20",
  },
};

const LIMIT_LABELS: Record<string, string> = {
  TIER_1K: "1,000/day",
  TIER_10K: "10,000/day",
  TIER_100K: "100,000/day",
  UNLIMITED: "Unlimited",
};

function SendTestDialog({
  phone,
  onClose,
  labels,
}: {
  phone: PhoneNumber | null;
  onClose: () => void;
  labels: Record<string, string>;
}) {
  const params = useParams();
  const appId = params.appId as string;
  const [to, setTo] = useState("");
  const [success, setSuccess] = useState(false);
  const sendMutation = useSendTestMessage(appId);

  const handleSend = useCallback(async () => {
    if (!phone || !to.trim()) return;
    await sendMutation.mutateAsync({ id: phone.id, to: to.trim() });
    setSuccess(true);
  }, [phone, to, sendMutation]);

  const handleClose = useCallback(() => {
    setTo("");
    setSuccess(false);
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={!!phone}
      onOpenChange={(v: boolean) => !v && handleClose()}
    >
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon>
                <Send className="size-5 text-[#25D366]" />
              </Modal.Icon>
              <Modal.Heading>{labels.sendTestTitle}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {success ? (
                <Alert status="success">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>{labels.sent}</Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted">{labels.sendTestDesc}</p>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">
                      {labels.recipientNumber}
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      placeholder={labels.recipientPlaceholder}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted/50 font-mono transition-colors focus:border-[#25D366]/50 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-default"
              >
                {success ? labels.close : labels.cancel}
              </button>
              {!success && (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!to.trim() || sendMutation.isPending}
                  className="rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#25D366]/90 disabled:opacity-50"
                >
                  {sendMutation.isPending ? labels.sending : labels.send}
                </button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function RegisterPhoneDialog({
  phone,
  onClose,
  labels,
}: {
  phone: PhoneNumber | null;
  onClose: () => void;
  labels: Record<string, string>;
}) {
  const params = useParams();
  const appId = params.appId as string;
  const [pin, setPin] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const registerMutation = useRegisterPhoneNumber(appId);

  const handleRegister = useCallback(async () => {
    if (!phone || pin.length !== 6) return;
    setError(null);
    try {
      await registerMutation.mutateAsync({ id: phone.id, pin });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || labels.registerError);
    }
  }, [phone, pin, registerMutation, labels]);

  const handleClose = useCallback(() => {
    setPin("");
    setSuccess(false);
    setError(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      isOpen={!!phone}
      onOpenChange={(v: boolean) => !v && handleClose()}
    >
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-md">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon>
                <KeyRound className="size-5 text-[#25D366]" />
              </Modal.Icon>
              <Modal.Heading>{labels.registerTitle}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {success ? (
                <Alert status="success">
                  <Alert.Indicator />
                  <Alert.Content>
                    <Alert.Description>
                      {labels.registerSuccess}
                    </Alert.Description>
                  </Alert.Content>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted">
                    {labels.registerDesc}
                  </p>
                  {phone && (
                    <div className="flex items-center gap-3 rounded-xl bg-default/30 px-4 py-3">
                      <Phone className="size-4 text-[#25D366]" />
                      <span
                        className="text-sm font-medium text-foreground font-mono"
                        dir="ltr"
                      >
                        {phone.displayPhoneNumber}
                      </span>
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-foreground">
                      {labels.pinLabel}
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      dir="ltr"
                      value={pin}
                      onChange={(e) =>
                        setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                      }
                      placeholder="000000"
                      className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-center text-sm text-foreground tracking-[0.5em] font-mono placeholder:text-muted/50 placeholder:tracking-[0.5em] transition-colors focus:border-[#25D366]/50 focus:outline-none"
                    />
                    <p className="mt-1.5 text-[11px] text-muted">
                      {labels.pinHint}
                    </p>
                  </div>
                  {error && (
                    <Alert status="danger">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Description>{error}</Alert.Description>
                      </Alert.Content>
                    </Alert>
                  )}
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-default"
              >
                {success ? labels.close : labels.cancel}
              </button>
              {!success && (
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={pin.length !== 6 || registerMutation.isPending}
                  className="rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#25D366]/90 disabled:opacity-50"
                >
                  {registerMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="size-3.5 animate-spin" />
                      {labels.registering}
                    </span>
                  ) : (
                    labels.register
                  )}
                </button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className={cn("text-sm font-semibold text-foreground", valueClassName)}>
        {value}
      </p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mt-2 animate-pulse sm:mt-10">
      <div className="mb-6 h-4 w-40 rounded bg-default/50" />
      <div className="rounded-3xl border border-border/30 bg-background p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-default/60" />
            <div className="space-y-2.5">
              <div className="h-6 w-52 rounded-lg bg-default/70" />
              <div className="h-4 w-36 rounded bg-default/45" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-28 rounded-full bg-default/50" />
            <div className="h-10 w-28 rounded-full bg-default/50" />
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl border border-border/30 bg-background"
          />
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="h-80 rounded-3xl border border-border/30 bg-background" />
        <div className="h-80 rounded-3xl border border-border/30 bg-background" />
      </div>
    </div>
  );
}

export default function PhoneNumberDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const appId = params.appId as string;
  const phoneNumberId = params.phoneNumberId as string;

  const { isLoading: authLoading } = useAuth();
  const { t, dir } = useLocale();
  const { data: phone, isLoading: phoneLoading } = usePhoneNumber(appId, phoneNumberId);
  const [testTarget, setTestTarget] = useState<PhoneNumber | null>(null);
  const [registerTarget, setRegisterTarget] = useState<PhoneNumber | null>(null);

  const raw = (t as any).whatsapp?.phoneNumbers as
    | Record<string, string>
    | undefined;
  const s = {
    detailsTitle: raw?.detailsTitle ?? "Phone Number Details",
    detailsSubtitle:
      raw?.detailsSubtitle ??
      "Review status, quality, business profile, and WhatsApp registration state.",
    back: raw?.backToPhoneNumbers ?? "Back to Phone Numbers",
    phoneNumber: raw?.phoneNumber ?? "Phone Number",
    quality: raw?.quality ?? "Quality",
    messagingLimit: raw?.messagingLimit ?? "Messaging Limit",
    status: raw?.status ?? "Status",
    pending: raw?.pending ?? "Pending",
    verified: raw?.verified ?? "Verified",
    active: raw?.active ?? "Active",
    disabled: raw?.disabled ?? "Disabled",
    banned: raw?.banned ?? "Banned",
    green: raw?.green ?? "Green",
    yellow: raw?.yellow ?? "Yellow",
    red: raw?.red ?? "Red",
    unknown: raw?.unknown ?? "Unknown",
    editProfile: raw?.editProfile ?? "Edit Profile",
    sendTest: raw?.sendTest ?? "Send Test",
    sendTestTitle: raw?.sendTestTitle ?? "Send Test Message",
    sendTestDesc:
      raw?.sendTestDesc ??
      "Send a hello_world template message to verify this number works.",
    recipientNumber: raw?.recipientNumber ?? "Recipient Number",
    recipientPlaceholder: raw?.recipientPlaceholder ?? "+964XXXXXXXXXX",
    sending: raw?.sending ?? "Sending...",
    send: raw?.send ?? "Send",
    sent: raw?.sent ?? "Test message sent!",
    cancel: raw?.cancel ?? "Cancel",
    close: raw?.close ?? "Close",
    register: raw?.register ?? "Register",
    registerTitle: raw?.registerTitle ?? "Register Phone Number",
    registerDesc:
      raw?.registerDesc ??
      "Register this phone number with WhatsApp Cloud API. You need to set a 6-digit PIN for two-step verification.",
    pinLabel: raw?.pinLabel ?? "6-Digit PIN",
    pinHint:
      raw?.pinHint ??
      "Choose a 6-digit PIN for two-step verification. Remember this PIN — you will need it if you re-register.",
    registering: raw?.registering ?? "Registering...",
    registerSuccess:
      raw?.registerSuccess ??
      "Phone number registered successfully! It is now active.",
    registerError:
      raw?.registerError ?? "Failed to register phone number.",
    notRegistered: raw?.notRegistered ?? "Not registered",
    notRegisteredDesc:
      raw?.notRegisteredDesc ??
      "This number must be registered before sending messages.",
    unnamed: raw?.unnamed ?? "Unnamed",
    approvedName: raw?.approvedName ?? "Approved Display Name",
    officialAccount:
      raw?.officialAccount ?? "Official Business Account",
    businessInfo: raw?.businessInfo ?? "Business Information",
    about: raw?.about ?? "About",
    description: raw?.description ?? "Description",
    address: raw?.address ?? "Address",
    email: raw?.email ?? "Email",
    website: raw?.website ?? "Website",
    categoryLabel: raw?.categoryLabel ?? "Category",
    identifiers: raw?.identifiers ?? "Identifiers",
    timeline: raw?.timeline ?? "Timeline",
    verification: raw?.verification ?? "Verification",
    phoneNumberIdLabel: raw?.phoneNumberIdLabel ?? "Phone Number ID",
    internalId: raw?.internalId ?? "Internal ID",
    createdAt: raw?.createdAt ?? "Created At",
    updatedAt: raw?.updatedAt ?? "Updated At",
    nameStatus: raw?.nameStatus ?? "Name Status",
    codeVerificationStatus:
      raw?.codeVerificationStatus ?? "Code Verification",
    noDescription: raw?.noDescription ?? "No description provided.",
    noAbout: raw?.noAbout ?? "No about text set yet.",
    noBusinessInfo:
      raw?.noBusinessInfo ?? "No business profile details are available yet.",
    notFound: raw?.notFound ?? "Phone number not found.",
    goBack: raw?.goBack ?? "Go Back",
    overview: raw?.overview ?? "Overview",
    activity: raw?.activity ?? "Activity",
  };

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  const goBack = useCallback(
    () => router.push(`/app/${appId}/whatsapp/phone-numbers`),
    [router, appId],
  );

  const openEdit = useCallback(() => {
    router.push(`/app/${appId}/whatsapp/phone-numbers/${phoneNumberId}/edit`);
  }, [router, appId, phoneNumberId]);

  if (authLoading || phoneLoading) {
    return <PageSkeleton />;
  }

  if (!phone) {
    return (
      <div className="mt-2 sm:mt-10">
        <button
          type="button"
          onClick={goBack}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <BackArrow className="size-4" />
          {s.back}
        </button>
        <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-border/40 bg-background px-6 py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-danger/10 ring-1 ring-danger/20">
            <Phone className="size-7 text-danger" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">
              {s.notFound}
            </p>
            <p className="mt-1.5 text-sm text-muted">
              {s.detailsTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={goBack}
            className="rounded-full bg-[#25D366] px-8 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#25D366]/90"
          >
            {s.goBack}
          </button>
        </div>
      </div>
    );
  }

  const qualityConfig = QUALITY_CONFIG[phone.qualityRating] ?? QUALITY_CONFIG.UNKNOWN;
  const statusConfig = STATUS_CONFIG[phone.status] ?? STATUS_CONFIG.PENDING;
  const qualityLabel =
    phone.qualityRating === "GREEN"
      ? s.green
      : phone.qualityRating === "YELLOW"
        ? s.yellow
        : phone.qualityRating === "RED"
          ? s.red
          : s.unknown;
  const statusLabel =
    phone.status === "ACTIVE"
      ? s.active
      : phone.status === "VERIFIED"
        ? s.verified
        : phone.status === "PENDING"
          ? s.pending
          : phone.status === "DISABLED"
            ? s.disabled
            : s.banned;
  const needsRegistration =
    phone.status === "PENDING" || phone.status === "VERIFIED";

  const businessItems = [
    {
      icon: FileText,
      label: s.about,
      value: phone.aboutText || s.noAbout,
    },
    {
      icon: FileText,
      label: s.description,
      value: phone.description || s.noDescription,
    },
    {
      icon: MapPin,
      label: s.address,
      value: phone.address || "—",
    },
    {
      icon: Mail,
      label: s.email,
      value: phone.email || "—",
      dir: "ltr" as const,
    },
    {
      icon: Globe,
      label: s.website,
      value: phone.websites?.length ? phone.websites.join("\n") : "—",
      dir: "ltr" as const,
    },
    {
      icon: FileText,
      label: s.categoryLabel,
      value: phone.category || "—",
    },
  ].filter((item) => item.value && item.value !== "—");

  return (
    <>
      <div className="mt-2 sm:mt-10">
        <button
          type="button"
          onClick={goBack}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          <BackArrow className="size-4" />
          {s.back}
        </button>

        <section className="overflow-hidden rounded-[28px] border border-border/50 bg-background shadow-sm">
          <div
            className={cn(
              "h-1.5 w-full",
              phone.status === "ACTIVE"
                ? "bg-[#25D366]"
                : phone.status === "VERIFIED"
                  ? "bg-accent"
                  : phone.status === "PENDING"
                    ? "bg-warning"
                    : phone.status === "BANNED"
                      ? "bg-danger"
                      : "bg-border",
            )}
          />
          <div className="p-6 sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <Avatar className="size-16 shrink-0 ring-2 ring-[#25D366]/20">
                  {phone.profilePictureUrl ? (
                    <Avatar.Image
                      src={phone.profilePictureUrl}
                      alt={phone.verifiedName || ""}
                    />
                  ) : null}
                  <Avatar.Fallback className="bg-[#25D366]/10 text-[#25D366] text-sm font-bold">
                    <Phone className="size-6" />
                  </Avatar.Fallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {phone.verifiedName || s.unnamed}
                    </h1>
                    {phone.nameStatus === "APPROVED" && (
                      <Tooltip>
                        <Tooltip.Trigger>
                          <BadgeCheck className="size-4 shrink-0 text-[#25D366]" />
                        </Tooltip.Trigger>
                        <Tooltip.Content>{s.approvedName}</Tooltip.Content>
                      </Tooltip>
                    )}
                    {phone.isOfficialBusinessAccount && (
                      <Tooltip>
                        <Tooltip.Trigger>
                          <ShieldCheck className="size-4 shrink-0 text-blue-500" />
                        </Tooltip.Trigger>
                        <Tooltip.Content>{s.officialAccount}</Tooltip.Content>
                      </Tooltip>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-mono text-muted" dir="ltr">
                    {phone.displayPhoneNumber}
                  </p>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                    {phone.aboutText || s.detailsSubtitle}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1",
                        statusConfig.bg,
                        statusConfig.color,
                        statusConfig.ring,
                      )}
                    >
                      <Circle className="size-1.5 fill-current" />
                      {statusLabel}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1",
                        qualityConfig.bg,
                        qualityConfig.color,
                        qualityConfig.ring,
                      )}
                    >
                      <Signal className="size-3" />
                      {qualityLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/8 px-3 py-1 text-xs font-medium text-accent/80 ring-1 ring-accent/10">
                      <MessageCircle className="size-3" />
                      {LIMIT_LABELS[phone.messagingLimit] ?? phone.messagingLimit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                {needsRegistration && (
                  <button
                    type="button"
                    onClick={() => setRegisterTarget(phone)}
                    className="inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-2 text-sm font-medium text-warning transition-colors hover:bg-warning/15"
                  >
                    <KeyRound className="size-4" />
                    {s.register}
                  </button>
                )}
                {phone.status === "ACTIVE" && (
                  <button
                    type="button"
                    onClick={() => setTestTarget(phone)}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-default"
                  >
                    <Send className="size-4" />
                    {s.sendTest}
                  </button>
                )}
                <button
                  type="button"
                  onClick={openEdit}
                  className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#25D366]/90"
                >
                  <Edit3 className="size-4" />
                  {s.editProfile}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <InfoCard
            icon={Signal}
            label={s.quality}
            value={qualityLabel}
            valueClassName={qualityConfig.color}
          />
          <InfoCard
            icon={MessageCircle}
            label={s.messagingLimit}
            value={LIMIT_LABELS[phone.messagingLimit] ?? phone.messagingLimit}
          />
          <InfoCard
            icon={KeyRound}
            label={s.codeVerificationStatus}
            value={phone.codeVerificationStatus || s.pending}
          />
        </section>

        {needsRegistration && (
          <section className="mt-6 rounded-2xl border border-warning/20 bg-warning/10 p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {s.notRegistered}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {s.notRegisteredDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRegisterTarget(phone)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#25D366]/90"
              >
                <KeyRound className="size-4" />
                {s.register}
              </button>
            </div>
          </section>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
          <section className="rounded-3xl border border-border/50 bg-background p-6">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-[#25D366]/10">
                <FileText className="size-4 text-[#25D366]" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  {s.businessInfo}
                </h2>
                <p className="text-sm text-muted">{s.overview}</p>
              </div>
            </div>

            {businessItems.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {businessItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-default/25 px-4 py-3"
                  >
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                      <item.icon className="size-3.5" />
                      {item.label}
                    </div>
                    <p
                      className="whitespace-pre-line break-words text-sm leading-6 text-foreground"
                      dir={item.dir}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-default/20 px-4 py-6 text-sm text-muted">
                {s.noBusinessInfo}
              </div>
            )}
          </section>

          <div className="space-y-6">
            <section className="rounded-3xl border border-border/50 bg-background p-6">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-[#25D366]/10">
                  <Hash className="size-4 text-[#25D366]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {s.identifiers}
                  </h2>
                  <p className="text-sm text-muted">{s.verification}</p>
                </div>
              </div>

              <div className="space-y-3">
                <InfoCard
                  icon={Hash}
                  label={s.phoneNumberIdLabel}
                  value={phone.phoneNumberId}
                  valueClassName="font-mono text-xs sm:text-sm"
                />
                <InfoCard
                  icon={Phone}
                  label={s.phoneNumber}
                  value={phone.displayPhoneNumber}
                  valueClassName="font-mono"
                />
                <InfoCard
                  icon={Hash}
                  label={s.internalId}
                  value={phone.id}
                  valueClassName="font-mono text-xs sm:text-sm"
                />
                <InfoCard
                  icon={BadgeCheck}
                  label={s.nameStatus}
                  value={phone.nameStatus || s.unknown}
                />
              </div>
            </section>

            <section className="rounded-3xl border border-border/50 bg-background p-6">
              <div className="mb-5 flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-[#25D366]/10">
                  <Clock3 className="size-4 text-[#25D366]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {s.timeline}
                  </h2>
                  <p className="text-sm text-muted">{s.activity}</p>
                </div>
              </div>

              <div className="space-y-3">
                <InfoCard
                  icon={Calendar}
                  label={s.createdAt}
                  value={formatDate(phone.createdAt)}
                />
                <InfoCard
                  icon={Clock3}
                  label={s.updatedAt}
                  value={formatDate(phone.updatedAt)}
                />
                <InfoCard
                  icon={Circle}
                  label={s.status}
                  value={statusLabel}
                  valueClassName={statusConfig.color}
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      <SendTestDialog
        phone={testTarget}
        onClose={() => setTestTarget(null)}
        labels={s}
      />
      <RegisterPhoneDialog
        phone={registerTarget}
        onClose={() => setRegisterTarget(null)}
        labels={s}
      />
    </>
  );
}