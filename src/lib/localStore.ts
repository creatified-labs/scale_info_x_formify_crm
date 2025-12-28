const hasWindow = typeof window !== "undefined";

export function readLocal<T>(key: string, fallback: T): T {
  if (!hasWindow) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Failed to parse localStorage key ${key}`, err);
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T) {
  if (!hasWindow) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed to write localStorage key ${key}`, err);
  }
}

export function removeLocal(key: string) {
  if (!hasWindow) return;
  window.localStorage.removeItem(key);
}
