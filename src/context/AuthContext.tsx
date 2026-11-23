import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { supabase, isSupabaseReady } from '../lib/supabaseClient';
import { getAvatarUrl, extractPrivateStudentDocAvatarPath } from '../lib/avatar';
import { toSafeString, toSafeLower } from '../lib/safeString';

interface AuthContextType {
  currentUser: UserProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ 
    success: boolean; 
    status?: number;
    error?: string; 
    code?: string;
    pendingType?: 'account' | 'payment';
    user?: UserProfile 
  }>;
  register: (formData: FormData) => Promise<{ 
    success: boolean; 
    error?: string; 
    user?: UserProfile;
  }>;
  reuploadDocument: (file: File) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateAvatar: (file: File) => Promise<{ success: boolean; avatar_url?: string; error?: string }>;
  removeAvatar: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_BOOTSTRAP_TIMEOUT_MS = 6000;
const PROFILE_FETCH_TIMEOUT_MS = 4500;
const LOGIN_API_TIMEOUT_MS = 9000;
const DIRECT_LOGIN_TIMEOUT_MS = 8000;
const SESSION_SYNC_WAIT_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage = 'Request timed out'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
    promise.then(
      (val) => {
        if (timer) clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        if (timer) clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = LOGIN_API_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isLoggingOutRef = useRef<boolean>(false);
  const isCheckingLoginRef = useRef<boolean>(false);
  const inFlightLoginRef = useRef<Promise<any> | null>(null);
  const inFlightProfileFetchesRef = useRef<Map<string, Promise<UserProfile | null>>>(new Map());

  // Deferred background avatar healing so initial auth/login never blocks on storage signing
  const healPrivateAvatarInBackground = (userId: string, privatePath: string) => {
    if (!isSupabaseReady || !supabase || !privatePath) return;
    void (async () => {
      try {
        let healedUrl = '';
        try {
          const { data: signed } = await withTimeout(
            supabase.storage.from('student-documents').createSignedUrl(privatePath, 5 * 365 * 24 * 3600),
            2500,
            'Avatar signing timed out'
          );
          if (signed?.signedUrl) {
            healedUrl = signed.signedUrl;
          }
        } catch (_) {}

        if (!healedUrl || extractPrivateStudentDocAvatarPath(healedUrl)) {
          try {
            const { data: sessionRes } = await supabase.auth.getSession();
            const token = sessionRes?.session?.access_token || localStorage.getItem('boardbuddy_auth_token');
            if (token) {
              const meResp = await fetchWithTimeout(
                '/api/auth/me',
                { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
                4000
              );
              if (meResp.ok) {
                const meData = await meResp.json();
                const healed = getAvatarUrl(meData?.user);
                if (healed && !extractPrivateStudentDocAvatarPath(healed)) {
                  healedUrl = healed;
                }
              }
            }
          } catch (_) {}
        }

        if (healedUrl && !extractPrivateStudentDocAvatarPath(healedUrl) && !isLoggingOutRef.current) {
          setCurrentUser((prev) =>
            prev && prev.id === userId
              ? { ...prev, avatar_url: healedUrl, avatarUrl: healedUrl, photoUrl: healedUrl }
              : prev
          );
        }
      } catch (_) {}
    })();
  };

  // Helper to fetch profile from Supabase DB (deduplicated & timeout-guarded)
  const fetchProfileFromSupabase = async (userId: string): Promise<UserProfile | null> => {
    if (!isSupabaseReady || !userId) return null;

    const existing = inFlightProfileFetchesRef.current.get(userId);
    if (existing) return existing;

    const task = (async (): Promise<UserProfile | null> => {
      try {
        const { data: profile, error } = await withTimeout(
          Promise.resolve(
            supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .maybeSingle()
          ),
          PROFILE_FETCH_TIMEOUT_MS,
          'Profile fetch timed out'
        );

        if (error || !profile) {
          if (error) console.warn('Profile fetch error:', error);
          return null;
        }

        const safeEmail = toSafeString(profile.email);
        const safeRole = toSafeString(profile.role, 'STUDENT').trim().toUpperCase();
        const isSuperAdmin =
          safeRole === 'SUPERADMIN' ||
          toSafeLower(safeEmail) === 'boardbuddy.team@gmail.com';

        const rawStatus = toSafeString(profile.verification_status, 'PENDING_VERIFICATION').trim().toUpperCase();
        const normalizedStatus =
          rawStatus === 'APPROVED' || rawStatus === 'VERIFIED' || rawStatus === 'ACTIVE'
            ? 'APPROVED'
            : toSafeString(profile.verification_status, 'PENDING_VERIFICATION');

        const resolvedAvatarUrl = getAvatarUrl(profile);
        const privateAvatarPath = extractPrivateStudentDocAvatarPath(resolvedAvatarUrl);
        if (privateAvatarPath) {
          healPrivateAvatarInBackground(profile.id, privateAvatarPath);
        }

        return {
          id: profile.id,
          email: safeEmail,
          full_name: toSafeString(profile.full_name, safeEmail.split('@')[0] || 'Student'),
          role: isSuperAdmin ? 'SUPERADMIN' : (safeRole as UserProfile['role']),
          reviewee_type: profile.reviewee_type,
          institution: profile.institution,
          course: profile.course,
          verification_status: normalizedStatus as UserProfile['verification_status'],
          email_confirmed: Boolean(profile.email_confirmed),
          rejection_reason: profile.rejection_reason ? toSafeString(profile.rejection_reason) : undefined,
          avatar_url: resolvedAvatarUrl,
          avatarUrl: resolvedAvatarUrl,
          photoUrl: resolvedAvatarUrl,
          is_premium: Boolean(profile.is_premium),
          created_at: profile.created_at,
        };
      } catch (e) {
        console.warn('Profile fetch exception:', e);
        return null;
      } finally {
        inFlightProfileFetchesRef.current.delete(userId);
      }
    })();

    inFlightProfileFetchesRef.current.set(userId, task);
    return task;
  };

  // Initialize session using Supabase Auth state listener
  useEffect(() => {
    let mounted = true;
    let initSettled = false;

    const initAuth = async () => {
      if (isSupabaseReady) {
        try {
          await withTimeout(
            (async () => {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user && mounted && !isLoggingOutRef.current && !isCheckingLoginRef.current) {
                const p = await fetchProfileFromSupabase(session.user.id);
                if (p && mounted && !isLoggingOutRef.current && !isCheckingLoginRef.current) {
                  setCurrentUser(p);
                }
              }
            })(),
            AUTH_BOOTSTRAP_TIMEOUT_MS,
            'Auth session initialization timed out'
          );
        } catch (e) {
          console.warn('Supabase auth initialization warning:', e);
        }
      }
      initSettled = true;
      if (mounted) setIsLoading(false);
    };

    initAuth();

    let authSubscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseReady) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!mounted) return;

        // Avoid duplicate profile fetch at startup when initAuth is already handling INITIAL_SESSION
        if (event === 'INITIAL_SESSION' && !initSettled) {
          return;
        }

        if (isLoggingOutRef.current) {
          if (event === 'SIGNED_OUT' || !session?.user) {
            isLoggingOutRef.current = false;
          }
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }

        if (event === 'SIGNED_OUT' || !session?.user) {
          setCurrentUser(null);
          setIsLoading(false);
          return;
        }

        if (session?.user) {
          if (isCheckingLoginRef.current) {
            setIsLoading(false);
            return;
          }
          const p = await fetchProfileFromSupabase(session.user.id);
          if (p && mounted && !isLoggingOutRef.current && !isCheckingLoginRef.current) {
            setCurrentUser(p);
          }
        }
        if (mounted) setIsLoading(false);
      });
      authSubscription = subscription;
    }

    return () => {
      mounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  // Separate Effect for Realtime Profile Listening to ensure it reacts to currentUser.id changes
  useEffect(() => {
    if (!isSupabaseReady || !supabase || !currentUser?.id || isLoggingOutRef.current) return;

    const subscription = supabase
      .channel(`profile_updates_${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${currentUser.id}`,
        },
        async (payload) => {
          console.log('[AuthContext] Real-time profile update detected:', payload.new);
          const updatedProfile = payload.new as any;
          setCurrentUser((prev) => {
            if (!prev) return null;
            const incomingAvatar =
              updatedProfile.avatar_url !== undefined
                ? getAvatarUrl(updatedProfile)
                : getAvatarUrl(prev);
            return {
              ...prev,
              full_name: updatedProfile.full_name || prev.full_name,
              verification_status: updatedProfile.verification_status || prev.verification_status,
              is_premium: Boolean(updatedProfile.is_premium),
              email_confirmed: Boolean(updatedProfile.email_confirmed),
              rejection_reason: updatedProfile.rejection_reason !== undefined ? updatedProfile.rejection_reason : prev.rejection_reason,
              avatar_url: incomingAvatar,
              avatarUrl: incomingAvatar,
              photoUrl: incomingAvatar,
            };
          });
        }
      )
      .subscribe();

    return () => {
      if (supabase) supabase.removeChannel(subscription);
    };
  }, [currentUser?.id]);

  // Login using Supabase Auth with backend proxy (single-flight, timeout-guarded, and resilient direct fallback)
  const login = async (email: string, password: string) => {
    if (inFlightLoginRef.current) {
      return inFlightLoginRef.current;
    }

    const runLogin = async () => {
      isLoggingOutRef.current = false;
      isCheckingLoginRef.current = true;
      const normalizedEmail = toSafeLower(email);
      const safePassword = toSafeString(password);
      const superAdminEmail = toSafeLower(import.meta.env.VITE_INITIAL_SUPERADMIN_EMAIL || 'boardbuddy.team@gmail.com');

      if (!normalizedEmail || !safePassword) {
        isCheckingLoginRef.current = false;
        return { success: false, status: 400, error: 'Email and password are required.' };
      }

      const ACCOUNT_PENDING_APPROVAL_MESSAGE =
        'Your newly registered account is still pending approval by the admin. Please wait for verification before logging in.';

      const clearSessionOnDeniedLogin = async () => {
        setCurrentUser(null);
        try { localStorage.removeItem('boardbuddy_auth_token'); } catch (e) {}
        if (isSupabaseReady) {
          await withTimeout(supabase.auth.signOut(), 2500, 'Sign out timed out').catch(() => {});
        }
      };

      const tryDirectSupabaseLogin = async (): Promise<{
        success: boolean;
        status?: number;
        error?: string;
        code?: string;
        pendingType?: 'account' | 'payment';
        user?: UserProfile;
      } | null> => {
        if (!isSupabaseReady) return null;
        try {
          const { data: authData, error: authErr } = await withTimeout(
            supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: safePassword,
            }),
            DIRECT_LOGIN_TIMEOUT_MS,
            'Sign-in timed out. Please check your internet connection and try again.'
          );

          if (authErr) {
            const msg = toSafeLower(authErr.message ?? authErr);
            if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed') || msg.includes('email not verified')) {
              if (normalizedEmail === superAdminEmail) {
                return {
                  success: false,
                  error: 'Your preview session expired. Please refresh the page and try signing in again.',
                };
              }
              return {
                success: false,
                status: 403,
                code: 'ACCOUNT_PENDING_VERIFICATION',
                pendingType: 'account',
                error: ACCOUNT_PENDING_APPROVAL_MESSAGE,
              };
            }
            if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
              return { success: false, error: 'Invalid email or password.' };
            }
            return { success: false, error: toSafeString(authErr.message ?? authErr, 'Invalid email or password.') };
          }

          if (!authData?.user) {
            return { success: false, error: 'User profile record not found in database.' };
          }

          const profile = await fetchProfileFromSupabase(authData.user.id);
          const isAdminEmail = normalizedEmail === superAdminEmail || profile?.role === 'SUPERADMIN';

          if (isAdminEmail) {
            const adminUser: UserProfile = profile
              ? { ...profile, role: 'SUPERADMIN', verification_status: 'APPROVED' }
              : {
                  id: authData.user.id,
                  email: normalizedEmail,
                  full_name: authData.user.user_metadata?.full_name || 'BoardBuddy Super Admin',
                  role: 'SUPERADMIN',
                  reviewee_type: 'Other Reviewee',
                  institution: 'BoardBuddy Central Administration',
                  verification_status: 'APPROVED',
                  email_confirmed: true,
                  is_premium: true,
                  created_at: new Date().toISOString(),
                };
            if (authData.session?.access_token) {
              try {
                localStorage.setItem('boardbuddy_auth_token', authData.session.access_token);
              } catch (e) {}
            }
            setCurrentUser(adminUser);
            return { success: true, user: adminUser };
          }

          if (!profile) {
            await clearSessionOnDeniedLogin();
            return {
              success: false,
              status: 403,
              code: 'ACCOUNT_PENDING_VERIFICATION',
              pendingType: 'account',
              error: ACCOUNT_PENDING_APPROVAL_MESSAGE,
            };
          }

          const rawStatus = String(profile.verification_status || 'PENDING_VERIFICATION')
            .trim()
            .replace(/\s+/g, '_')
            .toUpperCase();
          if (rawStatus === 'APPROVED' || rawStatus === 'VERIFIED' || rawStatus === 'ACTIVE') {
            const approvedUser: UserProfile = { ...profile, verification_status: 'APPROVED' };
            if (authData.session?.access_token) {
              try {
                localStorage.setItem('boardbuddy_auth_token', authData.session.access_token);
              } catch (e) {}
            }
            setCurrentUser(approvedUser);
            return { success: true, user: approvedUser };
          }

          await clearSessionOnDeniedLogin();
          if (rawStatus === 'REJECTED') {
            return {
              success: false,
              status: 403,
              code: 'REJECTED',
              error: profile.rejection_reason
                ? `Your registration application was declined: ${profile.rejection_reason}`
                : 'Your account registration was declined by the administrator.',
            };
          }
          if (rawStatus === 'NEEDS_CLEARER_COPY') {
            return {
              success: false,
              status: 403,
              code: 'NEEDS_CLEARER_COPY',
              error: profile.rejection_reason
                ? `Document review notice: ${profile.rejection_reason}`
                : 'The uploaded document was unreadable. Please upload a clear copy of your Student ID or Certificate.',
            };
          }
          return {
            success: false,
            status: 403,
            code: 'ACCOUNT_PENDING_VERIFICATION',
            pendingType: 'account',
            error: ACCOUNT_PENDING_APPROVAL_MESSAGE,
          };
        } catch (fallbackErr: any) {
          const isTimeout = toSafeLower(fallbackErr?.message).includes('timed out');
          return {
            success: false,
            status: isTimeout ? 504 : undefined,
            error: isTimeout
              ? 'Sign-in timed out. Please check your internet connection and try again.'
              : toSafeString(fallbackErr, 'Login processing error.'),
          };
        }
      };

      try {
        const resp = await fetchWithTimeout(
          '/api/auth/login',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            credentials: 'same-origin',
            body: JSON.stringify({ email: normalizedEmail, password: safePassword }),
          },
          LOGIN_API_TIMEOUT_MS
        );

        let data: any = {};
        const contentType = toSafeLower(resp.headers.get('content-type'));
        if (contentType.includes('application/json')) {
          try {
            data = await resp.json();
          } catch {
            data = {};
          }
        } else {
          const text = await resp.text().catch(() => '');
          console.warn(`[Login] Non-JSON response received (status ${resp.status}):`, text.slice(0, 200));
          if (text.includes('Starting Server') || text.includes('<title>Starting Server')) {
            return { success: false, error: 'The server is currently starting up. Please wait a few seconds and try again.' };
          }
          const fallbackResult = await tryDirectSupabaseLogin();
          if (fallbackResult) {
            return fallbackResult;
          }
          if (resp.status === 403) {
            return { success: false, error: 'Preview session expired (HTTP 403). Please refresh the page and try signing in again.' };
          }
          return { success: false, error: 'Server is temporarily unavailable. Please try again.' };
        }

        if (!resp.ok || !data?.success) {
          const errorCode = toSafeString(data?.code || data?.error?.code);
          const pendingType = data?.pendingType === 'payment' || data?.pendingType === 'account'
            ? data.pendingType
            : undefined;
          const isAccountPendingCode =
            errorCode === 'ACCOUNT_PENDING_VERIFICATION' ||
            (errorCode === 'PENDING_VERIFICATION' && pendingType !== 'payment');
          const isRejectedOrUnreadable = errorCode === 'REJECTED' || errorCode === 'NEEDS_CLEARER_COPY';
          const isPending403 = resp.status === 403 && !isRejectedOrUnreadable && pendingType !== 'payment';

          if (isAccountPendingCode || isPending403) {
            await clearSessionOnDeniedLogin();
            return {
              success: false,
              status: resp.status,
              code: 'ACCOUNT_PENDING_VERIFICATION',
              pendingType: 'account',
              error: ACCOUNT_PENDING_APPROVAL_MESSAGE,
            };
          }

          // If server returned 5xx/503/504, try client-side Supabase fallback if configured
          if (resp.status >= 500) {
            const fallbackResult = await tryDirectSupabaseLogin();
            if (fallbackResult && (fallbackResult.success || errorCode === 'SUPABASE_NOT_CONFIGURED' || fallbackResult.code)) {
              return fallbackResult;
            }
          }

          const safeErrorMsg = toSafeString(
            data?.error ?? data?.message ?? data,
            resp.status >= 500
              ? 'Authentication service is temporarily unavailable. Please try again.'
              : 'Invalid email or password.'
          );

          return {
            success: false,
            status: resp.status,
            code: errorCode || undefined,
            pendingType,
            error: safeErrorMsg,
          };
        }

        if (data.session?.access_token) {
          try {
            localStorage.setItem('boardbuddy_auth_token', data.session.access_token);
          } catch (e) {}
        }

        if (data.user) {
          const safeRole = toSafeString(data.user.role, 'STUDENT').trim().toUpperCase();
          const safeUserEmail = toSafeString(data.user.email, normalizedEmail);
          const safeVerificationStatus = toSafeString(data.user.verification_status, 'PENDING_VERIFICATION');

          if (
            safeRole === 'STUDENT' &&
            safeVerificationStatus.trim().toUpperCase() !== 'APPROVED'
          ) {
            await clearSessionOnDeniedLogin();
            return {
              success: false,
              status: 403,
              code: 'ACCOUNT_PENDING_VERIFICATION',
              pendingType: 'account',
              error: ACCOUNT_PENDING_APPROVAL_MESSAGE,
            };
          }

          // Sync Supabase client session with a short cap so login never stalls behind storage locks
          if (data.session && isSupabaseReady && !data.session.is_fallback) {
            const sessionSyncPromise = supabase.auth.setSession(data.session).catch(() => {});
            await Promise.race([sessionSyncPromise, sleep(SESSION_SYNC_WAIT_MS)]);
          }

          const normalizedAvatar = getAvatarUrl(data.user);
          const sanitizedUser: UserProfile = {
            ...data.user,
            email: safeUserEmail,
            role: safeRole as UserProfile['role'],
            full_name: toSafeString(data.user.full_name, safeUserEmail.split('@')[0] || 'Student'),
            verification_status: safeVerificationStatus as UserProfile['verification_status'],
          };
          const hydratedUser: UserProfile = normalizedAvatar
            ? {
                ...sanitizedUser,
                avatar_url: normalizedAvatar,
                avatarUrl: normalizedAvatar,
                photoUrl: normalizedAvatar,
              }
            : sanitizedUser;
          setCurrentUser(hydratedUser);
          return { success: true, user: hydratedUser };
        }

        return { success: false, error: 'User profile record not found in database.' };
      } catch (err: any) {
        const isAbortOrTimeout =
          err?.name === 'AbortError' || toSafeLower(err?.message).includes('timed out');
        const fallbackResult = await tryDirectSupabaseLogin();
        if (fallbackResult) {
          return fallbackResult;
        }
        return {
          success: false,
          status: isAbortOrTimeout ? 504 : undefined,
          error: isAbortOrTimeout
            ? 'Login request timed out. Please check your connection and try again.'
            : toSafeString(err, 'Unable to reach authentication service. Please try again.'),
        };
      } finally {
        isCheckingLoginRef.current = false;
      }
    };

    const promise = runLogin().finally(() => {
      if (inFlightLoginRef.current === promise) {
        inFlightLoginRef.current = null;
      }
    });
    inFlightLoginRef.current = promise;
    return promise;
  };

  // Register using server-side proxy (backend enforces strict Supabase DB & Auth persistence)
  const register = async (formData: FormData) => {
    try {
      // Send FormData directly to backend
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin',
        body: formData,
      });

      let data: any = {};
      const contentType = toSafeLower(resp.headers.get('content-type'));
      if (contentType.includes('application/json')) {
        try {
          data = await resp.json();
        } catch {
          data = {};
        }
      } else {
        const text = await resp.text().catch(() => '');
        console.warn('[Register] Non-JSON response received:', text.slice(0, 200));
        if (text.includes('Starting Server')) {
          data = { error: 'The server is currently starting up. Please wait a few seconds and try submitting again.' };
        } else if (resp.status === 403) {
          data = { error: 'Preview session expired (HTTP 403). Please refresh the page and try submitting again.' };
        } else {
          data = { error: 'Server returned an unexpected response format. Please try again.' };
        }
      }

      if (!resp.ok) {
        return { success: false, error: toSafeString(data?.error ?? data?.message ?? data, 'Registration failed.') };
      }

      return { 
        success: true, 
        user: data.user,
      };
    } catch (err: any) {
      return { success: false, error: toSafeString(err, 'Registration processing error.') };
    }
  };

  // Re-upload student document using direct Storage upload
  const reuploadDocument = async (file: File) => {
    if (!currentUser || !isSupabaseReady) return { success: false, error: 'Not authenticated' };
    if (file.size > 3.5 * 1024 * 1024) {
      return { success: false, error: 'File size exceeds the 3.5MB limit. Please choose a smaller image.' };
    }
    try {
      const userId = currentUser.id;
      const fileExt = file.name.split('.').pop() || 'png';
      const storagePath = `${userId}/${Date.now()}_clearer_copy.${fileExt}`;

      const { error: storageErr } = await supabase.storage
        .from('student-documents')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (storageErr) throw storageErr;

      await supabase.from('student_documents').insert([{
        user_id: userId,
        document_type: currentUser.reviewee_type === 'Graduating Education Student' ? 'STUDENT_ID' : 'CERTIFICATE',
        file_name: file.name,
        file_url: storagePath,
        mime_type: file.type,
        file_size: file.size,
        authenticity_status: 'PENDING_REVIEW',
      }]);

      await supabase
        .from('profiles')
        .update({ verification_status: 'PENDING_VERIFICATION', rejection_reason: null })
        .eq('id', userId);

      await refreshProfile();
      return { success: true, user: currentUser };
    } catch (err: any) {
      return { success: false, error: toSafeString(err, 'Re-upload failed.') };
    }
  };

  // Dynamic Avatar Upload: backend proxy first (guarantees working signed/public URL), then safe signed Storage fallback
  const updateAvatar = async (file: File): Promise<{ success: boolean; avatar_url?: string; error?: string }> => {
    if (!currentUser || !isSupabaseReady) return { success: false, error: 'Not authenticated' };
    if (file.size > 3.5 * 1024 * 1024) {
      return { success: false, error: 'File size exceeds the 3.5MB limit. Please choose a smaller image.' };
    }

    const applyLocalAvatar = (url: string) => {
      setCurrentUser((prev) =>
        prev
          ? {
              ...prev,
              avatar_url: url,
              avatarUrl: url,
              photoUrl: url,
            }
          : null
      );
    };

    // 1. Primary: upload via server proxy (/api/profile/avatar) which uses service role & signed/public URLs reliably
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes?.session?.access_token || localStorage.getItem('boardbuddy_auth_token');
      if (token) {
        const formData = new FormData();
        formData.append('avatar', file);
        const resp = await fetch('/api/profile/avatar', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: formData,
        });
        const contentType = toSafeLower(resp.headers.get('content-type'));
        if (contentType.includes('application/json')) {
          try {
            const data = await resp.json();
            const uploadedUrl = getAvatarUrl(data) || getAvatarUrl(data?.user);
            if (resp.ok && data?.success && uploadedUrl) {
              applyLocalAvatar(uploadedUrl);
              return { success: true, avatar_url: uploadedUrl };
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    // 2. Fallback: direct Supabase Storage upload using signed URLs for private student-documents bucket
    try {
      const userId = currentUser.id;
      const fileExt = file.name.split('.').pop() || 'png';
      const storagePath = `avatars/${userId}/${Date.now()}_avatar.${fileExt}`;

      const { error: storageErr } = await supabase.storage
        .from('avatars')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (!storageErr) {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(storagePath);
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
        applyLocalAvatar(publicUrl);
        return { success: true, avatar_url: publicUrl };
      }

      // Upload into student-documents and generate a 5-year signed URL (never getPublicUrl on private bucket)
      const fallbackPath = `${userId}/avatar_${Date.now()}.${fileExt}`;
      const { error: fbErr } = await supabase.storage
        .from('student-documents')
        .upload(fallbackPath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (!fbErr) {
        const { data: signedData } = await supabase.storage
          .from('student-documents')
          .createSignedUrl(fallbackPath, 5 * 365 * 24 * 3600);

        if (signedData?.signedUrl) {
          await supabase.from('profiles').update({ avatar_url: signedData.signedUrl }).eq('id', userId);
          applyLocalAvatar(signedData.signedUrl);
          return { success: true, avatar_url: signedData.signedUrl };
        }
      }

      // 3. Final fallback: inline Base64 data URI persisted in profiles.avatar_url
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      });

      if (!dataUri) throw new Error('Unable to process selected image.');
      await supabase.from('profiles').update({ avatar_url: dataUri }).eq('id', userId);
      applyLocalAvatar(dataUri);
      return { success: true, avatar_url: dataUri };
    } catch (err: any) {
      return { success: false, error: toSafeString(err, 'Avatar upload network error.') };
    }
  };

  // Remove avatar using backend endpoint + direct DB fallback
  const removeAvatar = async (): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser || !isSupabaseReady) return { success: false, error: 'Not authenticated' };
    try {
      try {
        const { data: sessionRes } = await supabase.auth.getSession();
        const token = sessionRes?.session?.access_token || localStorage.getItem('boardbuddy_auth_token');
        if (token) {
          await fetch('/api/profile/avatar', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch (_) {}

      await supabase.from('profiles').update({ avatar_url: null }).eq('id', currentUser.id);
      setCurrentUser((prev) =>
        prev ? { ...prev, avatar_url: undefined, avatarUrl: undefined, photoUrl: undefined } : null
      );
      return { success: true };
    } catch (err: any) {
      return { success: false, error: toSafeString(err, 'Avatar removal error.') };
    }
  };

  // Logout from Supabase Auth & reliably clear all local session state
  const logout = async () => {
    isLoggingOutRef.current = true;
    setCurrentUser(null);
    setIsLoading(false);

    if (isSupabaseReady) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase sign out error:', e);
      }
    }

    try {
      // Clear Supabase session tokens and all auth keys from storage to prevent stale re-authentication
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('sb-') ||
           key.includes('supabase') ||
           key.includes('-auth-token'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
      try { localStorage.removeItem('boardbuddy_auth_token'); } catch (e) {}
      try { sessionStorage.clear(); } catch (e) {}
    } catch (e) {}
  };

  // Refresh profile from Supabase DB
  const refreshProfile = async () => {
    if (!currentUser) return;
    const updated = await fetchProfileFromSupabase(currentUser.id);
    if (updated) {
      setCurrentUser(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        login,
        register,
        reuploadDocument,
        logout,
        refreshProfile,
        updateAvatar,
        removeAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

