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
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) ?? "";
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
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAdmin(): boolean {
  return getUser()?.role === "admin";
}

export function getUploadPath(): string {
  const user = getUser();
  if (user?.role === "admin") return "/admin";
  const slug = user?.company_slug;
  return slug ? `/${slug}` : "/login";
}

export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
