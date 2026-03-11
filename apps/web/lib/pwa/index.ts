/**
 * 📱 PWA Utilities Export
 */

export {
  registerServiceWorker,
  unregisterServiceWorker,
  hasUpdate,
  applyUpdate,
  isPWA,
  canInstall,
  requestNotificationPermission,
  subscribeToPush,
  getPushSubscription,
  unsubscribeFromPush,
  type SWRegistrationOptions,
} from './register-sw';
