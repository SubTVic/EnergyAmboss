// Nachbesprechung (After Action Review): Kaskaden aus Entscheidung → Ereignis → Folgen.
import { MONTH_VALUE, SYSTEM_EVENTS } from './engine';
import type { Decision, EventCard, GameData, GameState, LogEntry } from './types';

export interface Consequence {
  entry: LogEntry;
  cost: number; // positive Zahl = Verlust in €
  delayMonths: number;
}

export interface EventSummary {
  id: string;
  title: string;
  round: number;
  caseId?: string;
  entries: Consequence[];
  total: number;
}

export interface DecisionSummary {
  decision: Decision;
  /** Folgen, die direkt auf die Entscheidung zeigen (Kosten, Ergebnis, Pacht, verzögerte Ergebnisse). */
  direct: Consequence[];
  /** Ereignisse, die durch diese Entscheidung möglich wurden (`causedBy`). */
  events: EventSummary[];
  cost: number;
  delayMonths: number;
  /** Summe aus Kosten und Verzögerung (Monate × MONTH_VALUE). */
  total: number;
}

export interface Debrief {
  decisions: DecisionSummary[];
  /** Ereignisse ohne auslösende Entscheidung (Zufall, Gesetzgeber, Wettbewerb). */
  unattached: EventSummary[];
  mostExpensive: DecisionSummary | null;
}

const consequence = (entry: LogEntry): Consequence => ({
  entry,
  cost: Math.max(0, -(entry.budgetDelta ?? 0)),
  delayMonths: entry.monthsDelta ?? 0,
});

const sum = (items: Consequence[]) => ({
  cost: items.reduce((s, c) => s + c.cost, 0),
  delay: items.reduce((s, c) => s + c.delayMonths, 0),
});

function eventSummary(id: string, round: number, entries: LogEntry[], card: EventCard | undefined): EventSummary {
  const cs = entries.map(consequence);
  const s = sum(cs);
  return {
    id,
    title: card?.title ?? SYSTEM_EVENTS[id] ?? id,
    round,
    caseId: card?.caseId,
    entries: cs,
    total: s.cost + s.delay * MONTH_VALUE,
  };
}

export function buildDebrief(state: GameState, data: GameData): Debrief {
  const direct = new Map<string, LogEntry[]>();
  const eventEntries = new Map<string, LogEntry[]>();
  for (const e of state.log) {
    if (e.cause.kind === 'event') {
      const k = `${e.cause.id}@${e.cause.round}`;
      eventEntries.set(k, [...(eventEntries.get(k) ?? []), e]);
    } else {
      const k = `${e.cause.id}@${e.cause.round}`;
      direct.set(k, [...(direct.get(k) ?? []), e]);
    }
  }

  const summaries: DecisionSummary[] = state.decisions.map((decision) => {
    const cs = (direct.get(`${decision.id}@${decision.round}`) ?? []).map(consequence);
    const s = sum(cs);
    return { decision, direct: cs, events: [], cost: s.cost, delayMonths: s.delay, total: 0 };
  });

  const unattached: EventSummary[] = [];
  for (const [key, entries] of eventEntries) {
    const [id, roundText] = key.split('@');
    const round = Number(roundText);
    const card = data.events.find((e) => e.id === id);
    const summary = eventSummary(id, round, entries, card);
    // auslösende Entscheidung: die jüngste Entscheidung vor dem Ereignis mit der passenden Aktion
    const trigger = card?.causedBy
      ? [...summaries].reverse().find((d) => d.decision.actionId === card.causedBy && d.decision.round <= round)
      : undefined;
    if (trigger) trigger.events.push(summary);
    else unattached.push(summary);
  }

  for (const d of summaries) {
    const eventCost = d.events.reduce((s, e) => s + e.entries.reduce((a, c) => a + c.cost, 0), 0);
    const eventDelay = d.events.reduce((s, e) => s + e.entries.reduce((a, c) => a + c.delayMonths, 0), 0);
    d.cost += eventCost;
    d.delayMonths += eventDelay;
    d.total = d.cost + d.delayMonths * MONTH_VALUE;
    d.events.sort((a, b) => a.round - b.round);
  }

  unattached.sort((a, b) => a.round - b.round);
  const mostExpensive = summaries.reduce<DecisionSummary | null>((best, d) => (!best || d.total > best.total ? d : best), null);
  return { decisions: summaries, unattached, mostExpensive };
}
