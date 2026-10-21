// Regel-Engine für Prototyp D (Projekt-Planspiel): reine Funktionen mit Seed, keine Oberfläche.
// Würfel und Ereignisse nutzen eine einzige Zufallsquelle (mulberry32); gleicher Seed und gleiche
// Entscheidungen ergeben denselben Verlauf.
import { Rng } from './rng';
import type {
  ActionCard,
  Condition,
  Effect,
  EventCard,
  GameData,
  GameState,
  LogCause,
  LogEntry,
  ActionPick,
  Range,
} from './types';

export const MAX_ROUNDS = 12;
export const MAX_ACTIONS = 2;
export const MAX_REASONS = 3;
export const START_BUDGET = 1_500_000;
export const LEASE_PER_ROUND = 25_000; // Pacht je gesicherter Fläche und Runde
export const MONTHS_PER_ROUND = 6;
export const EVENT_CHANCE = 0.75;
export const MONTH_VALUE = 20_000; // Verzögerung wird in der Nachbesprechung mit 20.000 € je Monat bewertet (fiktiv)

export const SYSTEM_EVENTS: Record<string, string> = {
  ausweisung: 'Regionalplanung weist Flächen aus',
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

// --- Start --------------------------------------------------------------------------------

export function newGame(seed: number, data: GameData): GameState {
  const rng = new Rng(seed);
  const sites: GameState['sites'] = {};
  for (const id of data.siteIds) sites[id] = { status: 'frei', designated: data.pvSiteIds.includes(id) };
  // Ausweisung ist für den Spieler verdeckt: zwei Flächen in Runde 5, eine in Runde 7
  const windSites = rng.shuffle(data.siteIds.filter((id) => !data.pvSiteIds.includes(id)));
  const designations = [
    { round: 5, site: windSites[0] },
    { round: 5, site: windSites[1] },
    { round: 7, site: windSites[2] },
  ];
  return {
    seed,
    rng: rng.state,
    round: 1,
    months: 0,
    budget: START_BUDGET,
    contacts: 2,
    support: 3,
    sites,
    grid: 'keine',
    survey: 'keins',
    permit: 'keine',
    award: false,
    flags: [],
    timers: [],
    designations,
    firedEvents: [],
    decisions: [],
    log: [],
    ended: null,
  };
}

// --- Bedingungen --------------------------------------------------------------------------

const inList = <T>(v: T | T[], x: T) => (Array.isArray(v) ? v.includes(x) : v === x);
const inRange = (n: number, r: Range) => (r.gte === undefined || n >= r.gte) && (r.lte === undefined || n <= r.lte);

export function holds(state: GameState, c: Condition): boolean {
  const sites = Object.values(state.sites);
  if (c.grid !== undefined && !inList(c.grid, state.grid)) return false;
  if (c.survey !== undefined && !inList(c.survey, state.survey)) return false;
  if (c.permit !== undefined && !inList(c.permit, state.permit)) return false;
  if (c.award !== undefined && c.award !== state.award) return false;
  if (c.round && !inRange(state.round, c.round)) return false;
  if (c.budget && !inRange(state.budget, c.budget)) return false;
  if (c.contacts && !inRange(state.contacts, c.contacts)) return false;
  if (c.support && !inRange(state.support, c.support)) return false;
  if (c.securedSites && !inRange(sites.filter((s) => s.status === 'gesichert').length, c.securedSites)) return false;
  if (c.freeSites && !inRange(sites.filter((s) => s.status === 'frei').length, c.freeSites)) return false;
  if (c.designatedSecured && !inRange(sites.filter((s) => s.status === 'gesichert' && s.designated).length, c.designatedSecured)) return false;
  if (c.siteStatus && state.sites[c.siteStatus.site]?.status !== c.siteStatus.status) return false;
  if (c.flag !== undefined && !state.flags.includes(c.flag)) return false;
  if (c.noFlag !== undefined && state.flags.includes(c.noFlag)) return false;
  return true;
}

const holdsAll = (state: GameState, cs: Condition[]) => cs.every((c) => holds(state, c));

// --- Aktionen: Auswahl und Zielwert -------------------------------------------------------

/** Warum eine Aktion nicht gewählt werden kann; null, wenn sie möglich ist. */
export function blockedReason(state: GameState, card: ActionCard, site?: string): string | null {
  if (state.ended) return 'Das Spiel ist beendet.';
  if (!holdsAll(state, card.requires)) return 'Voraussetzung noch nicht erfüllt.';
  if (card.needsSite) {
    if (!site) return 'Fläche wählen.';
    if (state.sites[site]?.status !== card.needsSite) return `Die Fläche ${site} ist nicht ${card.needsSite}.`;
  }
  return null;
}

export const decisionId = (card: ActionCard, site?: string) => (card.needsSite && site ? `${card.id}:${site}` : card.id);

export interface TargetPart {
  label: string;
  delta: number;
}

/** Zielwert (Erfolg bei 2W6 ≥ Zielwert) mit allen Zu- und Abschlägen, für die Anzeige und die Würfe. */
export function effectiveTarget(state: GameState, card: ActionCard, pick?: ActionPick): { target: number; parts: TargetPart[] } {
  const parts: TargetPart[] = [{ label: 'Grundwert', delta: card.target }];
  for (const m of card.modifiers ?? []) if (holds(state, m.when)) parts.push({ label: m.why, delta: m.delta });
  if (pick?.llmValidReasons !== undefined) {
    const n = clamp(Math.round(pick.llmValidReasons), 0, MAX_REASONS);
    if (n) parts.push({ label: `${n} gültige Begründung${n > 1 ? 'en' : ''} (Spielleitung)`, delta: -n });
  } else {
    for (const id of (pick?.reasonIds ?? []).slice(0, MAX_REASONS)) {
      const r = card.reasons.find((x) => x.id === id);
      if (r) parts.push({ label: r.valid ? 'gültige Begründung' : 'ungültige Begründung', delta: r.valid ? -1 : 1 });
    }
  }
  const tagged = card.tags?.some((t) => t === 'eigentuemer' || t === 'gemeinde');
  if (tagged && state.contacts >= 7) parts.push({ label: 'viele Kontakte (ab 7)', delta: -1 });
  const target = clamp(parts.reduce((s, p) => s + p.delta, 0), 2, 13);
  return { target, parts };
}

/** Wahrscheinlichkeit, mit 2W6 mindestens `target` zu erreichen. */
export function successChance(target: number): number {
  let hits = 0;
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b >= target) hits++;
  return hits / 36;
}

// --- Wirkungen ----------------------------------------------------------------------------

interface Ctx {
  rng: Rng;
  cause: LogCause;
  target?: string;
  changes: string[];
  budget: number;
  months: number;
}

function securedCount(state: GameState): number {
  return Object.values(state.sites).filter((s) => s.status === 'gesichert').length;
}

function resolveSite(state: GameState, spec: string, ctx: Ctx): string | null {
  if (spec === '$target') return ctx.target ?? null;
  if (spec.startsWith('random:')) {
    const status = spec.slice('random:'.length);
    const candidates = Object.entries(state.sites)
      .filter(([, s]) => s.status === status)
      .map(([id]) => id)
      .sort();
    return candidates.length ? ctx.rng.pick(candidates) : null;
  }
  return spec;
}

function applyEffect(state: GameState, e: Effect, ctx: Ctx): void {
  if (e.if) {
    if (holds(state, e.if)) for (const t of e.then ?? []) applyEffect(state, t, ctx);
    return;
  }
  if (e.later !== undefined) {
    state.timers.push({ dueRound: state.round + e.later, text: e.text ?? '', effects: e.effects ?? [], cause: ctx.cause });
    ctx.changes.push(`Ergebnis in ${e.later} ${e.later === 1 ? 'Runde' : 'Runden'}`);
    return;
  }
  if (e.budget) {
    state.budget += e.budget;
    ctx.budget += e.budget;
  }
  if (e.months) {
    state.months += e.months;
    ctx.months += e.months;
    ctx.changes.push(`${e.months > 0 ? '+' : ''}${e.months} Monate Verzögerung`);
    // Die Pacht läuft während der Verzögerung weiter
    const rent = Math.round((securedCount(state) * LEASE_PER_ROUND * e.months) / MONTHS_PER_ROUND);
    if (rent) {
      state.budget -= rent;
      ctx.budget -= rent;
    }
  }
  if (e.contacts) {
    const before = state.contacts;
    state.contacts = clamp(state.contacts + e.contacts, 0, 10);
    if (state.contacts !== before) ctx.changes.push(`Kontakte ${state.contacts - before > 0 ? '+' : ''}${state.contacts - before}`);
  }
  if (e.support) {
    const before = state.support;
    state.support = clamp(state.support + e.support, 0, 10);
    if (state.support !== before) ctx.changes.push(`Rückhalt ${state.support - before > 0 ? '+' : ''}${state.support - before}`);
  }
  if (e.grid) {
    state.grid = e.grid;
    ctx.changes.push(`Netz: ${e.grid}`);
  }
  if (e.survey) {
    state.survey = e.survey;
    ctx.changes.push(`Gutachten: ${e.survey}`);
  }
  if (e.permit) {
    state.permit = e.permit;
    ctx.changes.push(`Genehmigung: ${e.permit}`);
  }
  if (e.award !== undefined) {
    state.award = e.award;
    if (e.award) ctx.changes.push('Zuschlag erhalten');
  }
  if (e.site && e.status) {
    const id = resolveSite(state, e.site, ctx);
    if (id && state.sites[id]) {
      state.sites[id].status = e.status;
      if (e.status === 'gesichert') state.sites[id].securedRound = state.round;
      ctx.changes.push(`Fläche ${id}: ${e.status}`);
    } else {
      ctx.changes.push('keine passende Fläche');
    }
  }
  if (e.flag && !state.flags.includes(e.flag)) state.flags.push(e.flag);
  if (e.clearFlag) state.flags = state.flags.filter((f) => f !== e.clearFlag);
}

function newCtx(rng: Rng, cause: LogCause, target?: string): Ctx {
  return { rng, cause, target, changes: [], budget: 0, months: 0 };
}

function pushLog(state: GameState, text: string, ctx: Ctx, extra: Partial<LogEntry> = {}): void {
  const suffix = ctx.changes.length ? ` (${ctx.changes.join(', ')})` : '';
  state.log.push({
    round: state.round,
    text: text + suffix,
    ...(ctx.budget ? { budgetDelta: ctx.budget } : {}),
    ...(ctx.months ? { monthsDelta: ctx.months } : {}),
    cause: ctx.cause,
    ...extra,
  });
}

// --- Runde --------------------------------------------------------------------------------

function resolveAction(state: GameState, card: ActionCard, pick: ActionPick, rng: Rng): void {
  const { target } = effectiveTarget(state, card, pick);
  const id = decisionId(card, pick.site);
  const cause: LogCause = { kind: 'action', id, round: state.round };
  const ctx = newCtx(rng, cause, pick.site);

  state.budget -= card.cost;
  ctx.budget -= card.cost;
  const roll: [number, number] = [rng.d6(), rng.d6()];
  const success = roll[0] + roll[1] >= target;
  for (const e of success ? card.onSuccess : card.onFailure) applyEffect(state, e, ctx);

  state.decisions.push({ id, actionId: card.id, label: card.label, site: pick.site, round: state.round, roll, target, success });
  const where = card.needsSite && pick.site ? ` ${pick.site}` : '';
  pushLog(
    state,
    `${card.label}${where}: 2W6 = ${roll[0]} + ${roll[1]} = ${roll[0] + roll[1]} (Ziel ≥ ${target}) → ${success ? 'Erfolg' : 'Misserfolg'}. ${success ? card.successText : card.failureText}`,
    ctx,
    { roll, success },
  );
}

function drawEvent(state: GameState, data: GameData, rng: Rng): EventCard | null {
  const chance = rng.next();
  const eligible = data.events.filter((ev) => !state.firedEvents.includes(ev.id) && holdsAll(state, ev.when));
  const pickValue = rng.next();
  if (eligible.length === 0 || chance >= EVENT_CHANCE) return null;
  const total = eligible.reduce((s, ev) => s + ev.weight, 0);
  let acc = 0;
  for (const ev of eligible) {
    acc += ev.weight;
    if (pickValue * total < acc) return ev;
  }
  return eligible[eligible.length - 1];
}

function resolveEvent(state: GameState, ev: EventCard, rng: Rng): void {
  const cause: LogCause = { kind: 'event', id: ev.id, round: state.round };
  const ctx = newCtx(rng, cause);
  let text = `${ev.title}: ${ev.text}`;
  let extra: Partial<LogEntry> = {};
  let effects = ev.effects;
  if (ev.resist) {
    const roll: [number, number] = [rng.d6(), rng.d6()];
    const bonus = Math.floor(state.contacts / 3) + (state.flags.includes('owners') ? 1 : 0);
    const resisted = roll[0] + roll[1] + bonus >= ev.resist.target;
    text += ` Gegenwehr: 2W6 = ${roll[0]} + ${roll[1]}${bonus ? ` + ${bonus}` : ''} (Ziel ≥ ${ev.resist.target}) → ${resisted ? 'abgewehrt' : 'nicht abgewehrt'}.`;
    extra = { roll, success: resisted };
    if (resisted) effects = ev.resistEffects ?? [];
  }
  state.firedEvents.push(ev.id);
  for (const e of effects) applyEffect(state, e, ctx);
  pushLog(state, text, ctx, extra);
}

/**
 * Eine Runde: Aktionen würfeln, Pacht abbuchen, verzögerte Ergebnisse, Ausweisungen, ein Ereignis, Endprüfung.
 * Wirft bei ungültiger Auswahl; die Oberfläche prüft vorher mit `blockedReason`.
 */
export function playRound(input: GameState, picks: ActionPick[], data: GameData): GameState {
  if (input.ended) throw new Error('Das Spiel ist beendet.');
  if (picks.length > MAX_ACTIONS) throw new Error(`Höchstens ${MAX_ACTIONS} Aktionen pro Runde.`);

  const state = structuredClone(input);
  const rng = new Rng(state.rng);

  const seen = new Set<string>();
  for (const pick of picks) {
    const card = data.actions.find((a) => a.id === pick.actionId);
    if (!card) throw new Error(`Unbekannte Aktion: ${pick.actionId}`);
    const why = blockedReason(state, card, pick.site);
    if (why) throw new Error(`${card.label}: ${why}`);
    const id = decisionId(card, pick.site);
    if (seen.has(id)) throw new Error(`${card.label}: nur einmal pro Runde und Fläche.`);
    seen.add(id);
  }

  // 1.–3. Aktionen wählen, Begründungen bewerten, würfeln und Wirkungen anwenden
  for (const pick of picks) resolveAction(state, data.actions.find((a) => a.id === pick.actionId)!, pick, rng);

  // 4. Laufende Kosten: Pacht je gesicherter Fläche, verbucht mit der Ursache „Fläche sichern, Runde n“
  for (const [id, s] of Object.entries(state.sites)) {
    if (s.status !== 'gesichert') continue;
    const ctx = newCtx(rng, { kind: 'upkeep', id: `sichern:${id}`, round: s.securedRound ?? state.round });
    state.budget -= LEASE_PER_ROUND;
    ctx.budget -= LEASE_PER_ROUND;
    pushLog(state, `Pacht ${id}`, ctx);
  }

  // Verzögerte Ergebnisse (Gutachten nach der Brutperiode, Genehmigung, späte Antworten)
  const due = state.timers.filter((t) => t.dueRound <= state.round);
  state.timers = state.timers.filter((t) => t.dueRound > state.round);
  for (const t of due) {
    const ctx = newCtx(rng, t.cause);
    for (const e of t.effects) applyEffect(state, e, ctx);
    pushLog(state, t.text, ctx);
  }

  // Ausweisungen der Regionalplanung
  const designated = state.designations.filter((d) => d.round === state.round);
  if (designated.length) {
    const ctx = newCtx(rng, { kind: 'event', id: 'ausweisung', round: state.round });
    for (const d of designated) {
      state.sites[d.site].designated = true;
      ctx.changes.push(`${d.site}${state.sites[d.site].status === 'verloren' ? ' (verloren)' : ''}`);
    }
    pushLog(state, `${SYSTEM_EVENTS.ausweisung}`, ctx);
  }

  // 5. Ein Ereignis ziehen, gewichtet unter allen, deren Bedingungen erfüllt sind
  const ev = drawEvent(state, data, rng);
  if (ev) resolveEvent(state, ev, rng);

  // 6. Ende nach Runde 12, bei Budget unter null oder bei Zuschlag plus Netzzusage
  state.months += MONTHS_PER_ROUND;
  if (state.award && state.grid === 'zusage') state.ended = { reason: 'sieg', round: state.round };
  else if (state.budget < 0) state.ended = { reason: 'pleite', round: state.round };
  else if (state.round >= MAX_ROUNDS) state.ended = { reason: 'zeit', round: state.round };
  else state.round += 1;

  state.rng = rng.state;
  return state;
}

export const END_LABELS = {
  sieg: 'Zuschlag und Netzzusage: Das Projekt steht.',
  pleite: 'Das Budget ist aufgebraucht.',
  zeit: 'Nach Runde 12 ist die Zeit abgelaufen.',
} as const;
