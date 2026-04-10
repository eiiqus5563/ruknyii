'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Phone,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Package,
  Shield,
  Tag,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import {
  getCart,
  setCheckoutToken,
  getCheckoutToken,
  getCheckoutPhone,
  clearCart,
  clearCheckoutSession,
  type CartItem,
} from '@/lib/cart-store';
import {
  quickCheckoutLogin,
  createCheckoutAddress,
  createCheckoutOrder,
} from '@/lib/api/checkout';
import { getCheckoutUserInfo } from '@/actions/checkout-session';

// ─── Iraqi Governorates ───────────────────────────────────────────────────────
const IRAQI_GOVERNORATES = [
  'بغداد', 'البصرة', 'نينوى', 'أربيل', 'السليمانية', 'دهوك',
  'كركوك', 'ديالى', 'الأنبار', 'بابل', 'كربلاء', 'النجف',
  'القادسية', 'المثنى', 'ذي قار', 'ميسان', 'واسط', 'صلاح الدين',
];

type Step = 'login' | 'address' | 'confirm';

interface ContactInfo {
  fullName: string;
  phone: string;
}

interface AddressInfo {
  city: string;
  district: string;
  street: string;
  buildingNo: string;
  landmark: string;
  note: string;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [step, setStep] = useState<Step>('login');
  const [items, setItems] = useState<CartItem[]>([]);
  const [storeId, setStoreId] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  const [contact, setContact] = useState<ContactInfo>({ fullName: '', phone: '' });

  const [address, setAddress] = useState<AddressInfo>({
    city: '', district: '', street: '', buildingNo: '', landmark: '', note: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [isLoggedInUser, setIsLoggedInUser] = useState(false);

  useEffect(() => {
    setMounted(true);
    const cart = getCart();
    if (!cart || cart.items.length === 0) {
      router.replace(`/${username}`);
      return;
    }
    setItems(cart.items);
    setStoreId(cart.storeId);

    // Check if user is already logged in (main app session)
    getCheckoutUserInfo().then((userInfo) => {
      if (userInfo.isLoggedIn && userInfo.accessToken) {
        setCheckoutToken(userInfo.accessToken, userInfo.phone || userInfo.email || '');
        // Extract local phone (remove +964 prefix if present)
        let localPhone = '';
        if (userInfo.phone) {
          localPhone = userInfo.phone.replace(/^\+964/, '').replace(/^0/, '');
        }
        setContact({
          fullName: userInfo.fullName || '',
          phone: localPhone,
        });
        setIsLoggedInUser(true);
        setStep('address');
        return;
      }
      // Fallback: check localStorage checkout token
      const token = getCheckoutToken();
      const phone = getCheckoutPhone();
      if (token && phone) {
        setContact((prev) => ({ ...prev, phone }));
        setStep('address');
      }
    });
  }, [username, router]);

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const currency = items[0]?.currency ?? 'IQD';

  // ─── Quick Login (no OTP) ──────────────────────────────────────────────────
  const handleQuickLogin = async () => {
    setError('');
    if (!contact.fullName.trim() || contact.fullName.trim().length < 3) {
      setError('الرجاء إدخال الاسم الكامل (3 أحرف على الأقل)');
      return;
    }
    const fullPhone = '+964' + contact.phone;
    const phoneRegex = /^\+964[0-9]{10}$/;
    if (!phoneRegex.test(fullPhone)) {
      setError('رقم الهاتف يجب أن يكون 10 أرقام بعد +964');
      return;
    }
    setLoading(true);
    try {
      const res = await quickCheckoutLogin(fullPhone, contact.fullName.trim());
      setCheckoutToken(res.accessToken, fullPhone);
      setStep('address');
    } catch (e: any) {
      setError(e.message ?? 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  // ─── Address → Confirm ────────────────────────────────────────────────────
  const handleAddressNext = () => {
    setError('');
    if (!contact.phone || contact.phone.length !== 10) {
      setError('الرجاء إدخال رقم هاتف صحيح (10 أرقام)');
      return;
    }
    if (!address.city) { setError('الرجاء اختيار المحافظة'); return; }
    if (!address.street || address.street.trim().length < 5) {
      setError('الرجاء إدخال العنوان التفصيلي (5 أحرف على الأقل)');
      return;
    }
    setStep('confirm');
  };

  // ─── Place Order ──────────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    setError('');
    const token = getCheckoutToken();
    if (!token) {
      setError('انتهت جلسة الشراء، يرجى التحقق مرة أخرى');
      clearCheckoutSession();
      setStep('login');
      return;
    }

    setLoading(true);
    try {
      const fullPhone = '+964' + contact.phone;
      const phoneLocal = '0' + contact.phone;
      const addrResult = await createCheckoutAddress({
        label: 'عنوان التوصيل',
        fullName: contact.fullName,
        phoneNumber: phoneLocal,
        city: address.city,
        district: address.district || undefined,
        street: address.street,
        buildingNo: address.buildingNo || undefined,
        landmark: address.landmark || undefined,
      }, token);

      const result = await createCheckoutOrder({
        storeId,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price,
          ...(i.variantId ? { variantId: i.variantId } : {}),
        })),
        shippingAddressId: String(addrResult.address?.id ?? addrResult.id),
        phoneNumber: phoneLocal,
        notes: address.note || undefined,
      }, token);

      clearCart();
      clearCheckoutSession();

      const orderNumbers = result.orders.map((o) => o.orderNumber).join(',');
      router.push(`/${username}/checkout/success?orders=${encodeURIComponent(orderNumbers)}&phone=${encodeURIComponent(fullPhone)}`);
    } catch (e: any) {
      if (e.message?.includes('401') || e.message?.includes('Unauthorized')) {
        setError('انتهت جلسة الشراء، يرجى التحقق مرة أخرى');
        clearCheckoutSession();
        setStep('login');
      } else {
        setError(e.message ?? 'حدث خطأ أثناء إنشاء الطلب');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
      {/* ══════════ Header ══════════ */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push(`/${username}/cart`)}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors lg:hidden"
            >
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-[15px] text-gray-400 font-medium">ركني</span>
            <span className="text-[15px] text-gray-300 mx-1">-</span>
            <span className="text-[15px] text-gray-800 font-semibold">{username}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-gray-400">
            <Shield className="w-3.5 h-3.5" />
            <span>checkout آمن</span>
          </div>
        </div>
      </header>

      {/* ══════════ Main ══════════ */}
      <main className="flex-1">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

            {/* ── Left Column: Form ── */}
            <div className="flex-1 min-w-0 order-2 lg:order-1">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Card header */}
                <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-gray-400 tracking-wide">rukny</span>
                    <span className="text-[17px] font-bold text-gray-900">checkout</span>
                  </div>
                </div>

                <div className="px-5 sm:px-6 py-5 sm:py-6">
                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-[13px] text-red-600 font-medium flex items-center gap-2"
                      >
                        <X className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {/* ── Step: Login ── */}
                    {step === 'login' && (
                      <motion.div
                        key="login"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <h2 className="text-[16px] font-bold text-gray-900 mb-1">بيانات التواصل</h2>
                        <p className="text-[13px] text-gray-500 mb-5">أدخل اسمك ورقم هاتفك للمتابعة</p>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                              الاسم الكامل <span className="text-red-400">*</span>
                            </label>
                            <input
                              type="text"
                              value={contact.fullName}
                              onChange={(e) => setContact({ ...contact, fullName: e.target.value })}
                              placeholder="أحمد محمد علي"
                              className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                              رقم الهاتف (واتساب) <span className="text-red-400">*</span>
                            </label>
                            <div className="flex h-11 rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-gray-900/10 focus-within:border-gray-900 transition-all">
                              <div className="flex items-center gap-1.5 px-3 bg-gray-50 border-l border-gray-300 shrink-0 select-none">
                                <span className="text-[14px]">🇮🇶</span>
                                <span className="text-[13px] font-mono text-gray-600">+964</span>
                                <ChevronDown className="w-3 h-3 text-gray-400" />
                              </div>
                              <input
                                type="tel"
                                dir="ltr"
                                value={contact.phone}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                  setContact({ ...contact, phone: val });
                                }}
                                placeholder="780 000 0000"
                                className="flex-1 h-full px-3 text-[14px] font-mono text-gray-900 placeholder-gray-400 focus:outline-none bg-white"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 pt-5 border-t border-gray-100">
                          <SubmitButton onClick={handleQuickLogin} loading={loading}>
                            <Phone className="w-4 h-4" />
                            متابعة
                          </SubmitButton>
                        </div>
                      </motion.div>
                    )}

                    {/* ── Step: Address ── */}
                    {step === 'address' && (
                      <motion.div
                        key="address"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <h2 className="text-[16px] font-bold text-gray-900 mb-1">عنوان التوصيل</h2>
                        <p className="text-[13px] text-gray-500 mb-5">أدخل عنوانك لنوصل طلبك</p>

                        <div className="space-y-3.5">
                          {/* Phone input for logged-in users or users without phone */}
                          {isLoggedInUser && (
                            <div>
                              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                                رقم الهاتف (واتساب) <span className="text-red-400">*</span>
                              </label>
                              <div className="flex h-11 rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-gray-900/10 focus-within:border-gray-900 transition-all">
                                <div className="flex items-center gap-1.5 px-3 bg-gray-50 border-l border-gray-300 shrink-0 select-none">
                                  <span className="text-[14px]">🇮🇶</span>
                                  <span className="text-[13px] font-mono text-gray-600">+964</span>
                                </div>
                                <input
                                  type="tel"
                                  dir="ltr"
                                  value={contact.phone}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setContact({ ...contact, phone: val });
                                  }}
                                  placeholder="780 000 0000"
                                  className="flex-1 h-full px-3 text-[14px] font-mono text-gray-900 placeholder-gray-400 focus:outline-none bg-white"
                                />
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                              المحافظة <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                              <select
                                value={address.city}
                                onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                className="w-full h-11 px-3.5 pl-9 rounded-lg border border-gray-300 text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all appearance-none bg-white"
                              >
                                <option value="">اختر المحافظة</option>
                                {IRAQI_GOVERNORATES.map((gov) => (
                                  <option key={gov} value={gov}>{gov}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">المنطقة / الحي</label>
                            <input
                              type="text"
                              value={address.district}
                              onChange={(e) => setAddress({ ...address, district: e.target.value })}
                              placeholder="مثال: الكرادة"
                              className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
                              العنوان التفصيلي <span className="text-red-400">*</span>
                            </label>
                            <textarea
                              value={address.street}
                              onChange={(e) => setAddress({ ...address, street: e.target.value })}
                              placeholder="اسم الشارع، المجمع، أقرب نقطة دالة..."
                              rows={2}
                              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all resize-none"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">رقم الدار</label>
                              <input
                                type="text"
                                value={address.buildingNo}
                                onChange={(e) => setAddress({ ...address, buildingNo: e.target.value })}
                                placeholder="42"
                                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                              />
                            </div>
                            <div>
                              <label className="block text-[13px] font-medium text-gray-700 mb-1.5">علامة مميزة</label>
                              <input
                                type="text"
                                value={address.landmark}
                                onChange={(e) => setAddress({ ...address, landmark: e.target.value })}
                                placeholder="بجانب..."
                                className="w-full h-11 px-3.5 rounded-lg border border-gray-300 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">ملاحظات للبائع</label>
                            <textarea
                              value={address.note}
                              onChange={(e) => setAddress({ ...address, note: e.target.value })}
                              placeholder="أي تعليمات خاصة..."
                              rows={2}
                              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all resize-none"
                            />
                          </div>
                        </div>

                        <div className="mt-6">
                          <SubmitButton onClick={handleAddressNext} loading={false}>
                            مراجعة الطلب
                          </SubmitButton>
                        </div>
                      </motion.div>
                    )}

                    {/* ── Step: Confirm ── */}
                    {step === 'confirm' && (
                      <motion.div
                        key="confirm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <h2 className="text-[16px] font-bold text-gray-900 mb-4">مراجعة الطلب</h2>

                        {/* Contact info */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">بيانات التواصل</span>
                            <button onClick={() => { if (isLoggedInUser) { setStep('address'); } else { setStep('login'); clearCheckoutSession(); } }} className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">تعديل</button>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[13px]">
                              <span className="text-gray-500">الاسم</span>
                              <span className="text-gray-900 font-medium">{contact.fullName}</span>
                            </div>
                            <div className="flex items-center justify-between text-[13px]">
                              <span className="text-gray-500">الهاتف</span>
                              <span className="text-gray-900 font-medium font-mono" dir="ltr">+964{contact.phone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Address info */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">عنوان التوصيل</span>
                            <button onClick={() => setStep('address')} className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">تعديل</button>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[13px]">
                              <span className="text-gray-500">المحافظة</span>
                              <span className="text-gray-900 font-medium">{address.city}</span>
                            </div>
                            {address.district && (
                              <div className="flex items-center justify-between text-[13px]">
                                <span className="text-gray-500">المنطقة</span>
                                <span className="text-gray-900 font-medium">{address.district}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[13px]">
                              <span className="text-gray-500">العنوان</span>
                              <span className="text-gray-900 font-medium max-w-[200px] text-left truncate">{address.street}</span>
                            </div>
                          </div>
                        </div>

                        {/* Items - mobile only */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-5 lg:hidden">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">المنتجات</span>
                          {items.map((item) => (
                            <div key={item.productId} className="flex items-center gap-3 py-1.5">
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><Package className="w-3.5 h-3.5 text-gray-400" /></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-gray-900 truncate">{item.name}</p>
                                {item.variantName && (
                                  <p className="text-[11px] text-gray-500">{item.variantName}</p>
                                )}
                                <p className="text-[11px] text-gray-400">× {item.quantity}</p>
                              </div>
                              <span className="text-[13px] font-bold text-gray-900 tabular-nums shrink-0">
                                {formatCurrency(item.price * item.quantity, item.currency)}
                              </span>
                            </div>
                          ))}
                          <div className="h-px bg-gray-200 my-2" />
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] text-gray-600">الإجمالي</span>
                            <span className="text-[16px] font-bold text-gray-900 tabular-nums">{formatCurrency(total, currency)}</span>
                          </div>
                        </div>

                        <SubmitButton onClick={handlePlaceOrder} loading={loading} variant="green">
                          <CheckCircle2 className="w-4 h-4" />
                          تأكيد الطلب — {formatCurrency(total, currency)}
                        </SubmitButton>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 text-center">
                <p className="text-[11px] text-gray-400">
                  Powered by <span className="font-bold text-gray-500">rukny</span>
                </p>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <Shield className="w-4 h-4 text-gray-300" />
                  <span className="text-[10px] text-gray-400">بياناتك آمنة ومشفرة</span>
                </div>
              </div>
            </div>

            {/* ── Right Column: Order Summary ── */}
            <div className="lg:w-[380px] shrink-0 order-1 lg:order-2 lg:sticky lg:top-6">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Total header */}
                <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4">
                  <div className="text-[28px] sm:text-[32px] font-bold text-gray-900 tabular-nums leading-tight">
                    {formatCurrency(total, currency)}
                  </div>
                  <p className="text-[12px] text-gray-400 mt-0.5">بدون رسوم مخفية</p>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Order items */}
                <div className="px-5 sm:px-6 py-4">
                  <h3 className="text-[13px] font-bold text-gray-900 mb-3">عناصر الطلب</h3>
                  <div className="space-y-3 max-h-[240px] overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.productId} className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200/50">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-4 h-4 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-gray-900 truncate">{item.name}</p>
                          {item.variantName && (
                            <p className="text-[11px] text-gray-500">{item.variantName}</p>
                          )}
                          <p className="text-[11px] text-gray-400 mt-0.5">الكمية: {item.quantity}</p>
                        </div>
                        <span className="text-[13px] font-bold text-gray-900 tabular-nums shrink-0">
                          {formatCurrency(item.price * item.quantity, item.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Discount code */}
                <div className="px-5 sm:px-6 py-3">
                  {!showDiscount ? (
                    <button
                      onClick={() => setShowDiscount(true)}
                      className="w-full h-10 rounded-lg border border-dashed border-gray-300 text-[13px] text-gray-500 font-medium flex items-center justify-center gap-1.5 hover:border-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      أضف كود الخصم
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={discountCode}
                        onChange={(e) => setDiscountCode(e.target.value)}
                        placeholder="كود الخصم"
                        className="flex-1 h-10 px-3 rounded-lg border border-gray-300 text-[13px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-900 transition-all"
                      />
                      <button className="h-10 px-4 rounded-lg bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors">
                        تطبيق
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-px bg-gray-100" />

                {/* Cost breakdown */}
                <div className="px-5 sm:px-6 py-4 space-y-2.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-500">المجموع الفرعي</span>
                    <span className="text-gray-900 font-medium tabular-nums">{formatCurrency(total, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-500">تكلفة التوصيل</span>
                    <span className="text-gray-500 text-[12px]">يُحدد لاحقاً</span>
                  </div>
                  {address.city && (
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="text-gray-500">التوصيل إلى</span>
                      <span className="text-gray-900 font-medium">{address.city}</span>
                    </div>
                  )}
                </div>

                <div className="h-px bg-gray-100" />

                {/* Total */}
                <div className="px-5 sm:px-6 py-4 flex items-center justify-between">
                  <span className="text-[14px] font-bold text-gray-900">التكلفة الإجمالية</span>
                  <span className="text-[20px] font-bold text-gray-900 tabular-nums">{formatCurrency(total, currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ══════════ Mobile Bottom CTA ══════════ */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-200 p-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div className="flex-1 min-w-0">
            {step === 'login' && (
              <SubmitButton onClick={handleQuickLogin} loading={loading} size="sm">
                متابعة
              </SubmitButton>
            )}
            {step === 'address' && (
              <SubmitButton onClick={handleAddressNext} loading={false} size="sm">
                مراجعة الطلب
              </SubmitButton>
            )}
            {step === 'confirm' && (
              <SubmitButton onClick={handlePlaceOrder} loading={loading} variant="green" size="sm">
                تأكيد — {formatCurrency(total, currency)}
              </SubmitButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SubmitButton({
  children,
  onClick,
  loading,
  disabled,
  variant = 'dark',
  size = 'md',
}: {
  children: React.ReactNode;
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
  variant?: 'dark' | 'green';
  size?: 'sm' | 'md';
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={cn(
        'w-full rounded-lg text-white font-semibold flex items-center justify-center gap-2 transition-all',
        size === 'sm' ? 'h-11 text-[14px]' : 'h-12 text-[15px]',
        variant === 'green'
          ? 'bg-green-600 hover:bg-green-700 shadow-sm'
          : 'bg-gray-900 hover:bg-gray-800 shadow-sm',
        (loading || disabled) && 'opacity-50 cursor-not-allowed',
      )}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
}
