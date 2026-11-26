const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

let inMemoryCsrfToken: string | null = null;

export function setCsrfToken(token: string | null) {
  inMemoryCsrfToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      sessionStorage.setItem('askrev_csrf_token', token);
    } else {
      sessionStorage.removeItem('askrev_csrf_token');
    }
  }
}

/**
 * Retrieve CSRF token from document cookies or session storage (double-submit pattern).
 * Prioritizes the current valid CSRF cookie where accessible in browser environments
 * to ensure strict synchronization with ambient credentials sent in Cookie headers.
 */
export function getCsrfToken(): string | null {
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)askrev_csrf_token=([^;]+)/);
    if (match && match[1]) {
      const cookieVal = decodeURIComponent(match[1]).trim();
      if (cookieVal) {
        inMemoryCsrfToken = cookieVal;
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('askrev_csrf_token', cookieVal);
          } catch {}
        }
        return cookieVal;
      }
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const fromSession = sessionStorage.getItem('askrev_csrf_token');
      if (fromSession) {
        inMemoryCsrfToken = fromSession;
        return fromSession;
      }
    } catch {}
  }

  return inMemoryCsrfToken;
}

/**
 * Browser Session Security Handler:
 * Pure HttpOnly cookie authentication for normal user/admin sessions.
 * When in Admin Support Mode, returns the ephemeral support token from sessionStorage.
 */
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('askrev_support_token') || null;
  }
  return null;
}

export function getRefreshToken(): string | null {
  return null;
}

export function setAuthSession(
  arg1?: any,
  arg2?: any,
  arg3?: string,
  arg4?: string
) {
  if (typeof window === 'undefined') return;

  let user: any = null;
  let csrf: string | undefined = undefined;

  if (arg1 && typeof arg1 === 'object' && !arg2) {
    user = arg1;
  } else if (arg1 && typeof arg1 === 'object' && typeof arg2 === 'string') {
    user = arg1;
    csrf = arg2;
  } else if (typeof arg1 === 'string' && arg2 && typeof arg2 === 'object') {
    user = arg2;
    csrf = arg4;
  } else if (arg2 && typeof arg2 === 'object') {
    user = arg2;
  }

  if (csrf) {
    setCsrfToken(csrf);
  }

  if (user) {
    localStorage.setItem('askrev_user', JSON.stringify(user));
  }

  // Strictly eliminate tokens from browser storage
  localStorage.removeItem('askrev_access_token');
  localStorage.removeItem('askrev_refresh_token');
  sessionStorage.removeItem('askrev_admin_access_token');

  // Clear any prior session popup dismissals on fresh login
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('askrev_popup_session_dismissed_')) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {}
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('askrev_access_token');
  localStorage.removeItem('askrev_refresh_token');
  localStorage.setItem('askrev_user', '');
  localStorage.removeItem('askrev_user');
  sessionStorage.removeItem('askrev_admin_access_token');
  sessionStorage.removeItem('askrev_admin_preview');
  sessionStorage.removeItem('askrev_csrf_token');
  inMemoryCsrfToken = null;

  // Clear any temporary session popup dismissal flags on logout
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('askrev_popup_session_dismissed_')) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {}
}

export const clearAuth = clearAuthSession;

export async function logoutSession(): Promise<void> {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken()! } : {}),
      },
    });
  } catch {
    // Always clear client credentials even if server call fails
  } finally {
    clearAuthSession();
  }
}

export function getStoredUser(): any | null {
  if (typeof window === 'undefined') return null;
  const user = localStorage.getItem('askrev_user');
  if (!user) return null;
  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

let pendingRefreshPromise: Promise<boolean> | null = null;
let authBroadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  try {
    authBroadcastChannel = new BroadcastChannel('askrev_auth_channel');
    authBroadcastChannel.onmessage = (event) => {
      if (event?.data?.type === 'REFRESH_SUCCESS' && event?.data?.user) {
        try {
          localStorage.setItem('askrev_user', JSON.stringify(event.data.user));
        } catch {}
      } else if (event?.data?.type === 'SESSION_REVOKED') {
        clearAuthSession();
      }
    };
  } catch {}
}

export async function attemptTokenRefresh(): Promise<boolean> {
  // Support session tokens do not use refresh rotation
  if (typeof window !== 'undefined' && sessionStorage.getItem('askrev_support_token')) {
    return false;
  }

  if (pendingRefreshPromise) {
    return pendingRefreshPromise;
  }

  // Cross-tab coordination: check if another tab is already refreshing
  if (typeof window !== 'undefined') {
    const activeTime = parseInt(localStorage.getItem('askrev_refresh_active') || '0', 10);
    const now = Date.now();
    if (activeTime && now - activeTime < 4000) {
      // Another tab is actively refreshing: wait up to 1.5 seconds for completion
      await new Promise((resolve) => setTimeout(resolve, 800));
      const postWaitStored = getStoredUser();
      if (postWaitStored) {
        return true;
      }
    }
    localStorage.setItem('askrev_refresh_active', String(Date.now()));
  }

  pendingRefreshPromise = (async () => {
    try {
      let csrf = getCsrfToken();
      if (!csrf) {
        csrf = await ensureCsrfToken();
      }

      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        // Only clear session if explicitly unauthenticated (401),
        // NEVER on transient network drops or server restarts (500, 502, 503, 504)
        if (res.status === 401) {
          clearAuthSession();
          authBroadcastChannel?.postMessage({ type: 'SESSION_REVOKED' });
        }
        return false;
      }

      const data = await res.json();
      if (data?.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      if (data?.user) {
        localStorage.setItem('askrev_user', JSON.stringify(data.user));
        authBroadcastChannel?.postMessage({ type: 'REFRESH_SUCCESS', user: data.user });
      }
      return true;
    } catch {
      // Network failure: do NOT immediately log out the user
      return false;
    } finally {
      pendingRefreshPromise = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('askrev_refresh_active');
      }
    }
  })();

  return pendingRefreshPromise;
}

/**
 * Ensure a valid CSRF token exists; if missing or forced, proactively fetch from /auth/csrf
 */
export async function ensureCsrfToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh) {
    const existing = getCsrfToken();
    if (existing) return existing;
  }
  try {
    const res = await fetch(`${API_BASE}/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.csrfToken) {
        setCsrfToken(data.csrfToken);
        return data.csrfToken;
      }
    }
  } catch {
    // Non-blocking fallback
  }
  return getCsrfToken();
}

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const token = getAuthToken();
  const method = (options.method || 'GET').toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Support-Mode'] = 'true';
  } else if (typeof window !== 'undefined' && sessionStorage.getItem('askrev_support_token')) {
    headers['X-Support-Mode'] = 'true';
  }

  let csrf = getCsrfToken();
  if (!csrf && isMutation && !endpoint.startsWith('/auth/csrf') && !endpoint.startsWith('/auth/login')) {
    csrf = await ensureCsrfToken();
  }

  if (csrf && isMutation) {
    headers['X-CSRF-Token'] = csrf;
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  // Handle 401 Unauthorized (expired token refresh & single retry)
  if (
    response.status === 401 &&
    !isRetry &&
    !endpoint.startsWith('/auth/login') &&
    !endpoint.startsWith('/auth/register') &&
    !endpoint.startsWith('/auth/refresh')
  ) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      return fetchApi<T>(endpoint, options, true);
    } else {
      clearAuthSession();
    }
  }

  // Handle 403 Forbidden specifically due to explicit CSRF token mismatch
  if (
    response.status === 403 &&
    !isRetry &&
    isMutation &&
    !endpoint.startsWith('/auth/csrf')
  ) {
    let isCsrfMismatch = false;
    try {
      const cloned = response.clone();
      const errData = await cloned.json();
      const message = Array.isArray(errData?.message)
        ? errData.message.join('. ')
        : (errData?.message || '');
      if (
        typeof message === 'string' &&
        (message.toLowerCase().includes('csrf') || message.toLowerCase().includes('token mismatch'))
      ) {
        isCsrfMismatch = true;
      }
    } catch {}

    if (isCsrfMismatch) {
      const freshCsrf = await ensureCsrfToken(true);
      if (freshCsrf) {
        const retryHeaders: Record<string, string> = {
          ...headers,
          'X-CSRF-Token': freshCsrf,
        };
        const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
          credentials: 'include',
          ...options,
          headers: retryHeaders,
        });

        if (retryResponse.ok) {
          return retryResponse.json();
        }
        response = retryResponse;
      }
    }
  }

  if (!response.ok) {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const errData = await response.json();
      if (Array.isArray(errData.message)) {
        errorMessage = errData.message.join('. ');
      } else if (errData.message) {
        errorMessage = errData.message;
      }
    } catch { }
    throw new Error(errorMessage);
  }

  return response.json();
}

/**
 * Upload product photo with authorization for Admin Product Catalog
 */
export async function uploadProductImageApi(
  file: File,
  slugPrefix?: string,
  target: 'gallery' | 'variant' = 'gallery'
): Promise<{ url: string; filename: string; storageProvider?: string }> {
  const token = getAuthToken();
  let csrf = getCsrfToken();
  if (!csrf) {
    csrf = await ensureCsrfToken();
  }
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Support-Mode'] = 'true';
  } else if (typeof window !== 'undefined' && sessionStorage.getItem('askrev_support_token')) {
    headers['X-Support-Mode'] = 'true';
  }
  if (csrf) {
    headers['X-CSRF-Token'] = csrf;
  }

  const query = `?slug=${encodeURIComponent(slugPrefix || 'catalog')}&target=${target}`;
  let response = await fetch(`${API_BASE}/admin/products/upload-image${query}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });

  // Safe one-time CSRF retry on explicit token mismatch
  if (response.status === 403) {
    let isCsrfMismatch = false;
    try {
      const cloned = response.clone();
      const errData = await cloned.json();
      const message = Array.isArray(errData?.message)
        ? errData.message.join('. ')
        : (errData?.message || '');
      if (
        typeof message === 'string' &&
        (message.toLowerCase().includes('csrf') || message.toLowerCase().includes('token mismatch'))
      ) {
        isCsrfMismatch = true;
      }
    } catch {}

    if (isCsrfMismatch) {
      const freshCsrf = await ensureCsrfToken(true);
      if (freshCsrf) {
        const retryHeaders: Record<string, string> = {
          ...headers,
          'X-CSRF-Token': freshCsrf,
        };
        const retryResponse = await fetch(`${API_BASE}/admin/products/upload-image${query}`, {
          method: 'POST',
          credentials: 'include',
          headers: retryHeaders,
          body: formData,
        });
        if (retryResponse.ok) {
          return retryResponse.json();
        }
        response = retryResponse;
      }
    }
  }

  if (!response.ok) {
    let errMessage = 'Image upload failed';
    try {
      const err = await response.json();
      errMessage = err.message || errMessage;
    } catch { }
    throw new Error(errMessage);
  }

  return response.json();
}

/**
 * Safe delete image from storage (Cloudflare R2 or local)
 */
export async function deleteProductImageApi(url: string): Promise<{ deleted: boolean; reason?: string }> {
  return fetchApi<{ deleted: boolean; reason?: string }>(
    `/admin/products/image?url=${encodeURIComponent(url)}`,
    { method: 'DELETE' }
  );
}

/**
 * Check if the stored session belongs to an administrative user
 */
export function isAdminUser(): boolean {
  if (typeof window === 'undefined') return false;
  const user = getStoredUser();
  if (!user) return false;
  const role = (user.role || '').toUpperCase();
  return role === 'SUPER_ADMIN' || role === 'ADMIN_OPERATIONS' || role === 'ADMIN';
}

/**
 * Determine whether Admin Preview Mode is currently active
 */
export function isAdminPreviewActive(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.search.includes('preview=true')) return true;
  if (isAdminUser()) {
    const pref = sessionStorage.getItem('askrev_admin_preview');
    return pref !== 'false'; // Defaults to active for administrators
  }
  return false;
}

/**
 * Toggle Admin Preview Mode on or off
 */
export function setAdminPreviewActive(active: boolean) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('askrev_admin_preview', active ? 'true' : 'false');
  window.dispatchEvent(new Event('askrev_preview_change'));
}

/**
 * Public catalog fetcher with dynamic live revalidation and authenticated draft preview support
 */
export async function fetchPublishedCatalog(params?: {
  category?: string;
  featured?: boolean;
  preview?: boolean;
}): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.category) query.append('category', params.category);
  if (params?.featured) query.append('featured', 'true');
  if (params?.preview) query.append('preview', 'true');
  const qs = query.toString() ? `?${query.toString()}` : '';

  let token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Support-Mode'] = 'true';
  } else if (typeof window !== 'undefined' && sessionStorage.getItem('askrev_support_token')) {
    headers['X-Support-Mode'] = 'true';
  }

  let res = await fetch(`${API_BASE}/catalog${qs}`, {
    cache: 'no-store',
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch catalog from ${API_BASE}/catalog: ${res.status} ${res.statusText}`);
  }

  let items = await res.json();

  // If preview was requested and caller is an admin, but the response contained 0 real fleet models
  // (which happens if the access token cookie silently expired), refresh credentials and retry once
  if (params?.preview && isAdminUser() && Array.isArray(items)) {
    const hasRealFleet = items.some((p: any) => p.slug && p.slug.startsWith('askr-ev-'));
    if (!hasRealFleet) {
      try {
        const refreshed = await attemptTokenRefresh();
        if (refreshed) {
          const retryRes = await fetch(`${API_BASE}/catalog${qs}`, {
            cache: 'no-store',
            credentials: 'include',
            headers,
          });
          if (retryRes.ok) {
            items = await retryRes.json();
          }
        }
      } catch {
        // Fall back to current response
      }
    }
  }

  return items;
}

/**
 * Public hero slides fetcher with authenticated draft preview support
 */
export async function fetchHeroSlides(preview: boolean = false): Promise<any[]> {
  const qs = preview ? '?preview=true' : '';
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Support-Mode'] = 'true';
  } else if (typeof window !== 'undefined' && sessionStorage.getItem('askrev_support_token')) {
    headers['X-Support-Mode'] = 'true';
  }

  const res = await fetch(`${API_BASE}/catalog/hero${qs}`, {
    cache: 'no-store',
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch hero slides: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function fetchProductBySlug(slug: string, preview: boolean = false): Promise<any> {
  const qs = preview ? '?preview=true' : '';
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Support-Mode'] = 'true';
  } else if (typeof window !== 'undefined' && sessionStorage.getItem('askrev_support_token')) {
    headers['X-Support-Mode'] = 'true';
  }

  const res = await fetch(`${API_BASE}/catalog/${encodeURIComponent(slug)}${qs}`, {
    cache: 'no-store',
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch product '${slug}': ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// =============================================================================
// INDEPENDENT HOMEPAGE HERO SLIDER APIs
// =============================================================================

/**
 * Public storefront: fetch active hero slider slides (with optional authenticated admin preview)
 */
export async function fetchHeroSliderSlides(preview: boolean = false): Promise<any[]> {
  const qs = preview ? '?preview=true' : '';
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Support-Mode'] = 'true';
  } else if (typeof window !== 'undefined' && sessionStorage.getItem('askrev_support_token')) {
    headers['X-Support-Mode'] = 'true';
  }

  const res = await fetch(`${API_BASE}/homepage/hero-slides${qs}`, {
    cache: 'no-store',
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch homepage hero slides: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Admin: fetch all hero slides with optional filters
 */
export async function adminFetchHeroSlides(params?: {
  status?: string;
  search?: string;
}): Promise<any[]> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);
  if (params?.search) query.append('search', params.search);
  const qs = query.toString() ? `?${query.toString()}` : '';

  return fetchApi<any[]>(`/admin/homepage/hero-slides${qs}`);
}

/**
 * Admin: get single hero slide by ID
 */
export async function adminGetHeroSlide(id: string): Promise<any> {
  return fetchApi<any>(`/admin/homepage/hero-slides/${id}`);
}

/**
 * Admin: create a new hero slide
 */
export async function adminCreateHeroSlide(data: any): Promise<any> {
  return fetchApi<any>('/admin/homepage/hero-slides', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Admin: update an existing hero slide
 */
export async function adminUpdateHeroSlide(id: string, data: any): Promise<any> {
  return fetchApi<any>(`/admin/homepage/hero-slides/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * Admin: reorder hero slides transactionally
 */
export async function adminReorderHeroSlides(slideIds: string[]): Promise<any> {
  return fetchApi<any>('/admin/homepage/hero-slides/reorder', {
    method: 'POST',
    body: JSON.stringify({ slideIds }),
  });
}

/**
 * Admin: publish a hero slide
 */
export async function adminPublishHeroSlide(id: string): Promise<any> {
  return fetchApi<any>(`/admin/homepage/hero-slides/${id}/publish`, {
    method: 'POST',
  });
}

/**
 * Admin: unpublish a hero slide
 */
export async function adminUnpublishHeroSlide(id: string): Promise<any> {
  return fetchApi<any>(`/admin/homepage/hero-slides/${id}/unpublish`, {
    method: 'POST',
  });
}

/**
 * Admin: duplicate a hero slide
 */
export async function adminDuplicateHeroSlide(id: string): Promise<any> {
  return fetchApi<any>(`/admin/homepage/hero-slides/${id}/duplicate`, {
    method: 'POST',
  });
}

/**
 * Admin: delete or archive a hero slide
 */
export async function adminDeleteHeroSlide(id: string): Promise<any> {
  return fetchApi<any>(`/admin/homepage/hero-slides/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Admin: upload hero slide photograph (desktop or mobile)
 */
export async function adminUploadHeroImage(
  file: File,
  kind: 'desktop' | 'mobile' = 'desktop',
  name: string = 'hero'
): Promise<{ url: string; filename: string }> {
  const token = getAuthToken();
  let csrf = getCsrfToken();
  if (!csrf) {
    csrf = await ensureCsrfToken();
  }
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (csrf) headers['X-CSRF-Token'] = csrf;

  const url = `${API_BASE}/admin/homepage/hero-slides/upload-image?kind=${kind}&name=${encodeURIComponent(name)}`;
  let res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });

  // Safe one-time CSRF retry on explicit token mismatch
  if (res.status === 403) {
    let isCsrfMismatch = false;
    try {
      const cloned = res.clone();
      const errData = await cloned.json();
      const message = Array.isArray(errData?.message)
        ? errData.message.join('. ')
        : (errData?.message || '');
      if (
        typeof message === 'string' &&
        (message.toLowerCase().includes('csrf') || message.toLowerCase().includes('token mismatch'))
      ) {
        isCsrfMismatch = true;
      }
    } catch {}

    if (isCsrfMismatch) {
      const freshCsrf = await ensureCsrfToken(true);
      if (freshCsrf) {
        const retryHeaders: Record<string, string> = {
          ...headers,
          'X-CSRF-Token': freshCsrf,
        };
        const retryRes = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: retryHeaders,
          body: formData,
        });
        if (retryRes.ok) {
          return retryRes.json();
        }
        res = retryRes;
      }
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to upload hero image: ${res.status}`);
  }

  return res.json();
}

/**
 * =============================================================================
 * ADMIN ACCOUNT SECURITY & TWO-FACTOR AUTHENTICATION (MFA)
 * =============================================================================
 */

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  totpCode?: string;
  recoveryCode?: string;
}

export interface SetupMfaResponse {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
  issuer: string;
  accountName: string;
  instructions: string;
}

export interface EnableMfaResponse {
  message: string;
  recoveryCodes: string[];
}

/**
 * Change account password with current-password verification, strong policy,
 * optional MFA challenge, and complete session revocation.
 */
export async function authChangePassword(payload: ChangePasswordPayload): Promise<{ message: string; success: boolean }> {
  return fetchApi<{ message: string; success: boolean }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Request TOTP MFA setup parameters (Base32 secret, otpauth URL, QR code)
 */
export async function authSetupMfa(): Promise<SetupMfaResponse> {
  return fetchApi<SetupMfaResponse>('/auth/mfa/setup', {
    method: 'POST',
  });
}

/**
 * Confirm and activate Two-Factor Authentication with 6-digit TOTP code
 */
export async function authEnableMfa(code: string, secret?: string): Promise<EnableMfaResponse> {
  return fetchApi<EnableMfaResponse>('/auth/mfa/enable', {
    method: 'POST',
    body: JSON.stringify({ code, secret }),
  });
}

/**
 * Disable Two-Factor Authentication with password and TOTP code verification
 */
export async function authDisableMfa(password: string, code: string): Promise<{ message: string }> {
  return fetchApi<{ message: string }>('/auth/mfa/disable', {
    method: 'POST',
    body: JSON.stringify({ password, code }),
  });
}

/**
 * Sign out all active devices and revoke all refresh tokens
 */
export async function authRevokeAllSessions(): Promise<{ message: string; success: boolean }> {
  return fetchApi<{ message: string; success: boolean }>('/auth/revoke-all-sessions', {
    method: 'POST',
  });
}

/**
 * Fetch latest authenticated user profile and synchronize localStorage
 */
export async function fetchCurrentUserProfile(): Promise<any> {
  const profile = await fetchApi<any>('/auth/me');
  if (profile && typeof window !== 'undefined') {
    localStorage.setItem('askrev_user', JSON.stringify(profile));
  }
  return profile;
}

/**
 * Bulk archive products safely (sets status = ARCHIVED)
 */
export async function bulkArchiveProductsApi(ids: string[]): Promise<{ success: boolean; count: number }> {
  return fetchApi<{ success: boolean; count: number }>('/admin/products/bulk-archive', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

/**
 * Safe restore an archived product back to DRAFT status
 */
export async function restoreProductApi(id: string): Promise<{ success: boolean; product: any }> {
  return fetchApi<{ success: boolean; product: any }>(`/admin/products/${id}/restore`, {
    method: 'PATCH',
  });
}

/**
 * =============================================================================
 * DASHBOARD BANNERS & WELCOME POPUP APIS
 * =============================================================================
 */

export async function fetchActiveBanners(): Promise<{
  topBanner: any | null;
  slides: any[];
  popupCampaign: any | null;
}> {
  return fetchApi<{ topBanner: any | null; slides: any[]; popupCampaign: any | null }>('/banners/active');
}

export async function dismissPopupCampaign(campaignId: string): Promise<any> {
  return fetchApi<any>(`/banners/popup/${campaignId}/dismiss`, {
    method: 'POST',
  });
}

export async function adminFetchTopBanner(): Promise<any> {
  return fetchApi<any>('/admin/banners/top');
}

export async function adminUpdateTopBanner(dto: any): Promise<any> {
  return fetchApi<any>('/admin/banners/top', {
    method: 'PUT',
    body: JSON.stringify(dto),
  });
}

export async function adminUploadBannerImage(
  file: File,
  kind: 'top' | 'popup' = 'top'
): Promise<{ url: string; filename: string }> {
  const token = getAuthToken();
  let csrf = getCsrfToken();
  if (!csrf) {
    csrf = await ensureCsrfToken();
  }
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (csrf) headers['X-CSRF-Token'] = csrf;

  const url = `${API_BASE}/admin/banners/upload-image?kind=${kind}`;
  let res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });

  // Safe one-time CSRF retry on explicit token mismatch
  if (res.status === 403) {
    let isCsrfMismatch = false;
    try {
      const cloned = res.clone();
      const errData = await cloned.json();
      const message = Array.isArray(errData?.message)
        ? errData.message.join('. ')
        : (errData?.message || '');
      if (
        typeof message === 'string' &&
        (message.toLowerCase().includes('csrf') || message.toLowerCase().includes('token mismatch'))
      ) {
        isCsrfMismatch = true;
      }
    } catch {}

    if (isCsrfMismatch) {
      const freshCsrf = await ensureCsrfToken(true);
      if (freshCsrf) {
        const retryHeaders: Record<string, string> = {
          ...headers,
          'X-CSRF-Token': freshCsrf,
        };
        const retryRes = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: retryHeaders,
          body: formData,
        });
        if (retryRes.ok) {
          return retryRes.json();
        }
        res = retryRes;
      }
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to upload banner image: ${res.status}`);
  }

  return res.json();
}

export async function adminFetchPopupCampaigns(): Promise<any[]> {
  return fetchApi<any[]>('/admin/banners/popups');
}

export async function adminFetchPopupCampaign(id: string): Promise<any> {
  return fetchApi<any>(`/admin/banners/popups/${id}`);
}

export async function adminCreatePopupCampaign(dto: any): Promise<any> {
  return fetchApi<any>('/admin/banners/popups', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function adminUpdatePopupCampaign(id: string, dto: any): Promise<any> {
  return fetchApi<any>(`/admin/banners/popups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function adminPublishPopupCampaign(id: string): Promise<any> {
  return fetchApi<any>(`/admin/banners/popups/${id}/publish`, {
    method: 'POST',
  });
}

export async function adminDisablePopupCampaign(id: string): Promise<any> {
  return fetchApi<any>(`/admin/banners/popups/${id}/disable`, {
    method: 'POST',
  });
}

export async function adminDeletePopupCampaign(id: string): Promise<any> {
  return fetchApi<any>(`/admin/banners/popups/${id}`, {
    method: 'DELETE',
  });
}

export async function adminFetchSlides(): Promise<any[]> {
  return fetchApi<any[]>('/admin/banners/slides');
}

export async function adminFetchSlide(id: string): Promise<any> {
  return fetchApi<any>(`/admin/banners/slides/${id}`);
}

export async function adminCreateSlide(dto: any): Promise<any> {
  return fetchApi<any>('/admin/banners/slides', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function adminUpdateSlide(id: string, dto: any): Promise<any> {
  return fetchApi<any>(`/admin/banners/slides/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export async function adminPublishSlide(id: string): Promise<any> {
  return fetchApi<any>(`/admin/banners/slides/${id}/publish`, {
    method: 'POST',
  });
}

export async function adminDisableSlide(id: string): Promise<any> {
  return fetchApi<any>(`/admin/banners/slides/${id}/disable`, {
    method: 'POST',
  });
}

export async function adminDeleteSlide(id: string): Promise<any> {
  return fetchApi<any>(`/admin/banners/slides/${id}`, {
    method: 'DELETE',
  });
}

export async function adminReorderSlides(slideIds: string[]): Promise<any[]> {
  return fetchApi<any[]>('/admin/banners/slides/reorder', {
    method: 'POST',
    body: JSON.stringify({ slideIds }),
  });
}

/**
 * =============================================================================
 * UAT COMPENSATION REFINEMENTS: LEGACY MATRIX, FLUSH & HOLD APIS
 * =============================================================================
 */

export async function fetchMyMatrixOverviewApi(): Promise<any> {
  return fetchApi<any>('/legacy-matrix/my-matrix');
}

export async function fetchMyMatrixQualificationApi(): Promise<any> {
  return fetchApi<any>('/legacy-matrix/qualification');
}

export async function fetchBinaryFlushHistoryApi(userId?: string): Promise<any> {
  const url = userId ? `/members/binary/flush-history?userId=${userId}` : '/members/binary/flush-history';
  return fetchApi<any>(url);
}

export async function fetchAdminMatrixTreeApi(rootSequence = 1, maxDepth = 4): Promise<any> {
  return fetchApi<any>(`/legacy-matrix/admin/tree?rootSequence=${rootSequence}&maxDepth=${maxDepth}`);
}

export async function fetchAdminMatrixReportApi(): Promise<any> {
  return fetchApi<any>('/legacy-matrix/admin/report');
}

export async function fetchAdminBinaryFlushesApi(): Promise<any[]> {
  return fetchApi<any[]>('/members/admin/binary-flushes');
}

export async function fetchAdminCommissionHoldsApi(): Promise<any[]> {
  return fetchApi<any[]>('/packages/admin/commission-holds');
}

export async function fetchMyCommissionHoldsApi(): Promise<any[]> {
  return fetchApi<any[]>('/packages/my-holds');
}

export async function fetchAdminVouchersApi(): Promise<any> {
  return fetchApi<any>('/vouchers/admin/all');
}

/**
 * =============================================================================
 * ADMIN SUPPORT MODE ("VIEW AS MEMBER") APIS & HELPERS
 * =============================================================================
 */

export interface SupportSessionData {
  targetUser: any;
  adminEmail: string;
  reason: string;
  expiresAt: string;
}

// In-memory support session storage (NOT persisted in localStorage or sessionStorage)
let inMemorySupportSession: SupportSessionData | null = null;

export function setSupportSession(data: SupportSessionData) {
  inMemorySupportSession = data;
  if (typeof window !== 'undefined') {
    // Clean up any legacy bearer tokens from storage
    sessionStorage.removeItem('askrev_support_token');
    sessionStorage.removeItem('askrev_support_meta');
  }
}

export function getSupportSession(): (SupportSessionData & { isSupportMode: boolean }) | null {
  if (!inMemorySupportSession) return null;
  return {
    ...inMemorySupportSession,
    isSupportMode: true,
  };
}

export function clearSupportSession() {
  inMemorySupportSession = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('askrev_support_token');
    sessionStorage.removeItem('askrev_support_meta');
    sessionStorage.removeItem('askrev_support_mode');
    localStorage.removeItem('askrev_support_meta');
    try {
      const stored = localStorage.getItem('askrev_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.isSupportMode || u?.role === 'ADMIN_SUPPORT' || sessionStorage.getItem('askrev_was_support')) {
          localStorage.removeItem('askrev_user');
        }
      }
      sessionStorage.removeItem('askrev_was_support');
    } catch {}
  }
}

export async function initiateAdminSupportSessionApi(dto: {
  targetMemberId: string;
  adminPassword?: string;
  consentCode?: string;
  reason?: string;
  consentReference?: string;
}): Promise<any> {
  return fetchApi<any>('/admin/support/initiate-session', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function exchangeAdminSupportSessionApi(exchangeCode: string): Promise<any> {
  return fetchApi<any>('/admin/support/exchange', {
    method: 'POST',
    body: JSON.stringify({ exchangeCode }),
  });
}

export async function exitAdminSupportSessionApi(): Promise<any> {
  try {
    return await fetchApi<any>('/admin/support/exit-session', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  } finally {
    clearSupportSession();
  }
}

export async function fetchAdminSupportAuditLogsApi(page = 1, limit = 50): Promise<any> {
  return fetchApi<any>(`/admin/support/audit-logs?page=${page}&limit=${limit}`);
}

export async function grantMemberSupportConsentApi(): Promise<any> {
  return fetchApi<any>('/members/support-consent/grant', {
    method: 'POST',
  });
}

export async function fetchActiveMemberSupportConsentApi(): Promise<any> {
  return fetchApi<any>('/members/support-consent/active');
}

export async function revokeMemberSupportConsentApi(): Promise<any> {
  return fetchApi<any>('/members/support-consent/revoke', {
    method: 'POST',
  });
}





