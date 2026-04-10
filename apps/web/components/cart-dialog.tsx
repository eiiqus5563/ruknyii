'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ShoppingCart,
  Package,
  Truck,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency';
import {
  getCart,
  getCartTotal,
  getCartCurrency,
  getCartCount,
  removeFromCart,
  updateQuantity,
  clearCart,
  createPaymentSession,
  isCartAllDigital,
  type Cart,
  type CartItem,
} from '@/lib/cart-store';

interface CartDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CartDialog({ open, onClose }: CartDialogProps) {
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [navigating, setNavigating] = useState(false);

  const refreshCart = useCallback(() => {
    setCart(getCart());
  }, []);

  useEffect(() => {
    if (open) {
      refreshCart();
      setNavigating(false);
    }
  }, [open, refreshCart]);

  // Listen for storage changes
  useEffect(() => {
    const sync = () => { if (open) refreshCart(); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [open, refreshCart]);

  const handleRemove = (productId: string, variantId?: string) => {
    removeFromCart(productId, variantId);
    refreshCart();
    window.dispatchEvent(new Event('storage'));
  };

  const handleQtyChange = (productId: string, delta: number, variantId?: string) => {
    const item = cart?.items.find((i) => i.productId === productId && i.variantId === variantId);
    if (!item) return;
    updateQuantity(productId, item.quantity + delta, variantId);
    refreshCart();
    window.dispatchEvent(new Event('storage'));
  };

  const handleClearCart = () => {
    clearCart();
    refreshCart();
    window.dispatchEvent(new Event('storage'));
  };

  const handleCheckout = () => {
    const result = createPaymentSession();
    if (!result) return;
    setNavigating(true);
    onClose();
    router.push(result.url);
  };

  const items = cart?.items ?? [];
  const total = getCartTotal();
  const currency = getCartCurrency();
  const isEmpty = items.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[200] bg-black/30 backdrop-blur-[3px]"
          />

          {/* ── Mobile: Bottom Sheet ── */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-[201] lg:hidden"
          >
            <div className="bg-white rounded-t-[24px] max-h-[85vh] flex flex-col">
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-9 h-1 rounded-full bg-[#e0e0e0]" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3 border-b border-[#f0ede8]">
                <div className="flex items-center gap-2">
                  <h2 className="text-[16px] font-bold text-[#1D1D1F]">السلة</h2>
                  {!isEmpty && (
                    <span className="text-[12px] text-[#b0a898] font-medium">
                      ({items.length})
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5 text-[#666]" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
                <CartContent
                  items={items}
                  isEmpty={isEmpty}
                  total={total}
                  currency={currency}
                  onRemove={handleRemove}
                  onQtyChange={handleQtyChange}
                  onClear={handleClearCart}
                />
              </div>

              {/* Footer CTA */}
              {!isEmpty && (
                <div className="border-t border-[#f0ede8] px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] text-[#8c8478]">المجموع</span>
                    <span className="text-[18px] font-bold text-[#1D1D1F] tabular-nums">
                      {formatCurrency(total, currency)}
                    </span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={navigating}
                    className={cn(
                      'w-full h-[48px] bg-[#1D1D1F] text-white rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 transition-all',
                      navigating ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#333] active:scale-[0.98]',
                    )}
                  >
                    {navigating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        متابعة الشراء
                        <ArrowLeft className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Desktop: Centered Dialog ── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[201] hidden lg:flex items-center justify-center p-6"
          >
            <div className="bg-white rounded-3xl w-full max-w-[480px] max-h-[80vh] flex flex-col shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-[#f0ede8]">
                <div className="flex items-center gap-2">
                  <h2 className="text-[18px] font-bold text-[#1D1D1F]">السلة</h2>
                  {!isEmpty && (
                    <span className="text-[13px] text-[#b0a898] font-medium">
                      ({items.length} {items.length === 1 ? 'منتج' : 'منتجات'})
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
                >
                  <X className="w-4 h-4 text-[#555]" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
                <CartContent
                  items={items}
                  isEmpty={isEmpty}
                  total={total}
                  currency={currency}
                  onRemove={handleRemove}
                  onQtyChange={handleQtyChange}
                  onClear={handleClearCart}
                />
              </div>

              {/* Footer CTA */}
              {!isEmpty && (
                <div className="border-t border-[#f0ede8] px-6 py-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[14px] text-[#8c8478]">المجموع</span>
                    <span className="text-[20px] font-bold text-[#1D1D1F] tabular-nums">
                      {formatCurrency(total, currency)}
                    </span>
                  </div>
                  {!isCartAllDigital() && (
                  <div className="flex items-center gap-2 text-[12px] text-[#8c8478] bg-[#f5f3f0] rounded-xl px-3 py-2 mb-4">
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    <span>رسوم الشحن تُحسب عند إكمال الطلب</span>
                  </div>
                  )}
                  <button
                    onClick={handleCheckout}
                    disabled={navigating}
                    className={cn(
                      'w-full h-[48px] bg-[#1D1D1F] text-white rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 transition-all',
                      navigating ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#333] active:scale-[0.98]',
                    )}
                  >
                    {navigating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        متابعة الشراء
                        <ArrowLeft className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Cart Content (shared between mobile/desktop) ────────────────────────────

function CartContent({
  items,
  isEmpty,
  total,
  currency,
  onRemove,
  onQtyChange,
  onClear,
}: {
  items: CartItem[];
  isEmpty: boolean;
  total: number;
  currency: string;
  onRemove: (id: string, variantId?: string) => void;
  onQtyChange: (id: string, delta: number, variantId?: string) => void;
  onClear: () => void;
}) {
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-14 gap-3">
        <div className="w-16 h-16 rounded-2xl bg-[#f5f3f0] flex items-center justify-center">
          <ShoppingBag className="w-7 h-7 text-[#d4cdc2]/60" />
        </div>
        <p className="text-[15px] font-bold text-[#1D1D1F]">سلتك فارغة</p>
        <p className="text-[13px] text-[#b0a898]">أضف منتجات وابدأ التسوق</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Clear all */}
      <div className="flex justify-end">
        <button
          onClick={onClear}
          className="text-[12px] text-rose-400 font-medium hover:text-rose-500 transition-colors"
        >
          مسح الكل
        </button>
      </div>

      {/* Items */}
      <AnimatePresence>
        {items.map((item, idx) => {
          const hasDiscount = item.originalPrice > item.price;
          const itemKey = item.variantId ? `${item.productId}::${item.variantId}` : item.productId;
          return (
            <motion.div
              key={itemKey}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.03 }}
              className="flex items-start gap-3 bg-[#f9f8f6] rounded-2xl p-3"
            >
              {/* Image */}
              <div className="w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-xl overflow-hidden bg-[#f0ede8] shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-5 h-5 text-[#d4cdc2]" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] sm:text-[14px] font-semibold text-[#1D1D1F] truncate">{item.name}</p>
                {item.variantName && (
                  <p className="text-[11px] text-[#8c8478] mt-0.5">{item.variantName}</p>
                )}
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-[12px] sm:text-[13px] font-bold text-[#1D1D1F]">
                    {formatCurrency(item.price, item.currency)}
                  </span>
                  {hasDiscount && (
                    <span className="text-[10px] sm:text-[11px] line-through text-[#ccc]">
                      {formatCurrency(item.originalPrice, item.currency)}
                    </span>
                  )}
                </div>

                {/* Qty controls */}
                <div className="flex items-center gap-0.5 mt-2">
                  <button
                    onClick={() => onQtyChange(item.productId, -1, item.variantId)}
                    className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#666] hover:bg-[#eee] transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-[13px] font-bold text-[#1D1D1F] min-w-[28px] text-center tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onQtyChange(item.productId, 1, item.variantId)}
                    disabled={item.quantity >= item.stock}
                    className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#666] hover:bg-[#eee] transition-colors disabled:opacity-30"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Total + Remove */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-[13px] font-bold text-[#1D1D1F] tabular-nums">
                  {formatCurrency(item.price * item.quantity, item.currency)}
                </span>
                <button
                  onClick={() => onRemove(item.productId, item.variantId)}
                  className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-rose-400 hover:bg-rose-100 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
