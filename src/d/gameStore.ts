import { readJson, removeKey, writeJson } from '../shared/storage';
import type { GameState, LogEntry } from './types';

export interface RoundReport {
  round: number;
  entries: LogEntry[];
  /** Gewählte Begründungen je Aktion mit Auflösung (Listenmodus) oder Rückmeldung der Spielleitung. */
  picks: { label: string; reasons: { text: string; valid: boolean; why: string }[]; feedback?: string; missing?: string }[];
}

export interface SavedGame {
  state: GameState;
  llm: boolean;
  report: RoundReport | null;
  aar: Record<string, string>;
}

const KEY = 'd-game';

export const loadGame = (): SavedGame | null => readJson<SavedGame | null>(KEY, null);
export const saveGame = (g: SavedGame): void => writeJson(KEY, g);
export const clearGame = (): void => removeKey(KEY);
