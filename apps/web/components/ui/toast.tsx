'use client';

import { forwardRef, useImperativeHandle, useRef, createContext, useContext, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Toaster as SonnerToaster,
  toast as sonnerToast,
} from 'sonner';
import {
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────

type Variant = 'default' | 'success' | 'error' | 'warning';
type Position =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
}

interface ToastShowProps {
  title?: string;
  message: string;
  variant?: Variant;
  duration?: number;
  position?: Position;
  actions?: ActionButton;
  onDismiss?: () => void;
  highlightTitle?: boolean;
}

export interface ToasterRef {
  show: (props: ToastShowProps) => void;
}

// ─── Variant Styling ──────────────────────────────────────────

const variantStyles: Record<Variant, string> = {
  default: 'border-zinc-200 bg-white text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50',
  success: 'border-zinc-200 bg-white text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50',
  error: 'border-zinc-200 bg-white text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50',
  warning: 'border-zinc-200 bg-white text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50',
};

const titleColor: Record<Variant, string> = {
  default: 'text-zinc-950 dark:text-zinc-50',
  success: 'text-zinc-950 dark:text-zinc-50',
  error: 'text-zinc-950 dark:text-zinc-50',
  warning: 'text-zinc-950 dark:text-zinc-50',
};

const iconColor: Record<Variant, string> = {
  default: 'text-zinc-600 dark:text-zinc-300',
  success: 'text-zinc-600 dark:text-zinc-300',
  error: 'text-zinc-600 dark:text-zinc-300',
  warning: 'text-zinc-600 dark:text-zinc-300',
};

const variantIcons: Record<Variant, React.ComponentType<{ className?: string }>> = {
  default: Info,
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

const actionBtnColor: Record<Variant, string> = {
  default: 'text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800',
  success: 'text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800',
  error: 'text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800',
  warning: 'text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800',
};

const toastAnimation = {
  initial: { opacity: 0, y: 50, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 50, scale: 0.95 },
};

// ─── Toaster Component ────────────────────────────────────────

const Toaster = forwardRef<ToasterRef, { defaultPosition?: Position }>(
  ({ defaultPosition = 'top-center' }, ref) => {
    useImperativeHandle(ref, () => ({
      show({
        title,
        message,
        variant = 'default',
        duration = 4000,
        position = defaultPosition,
        actions,
        onDismiss,
        highlightTitle,
      }) {
        const Icon = variantIcons[variant];

        sonnerToast.custom(
          (toastId) => (
            <motion.div
              variants={toastAnimation}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={cn(
                'flex items-center justify-between w-[min(100%,26rem)] max-w-[min(calc(100vw-1.5rem),26rem)] p-3 rounded-[24px] border shadow-[0_18px_50px_rgba(0,0,0,0.08)]',
                variantStyles[variant]
              )}
              dir="rtl"
            >
              <div className="flex items-start gap-2 min-w-0">
                <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconColor[variant])} />
                <div className="space-y-0.5 min-w-0">
                  {title && (
                    <h3
                      className={cn(
                        'text-xs font-medium leading-none',
                        highlightTitle ? titleColor.success : titleColor[variant]
                      )}
                    >
                      {title}
                    </h3>
                  )}
                  <p className="text-xs leading-6 text-zinc-600 dark:text-zinc-300">{message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ms-2">
                {actions?.label && (
                  <button
                    type="button"
                    onClick={() => {
                      actions.onClick();
                      sonnerToast.dismiss(toastId);
                    }}
                    className={cn(
                      'cursor-pointer text-xs font-medium px-2.5 py-1 rounded-full border transition-colors',
                      actionBtnColor[variant]
                    )}
                  >
                    {actions.label}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    sonnerToast.dismiss(toastId);
                    onDismiss?.();
                  }}
                  className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none"
                  aria-label="إغلاق"
                >
                  <X className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
                </button>
              </div>
            </motion.div>
          ),
          { duration, position }
        );
      },
    }));

    return (
      <SonnerToaster
        position={defaultPosition}
        dir="rtl"
        toastOptions={{ unstyled: true, className: 'flex justify-center px-3' }}
      />
    );
  }
);

Toaster.displayName = 'Toaster';

// ─── Global Toast Context ─────────────────────────────────────
// Allows using toast.success() / toast.error() anywhere without passing refs

type ToastFn = (message: string, options?: Omit<ToastShowProps, 'message' | 'variant'>) => void;

interface ToastAPI {
  show: (props: ToastShowProps) => void;
  success: ToastFn;
  error: ToastFn;
  warning: ToastFn;
  info: ToastFn;
}

const ToastContext = createContext<ToastAPI | null>(null);

export function ToastProvider({
  children,
  position = 'top-center',
}: {
  children: React.ReactNode;
  position?: Position;
}) {
  const toasterRef = useRef<ToasterRef>(null);

  const show = useCallback((props: ToastShowProps) => {
    toasterRef.current?.show(props);
  }, []);

  const success = useCallback<ToastFn>((message, options) => {
    show({ ...options, message, variant: 'success' });
  }, [show]);

  const error = useCallback<ToastFn>((message, options) => {
    show({ ...options, message, variant: 'error' });
  }, [show]);

  const warning = useCallback<ToastFn>((message, options) => {
    show({ ...options, message, variant: 'warning' });
  }, [show]);

  const info = useCallback<ToastFn>((message, options) => {
    show({ ...options, message, variant: 'default' });
  }, [show]);

  const api: ToastAPI = { show, success, error, warning, info };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster ref={toasterRef} defaultPosition={position} />
    </ToastContext.Provider>
  );
}

/**
 * Hook to access the global toast API.
 *
 * ```tsx
 * const toast = useToast();
 * toast.success('تم الحفظ بنجاح');
 * toast.error('حدث خطأ');
 * toast.warning('تحذير');
 * toast.info('ملاحظة');
 * toast.show({ title: '...', message: '...', variant: 'success', actions: { label: 'تراجع', onClick: () => {} } });
 * ```
 */
export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return ctx;
}

export default Toaster;
