'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  ArrowRight,
  Phone,
  ShieldCheck,
  Loader2,
  ShoppingBag,
  RefreshCw,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import {
  getPaymentSession,
  getActiveSessionId,
  setCheckoutToken,
  type PaymentSession,
} from '@/lib/cart-store';
import {
  requestCheckoutOtp,
  verifyCheckoutOtp,
  resendCheckoutOtp,
} from '@/lib/api/checkout';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

function PaymentVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSessionId = searchParams.get('id');

  const [session, setSession] = useState<PaymentSession | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [notFound, setNotFound] = useState(false);

  // Phone step
  const [phone, setPhone] = useState('+964');
  const [phoneSubmitted, setPhoneSubmitted] = useState(false);

  // OTP step
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [otpId, setOtpId] = useState('');
  const [sentVia, setSentVia] = useState<'WHATSAPP' | 'EMAIL'>('WHATSAPP');

  // State
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [verified, setVerified] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ─── Load Session ────────────────────────────────────────────────

  useEffect(() => {
    const sid = urlSessionId || getActiveSessionId();
    if (!sid) { setNotFound(true); return; }
    const s = getPaymentSession(sid);
    if (!s) { setNotFound(true); return; }
    setSessionId(sid);
    setSession(s);
  }, [urlSessionId]);

  // ─── Resend Timer ────────────────────────────────────────────────

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  // ─── Helpers ─────────────────────────────────────────────────────

  const navigateToAction = useCallback(() => {
    router.replace(`/payment/action?id=${sessionId}`);
  }, [router, sessionId]);

  const formatPhoneDisplay = (p: string) => {
    const digits = p.replace('+964', '');
    if (digits.length <= 3) return `+964 ${digits}`;
    if (digits.length <= 6) return `+964 ${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `+964 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  };

  // ─── Send OTP ────────────────────────────────────────────────────

  const handleSendOtp = async () => {
    const cleanPhone = phone.replace(/\s/g, '');
    if (!/^\+964\d{10}$/.test(cleanPhone)) {
      setError('يرجى إدخال رقم هاتف عراقي صحيح (مثال: +9647701234567)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await requestCheckoutOtp(cleanPhone);
      setOtpId(res.otpId);
      setSentVia(res.sentVia);
      setPhoneSubmitted(true);
      setResendTimer(RESEND_COOLDOWN);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (e: any) {
      setError(e.message ?? 'فشل إرسال رمز التحقق');
    } finally {
      setLoading(false);
    }
  };

  // ─── Verify OTP ──────────────────────────────────────────────────

  const handleVerifyOtp = async (code: string) => {
    const cleanPhone = phone.replace(/\s/g, '');
    setVerifying(true);
    setError('');

    try {
      const res = await verifyCheckoutOtp(cleanPhone, code, otpId);
      setCheckoutToken(res.accessToken, cleanPhone);
      setVerified(true);
      setTimeout(() => navigateToAction(), 800);
    } catch (e: any) {
      setError(e.message ?? 'رمز التحقق غير صحيح');
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally {
      setVerifying(false);
    }
  };

  // ─── Resend OTP ──────────────────────────────────────────────────

  const handleResend = async () => {
    if (resendTimer > 0) return;
    const cleanPhone = phone.replace(/\s/g, '');
    setLoading(true);
    setError('');

    try {
      const res = await resendCheckoutOtp(cleanPhone);
      setOtpId(res.otpId);
      setSentVia(res.sentVia);
      setResendTimer(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (e: any) {
      setError(e.message ?? 'فشل إعادة إرسال الرمز');
    } finally {
      setLoading(false);
    }
  };

  // ─── OTP Input Handlers ──────────────────────────────────────────

  const handleOtpChange = (index: number, value: string) => {
    if (verified) return;
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newOtp.join('');
    if (fullCode.length === OTP_LENGTH && newOtp.every((d) => d !== '')) {
      handleVerifyOtp(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newOtp = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < pasted.length; i++) newOtp[i] = pasted[i];
    setOtp(newOtp);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    if (pasted.length === OTP_LENGTH) handleVerifyOtp(pasted);
  };

  // ─── Not Found ───────────────────────────────────────────────────

  if (notFound) {
    return (
      <div className="min-h-screen w-full bg-white dark:bg-zinc-900 flex items-center justify-center px-4 py-6" dir="rtl">
        <div className="text-center max-w-[360px]">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 mx-auto mb-5">
            <ShoppingBag className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">جلسة الدفع غير موجودة</h2>
          <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mb-6">انتهت صلاحية هذه الجلسة أو تم الارتباط بشكل غير صحيح</p>
          <button
            onClick={() => router.push('/')}
            className="h-[48px] px-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full text-[14px] font-semibold inline-flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen w-full bg-white dark:bg-zinc-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  const items = session.items ?? [];
  const total = session.total ?? 0;
  const currency = session.currency ?? 'IQD';

  // ─── UI ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-[100dvh] w-full bg-white dark:bg-zinc-900 flex flex-col items-center justify-center px-5 py-16 sm:py-6" dir="rtl">
      {/* Brand */}
      <div className="fixed top-0 inset-x-0 z-10 flex items-center justify-center gap-2 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm sm:bg-transparent sm:dark:bg-transparent sm:backdrop-blur-none sm:absolute sm:top-6 sm:right-6 sm:inset-x-auto sm:py-0 sm:justify-start">
        <Image src="/ruknylogo.svg" alt="ركني" width={24} height={24} className="h-6 w-auto sm:h-7" priority />
        <span className="text-[13px] sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">ركني</span>
      </div>

      <div className="w-full max-w-[380px]">
        <AnimatePresence mode="wait">
          {!phoneSubmitted ? (
            /* ═══════════ Phone Entry Step ═══════════ */
            <motion.div
              key="phone"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >

              {/* Title */}
              <div className="text-center mb-5 sm:mb-6">
                <h1 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-zinc-900 dark:text-white leading-[1.2]">
                  تحقّق من رقم هاتفك
                </h1>
                <p className="mt-1.5 sm:mt-2 text-[13px] sm:text-[15px] leading-6 sm:leading-7 text-zinc-500 dark:text-zinc-400">
                  أدخل رقم هاتفك العراقي لتلقي رمز التحقق عبر واتساب
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 sm:mb-5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 sm:px-4 py-2.5 sm:py-3 text-red-600 dark:text-red-400 text-[13px] sm:text-sm text-center">
                  {error}
                </div>
              )}

              {/* Phone Input */}
              <div className="mb-3">
                <div className="relative">
                  <span className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-[14px] select-none">Iraq</span>
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (!val.startsWith('+964')) val = '+964';
                      if (val.length > 16) return;
                      setPhone(val);
                      setError('');
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendOtp(); }}
                    placeholder="+9647701234567"
                    className="w-full h-[44px] justify-items-start sm:h-[48px] pr-10 sm:pr-11 pl-4 text-[14px] border border-zinc-200 dark:border-zinc-700 rounded-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20 transition-all font-mono text-center"
                    autoFocus
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSendOtp}
                disabled={loading}
                className="flex items-center justify-center gap-2 h-[44px] sm:h-[48px] w-full bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 active:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-zinc-900 text-[14px] rounded-full font-semibold transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <span>إرسال رمز التحقق</span>
                )}
              </button>

              {/* Order Summary */}
              <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 dark:text-zinc-500" />
                  <span className="text-[12px] sm:text-[13px] font-medium text-zinc-500 dark:text-zinc-400">ملخص الطلب</span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 mr-auto">{items.length} منتج</span>
                </div>
                <div className="space-y-2 sm:space-y-2.5">
                  {items.slice(0, 3).map((item) => (
                    <div key={item.productId} className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] sm:text-[13px] font-medium text-zinc-900 dark:text-white truncate">{item.name}</p>
                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500">×{item.quantity}</p>
                      </div>
                      <span className="text-[12px] sm:text-[13px] font-semibold text-zinc-900 dark:text-white tabular-nums shrink-0">
                        {formatCurrency(item.price * item.quantity, item.currency)}
                      </span>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 text-center">+{items.length - 3} منتجات أخرى</p>
                  )}
                </div>
                <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-3" />
                <div className="flex items-center justify-between">
                  <span className="text-[12px] sm:text-[13px] text-zinc-500 dark:text-zinc-400">الإجمالي</span>
                  <span className="text-[15px] sm:text-[16px] font-bold text-zinc-900 dark:text-white tabular-nums">
                    {formatCurrency(total, currency)}
                  </span>
                </div>
              </div>

              {/* Back */}
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex items-center justify-center gap-1 text-[13px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors mx-auto"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  العودة للسلة
                </button>
              </div>
            </motion.div>
          ) : (
            /* ═══════════ OTP Verification Step ═══════════ */
            <motion.div
              key="otp"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full"
            >
              

              {/* Title */}
              <div className="text-center mb-5 sm:mb-6">
                <h1 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-zinc-900 dark:text-white leading-[1.2]">
                  {verified ? 'تم التحقق بنجاح!' : 'أدخل رمز التحقق'}
                </h1>
                {!verified && (
                  <p className="mt-1.5 sm:mt-2 text-[13px] sm:text-[15px] leading-6 sm:leading-7 text-zinc-500 dark:text-zinc-400">
                    تم الإرسال {sentVia === 'WHATSAPP' ? 'عبر واتساب' : 'عبر البريد'} إلى{' '}
                    <span className="font-mono text-zinc-900 dark:text-white" dir="ltr">{formatPhoneDisplay(phone)}</span>
                  </p>
                )}
              </div>

              {!verified ? (
                <>
                  {/* Error */}
                  {error && (
                    <div className="mb-5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-red-600 dark:text-red-400 text-sm text-center">
                      {error}
                    </div>
                  )}

                  {/* OTP Inputs */}
                  <div className="flex justify-center gap-1.5 sm:gap-3 mb-5 sm:mb-6" dir="ltr">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        disabled={verifying}
                        className={cn(
                          'size-[44px] sm:size-[52px] text-center text-base sm:text-lg font-semibold rounded-lg sm:rounded-xl border-2 transition-all outline-none',
                          verifying
                            ? 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400'
                            : digit
                              ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-white'
                              : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-white focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10',
                        )}
                      />
                    ))}
                  </div>

                  {/* Verifying spinner */}
                  {verifying && (
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Loader2 className="w-[18px] h-[18px] text-zinc-400 animate-spin" />
                      <span className="text-[15px] text-zinc-500 dark:text-zinc-400">جاري التحقق...</span>
                    </div>
                  )}

                  {/* Resend */}
                  <div className="mt-4 sm:mt-5 flex flex-col items-center gap-2">
                    {resendTimer > 0 ? (
                      <p className="text-[13px] sm:text-[15px] text-zinc-500 dark:text-zinc-400">
                        إعادة الإرسال بعد{' '}
                        <span className="font-mono font-bold text-zinc-900 dark:text-white">{resendTimer}</span>{' '}
                        ثانية
                      </p>
                    ) : (
                      <button
                        onClick={handleResend}
                        disabled={loading}
                        className="text-[13px] sm:text-[15px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                        إعادة إرسال الرمز
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setPhoneSubmitted(false);
                        setOtp(Array(OTP_LENGTH).fill(''));
                        setError('');
                      }}
                      className="flex items-center justify-center gap-1 text-[13px] text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      تغيير رقم الهاتف
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-2">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400 animate-spin" />
                    <p className="text-[15px] text-emerald-600 dark:text-emerald-400 font-medium">
                      جاري التوجيه لإكمال الطلب...
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function PaymentVerifyPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen w-full bg-white dark:bg-zinc-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
        </div>
      )}
    >
      <PaymentVerifyContent />
    </Suspense>
  );
}
