import { readJson, removeKey, writeJson } from '../shared/storage';
import type { Domain } from '../shared/types';
import type { EffectivePanel, SessionItem } from './logic';
import type { QuestionResult } from './types';

export interface ASession {
  seed: number;
  domain: Domain | null;
  items: SessionItem[]; // inkl. angehängter Wiederholungen
  index: number;
  results: QuestionResult[]; // results[i] gehört zu items[i]
  /** Panel-Stand beim Start der Session, damit die Wertung während der Session stabil bleibt. */
  panels: Record<string, EffectivePanel>;
}

const KEY = 'a-session';

export const loadSession = (): ASession | null => readJson<ASession | null>(KEY, null);
export const saveSession = (s: ASession): void => writeJson(KEY, s);
export const clearSession = (): void => removeKey(KEY);

export const isFinished = (s: ASession): boolean => s.index >= s.items.length;
