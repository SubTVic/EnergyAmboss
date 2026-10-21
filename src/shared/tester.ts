import { readJson, writeJson } from './storage';

const KEY = 'tester';

/** Tester-Kürzel: aus ?t=K1 übernommen, sonst aus localStorage. */
export function getTester(): string {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('t');
    if (fromUrl) {
      writeJson(KEY, fromUrl);
      return fromUrl;
    }
  } catch {
    /* ignorieren */
  }
  return readJson<string>(KEY, '');
}

export function setTester(value: string): void {
  writeJson(KEY, value.trim());
}

/** Fragt einmalig nach dem Kürzel, falls noch keins bekannt ist. */
export function ensureTester(): string {
  let t = getTester();
  if (!t) {
    const answer = window.prompt('Kürzel oder Name für die Auswertung (z. B. K1):', '');
    t = (answer ?? '').trim();
    if (t) setTester(t);
  }
  return t;
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
