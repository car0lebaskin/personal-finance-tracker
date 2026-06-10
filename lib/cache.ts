export type VaultCachePayload<T> = {
  savedAt: string;
  data: T;
};

export function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VaultCachePayload<T>;
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), data }));
  } catch {
    // Ignore cache write failures. Vault still works without local cache.
  }
}

export function cacheAgeLabel(key: string) {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return '';
    const parsed = JSON.parse(raw) as VaultCachePayload<unknown>;
    const savedAt = new Date(parsed.savedAt).getTime();
    const minutes = Math.max(0, Math.round((Date.now() - savedAt) / 60000));
    if (minutes < 1) return 'Updated just now';
    if (minutes < 60) return `Updated ${minutes}m ago`;
    return `Updated ${Math.round(minutes / 60)}h ago`;
  } catch {
    return '';
  }
}
