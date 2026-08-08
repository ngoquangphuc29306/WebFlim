'use client';

/**
 * Utility functions for safe localStorage operations and browser/same-tab event handling.
 */

export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export function safeReadJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Storage] Failed to read or parse key "${key}":`, err);
    return fallback;
  }
}

export function safeWriteJson<T>(key: string, data: T, eventName?: string): boolean {
  if (!isBrowser()) return false;
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(key, serialized);
    if (eventName) {
      window.dispatchEvent(new Event(eventName));
    }
    return true;
  } catch (err) {
    console.warn(`[Storage] Failed to write key "${key}":`, err);
    return false;
  }
}

export function safeRemoveItem(key: string, eventName?: string): boolean {
  if (!isBrowser()) return false;
  try {
    localStorage.removeItem(key);
    if (eventName) {
      window.dispatchEvent(new Event(eventName));
    }
    return true;
  } catch (err) {
    console.warn(`[Storage] Failed to remove key "${key}":`, err);
    return false;
  }
}

export function subscribeStorageEvent(eventName: string, callback: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(eventName, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener('storage', callback);
  };
}
