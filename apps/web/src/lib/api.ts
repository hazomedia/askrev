const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('askrev_access_token');
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('askrev_refresh_token');
}

export function setAuthSession(token: string, user: any, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('askrev_access_token', token);
  localStorage.setItem('askrev_user', JSON.stringify(user));
  if (refreshToken) {
    localStorage.setItem('askrev_refresh_token', refreshToken);
  }
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
    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
    }
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
  if (!refreshToken) return null;

  if (pendingRefreshPromise) {
    return pendingRefreshPromise;
  }

  pendingRefreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE}${endpoint}`, {
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
    } catch {}
    throw new Error(errorMessage);
  }

  return response.json();
}
