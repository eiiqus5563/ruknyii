'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Package,
  MapPin,
  ArrowRight,
  Copy,
  Check,
  Search,
  Clock,
  Loader2,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import { trackOrder, type TrackOrderResponse } from '@/lib/api/checkout';
import { ORDER_STATUS_CONFIG } from '@/components/(app)/store/OrderCard';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderNumbers = (searchParams.get('orders') ?? '').split(',').filter(Boolean);
  const phone = searchParams.get('phone') ?? '';
  const storeUsername = searchParams.get('store') ?? '';
  const isDigitalOrder = searchParams.get('digital') === '1';
  const phoneLast4 = phone.replace(/\D/g, '').slice(-4);
  const dlParam = searchParams.get('dl') ?? '';

  const [copied, setCopied] = useState(false);
  const [trackingData, setTrackingData] = useState<TrackOrderResponse | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [downloadTokens, setDownloadTokens] = useState<Array<{ orderItemId: string; productName: string; token: string | null; downloadCount: number; maxDownloads: number; expiresAt: string | null }>>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Parse download tokens from URL
  useEffect(() => {
    if (!dlParam) return;
    const tokens = dlParam.split(',').map((entry, idx) => {
      const [token, ...nameParts] = entry.split(':');
      const productName = decodeURIComponent(nameParts.join(':'));
      return {
        orderItemId: `dl-${idx}`,
        productName,
        token: token || null,
        downloadCount: 0,
        maxDownloads: 5,
        expiresAt: null,
      };
    }).filter(t => t.token);
    setDownloadTokens(tokens);
  }, [dlParam]);

  const firstOrder = orderNumbers[0] ?? '';

  const fetchTracking = useCallback(async () => {
    if (!firstOrder || !phoneLast4) return;
    setTrackLoading(true);
    setTrackError('');
    try {
      const data = await trackOrder(firstOrder, phoneLast4);
      setTrackingData(data);
    } catch (e: any) {
      setTrackError(e.message ?? 'تعذر جلب بيانات الطلب');
    } finally {
      setTrackLoading(false);
    }
  }, [firstOrder, phoneLast4]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  const handleCopy = (text: string) => {
    if (typeof navigator !== 'undefined') navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (token: string) => {
    setDownloading(token);
    try {
      const res = await fetch(`/api/v1/downloads/${token}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'تعذر تحميل الملف');
      }
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
        // Update download count locally
        setDownloadTokens(prev => prev.map(dt =>
          dt.token === token ? { ...dt, downloadCount: dt.downloadCount + 1 } : dt
        ));
      }
    } catch (e: any) {
      alert(e.message || 'تعذر تحميل الملف');
    } finally {
      setDownloading(null);
    }
  };

  const statusConfig = trackingData
    ? (ORDER_STATUS_CONFIG[trackingData.status] ?? ORDER_STATUS_CONFIG.PENDING)
    : null;
  const StatusIcon = statusConfig?.icon;

  const backUrl = storeUsername ? `/${storeUsername}` : '/';

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f7]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#ede7dd]/70">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-3">
          <button
            onClick={() => router.push(backUrl)}
            className="w-9 h-9 rounded-full bg-[#f5f5f5] flex items-center justify-center transition-colors hover:bg-[#ebebeb]"
          >
            <ArrowRight className="w-4 h-4 text-[#1D1D1F]" />
          </button>
          <h1 className="text-[16px] sm:text-[18px] font-bold text-[#1D1D1F] flex-1">تم الطلب!</h1>
        </div>
      </div>

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-5 sm:gap-6">
        {/* Success animation */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
          className="flex flex-col items-center text-center pt-2 sm:pt-6"
        >
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-emerald-100 flex items-center justify-center mb-4 sm:mb-5 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.3)]">
            <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-500" />
          </div>
          <h2 className="text-[22px] sm:text-[28px] font-bold text-[#1D1D1F] mb-1">تم تأكيد طلبك! 🎉</h2>
          <p className="text-[14px] sm:text-[16px] text-[#666]">
            {isDigitalOrder ? 'يمكنك تحميل ملفاتك الآن' : 'سيتواصل معك البائع قريباً'}
          </p>
        </motion.div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Order number card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-[24px] sm:rounded-[28px] border border-[#ede7dd] p-5 sm:p-6 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#999]" />
              <span className="text-[12px] sm:text-[13px] font-bold text-[#999] uppercase tracking-wide">أرقام الطلبات</span>
            </div>
            <div className="space-y-2.5">
              {orderNumbers.map((orderNum) => (
                <div key={orderNum} className="flex items-center justify-between gap-3 bg-[#faf9f7] rounded-[16px] sm:rounded-[18px] px-4 py-3.5">
                  <span className="font-mono text-[14px] sm:text-[15px] font-bold text-[#1D1D1F]">{orderNum}</span>
                  <button
                    onClick={() => handleCopy(orderNum)}
                    className="w-9 h-9 rounded-full bg-[#f0ebe3] flex items-center justify-center text-[#666] hover:bg-[#e5ded5] transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] sm:text-[12px] text-[#bbb] mt-3 text-center">احتفظ برقم الطلب لتتبعه لاحقاً</p>
          </motion.div>

          {/* Track later info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-[24px] sm:rounded-[28px] border border-[#ede7dd] p-5 sm:p-6 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] flex flex-col justify-center"
          >
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#999]" />
              <span className="text-[12px] sm:text-[13px] font-bold text-[#999] uppercase tracking-wide">تتبع الطلب</span>
            </div>
            <div className="bg-[#faf9f7] rounded-[16px] sm:rounded-[18px] p-4 text-center">
              <p className="text-[13px] sm:text-[14px] font-semibold text-[#1D1D1F] mb-2">لتتبع طلبك لاحقاً</p>
              <p className="text-[12px] sm:text-[13px] text-[#999] leading-relaxed">
                احتفظ برقم الطلب + آخر 4 أرقام من هاتفك
                <span className="inline-block font-bold text-[#1D1D1F] mx-1.5 font-mono bg-[#f0ebe3] px-2 py-0.5 rounded-lg text-[12px]">{phoneLast4}</span>
                وادخلهم في صفحة التتبع
              </p>
            </div>
          </motion.div>
        </div>

        {/* Digital Downloads card */}
        {isDigitalOrder && downloadTokens.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-[24px] sm:rounded-[28px] border border-[#ede7dd] p-5 sm:p-7 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center gap-2 mb-5">
              <Download className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-emerald-500" />
              <span className="text-[12px] sm:text-[13px] font-bold text-[#999] uppercase tracking-wide">تحميل الملفات</span>
            </div>
            <div className="space-y-3">
              {downloadTokens.map((dt) => (
                <div key={dt.orderItemId} className="flex items-center justify-between gap-3 bg-[#faf9f7] rounded-[16px] sm:rounded-[18px] px-4 py-3.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] sm:text-[15px] font-semibold text-[#1D1D1F] truncate">{dt.productName}</p>
                    <p className="text-[11px] sm:text-[12px] text-[#999] mt-0.5">
                      {dt.downloadCount}/{dt.maxDownloads} تحميلات
                    </p>
                  </div>
                  {dt.token && dt.downloadCount < dt.maxDownloads ? (
                    <button
                      onClick={() => handleDownload(dt.token!)}
                      disabled={downloading === dt.token}
                      className="h-10 px-5 bg-emerald-500 text-white rounded-full text-[13px] font-semibold flex items-center gap-2 hover:bg-emerald-600 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {downloading === dt.token ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      تحميل
                    </button>
                  ) : (
                    <span className="text-[12px] text-[#999]">تم استنفاد التحميلات</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[11px] sm:text-[12px] text-[#bbb] mt-3 text-center">
              يمكنك تحميل كل ملف حتى {downloadTokens[0]?.maxDownloads || 5} مرات خلال 30 يوم
            </p>
          </motion.div>
        )}

        {/* Live tracking card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-[24px] sm:rounded-[28px] border border-[#ede7dd] p-5 sm:p-7 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-[#999]" />
            <span className="text-[12px] sm:text-[13px] font-bold text-[#999] uppercase tracking-wide">حالة الطلب</span>
          </div>

          {trackLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-7 h-7 text-[#bbb] animate-spin" />
            </div>
          )}

          {trackError && !trackLoading && (
            <p className="text-[13px] sm:text-[14px] text-rose-500 text-center py-4">{trackError}</p>
          )}

          {trackingData && !trackLoading && statusConfig && StatusIcon && (
            <div className="space-y-5">
              {/* Status badge */}
              <div className={cn(
                'flex items-center gap-3 sm:gap-4 rounded-[18px] sm:rounded-[20px] p-4 sm:p-5',
                statusConfig.bg,
              )}>
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[14px] sm:rounded-[16px] flex items-center justify-center bg-white shadow-sm shrink-0">
                  <StatusIcon className={cn('w-6 h-6 sm:w-7 sm:h-7', statusConfig.color)} />
                </div>
                <div>
                  <p className={cn('text-[15px] sm:text-[17px] font-bold', statusConfig.textColor)}>{statusConfig.label}</p>
                  <p className="text-[12px] sm:text-[13px] text-[#999] mt-0.5">
                    {new Date(trackingData.createdAt).toLocaleDateString('ar-IQ', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Store + address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="flex items-center gap-2.5 text-[13px] sm:text-[14px] bg-[#faf9f7] rounded-[14px] px-4 py-3">
                  <Package className="w-4 h-4 text-[#bbb] shrink-0" />
                  <div>
                    <span className="text-[#999] text-[11px] block">المتجر</span>
                    <span className="font-medium text-[#1D1D1F]">{trackingData.store?.name}</span>
                  </div>
                </div>
                {trackingData.address && (
                  <div className="flex items-center gap-2.5 text-[13px] sm:text-[14px] bg-[#faf9f7] rounded-[14px] px-4 py-3">
                    <MapPin className="w-4 h-4 text-[#bbb] shrink-0" />
                    <div>
                      <span className="text-[#999] text-[11px] block">التوصيل إلى</span>
                      <span className="font-medium text-[#1D1D1F]">
                        {[trackingData.address.city, trackingData.address.district].filter(Boolean).join('، ')}
                      </span>
                    </div>
                  </div>
                )}
                {trackingData.estimatedDelivery && (
                  <div className="flex items-center gap-2.5 text-[13px] sm:text-[14px] bg-[#faf9f7] rounded-[14px] px-4 py-3">
                    <Clock className="w-4 h-4 text-[#bbb] shrink-0" />
                    <div>
                      <span className="text-[#999] text-[11px] block">التوصيل المتوقع</span>
                      <span className="font-medium text-[#1D1D1F]">
                        {new Date(trackingData.estimatedDelivery).toLocaleDateString('ar-IQ', {
                          month: 'long', day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Order items */}
              {trackingData.items && trackingData.items.length > 0 && (
                <div className="border-t border-[#f0ebe3] pt-4 space-y-2">
                  {trackingData.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[13px] sm:text-[14px]">
                      <span className="text-[#666] truncate flex-1 ml-2">
                        {item.productName} <span className="text-[#bbb]">× {item.quantity}</span>
                      </span>
                      <span className="font-medium text-[#1D1D1F] shrink-0 tabular-nums">
                        {formatCurrency(item.price * item.quantity, trackingData.currency)}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-[#f0ebe3]">
                    <span className="text-[13px] text-[#999]">المجموع</span>
                    <span className="text-[16px] sm:text-[18px] font-bold text-[#1D1D1F] tabular-nums">
                      {formatCurrency(trackingData.total, trackingData.currency)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 sm:justify-center"
        >
          <button
            onClick={() => router.push(backUrl)}
            className="h-[50px] sm:h-[52px] px-8 bg-black text-white rounded-full text-[14px] sm:text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all active:scale-[0.98] shadow-[0_4px_20px_-6px_rgba(0,0,0,0.3)] sm:min-w-[200px]"
          >
            <ArrowRight className="w-4 h-4" />
            العودة للمتجر
          </button>
        </motion.div>
      </div>
    </div>
  );
}
