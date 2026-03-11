'use client';

/**
 * 📱 PWA Install Prompt & Update Notification
 * 
 * Shows install prompt for PWA and notifies about updates
 */

import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, X, Smartphone } from 'lucide-react';
import { registerServiceWorker, applyUpdate, isPWA } from '@/lib/pwa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Check if already installed
  useEffect(() => {
    setIsInstalled(isPWA());
  }, []);

  // Register service worker and handle updates
  useEffect(() => {
    registerServiceWorker({
      onUpdate: () => {
        setShowUpdate(true);
      },
    });
  }, []);

  // Capture install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      
      // Show install prompt after a delay (not immediately on page load)
      setTimeout(() => {
        if (!isInstalled) {
          setShowInstall(true);
        }
      }, 30000); // 30 seconds
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [isInstalled]);

  // Track app installed
  useEffect(() => {
    const handler = () => {
      setShowInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handler);
    
    return () => {
      window.removeEventListener('appinstalled', handler);
    };
  }, []);

  // Handle install
  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowInstall(false);
      }
    } catch (error) {
      // PWA install error
    }

    setInstallPrompt(null);
  }, [installPrompt]);

  // Handle update
  const handleUpdate = useCallback(() => {
    applyUpdate();
  }, []);

  // Don't show if already installed
  if (isInstalled && !showUpdate) return null;

  return (
    <>
      {/* Install Prompt */}
      {showInstall && installPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  تثبيت تطبيق ركني
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  أضف التطبيق للشاشة الرئيسية للوصول السريع
                </p>
                
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleInstall}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    تثبيت
                  </button>
                  <button
                    onClick={() => setShowInstall(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    لاحقاً
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowInstall(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Notification */}
      {showUpdate && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-blue-600 text-white rounded-4xl shadow-2xl p-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold">تحديث جديد متاح</h3>
                <p className="text-sm text-blue-100 mt-1">
                  يتوفر إصدار جديد من التطبيق
                </p>
                
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleUpdate}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-600 text-sm rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    تحديث الآن
                  </button>
                  <button
                    onClick={() => setShowUpdate(false)}
                    className="px-3 py-1.5 text-sm text-blue-100 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    لاحقاً
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowUpdate(false)}
                className="text-blue-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PWAPrompt;
