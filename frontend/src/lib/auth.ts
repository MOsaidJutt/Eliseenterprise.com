import { logEvent } from "./debugLog";

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
  } catch (err) {
    logEvent(`setToken: THREW — ${err instanceof Error ? err.message : String(err)}`);
    throw new Error(
      "Unable to save your session. If Private Browsing or \"Block All Cookies\" is enabled in Safari, please disable it and try again."
    );
  }
  // Read back immediately to catch a browser that silently no-ops the
  // write instead of throwing (some Safari privacy modes do this).
  const tokenOk = localStorage.getItem(TOKEN_KEY) === token;
  const userOk = localStorage.getItem(USER_KEY) === JSON.stringify(user);
  logEvent(`setToken: readback token=${tokenOk} user=${userOk}`);
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
    if (!raw) {
      logEvent(`getUser: no "${USER_KEY}" in localStorage (token present: ${Boolean(localStorage.getItem(TOKEN_KEY))})`);
      return null;
    }
    return JSON.parse(raw);
  } catch (err) {
    logEvent(`getUser: THREW — ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

// The cached user carries the company_slug that drives the workspace link, so
// an admin who reassigns their own company must not have to re-login for it.
export function updateCachedCompany(companyId: number, companySlug: string): void {
  if (typeof window === "undefined") return;
  const user = getUser();
  if (!user) return;
  try {
    localStorage.setItem(
      USER_KEY,
      JSON.stringify({ ...user, company_id: companyId, company_slug: companySlug })
    );
    logEvent(`updateCachedCompany: -> ${companySlug} (#${companyId})`);
  } catch (err) {
    logEvent(`updateCachedCompany: THREW — ${err instanceof Error ? err.message : String(err)}`);
  }
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
  const dest = user?.role === "admin" ? "/admin" : (user?.company_slug ? `/${user.company_slug}` : "/");
  logEvent(`getUploadPath: user=${user ? JSON.stringify(user) : "null"} -> ${dest}`);
  return dest;
}

export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
