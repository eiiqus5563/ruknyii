"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";
import { useCreateApp, useSendAppOtp, useVerifyAppOtp } from "@/lib/hooks/use-apps";
import type { AppType } from "@/lib/api/apps";
import {
  TextField,
  Label,
  Input,
  Button,
  Spinner,
  InputOTP,
} from "@heroui/react";
import {
  Sparkles,
  LogOut,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Users,
  Package,
  ShieldCheck,
  Mail,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ================================================================ */
/*  Types                                                            */
/* ================================================================ */

type Step = 1 | 2 | 3 | 4;

interface WizardData {
  name: string;
  contactEmail: string;
  appType: AppType;
  phoneNumber: string;
  otpCode: string;
}

/* ================================================================ */
/*  Step  indicator                                                  */
/* ================================================================ */

function StepIndicator({
  currentStep,
  labels,
}: {
  currentStep: Step;
  labels: Record<string, string>;
}) {
  const steps = [
    { num: 1, label: labels.step1Title },
    { num: 2, label: labels.step2Title },
    { num: 3, label: labels.step3Title },
    { num: 4, label: labels.step4Title },
  ];

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-7 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300",
              step.num < currentStep
                ? "bg-success text-success-foreground"
                : step.num === currentStep
                  ? "bg-accent text-accent-foreground"
                  : "bg-default/60 text-muted",
            )}
          >
            {step.num < currentStep ? <Check className="size-3.5" /> : step.num}
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                "h-px w-6 sm:w-10 transition-colors duration-300",
                step.num < currentStep ? "bg-success" : "bg-border/50",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ================================================================ */
/*  Step 1 — App Details                                             */
/* ================================================================ */

function Step1AppDetails({
  data,
  onChange,
  labels,
}: {
  data: WizardData;
  onChange: (d: Partial<WizardData>) => void;
  labels: Record<string, string>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">{labels.step1Title}</h2>
        <p className="text-xs text-muted mt-1">{labels.step1Desc}</p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-surface p-5 space-y-4">
        <TextField isRequired>
          <Label className="text-xs font-medium text-foreground">{labels.appName}</Label>
          <Input
            placeholder={labels.appNamePlaceholder}
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="rounded-xl"
            autoFocus
          />
        </TextField>
        <p className="text-[11px] text-muted -mt-2">{labels.appNameHint}</p>

        <TextField isRequired>
          <Label className="text-xs font-medium text-foreground">{labels.contactEmail}</Label>
          <Input
            type="email"
            placeholder={labels.contactEmailPlaceholder}
            value={data.contactEmail}
            onChange={(e) => onChange({ contactEmail: e.target.value })}
            className="rounded-xl"
          />
        </TextField>
        <p className="text-[11px] text-muted -mt-2">{labels.contactEmailHint}</p>
      </div>
    </div>
  );
}

/* ================================================================ */
/*  Step 2 — Use Cases                                               */
/* ================================================================ */

function Step2UseCases({ labels }: { labels: Record<string, string> }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">{labels.step2Title}</h2>
        <p className="text-xs text-muted mt-1">{labels.step2Desc}</p>
      </div>

      <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10">
            <Package className="size-5 text-accent" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{labels.useCaseOther}</h3>
              <div className="flex size-5 items-center justify-center rounded-full bg-accent">
                <Check className="size-3 text-accent-foreground" />
              </div>
            </div>
            <p className="text-xs text-muted mt-1">{labels.useCaseOtherDesc}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-default/40 px-4 py-3">
        <p className="text-xs text-muted text-center">{labels.moreUseCasesSoon}</p>
      </div>
    </div>
  );
}

/* ================================================================ */
/*  Step 3 — App Type                                                */
/* ================================================================ */

function Step3AppType({
  data,
  onChange,
  labels,
}: {
  data: WizardData;
  onChange: (d: Partial<WizardData>) => void;
  labels: Record<string, string>;
}) {
  const types: { value: AppType; icon: typeof Building2; title: string; desc: string }[] = [
    {
      value: "BUSINESS",
      icon: Building2,
      title: labels.typeBusiness,
      desc: labels.typeBusinessDesc,
    },
    {
      value: "CONSUMER",
      icon: Users,
      title: labels.typeConsumer,
      desc: labels.typeConsumerDesc,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">{labels.step3Title}</h2>
        <p className="text-xs text-muted mt-1">{labels.step3Desc}</p>
      </div>

      <div className="space-y-3">
        {types.map((type) => {
          const Icon = type.icon;
          const selected = data.appType === type.value;
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => onChange({ appType: type.value })}
              className={cn(
                "w-full rounded-2xl border p-5 text-start transition-all duration-200",
                selected
                  ? "border-accent/50 bg-accent/5 shadow-sm"
                  : "border-border/40 bg-surface hover:border-border/60",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                    selected ? "bg-accent/15" : "bg-default/60",
                  )}
                >
                  <Icon className={cn("size-5", selected ? "text-accent" : "text-muted")} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={cn("text-sm font-semibold", selected ? "text-accent" : "text-foreground")}>
                      {type.title}
                    </h3>
                    {selected && (
                      <div className="flex size-5 items-center justify-center rounded-full bg-accent">
                        <Check className="size-3 text-accent-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1">{type.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-muted text-center">{labels.typeCannotChange}</p>
    </div>
  );
}

/* ================================================================ */
/*  Step 4 — Phone Verification                                      */
/* ================================================================ */

function Step4Verification({
  data,
  onChange,
  labels,
  dir,
  onSendOtp,
  onVerifyOtp,
  isSending,
  isVerifying,
  otpSent,
  otpVerified,
  otpError,
  cooldown,
}: {
  data: WizardData;
  onChange: (d: Partial<WizardData>) => void;
  labels: Record<string, string>;
  dir: string;
  onSendOtp: () => void;
  onVerifyOtp: () => void;
  isSending: boolean;
  isVerifying: boolean;
  otpSent: boolean;
  otpVerified: boolean;
  otpError: string;
  cooldown: number;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">{labels.step4Title}</h2>
        <p className="text-xs text-muted mt-1">{labels.step4Desc}</p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-surface p-5 space-y-4">
        {/* Phone input */}
        <TextField isRequired>
          <Label className="text-xs font-medium text-foreground">{labels.phoneLabel}</Label>
          <Input
            type="tel"
            placeholder={labels.phonePlaceholder}
            value={data.phoneNumber}
            onChange={(e) => onChange({ phoneNumber: e.target.value.replace(/\D/g, "") })}
            className="rounded-xl"
            dir="ltr"
            disabled={otpVerified}
          />
        </TextField>
        <p className="text-[11px] text-muted -mt-2">{labels.phoneHint}</p>

        {/* Send OTP button */}
        {!otpSent && !otpVerified && (
          <Button
            type="button"
            className="w-full rounded-xl bg-accent text-accent-foreground font-medium h-10"
            isDisabled={!data.phoneNumber || data.phoneNumber.length < 10 || isSending}
            onPress={onSendOtp}
          >
            {isSending ? (
              <span className="flex items-center gap-2">
                <Spinner size="sm" />
                {labels.sending}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Phone className="size-4" />
                {labels.sendOtp}
              </span>
            )}
          </Button>
        )}

        {/* OTP input */}
        {otpSent && !otpVerified && (
          <div className="space-y-4 pt-2">
            <div className="h-px bg-border/40" />

            <p className="text-xs text-foreground font-medium text-center">
              {labels.otpSentTo} <span dir="ltr" className="font-mono">{data.phoneNumber}</span>
            </p>

            <div className="flex justify-center" dir="ltr">
              <InputOTP
                maxLength={6}
                value={data.otpCode}
                onChange={(val: string) => onChange({ otpCode: val })}
                onComplete={() => onVerifyOtp()}
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

            {isVerifying && (
              <div className="flex justify-center">
                <Spinner size="sm" />
              </div>
            )}

            {otpError && (
              <p className="text-xs text-danger text-center">{otpError}</p>
            )}

            <button
              type="button"
              onClick={onSendOtp}
              disabled={cooldown > 0 || isSending}
              className="w-full text-xs text-accent hover:underline disabled:text-muted disabled:no-underline text-center"
            >
              {cooldown > 0 ? `${labels.resend} (${cooldown}s)` : labels.resend}
            </button>
          </div>
        )}

        {/* Verified state */}
        {otpVerified && (
          <div className="flex items-center justify-center gap-2 py-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-success/15">
              <ShieldCheck className="size-4 text-success" />
            </div>
            <p className="text-sm font-medium text-success">{labels.verified}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================ */
/*  Main Wizard                                                      */
/* ================================================================ */

export function FirstAppSetup() {
  const router = useRouter();
  const { t, dir } = useLocale();
  const { user, logout } = useAuth();
  const createApp = useCreateApp();
  const sendOtp = useSendAppOtp();
  const verifyOtp = useVerifyAppOtp();

  // Labels
  const gate = (t.dashboard as any).appGate as Record<string, string> | undefined;
  const labels: Record<string, string> = {
    welcome: gate?.welcome ?? "Welcome to Rukny",
    welcomeDesc: gate?.welcomeDesc ?? "Create your first app to start using the developer platform.",
    // Steps
    step1Title: gate?.step1Title ?? "App Details",
    step1Desc: gate?.step1Desc ?? "Basic information about your app.",
    step2Title: gate?.step2Title ?? "Use Cases",
    step2Desc: gate?.step2Desc ?? "What will your app be used for?",
    step3Title: gate?.step3Title ?? "App Type",
    step3Desc: gate?.step3Desc ?? "Select an app type. This can't be changed later.",
    step4Title: gate?.step4Title ?? "Verification",
    step4Desc: gate?.step4Desc ?? "Verify your phone number via WhatsApp.",
    // Step 1
    appName: gate?.appName ?? "App Name",
    appNamePlaceholder: gate?.appNamePlaceholder ?? "e.g. My WhatsApp Bot",
    appNameHint: gate?.appNameHint ?? "This name will appear on your My Apps page and is associated with your app ID. You can change it later in Settings.",
    contactEmail: gate?.contactEmail ?? "App Contact Email",
    contactEmailPlaceholder: gate?.contactEmailPlaceholder ?? "dev@example.com",
    contactEmailHint: gate?.contactEmailHint ?? "We'll use this email to contact you about policies, restrictions or recovery if your app is compromised.",
    // Step 2
    useCaseOther: gate?.useCaseOther ?? "Other",
    useCaseOtherDesc: gate?.useCaseOtherDesc ?? "Your app will be created in the standard experience. You'll choose from all available permissions, features and products.",
    moreUseCasesSoon: gate?.moreUseCasesSoon ?? "More use cases coming soon.",
    // Step 3
    typeBusiness: gate?.typeBusiness ?? "Business",
    typeBusinessDesc: gate?.typeBusinessDesc ?? "Create or manage business assets like Pages, Ads, Messenger, WhatsApp, and Instagram using business permissions and products.",
    typeConsumer: gate?.typeConsumer ?? "Consumer",
    typeConsumerDesc: gate?.typeConsumerDesc ?? "Connect consumer products and permissions, like login integration, to your app.",
    typeCannotChange: gate?.typeCannotChange ?? "The app type can't be changed after creation.",
    // Step 4
    phoneLabel: gate?.phoneLabel ?? "Phone Number",
    phonePlaceholder: gate?.phonePlaceholder ?? "9647701234567",
    phoneHint: gate?.phoneHint ?? "Enter your number with country code (e.g. 964). We'll send a verification code via WhatsApp.",
    sendOtp: gate?.sendOtp ?? "Send Verification Code",
    sending: gate?.sending ?? "Sending...",
    otpSentTo: gate?.otpSentTo ?? "Code sent to",
    resend: gate?.resend ?? "Resend code",
    verified: gate?.verified ?? "Phone verified",
    // Actions
    next: gate?.next ?? "Next",
    back: gate?.back ?? "Back",
    create: gate?.create ?? "Create App",
    creating: gate?.creating ?? "Creating...",
  };

  // State
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<WizardData>({
    name: "",
    contactEmail: user?.email ?? "",
    appType: "BUSINESS",
    phoneNumber: "",
    otpCode: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [createError, setCreateError] = useState("");

  const updateData = useCallback(
    (partial: Partial<WizardData>) => setData((prev) => ({ ...prev, ...partial })),
    [],
  );

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Step validation
  const isStep1Valid = data.name.trim().length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contactEmail);
  const isStep2Valid = true; // always valid since only "Other" is selected
  const isStep3Valid = !!data.appType;
  const isStep4Valid = otpVerified;

  const canProceed = [isStep1Valid, isStep2Valid, isStep3Valid, isStep4Valid][step - 1];

  // Handlers
  const handleNext = () => {
    if (step < 4) setStep((s) => (s + 1) as Step);
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => (s - 1) as Step);
  };

  const handleSendOtp = async () => {
    setOtpError("");
    try {
      await sendOtp.mutateAsync(data.phoneNumber);
      setOtpSent(true);
      setCooldown(60);
    } catch (err: any) {
      setOtpError(err?.message ?? "Failed to send OTP");
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError("");
    try {
      await verifyOtp.mutateAsync({ phoneNumber: data.phoneNumber, code: data.otpCode });
      setOtpVerified(true);
    } catch (err: any) {
      setOtpError(err?.message ?? "Invalid code");
    }
  };

  const handleCreate = async () => {
    setCreateError("");
    try {
      const app = await createApp.mutateAsync({
        name: data.name.trim(),
        contactEmail: data.contactEmail.trim(),
        appType: data.appType,
        otpCode: data.otpCode,
      });
      router.push(`/app/${app.appId}`);
    } catch (err: any) {
      setCreateError(err?.message ?? "Failed to create app");
    }
  };

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;
  const NextArrow = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="flex min-h-dvh " dir={dir}>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          {/* Logo */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex items-center gap-2.5">
              <Image src="/ruknylogo.svg" alt="Rukny" width={32} height={32} priority />
              <span className="text-lg font-bold text-foreground">Rukny</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">{labels.welcome}</h1>
              <p className="text-xs text-muted mt-1">{labels.welcomeDesc}</p>
            </div>
          </div>

          {/* Step indicator */}
          <StepIndicator currentStep={step} labels={labels} />

          {/* Step content */}
          <div className="min-h-[280px]">
            {step === 1 && <Step1AppDetails data={data} onChange={updateData} labels={labels} />}
            {step === 2 && <Step2UseCases labels={labels} />}
            {step === 3 && <Step3AppType data={data} onChange={updateData} labels={labels} />}
            {step === 4 && (
              <Step4Verification
                data={data}
                onChange={updateData}
                labels={labels}
                dir={dir}
                onSendOtp={handleSendOtp}
                onVerifyOtp={handleVerifyOtp}
                isSending={sendOtp.isPending}
                isVerifying={verifyOtp.isPending}
                otpSent={otpSent}
                otpVerified={otpVerified}
                otpError={otpError}
                cooldown={cooldown}
              />
            )}
          </div>

          {createError && <p className="text-xs text-danger text-center">{createError}</p>}

          {/* Navigation buttons */}
          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl h-11 font-medium"
                onPress={handleBack}
              >
                <BackArrow className="size-4" />
                {labels.back}
              </Button>
            )}

            {step < 4 ? (
              <Button
                type="button"
                className={cn(
                  "rounded-xl bg-accent text-accent-foreground font-medium h-11",
                  step === 1 ? "w-full" : "flex-1",
                )}
                isDisabled={!canProceed}
                onPress={handleNext}
              >
                {labels.next}
                <NextArrow className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                className="flex-1 rounded-xl bg-accent text-accent-foreground font-medium h-11"
                isDisabled={!otpVerified || createApp.isPending}
                onPress={handleCreate}
              >
                {createApp.isPending ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" />
                    {labels.creating}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="size-4" />
                    {labels.create}
                  </span>
                )}
              </Button>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
            >
              <LogOut className="size-3" />
              {t.dashboard.sidebar.logout}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
