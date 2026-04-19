"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Alert, Avatar, Separator } from "@heroui/react";
import {
  ArrowLeft,
  ArrowRight,
  Phone,
  Pencil,
  FileText,
  MapPin,
  Mail,
  Globe,
  Plus,
  Trash2,
  BadgeCheck,
  Info,
  Loader2,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";
import {
  usePhoneNumber,
  useUpdatePhoneProfile,
} from "@/lib/hooks/use-whatsapp";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EditPhoneProfilePage() {
  const router = useRouter();
  const params = useParams();
  const appId = params.appId as string;
  const phoneNumberId = params.phoneNumberId as string;

  const { isLoading: authLoading } = useAuth();
  const { t, dir } = useLocale();

  const raw = (t as any).whatsapp?.phoneNumbers as
    | Record<string, string>
    | undefined;
  const s = {
    editProfileTitle: raw?.editProfileTitle ?? "Edit Phone Profile",
    editProfileDesc:
      raw?.editProfileDesc ??
      "Changes are sent directly to WhatsApp. They may take a few minutes to reflect.",
    back: raw?.backToPhoneNumbers ?? "Back to Phone Numbers",
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
    businessInfo: raw?.businessInfo ?? "Business Information",
    optional: raw?.optional ?? "Optional",
    save: raw?.save ?? "Save Changes",
    saving: raw?.saving ?? "Saving...",
    saveError: raw?.saveError ?? "Failed to save changes.",
    profileUpdated:
      raw?.profileUpdated ?? "Profile updated successfully!",
    cancel: raw?.cancel ?? "Cancel",
    notFound: raw?.notFound ?? "Phone number not found.",
    goBack: raw?.goBack ?? "Go Back",
  };

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  const { data: phone, isLoading: phoneLoading } = usePhoneNumber(appId, phoneNumberId);
  const updateMutation = useUpdatePhoneProfile(appId);

  /* ── Form state ── */
  const [about, setAbout] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [websites, setWebsites] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  /* ── Populate form when phone loads ── */
  useEffect(() => {
    if (phone && !initialized) {
      setAbout(phone.aboutText ?? "");
      setDescription(phone.description ?? "");
      setAddress(phone.address ?? "");
      setEmail(phone.email ?? "");
      setWebsites(phone.websites?.length ? [...phone.websites] : [""]);
      setInitialized(true);
    }
  }, [phone, initialized]);

  const goBack = useCallback(
    () => router.push(`/app/${appId}/whatsapp/phone-numbers`),
    [router, appId],
  );

  const handleSave = useCallback(async () => {
    if (!phone) return;
    setError(null);
    try {
      const filteredWebsites = websites.filter((w) => w.trim());
      await updateMutation.mutateAsync({
        id: phone.id,
        profile: {
          about: about.trim() || undefined,
          description: description.trim() || undefined,
          address: address.trim() || undefined,
          email: email.trim() || undefined,
          websites: filteredWebsites.length ? filteredWebsites : undefined,
        },
      });
      goBack();
    } catch (err: any) {
      setError(err?.message || s.saveError);
    }
  }, [
    phone,
    about,
    description,
    address,
    email,
    websites,
    updateMutation,
    s,
    goBack,
  ]);

  const addWebsite = () => {
    if (websites.length < 2) setWebsites([...websites, ""]);
  };

  const removeWebsite = (index: number) => {
    setWebsites(websites.filter((_, i) => i !== index));
  };

  const updateWebsite = (index: number, value: string) => {
    const updated = [...websites];
    updated[index] = value;
    setWebsites(updated);
  };

  /* ── Loading skeleton ── */
  if (authLoading || phoneLoading) {
    return (
      <div className="mt-2 sm:mt-10 max-w-2xl mx-auto animate-pulse">
        <div className="mb-8">
          <div className="h-4 w-32 rounded bg-default/60 mb-4" />
          <div className="h-7 w-48 rounded-lg bg-default/70 mb-2" />
          <div className="h-4 w-72 rounded bg-default/50" />
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border/30 bg-background p-5"
            >
              <div className="h-5 w-24 rounded bg-default/60 mb-4" />
              <div className="h-10 w-full rounded-lg bg-default/40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!phone) {
    return (
      <div className="mt-2 sm:mt-10 max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-danger/10 ring-1 ring-danger/20">
            <Phone className="size-7 text-danger" />
          </div>
          <p className="text-base font-semibold text-foreground">
            {s.notFound}
          </p>
          <button
            type="button"
            onClick={goBack}
            className="rounded-full bg-[#25D366] px-8 py-2.5 text-sm font-medium text-white hover:bg-[#25D366]/90 transition-colors"
          >
            {s.goBack}
          </button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  Form view                                                        */
  /* ================================================================ */
  return (
    <div className="mt-2 sm:mt-10 max-w-2xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-8">
        <button
          type="button"
          onClick={goBack}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4"
        >
          <BackArrow className="size-4" />
          {s.back}
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          {s.editProfileTitle}
        </h1>
        <p className="text-sm text-muted mt-1">{s.editProfileDesc}</p>
      </div>

      {/* ── Error ── */}
      {error && (
        <Alert status="danger" className="mb-6">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="space-y-6">
        {/* ─────────────── Read-only phone info ─────────────── */}
        <section>
          <div className="rounded-2xl border border-border/50 bg-background p-5">
            <div className="flex items-center gap-3.5">
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
                  <span className="text-sm font-bold text-foreground truncate">
                    {phone.verifiedName || "—"}
                  </span>
                  {phone.nameStatus === "APPROVED" && (
                    <BadgeCheck className="size-3.5 text-[#25D366] shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted font-mono" dir="ltr">
                  {phone.displayPhoneNumber}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted mt-3">
              <Info className="size-3 shrink-0" />
              <span>{s.editProfileDesc}</span>
            </div>
          </div>
        </section>

        {/* ─────────────── About ─────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex size-7 items-center justify-center rounded-lg bg-[#25D366]/10">
              <Pencil className="size-3.5 text-[#25D366]" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              {s.about}
            </h2>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background p-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-foreground">
                {s.about}
              </label>
              <span
                className={cn(
                  "text-[10px] font-mono tabular-nums",
                  about.length > 256 ? "text-danger" : "text-muted",
                )}
              >
                {about.length}/256
              </span>
            </div>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value.slice(0, 256))}
              rows={2}
              placeholder={s.aboutPlaceholder}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-[#25D366]/50 transition-colors resize-none"
            />
          </div>
        </section>

        {/* ─────────────── Business Information ─────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex size-7 items-center justify-center rounded-lg bg-[#25D366]/10">
              <FileText className="size-3.5 text-[#25D366]" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              {s.businessInfo}
            </h2>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background p-5 space-y-5">
            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-foreground">
                  {s.description}{" "}
                  <span className="text-muted font-normal">
                    · {s.optional}
                  </span>
                </label>
                <span
                  className={cn(
                    "text-[10px] font-mono tabular-nums",
                    description.length > 512
                      ? "text-danger"
                      : "text-muted",
                  )}
                >
                  {description.length}/512
                </span>
              </div>
              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value.slice(0, 512))
                }
                rows={3}
                placeholder={s.descriptionPlaceholder}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-[#25D366]/50 transition-colors resize-none"
              />
            </div>

            <Separator />

            {/* Address */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <MapPin className="size-3 text-muted" />
                  {s.address}{" "}
                  <span className="text-muted font-normal">
                    · {s.optional}
                  </span>
                </label>
                <span
                  className={cn(
                    "text-[10px] font-mono tabular-nums",
                    address.length > 256 ? "text-danger" : "text-muted",
                  )}
                >
                  {address.length}/256
                </span>
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) =>
                  setAddress(e.target.value.slice(0, 256))
                }
                placeholder={s.addressPlaceholder}
                className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-[#25D366]/50 transition-colors"
              />
            </div>

            <Separator />

            {/* Email */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Mail className="size-3 text-muted" />
                  {s.email}{" "}
                  <span className="text-muted font-normal">
                    · {s.optional}
                  </span>
                </label>
                <span
                  className={cn(
                    "text-[10px] font-mono tabular-nums",
                    email.length > 128 ? "text-danger" : "text-muted",
                  )}
                >
                  {email.length}/128
                </span>
              </div>
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value.slice(0, 128))
                }
                placeholder={s.emailPlaceholder}
                className="h-10 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-[#25D366]/50 transition-colors"
              />
            </div>

            <Separator />

            {/* Websites */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Globe className="size-3 text-muted" />
                  {s.website}{" "}
                  <span className="text-muted font-normal">
                    · {s.optional}
                  </span>
                </label>
              </div>
              <div className="space-y-2">
                {websites.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="url"
                      dir="ltr"
                      value={url}
                      onChange={(e) =>
                        updateWebsite(i, e.target.value.slice(0, 256))
                      }
                      placeholder="https://example.com"
                      className="h-10 flex-1 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted/50 focus:outline-none focus:border-[#25D366]/50 transition-colors"
                    />
                    <span
                      className={cn(
                        "text-[10px] font-mono tabular-nums shrink-0 w-12 text-end",
                        url.length > 256 ? "text-danger" : "text-muted",
                      )}
                    >
                      {url.length}/256
                    </span>
                    {websites.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeWebsite(i)}
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {websites.length < 2 && (
                  <button
                    type="button"
                    onClick={addWebsite}
                    className="flex items-center gap-1.5 text-xs font-medium text-[#25D366] hover:text-[#25D366]/80 transition-colors mt-1"
                  >
                    <Plus className="size-3.5" />
                    {s.addWebsite}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── Sticky Footer ── */}
      <div className="sticky bottom-0 z-20 -mx-3 sm:-mx-4 md:-mx-6 mt-6 bg-surface/90 backdrop-blur-xl border-t border-border/30">
        <div className="flex items-center justify-end gap-3 px-3 py-3 sm:px-4 md:px-6">
          <button
            type="button"
            onClick={goBack}
            className="rounded-full border border-border px-6 py-2 text-sm font-medium text-foreground hover:bg-default transition-colors"
          >
            {s.cancel}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="rounded-full bg-[#25D366] px-8 py-2.5 text-sm font-medium text-white hover:bg-[#25D366]/90 transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin" />
                {s.saving}
              </span>
            ) : (
              s.save
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
