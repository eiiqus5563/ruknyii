'use client';

import {
  createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode,
} from 'react';
import {
  User, AuthResponse,
  logout as apiLogout, getCurrentUser, refreshToken,
  requestQuickSign, verifyQuickSign, exchangeOAuthCode,
  completeProfile, updateOAuthProfile,
  type CompleteProfileInput, type QuickSignResponse,
} from '@/lib/api/auth';
import {
  ApiException, clearCsrfToken, setCsrfToken, getCsrfToken,
  updateLastRefreshTime, setLoggingOut, resetRefreshState, scheduleSilentRefresh,
} from '@/lib/api-client';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsProfileCompletion: boolean;
  isRateLimited: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  sendMagicLink: (email: string) => Promise<QuickSignResponse>;
  verifyMagicLink: (token: string) => Promise<AuthResponse>;
  handleOAuthCallback: (code: string) => Promise<AuthResponse>;
  completeUserProfile: (input: CompleteProfileInput) => Promise<void>;
  completeOAuthProfile: (input: CompleteProfileInput) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, isLoading: true, isAuthenticated: false,
    needsProfileCompletion: false, isRateLimited: false, error: null,
  });

  const rateLimitRetryRef = useRef(0);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        const url = new URL(window.location.href);

        if (pathname.includes('/callback') && url.searchParams.has('code')) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const authPaths = ['/login', '/check-email', '/verify'];
        if (authPaths.some(p => pathname === p || pathname.startsWith(p + '/'))) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }

      try {
        const csrf = getCsrfToken();
        if (!csrf) {
          try {
            const user = await getCurrentUser();
            setState({ user, isLoading: false, isAuthenticated: true, needsProfileCompletion: !user.name || !user.username, isRateLimited: false, error: null });
            return;
          } catch { /* fallback to refresh */ }

          try {
            const result = await refreshToken();
            if (result.user) {
              setState({ user: result.user, isLoading: false, isAuthenticated: true, needsProfileCompletion: !result.user.name || !result.user.username, isRateLimited: false, error: null });
              return;
            }
          } catch {
            clearCsrfToken();
            setState(prev => ({ ...prev, isLoading: false }));
            return;
          }
        }

        const user = await getCurrentUser();
        setState({ user, isLoading: false, isAuthenticated: true, needsProfileCompletion: !user.name || !user.username, isRateLimited: false, error: null });
      } catch (err) {
        if (err instanceof ApiException && err.isRateLimited) {
          const retryCount = rateLimitRetryRef.current;
          if (retryCount < 3) {
            rateLimitRetryRef.current = retryCount + 1;
            setState(prev => ({ ...prev, isLoading: false, isRateLimited: true }));
            setTimeout(() => initAuth(), Math.min(5000 * Math.pow(2, retryCount), 30_000));
            return;
          }
          setState(prev => ({ ...prev, isLoading: false, isRateLimited: true }));
          return;
        }

        clearCsrfToken();
        setState({ user: null, isLoading: false, isAuthenticated: false, needsProfileCompletion: false, isRateLimited: false, error: null });
      }
    };

    initAuth();
  }, []);

  const sendMagicLink = useCallback(async (email: string): Promise<QuickSignResponse> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await requestQuickSign(email);
      setState(prev => ({ ...prev, isLoading: false }));
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send magic link';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const verifyMagicLink = useCallback(async (token: string): Promise<AuthResponse> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await verifyQuickSign(token);
      if (response.csrf_token) { setCsrfToken(response.csrf_token); updateLastRefreshTime(); }
      if (typeof response.expires_in === 'number') { scheduleSilentRefresh(response.expires_in); }
      if (response.user) {
        setState({ user: response.user, isLoading: false, isAuthenticated: true, needsProfileCompletion: response.needsProfileCompletion || false, isRateLimited: false, error: null });
      } else {
        const user = await getCurrentUser();
        setState({ user, isLoading: false, isAuthenticated: true, needsProfileCompletion: !user.name || !user.username, isRateLimited: false, error: null });
      }
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const handleOAuthCallback = useCallback(async (code: string): Promise<AuthResponse> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      resetRefreshState();
      const response = await exchangeOAuthCode(code);
      if (response.csrf_token) { setCsrfToken(response.csrf_token); updateLastRefreshTime(); }
      if (typeof response.expires_in === 'number') { scheduleSilentRefresh(response.expires_in); }
      if (response.user) {
        setState({ user: response.user, isLoading: false, isAuthenticated: true, needsProfileCompletion: response.needsProfileCompletion || false, isRateLimited: false, error: null });
      } else {
        const user = await getCurrentUser();
        setState({ user, isLoading: false, isAuthenticated: true, needsProfileCompletion: !user.name || !user.username, isRateLimited: false, error: null });
      }
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const completeUserProfile = useCallback(async (input: CompleteProfileInput) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await completeProfile(input);
      updateLastRefreshTime();
      if (response.user) setState(prev => ({ ...prev, user: response.user, isLoading: false, needsProfileCompletion: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const completeOAuthProfile = useCallback(async (input: CompleteProfileInput) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await updateOAuthProfile(input);
      updateLastRefreshTime();
      if (response.user) setState(prev => ({ ...prev, user: response.user, isLoading: false, needsProfileCompletion: false }));
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const logoutFn = useCallback(async () => {
    setLoggingOut(true);
    setState(prev => ({ ...prev, isLoading: true }));
    try { await apiLogout(); } catch { /* ignore */ } finally {
      clearCsrfToken();
      resetRefreshState();
      setState({ user: null, isLoading: false, isAuthenticated: false, needsProfileCompletion: false, isRateLimited: false, error: null });
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!state.isAuthenticated) return;
    try {
      const user = await getCurrentUser();
      setState(prev => ({ ...prev, user, needsProfileCompletion: !user.name || !user.username }));
    } catch { /* ignore */ }
  }, [state.isAuthenticated]);

  const setUser = useCallback((user: User) => {
    setState(prev => ({ ...prev, user, isAuthenticated: true, needsProfileCompletion: !user.name || !user.username }));
  }, []);

  const clearError = useCallback(() => setState(prev => ({ ...prev, error: null })), []);

  const value = useMemo<AuthContextType>(
    () => ({ ...state, sendMagicLink, verifyMagicLink, handleOAuthCallback, completeUserProfile, completeOAuthProfile, logout: logoutFn, refreshUser, setUser, clearError }),
    [state, sendMagicLink, verifyMagicLink, handleOAuthCallback, completeUserProfile, completeOAuthProfile, logoutFn, refreshUser, setUser, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useUser(): User | null {
  return useAuth().user;
}

export function useIsAuthenticated(): boolean {
  return useAuth().isAuthenticated;
}
