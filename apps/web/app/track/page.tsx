'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  RotateCcw,
  ChevronLeft,
  MapPin,
  Store,
  ShoppingBag,
  RefreshCw,
  Phone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import {
  requestTrackingOtp,
  verifyTrackingOtp,
  getTrackingOrderDetails,
  type TrackingOrderSummary,
  type TrackingOrderDetails,
} from '@/lib/api/checkout';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; dot: string }> = {
  PENDING: { label: 'قيد الانتظار', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  CONFIRMED: { label: 'مؤكد', icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-500/10', dot: 'bg-blue-500' },
  PROCESSING: { label: 'قيد التجهيز', icon: Loader2, color: 'text-indigo-600', bg: 'bg-indigo-500/10', dot: 'bg-indigo-500' },
  SHIPPED: { label: 'تم الشحن', icon: Truck, color: 'text-violet-600', bg: 'bg-violet-500/10', dot: 'bg-violet-500' },
  OUT_FOR_DELIVERY: { label: 'في الطريق', icon: Package, color: 'text-cyan-600', bg: 'bg-cyan-500/10', dot: 'bg-cyan-500' },
  DELIVERED: { label: 'تم التوصيل', icon: PackageCheck, color: 'text-emerald-600', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'ملغي', icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-500/10', dot: 'bg-rose-500' },
  REFUNDED: { label: 'مسترجع', icon: RotateCcw, color: 'text-gray-600', bg: 'bg-gray-500/10', dot: 'bg-gray-500' },
};

function getStatus(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `منذ ${days} يوم`;
  return fmtDate(d);
}

type Step = 'phone' | 'otp' | 'orders' | 'details';

export default function TrackOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+964');
  const [otpId, setOtpId] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [orders, setOrders] = useState<TrackingOrderSummary[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<TrackingOrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const fmtPhone = (p: string) => {
    const d = p.replace(/\D/g, '');
    if (d.startsWith('964')) return `+${d}`;
    if (d.startsWith('0')) return `+964${d.slice(1)}`;
    return `+964${d}`;
  };

  const displayPhone = (p: string) => {
    const d = p.replace('+964', '');
    if (d.length <= 3) return `+964 ${d}`;
    if (d.length <= 6) return `+964 ${d.slice(0, 3)} ${d.slice(3)}`;
    return `+964 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  };

  const handleSendOtp = async () => {
    const clean = phone.replace(/\s/g, '');
    if (!/^\+964\d{10}$/.test(clean)) {
      setError('يرجى إدخال رقم هاتف عراقي صحيح');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await requestTrackingOtp(fmtPhone(clean));
      setOtpId(res.otpId); setStep('otp'); setResendTimer(RESEND_COOLDOWN);
      setTimeout(() => inputRefs.current[0]?.focus(), 300);
    } catch (e: any) { setError(e.message ?? 'فشل إرسال رمز التحقق'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async (code: string) => {
    setVerifying(true); setError('');
    try {
      const res = await verifyTrackingOtp(fmtPhone(phone.replace(/\s/g, '')), code, otpId);
      setVerified(true); setOrders(res.orders);
      setTimeout(() => { setStep('orders'); setVerified(false); }, 500);
    } catch (e: any) {
      setError(e.message ?? 'رمز التحقق غير صحيح');
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } finally { setVerifying(false); }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true); setError('');
    try {
      const res = await requestTrackingOtp(fmtPhone(phone.replace(/\s/g, '')));
      setOtpId(res.otpId); setResendTimer(RESEND_COOLDOWN);
      setOtp(Array(OTP_LENGTH).fill('')); setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (e: any) { setError(e.message ?? 'فشل إعادة إرسال الرمز'); }
    finally { setLoading(false); }
  };

  const handleViewOrder = async (orderNumber: string) => {
    setError(''); setLoading(true);
    try {
      const d = await getTrackingOrderDetails(orderNumber, fmtPhone(phone.replace(/\s/g, '')));
      setSelectedOrder(d); setStep('details');
    } catch (e: any) { setError(e.message ?? 'تعذر جلب تفاصيل الطلب'); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (i: number, value: string) => {
    if (verified) return;
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[i] = digit; setOtp(next);
    if (digit && i < OTP_LENGTH - 1) inputRefs.current[i + 1]?.focus();
    const full = next.join('');
    if (full.length === OTP_LENGTH && next.every((d) => d !== '')) handleVerifyOtp(full);
  };

  const handleOtpKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!p) return;
    const next = Array(OTP_LENGTH).fill('');
    for (let i = 0; i < p.length; i++) next[i] = p[i];
    setOtp(next); inputRefs.current[Math.min(p.length, OTP_LENGTH - 1)]?.focus();
    if (p.length === OTP_LENGTH) handleVerifyOtp(p);
  };

  const goBack = () => {
    if (step === 'details') { setStep('orders'); setSelectedOrder(null); setError(''); }
    else if (step === 'orders') { setStep('phone'); setPhone('+964'); setError(''); }
    else if (step === 'otp') { setStep('phone'); setOtp(Array(OTP_LENGTH).fill('')); setError(''); }
    else router.back();
  };

  const ErrorBlock = () => error ? (
    <div className="mb-4 rounded-xl bg-rose-500/10 px-4 py-2.5 text-rose-600 dark:text-rose-400 text-[13px] text-center">
      {error}
    </div>
  ) : null;

  return (
    <div className="min-h-[100dvh] w-full bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center px-4 sm:px-6" dir="rtl">

      {/* Brand Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between pt-5 pb-4 sm:pt-8 sm:pb-6">
        <button onClick={goBack} className="flex items-center gap-1.5 text-[13px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
          <ArrowRight className="w-4 h-4" />
          {step === 'details' ? 'الطلبات' : step === 'orders' ? 'بحث جديد' : step === 'otp' ? 'تغيير الرقم' : 'العودة'}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100">ركني</span>
          <Image src="/ruknylogo.svg" alt="ركني" width={22} height={22} className="h-5 w-auto" priority />
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        'w-full transition-all duration-200',
        step === 'phone' || step === 'otp' ? 'max-w-sm mx-auto flex-1 flex flex-col justify-center -mt-16' : 'max-w-2xl pb-10',
      )}>
        <AnimatePresence mode="wait">

          {/* ═══ Step 1: Phone ═══ */}
          {step === 'phone' && (
            <motion.div key="phone" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="w-full">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">تتبع طلبك</h1>
                <p className="mt-1.5 text-[14px] text-zinc-500 dark:text-zinc-400">أدخل رقم هاتفك لعرض طلباتك</p>
              </div>

              <ErrorBlock />

              <div className="space-y-3">
                <div className="relative">
                  <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="tel" dir="ltr" value={phone} autoFocus
                    onChange={(e) => { let v = e.target.value; if (!v.startsWith('+964')) v = '+964'; if (v.length > 16) return; setPhone(v); setError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSendOtp(); }}
                    placeholder="+9647701234567"
                    className="w-full h-12 pr-10 pl-4 text-[15px] font-mono text-center border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 focus:ring-2 focus:ring-zinc-200/50 dark:focus:ring-zinc-700/50 transition-all"
                  />
                </div>

                <button onClick={handleSendOtp} disabled={loading} className="flex items-center justify-center gap-2 h-12 w-full bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 text-white dark:text-zinc-900 text-[14px] rounded-xl font-semibold transition-colors">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإرسال...</> : 'إرسال رمز التحقق'}
                </button>
              </div>

              <p className="text-center text-[12px] text-zinc-400 mt-5">سيصلك رمز تحقق عبر واتساب</p>
            </motion.div>
          )}

          {/* ═══ Step 2: OTP ═══ */}
          {step === 'otp' && (
            <motion.div key="otp" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="w-full">
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                  {verified ? 'تم التحقق ✓' : 'رمز التحقق'}
                </h1>
                {!verified && (
                  <p className="mt-1.5 text-[14px] text-zinc-500 dark:text-zinc-400">
                    أرسلنا رمز إلى <span className="font-mono text-zinc-800 dark:text-zinc-200" dir="ltr">{displayPhone(phone)}</span>
                  </p>
                )}
              </div>

              {!verified ? (
                <>
                  <ErrorBlock />
                  <div className="flex justify-center gap-2 sm:gap-3 mb-6" dir="ltr">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text" inputMode="numeric" maxLength={1} value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        disabled={verifying}
                        className={cn(
                          'size-12 text-center text-lg font-semibold rounded-xl border-2 transition-all outline-none',
                          verifying ? 'border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                            : digit ? 'border-zinc-900 dark:border-white bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white'
                            : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:border-zinc-900 dark:focus:border-white',
                        )}
                      />
                    ))}
                  </div>

                  {verifying && (
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                      <span className="text-sm text-zinc-500">جاري التحقق...</span>
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-2 mt-4">
                    {resendTimer > 0 ? (
                      <p className="text-[13px] text-zinc-500">
                        إعادة الإرسال بعد <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{resendTimer}</span> ثانية
                      </p>
                    ) : (
                      <button onClick={handleResend} disabled={loading} className="text-[13px] font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-white inline-flex items-center gap-1.5 transition-colors disabled:opacity-50">
                        <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> إعادة إرسال الرمز
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                  <p className="text-sm text-emerald-600 font-medium">جاري تحميل طلباتك...</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══ Step 3: Orders List ═══ */}
          {step === 'orders' && (
            <motion.div key="orders" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="w-full">

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900/5 dark:bg-white/10">
                    <ShoppingBag className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-zinc-900 dark:text-white">طلباتك</h1>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{orders.length} طلب مرتبط برقمك</p>
                  </div>
                </div>
              </div>

              <ErrorBlock />

              <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 overflow-hidden">
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">لا توجد طلبات</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {orders.map((order) => {
                      const s = getStatus(order.status);
                      const Icon = s.icon;
                      return (
                        <button
                          key={order.orderNumber}
                          onClick={() => handleViewOrder(order.orderNumber)}
                          disabled={loading}
                          className="group flex items-center gap-3 w-full text-right px-4 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors disabled:opacity-50"
                        >
                          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', s.bg)}>
                            <Icon className={cn('h-4 w-4', s.color)} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-zinc-900 dark:text-white">#{order.orderNumber}</span>
                              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', s.bg, s.color)}>
                                <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                                {order.statusLabel || s.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                              <span className="flex items-center gap-1"><Store className="w-3 h-3" />{order.storeName}</span>
                              <span>{order.itemsCount} منتج</span>
                              <span>{timeAgo(order.createdAt)}</span>
                            </div>
                          </div>

                          <span className="text-sm font-semibold text-zinc-900 dark:text-white tabular-nums shrink-0">
                            {formatCurrency(order.total, order.currency)}
                          </span>

                          <ChevronLeft className="w-4 h-4 text-zinc-300 dark:text-zinc-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══ Step 4: Order Details ═══ */}
          {step === 'details' && selectedOrder && (
            <motion.div key="details" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="w-full space-y-3">

              {/* Header */}
              {(() => {
                const s = getStatus(selectedOrder.status);
                const Icon = s.icon;
                return (
                  <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', s.bg)}>
                          <Icon className={cn('h-5 w-5', s.color)} />
                        </div>
                        <div>
                          <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-white">#{selectedOrder.orderNumber}</h1>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {fmtDate(selectedOrder.dates.ordered)}
                            {selectedOrder.store && <> · {selectedOrder.store.name}</>}
                          </p>
                        </div>
                      </div>
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', s.bg, s.color)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                        {selectedOrder.statusLabel || s.label}
                      </span>
                    </div>

                    {/* Progress */}
                    {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (() => {
                      const total = selectedOrder.statusHistory.length;
                      const currentIdx = selectedOrder.statusHistory.findIndex((h) => h.isCurrent);
                      const progress = total > 1 ? ((currentIdx >= 0 ? currentIdx : 0) / (total - 1)) * 100 : 0;
                      return (
                        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center justify-between mb-2">
                            {selectedOrder.statusHistory.map((sh, i) => (
                              <span key={i} className={cn('text-[10px] font-medium', sh.isCurrent ? 'text-zinc-900 dark:text-white' : i <= currentIdx ? 'text-zinc-500' : 'text-zinc-400 dark:text-zinc-600')}>
                                {sh.label}
                              </span>
                            ))}
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div className="h-full rounded-full bg-zinc-900 dark:bg-white transition-all duration-500" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}

              {/* Items */}
              <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-4 sm:p-5">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-zinc-400" />
                  المنتجات ({selectedOrder.items.length})
                </h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-700 shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-4 h-4 text-zinc-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white line-clamp-1">{item.nameAr || item.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">×{item.quantity}</p>
                      </div>
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white tabular-nums shrink-0">
                        {formatCurrency(item.subtotal, selectedOrder.payment.currency)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">المجموع الفرعي</span>
                    <span className="text-zinc-700 dark:text-zinc-300 tabular-nums">{formatCurrency(selectedOrder.payment.subtotal, selectedOrder.payment.currency)}</span>
                  </div>
                  {selectedOrder.payment.shippingFee > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">التوصيل</span>
                      <span className="text-zinc-700 dark:text-zinc-300 tabular-nums">{formatCurrency(selectedOrder.payment.shippingFee, selectedOrder.payment.currency)}</span>
                    </div>
                  )}
                  {selectedOrder.payment.discount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-500">الخصم</span>
                      <span className="text-emerald-500 tabular-nums">-{formatCurrency(selectedOrder.payment.discount, selectedOrder.payment.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">الإجمالي</span>
                    <span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums">{formatCurrency(selectedOrder.payment.total, selectedOrder.payment.currency)}</span>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedOrder.address && (
                  <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-4 sm:p-5">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-zinc-400" />
                      عنوان التوصيل
                    </h3>
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{selectedOrder.address.fullName}</p>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      {selectedOrder.address.fullAddress || [selectedOrder.address.city, selectedOrder.address.district, selectedOrder.address.street].filter(Boolean).join('، ')}
                    </p>
                  </div>
                )}

                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-4 sm:p-5">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    معلومات التوصيل
                  </h3>
                  <div className="space-y-2 text-xs text-zinc-500">
                    <div className="flex justify-between"><span>تاريخ الطلب</span><span className="text-zinc-800 dark:text-zinc-200">{fmtDate(selectedOrder.dates.ordered)}</span></div>
                    {selectedOrder.dates.estimatedDelivery && (
                      <div className="flex justify-between"><span>التوصيل المتوقع</span><span className="text-zinc-800 dark:text-zinc-200">{fmtDate(selectedOrder.dates.estimatedDelivery)}</span></div>
                    )}
                    {selectedOrder.dates.deliveredAt && (
                      <div className="flex justify-between"><span>تم التوصيل</span><span className="text-emerald-600 font-medium">{fmtDate(selectedOrder.dates.deliveredAt)}</span></div>
                    )}
                  </div>
                </div>
              </div>

              {selectedOrder.customerNote && (
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-4 sm:p-5">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1.5">ملاحظتك</h3>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">{selectedOrder.customerNote}</p>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
