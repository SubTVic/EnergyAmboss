// Rechenlogik für Prototyp A (Kreuzen mit vernetzter Bibliothek): reine Funktionen ohne Oberfläche.
import { knowledgeEdges, knowledgeNodes } from '../shared/content';
import { Rng } from '../shared/rng';
import type { Domain } from '../shared/types';
import type { Answer, Cascade, Question, QuestionResult, Sct, SctAnswer, SingleBest } from './types';

/** SCT-Wertung: Punkte für Antwort v = panel[v] / max(panel). Das Panel hat die Anzahlen für −2 … +2. */
export function sctPoints(panel: number[], answer: SctAnswer): number {
  const max = Math.max(...panel);
  if (max <= 0) return 0;
  return panel[answer + 2] / max;
}

export interface PanelRowLike {
  item_id: string;
  expert: string;
  value: number;
}

export const MIN_PANEL_EXPERTS = 5;

export interface EffectivePanel {
  panel: number[]; // Anzahlen für −2 … +2
  placeholder: boolean;
  experts: number;
}

/** Echtes Panel aus `sct_panel`, sobald mindestens 5 Experten geantwortet haben; sonst `seedPanel` als Platzhalter. */
export function effectivePanel(question: Sct, rows: PanelRowLike[]): EffectivePanel {
  // je Experte zählt die letzte Antwort
  const latest = new Map<string, number>();
  for (const r of rows) if (r.item_id === question.id) latest.set(r.expert, r.value);
  if (latest.size >= MIN_PANEL_EXPERTS) {
    const panel = [0, 0, 0, 0, 0];
    for (const v of latest.values()) panel[v + 2] += 1;
    return { panel, placeholder: false, experts: latest.size };
  }
  return { panel: [...question.seedPanel], placeholder: true, experts: latest.size };
}

/** Kaskadenfrage: 1 Punkt pro richtigem Bereich, höchstens 3. */
export function cascadePoints(selected: Domain[], correct: Domain[]): number {
  const unique = [...new Set(selected)];
  return Math.min(3, unique.filter((d) => correct.includes(d)).length);
}

export const maxPoints = (q: Question): number => (q.type === 'cascade' ? 3 : 1);

export function scoreAnswer(q: Question, answer: Answer, panel?: number[]): { points: number; max: number; miss: boolean } {
  let points = 0;
  if (q.type === 'single' && answer.type === 'single') {
    points = (q as SingleBest).options.find((o) => o.id === answer.optionId)?.correct ? 1 : 0;
  } else if (q.type === 'sct' && answer.type === 'sct') {
    points = sctPoints(panel ?? (q as Sct).seedPanel, answer.value);
  } else if (q.type === 'cascade' && answer.type === 'cascade') {
    points = cascadePoints(answer.domains, (q as Cascade).correctDomains);
  }
  const max = maxPoints(q);
  return { points, max, miss: points / max < 0.5 };
}

export interface SessionItem {
  questionId: string;
  retry: boolean;
  /** Reihenfolge der Optionen (nur Einzelwahl), damit die richtige nicht immer an derselben Stelle steht. */
  optionOrder?: string[];
}

/**
 * Gemischte Reihenfolge: zufällig, aber nie zwei Fragen zum selben Fall direkt hintereinander (soweit möglich).
 * Verwechselbare Fälle wie F4 und F5 stehen bewusst nah beieinander.
 */
export function mixQuestions(questions: Question[], seed: number): Question[] {
  const rng = new Rng(seed);
  const pool = rng.shuffle(questions);
  const out: Question[] = [];
  while (pool.length) {
    const last = out[out.length - 1]?.caseId;
    // Aus dem Fall mit den meisten verbleibenden Fragen wählen (außer dem letzten), sonst läuft das Ende in zwei gleiche Fälle
    const remaining = new Map<string, number>();
    for (const q of pool) remaining.set(q.caseId, (remaining.get(q.caseId) ?? 0) + 1);
    let idx = -1;
    let best = 0;
    pool.forEach((q, i) => {
      const n = remaining.get(q.caseId)!;
      if (q.caseId !== last && n > best) {
        best = n;
        idx = i;
      }
    });
    out.push(pool.splice(idx === -1 ? 0 : idx, 1)[0]);
  }
  return out;
}

export interface SessionOptions {
  count: number;
  /** Nur Fragen, die diesen Bereich berühren (domains enthält den Bereich). */
  domain?: Domain;
  seed: number;
}

export function buildSession(all: Question[], { count, domain, seed }: SessionOptions): SessionItem[] {
  const rng = new Rng(seed * 31 + 7);
  const pool = domain ? all.filter((q) => q.domains.includes(domain)) : all;
  const picked = new Rng(seed).shuffle(pool).slice(0, count);
  return mixQuestions(picked, seed).map((q) => ({
    questionId: q.id,
    retry: false,
    ...(q.type === 'single' ? { optionOrder: rng.shuffle(q.options.map((o) => o.id)) } : {}),
  }));
}

/** Falsch beantwortete Fragen kommen am Ende der Session einmal wieder. */
export function retriesFor(results: QuestionResult[], alreadyQueued: SessionItem[]): SessionItem[] {
  const queued = new Set(alreadyQueued.filter((i) => i.retry).map((i) => i.questionId));
  return results
    .filter((r) => !r.retry && r.miss && !queued.has(r.questionId))
    .map((r) => ({ questionId: r.questionId, retry: true }));
}

export interface PairStat {
  key: string;
  label: string;
  domains: Domain[];
  total: number;
  misses: number;
  errorRate: number;
  questionIds: string[];
}

/** Verbindungs-Radar: Jede Frage zählt für das Bereichspaar aus domains[0] und domains[1]; Fehlerquote je Paar (nur Erstversuche). */
export function connectionRadar(results: QuestionResult[], questions: Question[]): PairStat[] {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const stats = new Map<string, PairStat>();
  for (const r of results) {
    if (r.retry) continue;
    const q = byId.get(r.questionId);
    if (!q) continue;
    const pair = q.domains.slice(0, 2);
    const key = pair.join('|');
    const s = stats.get(key) ?? { key, label: '', domains: pair, total: 0, misses: 0, errorRate: 0, questionIds: [] };
    s.total += 1;
    if (r.miss) s.misses += 1;
    s.questionIds.push(q.id);
    stats.set(key, s);
  }
  return [...stats.values()]
    .map((s) => ({ ...s, errorRate: s.misses / s.total }))
    .sort((a, b) => b.errorRate - a.errorRate || b.total - a.total);
}

/**
 * Wissenskarte unter jeder Erklärung: die Knoten der Frage plus direkte Nachbarn, insgesamt höchstens `max`.
 * Nachbarn aus anderen Bereichen als dem Hauptbereich der Frage kommen zuerst (Querwissen).
 */
export function knowledgeSubgraph(question: Question, max = 6): { nodeIds: string[]; edges: { from: string; to: string; kind: string }[] } {
  const chosen: string[] = [...new Set(question.nodeIds)].slice(0, max);
  const domainOf = new Map(knowledgeNodes.map((n) => [n.id, n.domain]));
  const main = question.domains[0];
  if (chosen.length < max) {
    const candidates = new Map<string, number>();
    for (const e of knowledgeEdges) {
      for (const [a, b] of [[e.from, e.to], [e.to, e.from]] as const) {
        if (chosen.includes(a) && !chosen.includes(b)) candidates.set(b, (candidates.get(b) ?? 0) + 1);
      }
    }
    const sorted = [...candidates.entries()].sort(
      (x, y) =>
        Number(domainOf.get(y[0]) !== main) - Number(domainOf.get(x[0]) !== main) || y[1] - x[1] || x[0].localeCompare(y[0]),
    );
    for (const [id] of sorted) {
      if (chosen.length >= max) break;
      chosen.push(id);
    }
  }
  const edges = knowledgeEdges.filter((e) => chosen.includes(e.from) && chosen.includes(e.to));
  return { nodeIds: chosen, edges };
}
