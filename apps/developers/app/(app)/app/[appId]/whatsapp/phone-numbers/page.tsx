"use client";

import { useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Modal,
  Tooltip,
  Dropdown,
  Alert,
  Label,
  Avatar,
} from "@heroui/react";
import {
  Phone,
  MoreHorizontal,
  Pencil,
  Send,
  Circle,
  Clock,
  Signal,
  MessageCircle,
  Hash,
  Loader2,
  KeyRound,
  AlertTriangle,
  Globe,
  Mail,
  MapPin,
  FileText,
  ShieldCheck,
  BadgeCheck,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";
import {
  usePhoneNumbers,
  useSendTestMessage,
  useRegisterPhoneNumber,
} from "@/lib/hooks/use-whatsapp";
import type {
  PhoneNumber,
  PhoneQuality,
  PhoneStatus,
} from "@/lib/api/whatsapp";
import { cn } from "@/lib/utils";

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

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between pb-5">
        <div className="space-y-2.5">
          <div className="h-7 w-44 rounded-lg bg-default/80" />
          <div className="h-4 w-64 rounded-lg bg-default/50" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 mt-6">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/30 bg-background p-6"
          >
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-full bg-default/70" />
              <div className="flex-1 space-y-2.5">
                <div className="h-5 w-40 rounded-lg bg-default/70" />
                <div className="h-3 w-28 rounded bg-default/40" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <div className="h-6 w-18 rounded-full bg-default/50" />
              <div className="h-6 w-24 rounded-full bg-default/50" />
              <div className="h-6 w-20 rounded-full bg-default/50" />
            </div>
            <div className="grid grid-cols-2 gap-2.5 mt-4">
              <div className="h-14 rounded-xl bg-default/30" />
              <div className="h-14 rounded-xl bg-default/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Send Test Dialog                                                   */
/* ------------------------------------------------------------------ */

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
                    <label className="block text-xs font-medium text-foreground mb-1.5">
                      {labels.recipientNumber}
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      placeholder={labels.recipientPlaceholder}
                      className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-[#25D366]/50 transition-colors font-mono"
                    />
                  </div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-default transition-colors"
              >
                {success ? labels.close : labels.cancel}
              </button>
              {!success && (
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!to.trim() || sendMutation.isPending}
                  className="rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#25D366]/90 transition-colors disabled:opacity-50"
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

/* ------------------------------------------------------------------ */
/*  Register Phone Dialog                                              */
/* ------------------------------------------------------------------ */

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
                  <p className="text-sm text-muted leading-relaxed">
                    {labels.registerDesc}
                  </p>
                  {phone && (
                    <div className="rounded-xl bg-default/30 px-4 py-3 flex items-center gap-3">
                      <Phone className="size-4 text-[#25D366]" />
                      <span
                        className="text-sm font-mono font-medium text-foreground"
                        dir="ltr"
                      >
                        {phone.displayPhoneNumber}
                      </span>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1.5">
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
                      className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground text-center tracking-[0.5em] font-mono placeholder:text-muted/50 placeholder:tracking-[0.5em] focus:outline-none focus:border-[#25D366]/50 transition-colors"
                    />
                    <p className="text-[11px] text-muted mt-1.5">
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
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-default transition-colors"
              >
                {success ? labels.close : labels.cancel}
              </button>
              {!success && (
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={pin.length !== 6 || registerMutation.isPending}
                  className="rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#25D366]/90 transition-colors disabled:opacity-50"
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



/* ------------------------------------------------------------------ */
/*  Phone Number Card                                                  */
/* ------------------------------------------------------------------ */

function PhoneCard({
  phone,
  labels,
  onOpenDetails,
  onSendTest,
  onEditProfile,
  onRegister,
}: {
  phone: PhoneNumber;
  labels: Record<string, string>;
  onOpenDetails: (phone: PhoneNumber) => void;
  onSendTest: (phone: PhoneNumber) => void;
  onEditProfile: (phone: PhoneNumber) => void;
  onRegister: (phone: PhoneNumber) => void;
}) {
  const qc = QUALITY_CONFIG[phone.qualityRating] ?? QUALITY_CONFIG.UNKNOWN;
  const sc = STATUS_CONFIG[phone.status] ?? STATUS_CONFIG.PENDING;

  const qualityLabel =
    phone.qualityRating === "GREEN"
      ? labels.green
      : phone.qualityRating === "YELLOW"
        ? labels.yellow
        : phone.qualityRating === "RED"
          ? labels.red
          : labels.unknown;

  const statusLabel =
    phone.status === "ACTIVE"
      ? labels.active
      : phone.status === "VERIFIED"
        ? labels.verified
        : phone.status === "PENDING"
          ? labels.pending
          : phone.status === "DISABLED"
            ? labels.disabled
            : labels.banned;

  const needsRegistration =
    phone.status === "PENDING" || phone.status === "VERIFIED";

  // Gather info-grid items dynamically
  const infoItems: { icon: typeof Mail; label: string; value: string; dir?: string }[] = [];
  if (phone.email)
    infoItems.push({ icon: Mail, label: labels.email, value: phone.email, dir: "ltr" });
  if (phone.address)
    infoItems.push({ icon: MapPin, label: labels.address, value: phone.address });
  if (phone.websites?.length)
    infoItems.push({ icon: Globe, label: labels.website, value: phone.websites[0], dir: "ltr" });
  if (phone.category)
    infoItems.push({ icon: FileText, label: labels.categoryLabel, value: phone.category });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(phone)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails(phone);
        }
      }}
      className="group overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
    >


      <div className="p-5 space-y-4">
        {/* ── Header: Avatar + Name + Number + Actions ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <Avatar className="size-12 shrink-0 ring-2 ring-[#25D366]/20">
              {phone.profilePictureUrl ? (
                <Avatar.Image
                  src={phone.profilePictureUrl}
                  alt={phone.verifiedName || ""}
                />
              ) : null}
              <Avatar.Fallback className="bg-[#25D366]/10 text-[#25D366] text-sm font-bold">
                <Phone className="size-5" />
              </Avatar.Fallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-foreground truncate">
                  {phone.verifiedName || labels.unnamed}
                </h3>
                {phone.nameStatus === "APPROVED" && (
                  <Tooltip>
                    <Tooltip.Trigger>
                      <BadgeCheck className="size-4 text-[#25D366] shrink-0" />
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      {labels.approvedName}
                    </Tooltip.Content>
                  </Tooltip>
                )}
                {phone.isOfficialBusinessAccount && (
                  <Tooltip>
                    <Tooltip.Trigger>
                      <ShieldCheck className="size-4 text-blue-500 shrink-0" />
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      {labels.officialAccount}
                    </Tooltip.Content>
                  </Tooltip>
                )}
              </div>
              <p
                className="text-[12px] text-muted font-mono mt-0.5"
                dir="ltr"
              >
                {phone.displayPhoneNumber}
              </p>
            </div>
          </div>

          {/* Actions dropdown */}
          <Dropdown>
            <Dropdown.Trigger>
              <div
                role="button"
                tabIndex={0}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-default hover:text-foreground transition-colors cursor-pointer"
              >
                <MoreHorizontal className="size-4" />
              </div>
            </Dropdown.Trigger>
            <Dropdown.Popover
              placement="bottom end"
              className="min-w-[160px] rounded-xl"
            >
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === "edit") onEditProfile(phone);
                  if (key === "test") onSendTest(phone);
                  if (key === "register") onRegister(phone);
                }}
              >
                {needsRegistration && (
                  <Dropdown.Item id="register" textValue={labels.register}>
                    <KeyRound className="size-4" />
                    <Label>{labels.register}</Label>
                  </Dropdown.Item>
                )}
                <Dropdown.Item id="edit" textValue={labels.editProfile}>
                  <Pencil className="size-4" />
                  <Label>{labels.editProfile}</Label>
                </Dropdown.Item>
                {phone.status === "ACTIVE" && (
                  <Dropdown.Item id="test" textValue={labels.sendTest}>
                    <Send className="size-4" />
                    <Label>{labels.sendTest}</Label>
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        {/* ── About ── */}
        {phone.aboutText && (
          <p className="text-xs text-muted/80 leading-relaxed line-clamp-2">
            {phone.aboutText}
          </p>
        )}

        {/* ── Description (if present, truncated) ── */}
        {phone.description && (
          <p className="text-[11px] text-muted/60 leading-relaxed line-clamp-1">
            {phone.description}
          </p>
        )}

        {/* ── Badges row ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
              sc.bg,
              sc.color,
              sc.ring,
            )}
          >
            <Circle className="size-1.5 fill-current" />
            {statusLabel}
          </span>
          <Tooltip>
            <Tooltip.Trigger>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 cursor-default",
                  qc.bg,
                  qc.color,
                  qc.ring,
                )}
              >
                <Signal className="size-3" />
                {qualityLabel}
              </span>
            </Tooltip.Trigger>
            <Tooltip.Content>
              {labels.quality}: {qualityLabel}
            </Tooltip.Content>
          </Tooltip>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/8 px-2.5 py-0.5 text-[11px] font-medium text-accent/80 ring-1 ring-accent/10">
            <MessageCircle className="size-3" />
            {LIMIT_LABELS[phone.messagingLimit] ?? phone.messagingLimit}
          </span>
        </div>

        {/* ── Info grid ── */}
        {infoItems.length > 0 && (
          <div className="grid grid-cols-2 gap-2.5">
            {infoItems.map((item, i) => (
              <div
                key={i}
                className="rounded-xl bg-default/30 px-3 py-2.5"
              >
                <div className="flex items-center gap-1.5 text-[10px] text-muted mb-0.5">
                  <item.icon className="size-3" />
                  {item.label}
                </div>
                <p
                  className="text-xs font-medium text-foreground truncate"
                  dir={item.dir}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Registration banner ── */}
        {needsRegistration && (
          <div className="flex items-center gap-3 rounded-xl bg-warning/10 border border-warning/20 px-4 py-3">
            <AlertTriangle className="size-4 text-warning shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">
                {labels.notRegistered}
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                {labels.notRegisteredDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onRegister(phone);
              }}
              className="shrink-0 rounded-lg bg-[#25D366] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#25D366]/90 transition-colors"
            >
              {labels.register}
            </button>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-border/50 bg-default/20 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-muted font-medium">
          <Clock className="size-3" />
          {formatDate(phone.createdAt)}
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-1.5 text-[11px] text-muted font-mono"
            dir="ltr"
          >
            <Hash className="size-3" />
            {phone.phoneNumberId}
          </div>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onEditProfile(phone);
            }}
            className="flex items-center gap-1 text-[11px] font-medium text-[#25D366] hover:text-[#25D366]/80 transition-colors"
          >
            <Pencil className="size-3" />
            {labels.editProfile}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty                                                              */
/* ------------------------------------------------------------------ */

function EmptyState({ labels }: { labels: Record<string, string> }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-[#25D366]/10 ring-1 ring-[#25D366]/20">
        <Phone className="size-7 text-[#25D366]" />
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">
          {labels.noNumbers}
        </p>
        <p className="text-sm text-muted mt-1.5 max-w-sm leading-relaxed">
          {labels.noNumbersDesc}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PhoneNumbersPage() {
  const { isLoading: authLoading } = useAuth();
  const { t } = useLocale();
  const params = useParams();
  const appId = params.appId as string;

  const raw = (t as any).whatsapp?.phoneNumbers as
    | Record<string, string>
    | undefined;
  const s = {
    title: raw?.title ?? "Phone Numbers",
    subtitle:
      raw?.subtitle ?? "Manage your WhatsApp phone numbers and profiles",
    noNumbers: raw?.noNumbers ?? "No phone numbers",
    noNumbersDesc:
      raw?.noNumbersDesc ??
      "Connect a WhatsApp Business Account to see your phone numbers here.",
    phoneNumber: raw?.phoneNumber ?? "Phone Number",
    verifiedName: raw?.verifiedName ?? "Verified Name",
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
    editProfileTitle: raw?.editProfileTitle ?? "Edit Phone Profile",
    editProfileDesc:
      raw?.editProfileDesc ??
      "Changes are sent directly to WhatsApp. They may take a few minutes to reflect.",
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
    about: raw?.about ?? "About",
    aboutPlaceholder:
      raw?.aboutPlaceholder ?? "Tell people about your business...",
    address: raw?.address ?? "Address",
    addressPlaceholder: raw?.addressPlaceholder ?? "Business address",
    description: raw?.description ?? "Description",
    descriptionPlaceholder:
      raw?.descriptionPlaceholder ?? "Describe your business...",
    email: raw?.email ?? "Email",
    emailPlaceholder: raw?.emailPlaceholder ?? "contact@example.com",
    website: raw?.website ?? "Website",
    addWebsite: raw?.addWebsite ?? "+ Add Website",
    profilePicture: raw?.profilePicture ?? "Profile Picture",
    profilePicturePlaceholder:
      raw?.profilePicturePlaceholder ?? "https://example.com/logo.png",
    profilePictureHint:
      raw?.profilePictureHint ??
      "Public URL of your business logo or profile picture",
    businessInfo: raw?.businessInfo ?? "Business Information",
    optional: raw?.optional ?? "Optional",
    save: raw?.save ?? "Save",
    saving: raw?.saving ?? "Saving...",
    saveError: raw?.saveError ?? "Failed to save changes.",
    profileUpdated:
      raw?.profileUpdated ?? "Profile updated successfully!",
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
    categoryLabel: raw?.categoryLabel ?? "Category",
  };

  const { data: phones, isLoading: phonesLoading } = usePhoneNumbers(appId);
  const router = useRouter();
  const [testTarget, setTestTarget] = useState<PhoneNumber | null>(null);
  const [registerTarget, setRegisterTarget] = useState<PhoneNumber | null>(
    null,
  );

  const handleEditProfile = useCallback(
    (phone: PhoneNumber) => {
      router.push(`/app/${appId}/whatsapp/phone-numbers/${phone.phoneNumberId}/edit`);
    },
    [router, appId],
  );

  const handleOpenDetails = useCallback(
    (phone: PhoneNumber) => {
      router.push(`/app/${appId}/whatsapp/phone-numbers/${phone.phoneNumberId}`);
    },
    [router, appId],
  );

  if (authLoading || phonesLoading) {
    return (
      <div className="mt-2 sm:mt-10">
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="mt-2 sm:mt-10">
      {/* ── Header ── */}
      <div className="pb-4 pt-2 border-b border-border/20 -mx-3 px-3 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#25D366]/10">
            <Phone className="size-4 text-[#25D366]" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {s.title}
            </h1>
            <p className="text-sm text-muted mt-0.5">{s.subtitle}</p>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {!phones?.length ? (
        <EmptyState labels={s} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 mt-6">
          {phones.map((phone) => (
            <PhoneCard
              key={phone.id}
              phone={phone}
              labels={s}
              onOpenDetails={handleOpenDetails}
              onSendTest={setTestTarget}
              onEditProfile={handleEditProfile}
              onRegister={setRegisterTarget}
            />
          ))}
        </div>
      )}

      {/* ── Dialogs ── */}
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
    </div>
  );
}
