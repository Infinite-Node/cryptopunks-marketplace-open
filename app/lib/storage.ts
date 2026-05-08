const VERSION = 1;
const NS = `punks-cache:v${VERSION}:`;

function ns(key: string) {
  return NS + key;
}

export function readImmutable<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ns(key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeImmutable<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ns(key), JSON.stringify(value));
  } catch {
    // quota exceeded, etc — ignore; we'll just refetch next time
  }
}

type Stamped<T> = { t: number; v: T };

export function readWithTtl<T>(key: string, ttlMs: number): T | null {
  const raw = readImmutable<Stamped<T>>(key);
  if (!raw) return null;
  if (Date.now() - raw.t > ttlMs) return null;
  return raw.v;
}

export function writeWithTtl<T>(key: string, value: T) {
  writeImmutable<Stamped<T>>(key, { t: Date.now(), v: value });
}

// Punk image SVGs and the attribute string for a given index never change once
// the CryptopunksData contract was deployed (2021). Safe to cache forever.
export const cacheKeys = {
  punkSvg: (i: number) => `punk:${i}:svg`,
  punkAttrs: (i: number) => `punk:${i}:attrs`,
  allAttrs: () => `attrs:all`,
  ownership: (addr: string) => `owner:${addr.toLowerCase()}`,
};
