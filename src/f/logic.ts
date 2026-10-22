// Logik für Prototyp F: selbst angetippte Einträge mit den echten Zusammenhängen vergleichen.
import type { LogEntry } from './types';

export interface LinkComparison {
  found: string[]; // angetippt und hängt zusammen
  missed: string[]; // hängt zusammen, aber nicht angetippt
  extra: string[]; // angetippt, hängt aber nicht direkt zusammen
}

export function compareLinks(picks: string[], linkIds: string[]): LinkComparison {
  const picked = new Set(picks);
  const linked = new Set(linkIds);
  return {
    found: linkIds.filter((id) => picked.has(id)),
    missed: linkIds.filter((id) => !picked.has(id)),
    extra: picks.filter((id) => !linked.has(id)),
  };
}

/** Wer muss Bescheid wissen: die Abteilungen der zusammenhängenden Einträge, ohne die eigene, ohne Doppelte. */
export function whoToInform(log: LogEntry[], linkIds: string[], own: string): string[] {
  const who = linkIds.map((id) => log.find((e) => e.id === id)?.who).filter((w): w is string => !!w && w !== own);
  return [...new Set(who)];
}
