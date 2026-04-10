'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  MapPin,
  CheckCircle2,
  Loader2,
  ShoppingBag,
  ChevronDown,
  ClipboardList,
  Package,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import {
  getPaymentSession,
  getActiveSessionId,
  clearPaymentSession,
  getCheckoutToken,
  getCheckoutPhone,
  clearCart,
  clearCheckoutSession,
  type PaymentSession,
} from '@/lib/cart-store';
import {
  createCheckoutAddress,
  createCheckoutOrder,
} from '@/lib/api/checkout';
// ─── Iraqi Governorates ───────────────────────────────────────────────────────
const IRAQI_GOVERNORATES = [
  'بغداد', 'البصرة', 'نينوى', 'أربيل', 'السليمانية', 'دهوك',
  'كركوك', 'ديالى', 'الأنبار', 'بابل', 'كربلاء', 'النجف',
  'القادسية', 'المثنى', 'ذي قار', 'ميسان', 'واسط', 'صلاح الدين',
];

type Step = 'address' | 'confirm';

const STEPS_PHYSICAL: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'address', label: 'العنوان', icon: <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
  { key: 'confirm', label: 'التأكيد', icon: <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
];

const STEPS_DIGITAL: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: 'confirm', label: 'التأكيد', icon: <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> },
];

interface AddressInfo { city: string; district: string; street: string; buildingNo: string; landmark: string; note: string }

function PaymentActionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSessionId = searchParams.get('id');

  const [sessionId, setSessionId] = useState('');

  const [session, setSession] = useState<PaymentSession | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [allDigital, setAllDigital] = useState(false);

  const [step, setStep] = useState<Step>('address');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState<AddressInfo>({ city: '', district: '', street: '', buildingNo: '', landmark: '', note: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const STEPS = allDigital ? STEPS_DIGITAL : STEPS_PHYSICAL;
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  // Load payment session
  useEffect(() => {
    const sid = urlSessionId || getActiveSessionId();
    if (!sid) { setNotFound(true); return; }
    const s = getPaymentSession(sid);
    if (!s) { setNotFound(true); return; }
    setSessionId(sid);
    setSession(s);

    // Detect if all items are digital
    const digital = s.allDigital ?? (s.items.length > 0 && s.items.every((i) => i.isDigital));
    setAllDigital(digital);

    // Skip address step for digital-only orders
    if (digital) {
      setStep('confirm');
    }

    // Must have checkout token (set by /payment/verify)
    const token = getCheckoutToken();
    if (!token) {
      router.replace(`/payment/verify?id=${sid}`);
      return;
    }
  }, [router, urlSessionId]);

  const items = session?.items ?? [];
  const total = session?.total ?? 0;
  const currency = session?.currency ?? 'IQD';

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleAddressNext = () => {
    if (!fullName.trim()) { setError('يرجى إدخال الاسم الكامل'); return; }
    if (!address.city) { setError('يرجى اختيار المحافظة'); return; }
    if (!address.street.trim()) { setError('يرجى إدخال العنوان التفصيلي'); return; }
    setError('');
    setStep('confirm');
  };

  const handlePlaceOrder = async () => {
    if (!session) return;
    const token = getCheckoutToken();
    const phone = getCheckoutPhone();
    if (!token || !phone) { setError('انتهت الجلسة. يرجى إعادة التحقق.'); router.replace(`/payment/verify?id=${sessionId}`); return; }
    setLoading(true); setError('');
    try {
      let addressId: string | undefined;

      // Only create address for physical products
      if (!allDigital) {
        const addrResult = await createCheckoutAddress({
          label: 'عنوان التوصيل',
          fullName: fullName,
          phoneNumber: phone,
          city: address.city,
          district: address.district || undefined,
          street: address.street,
          buildingNo: address.buildingNo || undefined,
          landmark: address.landmark || undefined,
        }, token);
        addressId = String(addrResult.address?.id ?? addrResult.id);
      }

      // Create order
      const orderResult = await createCheckoutOrder({
        storeId: session.storeId,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, price: i.price, ...(i.variantId ? { variantId: i.variantId } : {}) })),
        ...(addressId ? { shippingAddressId: addressId } : {}),
        phoneNumber: phone,
        notes: address.note || undefined,
      }, token);

      // Cleanup
      clearCart();
      clearCheckoutSession();
      clearPaymentSession(sessionId);

      // Navigate to success
      const orderNums = orderResult.orders.map((o) => o.orderNumber).join(',');
      const digitalParam = allDigital ? '&digital=1' : '';
      // Collect download tokens from digital order responses
      const dlTokens = orderResult.orders
        .filter((o: any) => o.downloadTokens?.length)
        .flatMap((o: any) => o.downloadTokens.map((t: any) => `${t.token}:${encodeURIComponent(t.productName)}`));
      const dlParam = dlTokens.length > 0 ? `&dl=${encodeURIComponent(dlTokens.join(','))}` : '';
      router.push(`/payment/success?orders=${encodeURIComponent(orderNums)}&phone=${encodeURIComponent(phone)}&store=${encodeURIComponent(session.storeUsername)}${digitalParam}${dlParam}`);
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ أثناء إنشاء الطلب');
    } finally { setLoading(false); }
  };

  // ─── Not Found State ───────────────────────────────────────────────────────

  if (notFound) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-900 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
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
      <div className="min-h-screen bg-white dark:bg-zinc-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  // ─── UI ─────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <button
            onClick={() => {
              if (step === 'address') router.back();
              else if (step === 'confirm') setStep('address');
            }}
            className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <ArrowRight className="w-4 h-4 text-zinc-900 dark:text-white" />
          </button>
          <h1 className="text-[16px] sm:text-[18px] font-bold text-zinc-900 dark:text-white flex-1">إكمال الطلب</h1>
        </div>

        {/* Step progress */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-3">
          <div className="max-w-xl flex items-center gap-1">
            {STEPS.map((s, idx) => (
              <div key={s.key} className="flex items-center flex-1">
                <div className={cn(
                  'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all shrink-0',
                  idx < stepIndex ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900' :
                  idx === stepIndex ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 ring-2 ring-zinc-900/20 dark:ring-white/20 ring-offset-2' :
                  'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500',
                )}>
                  {idx < stepIndex ? <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : s.icon}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-[2px] mx-1.5 rounded-full transition-all',
                    idx < stepIndex ? 'bg-zinc-900 dark:bg-white' : 'bg-zinc-100 dark:bg-zinc-800',
                  )} />
                )}
              </div>
            ))}
          </div>
          <div className="max-w-xl flex justify-between mt-1.5">
            {STEPS.map((s) => (
              <span key={s.key} className={cn(
                'text-[10px] sm:text-[11px] font-medium flex-1 text-center',
                s.key === step ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500',
              )}>{s.label}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-32 lg:pb-8">
        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 lg:items-start">
          {/* ── Form Column ── */}
          <div className="flex-1 min-w-0">
            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-[18px] text-[13px] text-red-600 dark:text-red-400 font-medium"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {/* ── Step 1: Address ── */}
              {step === 'address' && (
                <StepPanel key="address">
                  <div className="bg-white dark:bg-zinc-900 rounded-[24px] sm:rounded-[28px] border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7">
                    <StepTitle icon={<MapPin className="w-5 h-5 text-white dark:text-zinc-900" />} title="عنوان التوصيل" />

                    <div className="space-y-4">
                      <FormField label="الاسم الكامل" required>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="أحمد محمد علي"
                          className="w-full h-[48px] sm:h-[52px] px-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-[14px] sm:text-[15px] text-zinc-900 dark:text-white bg-white dark:bg-zinc-800/50 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20 transition-all"
                        />
                      </FormField>

                      <FormField label="المحافظة" required>
                        <div className="relative">
                          <select
                            value={address.city}
                            onChange={(e) => setAddress({ ...address, city: e.target.value })}
                            className="w-full h-[48px] sm:h-[52px] px-4 pl-10 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-[14px] sm:text-[15px] text-zinc-900 dark:text-white bg-white dark:bg-zinc-800/50 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20 transition-all appearance-none"
                          >
                            <option value="">اختر المحافظة</option>
                            {IRAQI_GOVERNORATES.map((gov) => (
                              <option key={gov} value={gov}>{gov}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
                        </div>
                      </FormField>

                      <FormField label="المنطقة/الحي">
                        <input
                          type="text"
                          value={address.district}
                          onChange={(e) => setAddress({ ...address, district: e.target.value })}
                          placeholder="مثال: الكرادة"
                          className="w-full h-[48px] sm:h-[52px] px-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-[14px] sm:text-[15px] text-zinc-900 dark:text-white bg-white dark:bg-zinc-800/50 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20 transition-all"
                        />
                      </FormField>

                      <FormField label="الشارع / العنوان التفصيلي" required>
                        <textarea
                          value={address.street}
                          onChange={(e) => setAddress({ ...address, street: e.target.value })}
                          placeholder="اسم الشارع، المجمع، القرب من..."
                          rows={2}
                          className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-[14px] sm:text-[15px] text-zinc-900 dark:text-white bg-white dark:bg-zinc-800/50 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20 transition-all resize-none"
                        />
                      </FormField>

                      <div className="grid grid-cols-2 gap-3">
                        <FormField label="رقم الدار/المبنى">
                          <input
                            type="text"
                            value={address.buildingNo}
                            onChange={(e) => setAddress({ ...address, buildingNo: e.target.value })}
                            placeholder="مثال: 42"
                            className="w-full h-[48px] sm:h-[52px] px-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-[14px] sm:text-[15px] text-zinc-900 dark:text-white bg-white dark:bg-zinc-800/50 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20 transition-all"
                          />
                        </FormField>
                        <FormField label="علامة مميزة">
                          <input
                            type="text"
                            value={address.landmark}
                            onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                            placeholder="بجانب..."
                            className="w-full h-[48px] sm:h-[52px] px-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-[14px] sm:text-[15px] text-zinc-900 dark:text-white bg-white dark:bg-zinc-800/50 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20 transition-all"
                          />
                        </FormField>
                      </div>

                      <FormField label="ملاحظات للبائع">
                        <textarea
                          value={address.note}
                          onChange={(e) => setAddress({ ...address, note: e.target.value })}
                          placeholder="أي تعليمات خاصة بالطلب..."
                          rows={2}
                          className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-[14px] sm:text-[15px] text-zinc-900 dark:text-white bg-white dark:bg-zinc-800/50 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400/20 transition-all resize-none"
                        />
                      </FormField>
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden lg:block mt-6">
                      <PrimaryButton onClick={handleAddressNext} loading={false}>
                        مراجعة الطلب
                      </PrimaryButton>
                    </div>
                  </div>
                </StepPanel>
              )}

              {/* ── Step 4: Confirm ── */}
              {step === 'confirm' && (
                <StepPanel key="confirm">
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-[24px] sm:rounded-[28px] border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7">
                      <StepTitle icon={<ClipboardList className="w-5 h-5 text-white dark:text-zinc-900" />} title="مراجعة الطلب" />

                      {/* Contact summary */}
                      <SummarySection title="بيانات التواصل">
                        <SummaryRow label="الاسم" value={fullName} />
                        <SummaryRow label="الهاتف" value={getCheckoutPhone() ?? ''} mono />
                      </SummarySection>

                      {/* Address summary */}
                      <SummarySection title="عنوان التوصيل">
                        <SummaryRow label="المحافظة" value={address.city} />
                        {address.district && <SummaryRow label="المنطقة" value={address.district} />}
                        <SummaryRow label="الشارع" value={address.street} />
                        {address.buildingNo && <SummaryRow label="الدار" value={address.buildingNo} />}
                        {address.landmark && <SummaryRow label="علامة مميزة" value={address.landmark} />}
                        {address.note && <SummaryRow label="ملاحظات" value={address.note} />}
                      </SummarySection>
                    </div>

                    {/* Items summary - mobile only */}
                    <div className="bg-white dark:bg-zinc-900 rounded-[24px] sm:rounded-[28px] border border-zinc-200 dark:border-zinc-800 p-5 sm:p-7 lg:hidden">
                      <SummarySection title="المنتجات">
                        {items.map((item) => (
                          <div key={item.productId} className="flex items-center gap-3 py-2">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate">{item.name}</p>
                              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">كمية: {item.quantity}</p>
                            </div>
                            <span className="text-[13px] font-bold text-zinc-900 dark:text-white shrink-0 tabular-nums">
                              {formatCurrency(item.price * item.quantity, item.currency)}
                            </span>
                          </div>
                        ))}
                        <div className="h-px bg-zinc-100 dark:bg-zinc-800 mt-2 mb-3" />
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-zinc-500 dark:text-zinc-400">مجموع الطلب</span>
                          <span className="text-[16px] font-bold text-zinc-900 dark:text-white tabular-nums">
                            {formatCurrency(total, currency)}
                          </span>
                        </div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1.5">+ رسوم الشحن تُحسب لاحقاً</p>
                      </SummarySection>
                    </div>

                    {/* Desktop CTA */}
                    <div className="hidden lg:block">
                      <PrimaryButton onClick={handlePlaceOrder} loading={loading}>
                        تأكيد الطلب نهائياً 🎉
                      </PrimaryButton>
                    </div>
                  </div>
                </StepPanel>
              )}
            </AnimatePresence>
          </div>

          {/* ── Order Summary Sidebar (Desktop) ── */}
          <div className="hidden lg:block lg:w-[360px] lg:sticky lg:top-36 shrink-0">
            <div className="bg-white dark:bg-zinc-900 rounded-[28px] border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="flex items-center gap-2 mb-5">
                <ShoppingBag className="w-[18px] h-[18px] text-zinc-400 dark:text-zinc-500" />
                <h3 className="text-[15px] font-bold text-zinc-900 dark:text-white">ملخص الطلب</h3>
              </div>

              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.productId} className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-[14px] overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate">{item.name}</p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500">× {item.quantity}</p>
                    </div>
                    <span className="text-[13px] font-bold text-zinc-900 dark:text-white shrink-0 tabular-nums">
                      {formatCurrency(item.price * item.quantity, item.currency)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-4" />
              <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] text-zinc-500 dark:text-zinc-400">المجموع</span>
                <span className="text-[20px] font-bold text-zinc-900 dark:text-white tabular-nums">
                  {formatCurrency(total, currency)}
                </span>
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">+ رسوم الشحن تُحسب لاحقاً</p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating CTA bar - mobile only */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-gradient-to-t from-white dark:from-zinc-900 via-white/95 dark:via-zinc-900/95 to-transparent pb-[env(safe-area-inset-bottom)] pt-3 px-4 lg:hidden">
        <div className="max-w-xl mx-auto">
          {step === 'address' && (
            <PrimaryButton onClick={handleAddressNext} loading={false}>
              مراجعة الطلب
            </PrimaryButton>
          )}
          {step === 'confirm' && (
            <PrimaryButton onClick={handlePlaceOrder} loading={loading}>
              تأكيد الطلب نهائياً 🎉
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PaymentActionPage() {
  return (
    <Suspense
      fallback={(
        <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-zinc-950">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      )}
    >
      <PaymentActionContent />
    </Suspense>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

function StepTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[14px] sm:rounded-[16px] bg-zinc-900 dark:bg-white flex items-center justify-center shrink-0">
        {icon}
      </div>
      <h2 className="text-[18px] sm:text-[20px] font-bold text-zinc-900 dark:text-white">{title}</h2>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] sm:text-[14px] font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 sm:mb-2">
        {label}
        {required && <span className="text-red-500 mr-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4">
      <h3 className="text-[12px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2 py-1">
      <span className="text-[12px] text-zinc-400 dark:text-zinc-500 shrink-0">{label}</span>
      <span className={cn('text-[13px] text-zinc-900 dark:text-white font-medium text-left', mono && 'font-mono')} dir={mono ? 'ltr' : undefined}>
        {value}
      </span>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  loading,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        'w-full h-[52px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full text-[15px] font-semibold flex items-center justify-center gap-2 transition-all',
        (loading || disabled) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-[0.98]',
      )}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : children}
    </button>
  );
}
