const TOKEN_KEY = "pv_token";
const USER_KEY  = "pv_user";

export interface StoredUser {
  id: number;
  email: string;
  name: string;
  role: string;
  company_id: number | null;
  company_slug?: string | null;
}

export function setToken(token: string, user: StoredUser): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    throw new Error(
      "Unable to save your session. If Private Browsing or \"Block All Cookies\" is enabled in Safari, please disable it and try again."
    );
  }
}

export function getToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore — nothing to clean up if storage isn't accessible
  }
}

export function isAdmin(): boolean {
  return getUser()?.role === "admin";
}

// Callers only reach this once isLoggedIn() is already true, so a missing
// cached user (e.g. after a partial localStorage write) must never fall
// back to "/login" — that would sign out a user who is still holding a
// valid token. Fall back to the public landing page instead, which is
// always safe to show regardless of role.
export function getUploadPath(): string {
  const user = getUser();
  if (user?.role === "admin") return "/admin";
  const slug = user?.company_slug;
  return slug ? `/${slug}` : "/";
}

export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
