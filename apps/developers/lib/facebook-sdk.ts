/* ------------------------------------------------------------------ */
/*  Facebook JavaScript SDK loader                                     */
/*  Used for Meta Embedded Signup (WhatsApp Business onboarding)       */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: {
      init: (params: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: FBLoginResponse) => void,
        options?: {
          config_id?: string;
          response_type?: string;
          override_default_response_type?: boolean;
          extras?: Record<string, unknown>;
        },
      ) => void;
    };
  }
}

export interface FBLoginResponse {
  authResponse?: {
    code?: string;
    accessToken?: string;
    userID?: string;
    expiresIn?: number;
  };
  status: 'connected' | 'not_authorized' | 'unknown';
}

let sdkLoadPromise: Promise<void> | null = null;

/**
 * Load the Facebook JS SDK (idempotent).
 * Resolves once FB.init() is done and FB is ready.
 */
export function loadFacebookSDK(appId: string): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise<void>((resolve) => {
    // If SDK is already loaded
    if (window.FB) {
      window.FB.init({ appId, cookie: true, xfbml: true, version: 'v21.0' });
      resolve();
      return;
    }

    window.fbAsyncInit = () => {
      window.FB.init({ appId, cookie: true, xfbml: true, version: 'v21.0' });
      resolve();
    };

    // Inject the SDK script
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });

  return sdkLoadPromise;
}

/**
 * Launch the Meta Embedded Signup popup.
 * Returns the authorization code on success, or null if cancelled.
 */
export function launchEmbeddedSignup(configId: string): Promise<string | null> {
  return new Promise((resolve) => {
    window.FB.login(
      (response: FBLoginResponse) => {
        if (response.authResponse?.code) {
          resolve(response.authResponse.code);
        } else {
          resolve(null);
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: 2,
        },
      },
    );
  });
}
