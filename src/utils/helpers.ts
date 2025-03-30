/**
 * Helper utilities for various common operations
 */

/**
 * Pauses execution for the specified duration
 * @param ms Duration to sleep in milliseconds
 * @returns Promise that resolves after the specified duration
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Formats a date to a readable string
 * @param date Date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Truncates text to a specified length
 * @param text Text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Generates a random ID
 * @returns Random string ID
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

/**
 * Cache helpers
 */

export const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export interface CachedData<T> {
  timestamp: number;
  data: T[];
}

/**
 * Retrieves cached data from localStorage if it exists and is not expired.
 * @param key The localStorage key for the cache.
 * @returns The cached data array or null if not found or expired.
 */
export function getCachedData<T>(key: string): T[] | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;

  const cached = localStorage.getItem(key);
  if (!cached) {
    console.log(`[Cache] No cache found for key: ${key}`);
    return null;
  }

  try {
    const parsed: CachedData<T> = JSON.parse(cached);
    const now = Date.now();
    if (now - parsed.timestamp < CACHE_DURATION_MS) {
      console.log(`[Cache] Using fresh cache for key: ${key}`);
      return parsed.data;
    } else {
      console.log(`[Cache] Cache expired for key: ${key}`);
      localStorage.removeItem(key); // Remove expired cache
      return null;
    }
  } catch (e) {
    console.error(`[Cache] Error parsing cache for key ${key}:`, e);
    localStorage.removeItem(key); // Remove corrupted cache
    return null;
  }
}

/**
 * Stores data in localStorage with a timestamp.
 * @param key The localStorage key for the cache.
 * @param data The data array to store.
 */
export function setCachedData<T>(key: string, data: T[]) {
  if (typeof window === 'undefined' || !window.localStorage) return;

  const cacheEntry: CachedData<T> = {
    timestamp: Date.now(),
    data: data,
  };
  try {
    localStorage.setItem(key, JSON.stringify(cacheEntry));
    console.log(`[Cache] Stored ${data.length} items in cache for key: ${key}`);
  } catch (e) {
    console.error(`[Cache] Error storing cache for key ${key}:`, e);
    // Optional: Handle potential storage quota errors
  }
} 