// Rechenlogik für Prototyp F: Log fortschreiben, selbst gezogene Verbindungen abgleichen, Erwartungswert.
// Reine Funktionen ohne Oberfläche; alle Zahlen sind fiktiv.
import type { Dept, Decision, DecisionLog, Estimate, LogEntry, MyDecision } from './types';

export interface LinkComparison {
  found: string[]; // selbst verknüpft und im Modell
  missed: string[]; // im Modell, aber nicht verknüpft
  extra: string[]; // selbst verknüpft, aber nicht im Modell
}

/** Selbst gezogene Verbindungen mit dem Modell vergleichen (Reihenfolge des Modells bleibt erhalten). */
export function compareLinks(picks: string[], modelIds: string[]): LinkComparison {
  const picked = new Set(picks);
  const model = new Set(modelIds);
  return {
    found: modelIds.filter((id) => picked.has(id)),
    missed: modelIds.filter((id) => !picked.has(id)),
    extra: picks.filter((id) => !model.has(id)),
  };
}

/** Eigene Entscheidung als Log-Eintrag: Begründung, eigene Verbindung, Schätzung und offene Annahmen der Option. */
export function toLogEntry(decision: Decision, mine: MyDecision, entries: LogEntry[]): LogEntry {
  const option = decision.options.find((o) => o.id === mine.optionId);
  const reasons = [mine.reason.trim()];
  if (mine.p !== undefined && decision.estimate) {
    const pText = `Schätzung Netzzusage: ${Math.round(mine.p * 100)} %`;
    reasons.push(mine.pReason?.trim() ? `${pText}, weil ${mine.pReason.trim()}` : pText);
  }
  if (mine.note.trim()) reasons.push(`Eigene Verbindung: ${mine.note.trim()}`);
  return {
    id: decision.id,
    date: decision.date,
    title: `${decision.question} → ${option?.label ?? mine.optionId}`,
    dept: decision.dept,
    domains: decision.domains,
    reasons: reasons.filter(Boolean),
    assumptions: (option?.restsOn ?? []).flatMap((id) =>
      (entries.find((e) => e.id === id)?.assumptions ?? [])
        .filter((a) => a.status !== 'belegt')
        .map((a) => ({ ...a, note: `aus ${id.toUpperCase()}` })),
    ),
    knowledgeIds: [],
    mine: true,
  };
}

/** Log mit den ersten `own` eigenen Einträgen; Annahmen, die die ersten `breaks` Lagen widerlegen, sind rot. */
function buildLog(data: DecisionLog, mine: MyDecision[], own: number, breaks: number): LogEntry[] {
  const broken = new Set(data.decisions.slice(0, breaks).flatMap((d) => d.breaks ?? []));
  const log = data.log.map((e) =>
    broken.has(e.id)
      ? { ...e, assumptions: e.assumptions.map((a) => (a.status === 'offen' ? { ...a, status: 'widerlegt' as const, note: 'mit der neuen Lage widerlegt' } : a)) }
      : e,
  );
  for (const d of data.decisions.slice(0, own)) {
    const m = mine.find((x) => x.decisionId === d.id);
    if (m) log.push(toLogEntry(d, m, log));
  }
  return log;
}

/** Log, wie es vor Entscheidung `index` aussieht: Start-Log, eigene frühere Einträge, die neue Lage. */
export const logBefore = (data: DecisionLog, mine: MyDecision[], index: number): LogEntry[] =>
  buildLog(data, mine, index, index + 1);

/** Log direkt nach Entscheidung `index`, mit dem eigenen neuen Eintrag. */
export const logAfter = (data: DecisionLog, mine: MyDecision[], index: number): LogEntry[] =>
  buildLog(data, mine, index + 1, index + 1);

/** Abteilungen, die eine Entscheidung betrifft: Verantwortliche der verknüpften Einträge, ohne die eigene. */
export function affectedDepts(entries: LogEntry[], ids: string[], own: Dept): { dept: Dept; entryIds: string[] }[] {
  const byDept = new Map<Dept, string[]>();
  for (const id of ids) {
    const e = entries.find((x) => x.id === id);
    if (!e || e.dept === own) continue;
    byDept.set(e.dept, [...(byDept.get(e.dept) ?? []), id]);
  }
  return [...byDept].map(([dept, entryIds]) => ({ dept, entryIds }));
}

/**
 * Erwartungswert ab heute je Option; bereits Bezahltes (Pacht, Gutachten) ist in jeder Option weg.
 * jetzt:  p · p_R · V − P
 * warten: p · (p_R · V − P) − Wartekosten
 * Informationswert der Zusage (ohne Wartekosten): P · (1 − p)
 */
export function evOptions(est: Estimate, p: number): { now: number; wait: number; giveUp: number; voi: number } {
  const now = p * est.pRest * est.value - est.planning;
  const wait = p * Math.max(0, est.pRest * est.value - est.planning) - est.waitCost;
  return { now, wait, giveUp: 0, voi: wait + est.waitCost - now };
}
