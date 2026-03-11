/**
 * 📱 PWA Service Worker Registration
 * 
 * Handles service worker registration and updates
 */

export interface SWRegistrationOptions {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
}

let swRegistration: ServiceWorkerRegistration | null = null;

/**
 * Register the service worker
 */
export async function registerServiceWorker(
  options: SWRegistrationOptions = {}
): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    // Service workers not supported
    return null;
  }

  // Only register in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[SW] Skipping registration in development');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
    });

    swRegistration = registration;
    // Service Worker registered

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New update available
            // New content available
            options.onUpdate?.(registration);
          } else {
            // First install
            // Content cached for offline use
            options.onSuccess?.(registration);
          }
        }
      });
    });

    // Check if there's already a waiting worker (e.g., from a previous visit)
    if (registration.waiting && navigator.serviceWorker.controller) {
      options.onUpdate?.(registration);
    }

    // 🔄 Periodically check for updates (every 30 minutes)
    setInterval(() => {
      registration.update().catch(() => {
        // Update check failed (likely offline)
      });
    }, 30 * 60 * 1000);

    // 🔄 Check for updates when user returns to tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(() => {});
      }
    });

    // Handle controller change (new SW activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // New service worker activated
    });

    return registration;
  } catch (error) {
    // Registration failed
    options.onError?.(error as Error);
    return null;
  }
}

/**
 * Unregister the service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    // Service Worker unregistered
    return result;
  } catch (error) {
    // Unregistration failed
    return false;
  }
}

/**
 * Check if there's a waiting service worker (update available)
 */
export function hasUpdate(): boolean {
  return !!swRegistration?.waiting;
}

/**
 * Skip waiting and activate the new service worker
 */
export async function applyUpdate(): Promise<void> {
  if (!swRegistration?.waiting) {
    // No update waiting
    return;
  }

  swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  
  // Reload once the new SW takes over
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  }, { once: true });
}

/**
 * Check if the app is running as PWA (installed)
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if the app can be installed
 */
export function canInstall(): boolean {
  if (typeof window === 'undefined') return false;
  return 'BeforeInstallPromptEvent' in window && !isPWA();
}

// ============ Push Notifications ============

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    // Notifications not supported
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  const permission = await Notification.requestPermission();
  // Notification permission set
  return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  if (!swRegistration) {
    // No service worker registration
    return null;
  }

  try {
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Push subscription created
    return subscription;
  } catch (error) {
    // Push subscription failed
    return null;
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!swRegistration) return null;
  return swRegistration.pushManager.getSubscription();
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getPushSubscription();
  if (!subscription) return true;
  return subscription.unsubscribe();
}

// ============ Utilities ============

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
