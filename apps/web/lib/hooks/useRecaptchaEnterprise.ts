import { useCallback } from 'react';

// Declare global grecaptcha for TypeScript
declare global {
  interface Window {
    grecaptcha: {
      enterprise: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

interface UseRecaptchaEnterpriseOptions {
  siteKey?: string;
  onError?: (error: string) => void;
}

export function useRecaptchaEnterprise({
  siteKey = '6LcYWWAsAAAAAJpv0z4pIQqOIhl05dUUzauUEG2D', // Your site key
  onError
}: UseRecaptchaEnterpriseOptions = {}) {
  
  const executeRecaptcha = useCallback(async (action: string): Promise<string | null> => {
    try {
      if (!window.grecaptcha?.enterprise) {
        const error = 'reCAPTCHA Enterprise script not loaded';
        onError?.(error);
        // reCAPTCHA load warning
        return null;
      }

      return new Promise((resolve, reject) => {
        window.grecaptcha.enterprise.ready(async () => {
          try {
            const token = await window.grecaptcha.enterprise.execute(siteKey, { action });
            resolve(token);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'reCAPTCHA execution failed';
            onError?.(errorMsg);
            reject(err);
          }
        });
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'reCAPTCHA error';
      onError?.(errorMsg);
      // reCAPTCHA Enterprise error
      return null;
    }
  }, [siteKey, onError]);

  return { executeRecaptcha };
}

// Helper function for common actions
export const RecaptchaActions = {
  LOGIN: 'LOGIN',
  REGISTER: 'REGISTER',
  FORM_SUBMIT: 'FORM_SUBMIT',
  CONTACT: 'CONTACT',
  PAYMENT: 'PAYMENT',
  PROFILE_UPDATE: 'PROFILE_UPDATE'
} as const;

export type RecaptchaAction = typeof RecaptchaActions[keyof typeof RecaptchaActions];