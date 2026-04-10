'use client';

/**
 * 🔔 Global Toast/Notification System
 * 
 * Provides a unified way to show notifications across the app.
 * Uses Sonner with custom styled toasts for a modern, RTL-friendly design.
 */

import { Toaster, toast as sonnerToast, type ExternalToast } from 'sonner';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Loader2,
  X 
} from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ============ Toast Styles ============

type Variant = 'default' | 'success' | 'error' | 'warning';

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
  error: XCircle,
  warning: AlertTriangle,
};

const toastAnimation = {
  initial: { opacity: 0, y: 50, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 50, scale: 0.95 },
};

const actionButtonClass =
  'text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-800';

// ============ Custom Toast Component ============

interface CustomToastProps {
  toastId: string | number;
  title?: string;
  message: string;
  variant: Variant;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
}

function CustomToast({ toastId, title, message, variant, action, onDismiss }: CustomToastProps) {
  const Icon = variantIcons[variant];

  return (
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
      <div className="flex items-start gap-2">
        <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', iconColor[variant])} />
        <div className="space-y-0.5">
          {title && (
            <h3 className={cn('text-xs font-medium leading-none', titleColor[variant])}>
              {title}
            </h3>
          )}
          <p className="text-xs leading-6 text-zinc-600 dark:text-zinc-300">{message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {action && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              action.onClick();
              sonnerToast.dismiss(toastId);
            }}
            className={cn(
              'cursor-pointer text-xs h-7 px-2 rounded-full',
              actionButtonClass
            )}
          >
            {action.label}
          </Button>
        )}

        <button
          onClick={() => {
            sonnerToast.dismiss(toastId);
            onDismiss?.();
          }}
          className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-700"
          aria-label="إغلاق الإشعار"
        >
          <X className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
        </button>
      </div>
    </motion.div>
  );
}

// ============ Toast Provider ============

interface ToastProviderProps {
  children?: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  return (
    <>
      {children}
      <Toaster
        position="top-center"
        dir="rtl"
        expand={false}
        toastOptions={{
          unstyled: true,
          className: 'flex justify-center px-3',
        }}
      />
    </>
  );
}

// ============ Toast Utilities ============

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  cancel?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  onAutoClose?: () => void;
}

/**
 * 🎯 Unified Toast API with Custom Design
 */
export const toast = {
  /**
   * ✅ Success toast
   */
  success: (message: string, options?: ToastOptions) => {
    return sonnerToast.custom(
      (id) => (
        <CustomToast
          toastId={id}
          title={options?.title}
          message={message}
          variant="success"
          action={options?.action}
          onDismiss={options?.onDismiss}
        />
      ),
      { duration: options?.duration ?? 4000 }
    );
  },

  /**
   * ❌ Error toast
   */
  error: (message: string, options?: ToastOptions) => {
    return sonnerToast.custom(
      (id) => (
        <CustomToast
          toastId={id}
          title={options?.title}
          message={message}
          variant="error"
          action={options?.action}
          onDismiss={options?.onDismiss}
        />
      ),
      { duration: options?.duration ?? 5000 }
    );
  },

  /**
   * ⚠️ Warning toast
   */
  warning: (message: string, options?: ToastOptions) => {
    return sonnerToast.custom(
      (id) => (
        <CustomToast
          toastId={id}
          title={options?.title}
          message={message}
          variant="warning"
          action={options?.action}
          onDismiss={options?.onDismiss}
        />
      ),
      { duration: options?.duration ?? 4000 }
    );
  },

  /**
   * ℹ️ Info toast
   */
  info: (message: string, options?: ToastOptions) => {
    return sonnerToast.custom(
      (id) => (
        <CustomToast
          toastId={id}
          title={options?.title}
          message={message}
          variant="default"
          action={options?.action}
          onDismiss={options?.onDismiss}
        />
      ),
      { duration: options?.duration ?? 4000 }
    );
  },

  /**
   * ⏳ Loading toast (returns ID for later dismiss)
   */
  loading: (message: string, options?: Omit<ToastOptions, 'duration'>) => {
    return sonnerToast.custom(
      (id) => (
        <motion.div
          variants={toastAnimation}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="flex items-center gap-3 w-[min(100%,26rem)] max-w-[min(calc(100vw-1.5rem),26rem)] p-3 rounded-[24px] border border-zinc-200 bg-white shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-zinc-800 dark:bg-zinc-950"
          dir="rtl"
        >
          <Loader2 className="h-4 w-4 animate-spin text-zinc-700 dark:text-zinc-200 flex-shrink-0" />
          <div className="space-y-0.5">
            {options?.title && (
              <h3 className="text-xs font-medium leading-none text-zinc-950 dark:text-zinc-50">
                {options.title}
              </h3>
            )}
            <p className="text-xs leading-6 text-zinc-600 dark:text-zinc-300">{message}</p>
          </div>
        </motion.div>
      ),
      { duration: Infinity }
    );
  },

  /**
   * 🔄 Promise toast - shows loading, then success/error
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: Error) => string);
    },
    options?: ToastOptions
  ) => {
    const loadingId = toast.loading(messages.loading);
    
    promise
      .then((data) => {
        sonnerToast.dismiss(loadingId);
        const successMessage = typeof messages.success === 'function' 
          ? messages.success(data) 
          : messages.success;
        toast.success(successMessage, options);
      })
      .catch((error) => {
        sonnerToast.dismiss(loadingId);
        const errorMessage = typeof messages.error === 'function' 
          ? messages.error(error) 
          : messages.error;
        toast.error(errorMessage, options);
      });
    
    return loadingId;
  },

  /**
   * 🗑️ Dismiss a specific toast or all toasts
   */
  dismiss: (toastId?: string | number) => {
    sonnerToast.dismiss(toastId);
  },

  /**
   * 📝 Custom toast with full control
   */
  custom: (content: ReactNode, options?: ToastOptions) => {
    return sonnerToast.custom(() => <>{content}</>, options as ExternalToast);
  },
};

// ============ Pre-built Toast Messages ============

/**
 * 🎯 Common toast messages for consistency
 */
export const toastMessages = {
  // Auth
  loginSuccess: () => toast.success('تم تسجيل الدخول بنجاح'),
  logoutSuccess: () => toast.success('تم تسجيل الخروج'),
  sessionExpired: () => toast.warning('انتهت صلاحية الجلسة، يرجى تسجيل الدخول مرة أخرى'),
  
  // CRUD
  saveSuccess: () => toast.success('تم الحفظ بنجاح'),
  createSuccess: (item?: string) => toast.success(item ? `تم إنشاء ${item} بنجاح` : 'تم الإنشاء بنجاح'),
  updateSuccess: (item?: string) => toast.success(item ? `تم تحديث ${item} بنجاح` : 'تم التحديث بنجاح'),
  deleteSuccess: (item?: string) => toast.success(item ? `تم حذف ${item}` : 'تم الحذف'),
  
  // Errors
  genericError: () => toast.error('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى'),
  networkError: () => toast.error('خطأ في الاتصال. تحقق من اتصالك بالإنترنت'),
  validationError: (message?: string) => toast.error(message || 'يرجى التحقق من البيانات المدخلة'),
  permissionError: () => toast.error('ليس لديك صلاحية للقيام بهذا الإجراء'),
  
  // Loading
  saving: () => toast.loading('جاري الحفظ...'),
  loading: () => toast.loading('جاري التحميل...'),
  uploading: () => toast.loading('جاري الرفع...'),
  
  // Clipboard
  copied: () => toast.success('تم النسخ'),
  
  // Forms
  formSubmitted: () => toast.success('تم إرسال النموذج بنجاح'),
  
  // Files
  uploadSuccess: () => toast.success('تم رفع الملف بنجاح'),
  uploadError: () => toast.error('فشل رفع الملف'),
  fileTooLarge: (maxSize?: string) => 
    toast.error(`حجم الملف كبير جداً${maxSize ? `. الحد الأقصى: ${maxSize}` : ''}`),
};

// ============ Confirmation Toast ============

interface ConfirmToastOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  destructive?: boolean;
}

/**
 * 🤔 Confirmation toast with action buttons
 */
export function confirmToast({
  title,
  description,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmToastOptions) {
  return sonnerToast.custom(
    (id) => (
      <motion.div
        variants={toastAnimation}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          'flex flex-col gap-3 w-full max-w-sm p-3 rounded-[24px] border shadow-[0_18px_50px_rgba(0,0,0,0.08)]',
          'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950'
        )}
        dir="rtl"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            {destructive ? (
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-zinc-700 dark:text-zinc-300" />
            ) : (
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-zinc-700 dark:text-zinc-300" />
            )}
            <div className="space-y-0.5">
              <h3 className={cn(
                'text-xs font-medium leading-none',
                'text-zinc-950 dark:text-zinc-50'
              )}>
                {title}
              </h3>
              {description && (
                <p className="text-xs leading-6 text-zinc-600 dark:text-zinc-300">{description}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              sonnerToast.dismiss(id);
              onCancel?.();
            }}
            className="rounded-full p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-700"
            aria-label="إغلاق"
          >
            <X className="h-3 w-3 text-zinc-500 dark:text-zinc-400" />
          </button>
        </div>
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              sonnerToast.dismiss(id);
              onCancel?.();
            }}
            className="text-xs h-7 px-3 rounded-full border-zinc-200 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {cancelLabel}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              sonnerToast.dismiss(id);
              await onConfirm();
            }}
            className="text-xs h-7 px-3 rounded-full border-zinc-950 bg-zinc-950 text-white hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    ),
    {
      duration: Infinity, // Don't auto-dismiss confirmations
    }
  );
}

export default ToastProvider;
