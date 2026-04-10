'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  User,
  AuthResponse,
  logout as apiLogout,
  getCurrentUser,
  refreshToken,
  requestQuickSign,
  verifyQuickSign,
  exchangeOAuthCode,
  completeProfile,
  updateOAuthProfile,
  type CompleteProfileInput,
  type QuickSignResponse,
} from '@/lib/api/auth';
import {
  ApiException,
  clearCsrfToken,
  setCsrfToken,
  getCsrfToken,
  updateLastRefreshTime,
  setLoggingOut,
  resetRefreshState,
} from '@/lib/api-client';

// ============ Types ============

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
  completeOAuthProfile: (input: Omit<CompleteProfileInput, 'quickSignToken'> & { phone?: string }) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

// ============ Context ============

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============ Provider ============

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    needsProfileCompletion: false,
    isRateLimited: false,
    error: null,
  });

  const rateLimitRetryRef = useRef(0);
  const MAX_RATE_LIMIT_RETRIES = 3;

  useEffect(() => {
    const initAuth = async () => {
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        const url = new URL(window.location.href);

        // Skip init on OAuth callback page
        if (pathname.includes('/callback') && url.searchParams.has('code')) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // Skip refresh attempt on auth pages (no point refreshing on login/register)
        const AUTH_PATHS = ['/login', '/register', '/check-email', '/verify'];
        const isOnAuthPage = AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
        if (isOnAuthPage) {
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }

      try {
        const csrfToken = getCsrfToken();
        if (!csrfToken) {
          try {
            // Some auth flows (e.g. 2FA verify) can finish with valid session cookies
            // before CSRF is available on the client. Try /me first to avoid false expiry.
            const currentUser = await getCurrentUser();
            setState({
              user: currentUser,
              isLoading: false,
              isAuthenticated: true,
              needsProfileCompletion: !currentUser.name || !currentUser.username,
              isRateLimited: false,
              error: null,
            });
            return;
          } catch {
            // Ignore and fallback to refresh flow below.
          }

          try {
            const refreshResult = await refreshToken();
            if (refreshResult.user) {
              setState({
                user: refreshResult.user,
                isLoading: false,
                isAuthenticated: true,
                needsProfileCompletion: !refreshResult.user.name || !refreshResult.user.username,
                isRateLimited: false,
                error: null,
              });
              return;
            }
          } catch {
            clearCsrfToken();
            setState(prev => ({ ...prev, isLoading: false }));
            if (typeof window !== 'undefined') {
              const path = window.location.pathname;
              if (path === '/dashboard' || path.startsWith('/dashboard/')) {
                window.location.href = '/login?session=expired';
              }
            }
            return;
          }
        }

        const user = await getCurrentUser();
        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
          needsProfileCompletion: !user.name || !user.username,
          isRateLimited: false,
          error: null,
        });
      } catch (err) {
        if (err instanceof ApiException && err.isRateLimited) {
          const retryCount = rateLimitRetryRef.current;
          if (retryCount < MAX_RATE_LIMIT_RETRIES) {
            rateLimitRetryRef.current = retryCount + 1;
            const delayMs = Math.min(5000 * Math.pow(2, retryCount), 30_000);
            setState(prev => ({ ...prev, isLoading: false, isRateLimited: true, error: null }));
            setTimeout(() => initAuth(), delayMs);
            return;
          }
          setState(prev => ({ ...prev, isLoading: false, isRateLimited: true, error: null }));
          return;
        }

        clearCsrfToken();
        setState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          needsProfileCompletion: false,
          isRateLimited: false,
          error: null,
        });
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
      const message = err instanceof Error ? err.message : 'فشل إرسال رابط الدخول';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const verifyMagicLink = useCallback(async (token: string): Promise<AuthResponse> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await verifyQuickSign(token);
      if (response.csrf_token) {
        setCsrfToken(response.csrf_token);
        updateLastRefreshTime();
      }
      if (response.user) {
        setState({
          user: response.user,
          isLoading: false,
          isAuthenticated: true,
          needsProfileCompletion: response.needsProfileCompletion || false,
          isRateLimited: false,
          error: null,
        });
      } else {
        const user = await getCurrentUser();
        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
          needsProfileCompletion: response.needsProfileCompletion || !user.name || !user.username,
          isRateLimited: false,
          error: null,
        });
      }
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل التحقق من الرابط';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const handleOAuthCallback = useCallback(async (code: string): Promise<AuthResponse> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      resetRefreshState();
      const response = await exchangeOAuthCode(code);
      if (response.csrf_token) {
        setCsrfToken(response.csrf_token);
        updateLastRefreshTime();
      }
      if (response.user) {
        setState({
          user: response.user,
          isLoading: false,
          isAuthenticated: true,
          needsProfileCompletion: response.needsProfileCompletion || false,
          isRateLimited: false,
          error: null,
        });
      } else {
        const user = await getCurrentUser();
        setState({
          user,
          isLoading: false,
          isAuthenticated: true,
          needsProfileCompletion: response.needsProfileCompletion || !user.name || !user.username,
          isRateLimited: false,
          error: null,
        });
      }
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل تسجيل الدخول';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const completeUserProfile = useCallback(async (input: CompleteProfileInput) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await completeProfile(input);
      updateLastRefreshTime();
      if (response.user) {
        setState(prev => ({ ...prev, user: response.user, isLoading: false, needsProfileCompletion: false }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل تحديث الملف الشخصي';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const completeOAuthProfile = useCallback(async (input: Omit<CompleteProfileInput, 'quickSignToken'> & { phone?: string }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await updateOAuthProfile(input);
      updateLastRefreshTime();
      if (response.user) {
        setState(prev => ({ ...prev, user: response.user, isLoading: false, needsProfileCompletion: false }));
      }
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل تحديث الملف الشخصي';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
      throw err;
    }
  }, []);

  const logoutFn = useCallback(async () => {
    setLoggingOut(true);
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await apiLogout();
    } catch { /* ignore */ } finally {
      clearCsrfToken();
      resetRefreshState();
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
        needsProfileCompletion: false,
        isRateLimited: false,
        error: null,
      });
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل تحديث البيانات';
      setState(prev => ({ ...prev, error: message }));
    }
  }, [state.isAuthenticated]);

  const setUser = useCallback((user: User) => {
    setState(prev => ({
      ...prev,
      user,
      isAuthenticated: true,
      needsProfileCompletion: !user.name || !user.username,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      ...state,
      sendMagicLink,
      verifyMagicLink,
      handleOAuthCallback,
      completeUserProfile,
      completeOAuthProfile,
      logout: logoutFn,
      refreshUser,
      setUser,
      clearError,
    }),
    [state, sendMagicLink, verifyMagicLink, handleOAuthCallback, completeUserProfile, completeOAuthProfile, logoutFn, refreshUser, setUser, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============ Hooks ============

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}
