const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Retrieve CSRF token from document cookies (double-submit pattern)
 */
export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)askrev_csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Legacy auth token helper (preserved for non-admin backward compatibility)
 * Admin accounts strictly use secure HttpOnly cookies.
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('askrev_access_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('askrev_refresh_token');
}

/**
 * Session storage handler:
 * CRITICAL SECURITY RULE: Admin credentials are NEVER written to localStorage.
 * Tokens are securely managed by the server in HttpOnly cookies.
 */
export function setAuthSession(token: string, user: any, refreshToken?: string) {
  if (typeof window === 'undefined') return;

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  if (isAdmin) {
    // Strictly purge any legacy tokens from localStorage for admin users
    localStorage.removeItem('askrev_access_token');
    localStorage.removeItem('askrev_refresh_token');
    localStorage.setItem('askrev_user', JSON.stringify(user));
    return;
  }

  // Non-admin fallback session persistence
  if (token) localStorage.setItem('askrev_access_token', token);
  if (user) localStorage.setItem('askrev_user', JSON.stringify(user));
  if (refreshToken) localStorage.setItem('askrev_refresh_token', refreshToken);
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('askrev_access_token');
  localStorage.removeItem('askrev_refresh_token');
  localStorage.removeItem('askrev_user');
}

export const clearAuth = clearAuthSession;

export async function logoutSession(): Promise<void> {
  const token = getAuthToken();
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

let pendingRefreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();

  if (pendingRefreshPromise) {
    return pendingRefreshPromise;
  }

  pendingRefreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(getCsrfToken() ? { 'X-CSRF-Token': getCsrfToken()! } : {}),
        },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
      if (!res.ok) {
        clearAuthSession();
        return null;
      }
      const data = await res.json();
      if (data?.tokens?.accessToken) {
        setAuthSession(
          data.tokens.accessToken,
          data.user || getStoredUser(),
          data.tokens.refreshToken
        );
        return data.tokens.accessToken as string;
      }
      clearAuthSession();
      return null;
    } catch {
      return null;
    } finally {
      pendingRefreshPromise = null;
    }
  })();

  return pendingRefreshPromise;
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const csrf = getCsrfToken();
  const method = (options.method || 'GET').toUpperCase();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (csrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    headers['X-CSRF-Token'] = csrf;
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (
    response.status === 401 &&
    !endpoint.startsWith('/auth/login') &&
    !endpoint.startsWith('/auth/register') &&
    !endpoint.startsWith('/auth/refresh')
  ) {
    const newAccessToken = await attemptTokenRefresh();
    if (newAccessToken) {
      headers['Authorization'] = `Bearer ${newAccessToken}`;
      response = await fetch(`${API_BASE}${endpoint}`, {
        credentials: 'include',
        ...options,
        headers,
      });
    } else if (token) {
      clearAuthSession();
    }
  }

  if (!response.ok) {
    let errorMessage = `API error: ${response.status} ${response.statusText}`;
    try {
      const errData = await response.json();
      errorMessage = errData.message || errorMessage;
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
  slugPrefix?: string
): Promise<{ url: string; filename: string; storageProvider?: string }> {
  const token = getAuthToken();
  const csrf = getCsrfToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (csrf) {
    headers['X-CSRF-Token'] = csrf;
  }

  const query = slugPrefix ? `?slug=${encodeURIComponent(slugPrefix)}` : '';
  const response = await fetch(`${API_BASE}/admin/products/upload-image${query}`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });

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

  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/catalog${qs}`, {
    cache: 'no-store',
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch catalog from ${API_BASE}/catalog: ${res.status} ${res.statusText}`);
  }

  return res.json();
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
  const csrf = getCsrfToken();
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (csrf) headers['X-CSRF-Token'] = csrf;

  const url = `${API_BASE}/admin/homepage/hero-slides/upload-image?kind=${kind}&name=${encodeURIComponent(name)}`;
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to upload hero image: ${res.status}`);
  }

  return res.json();
}
