const KEY = "pv_debug_log";
const MAX = 40;

export function logEvent(msg: string): void {
  if (typeof window === "undefined") return;
  try {
    const arr: string[] = JSON.parse(sessionStorage.getItem(KEY) || "[]");
    const time = new Date().toTimeString().slice(0, 8);
    arr.push(`${time} ${msg}`);
    while (arr.length > MAX) arr.shift();
    sessionStorage.setItem(KEY, JSON.stringify(arr));
  } catch {
    // ignore — diagnostics must never break the app
  }
}

export function getLog(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function clearLog(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
