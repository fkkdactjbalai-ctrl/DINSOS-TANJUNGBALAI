// Robust, safe localStorage wrapper with automatic in-memory fallback
// This prevents uncaught SecurityError / Access Denied exceptions inside sandboxed cross-origin iframes or private browsing.

const memoryStorage: Record<string, string> = {};

export const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`Storage getItem blocked for key "${key}", using memory fallback.`, e);
    }
    return key in memoryStorage ? memoryStorage[key] : null;
  },
  
  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      console.warn(`Storage setItem blocked for key "${key}", using memory fallback.`, e);
    }
    memoryStorage[key] = String(value);
  },
  
  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(key);
        return;
      }
    } catch (e) {
      console.warn(`Storage removeItem blocked for key "${key}", using memory fallback.`, e);
    }
    delete memoryStorage[key];
  }
};
