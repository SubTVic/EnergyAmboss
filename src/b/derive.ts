// Statuslogik für Prototyp B (Projekt als Beweis): reine Funktionen ohne Oberfläche.
import { isContainer, type BpNode, type OwnStatus, type ShownStatus } from './types';

/** Wirksamer Status für die Weitergabe nach oben; „entfallen“ zählt wie „belegt“. */
export type Effective = 'widerlegt' | 'sorry' | 'in_arbeit' | 'belegt';

// Rangfolge: widerlegt > sorry > in_arbeit > belegt = entfallen
const RANK: Record<Effective, number> = { widerlegt: 3, sorry: 2, in_arbeit: 1, belegt: 0 };

const normalize = (s: OwnStatus | undefined): Effective => (s === 'entfallen' ? 'belegt' : (s ?? 'sorry'));

function worst(values: Effective[]): Effective {
  return values.reduce<Effective>((w, v) => (RANK[v] > RANK[w] ? v : w), 'belegt');
}

/** Versteckte Knoten und nicht übernommene Alternativen zählen nicht als Voraussetzung. */
export function isActive(n: BpNode): boolean {
  if (n.hidden) return false;
  if (n.kind === 'alternative' && !n.adopted) return false;
  return true;
}

/** Voraussetzungen eines Knotens: seine Kinder plus `deps`. */
export function prerequisites(nodes: BpNode[], node: BpNode): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ids = new Set<string>();
  for (const n of nodes) if (n.parentId === node.id && isActive(n)) ids.add(n.id);
  for (const id of node.deps) {
    const d = byId.get(id);
    if (d && isActive(d)) ids.add(id);
  }
  return [...ids];
}

export interface Derived {
  shown: ShownStatus;
  eff: Effective;
  prerequisites: string[];
}

export class CycleError extends Error {
  constructor(public readonly path: string[]) {
    super(`Zyklus im Beweisbaum: ${path.join(' → ')}`);
  }
}

/** Findet einen Zyklus in den Voraussetzungen (Kinder und Querabhängigkeiten) und gibt den Pfad zurück. */
export function findCycle(nodes: BpNode[]): string[] | null {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const next = new Map<string, string[]>();
  for (const n of nodes) {
    const ids = new Set<string>();
    for (const c of nodes) if (c.parentId === n.id) ids.add(c.id);
    for (const d of n.deps) if (byId.has(d)) ids.add(d);
    next.set(n.id, [...ids]);
  }
  const state = new Map<string, 'visiting' | 'done'>();
  const stack: string[] = [];

  function visit(id: string): string[] | null {
    state.set(id, 'visiting');
    stack.push(id);
    for (const n of next.get(id) ?? []) {
      if (state.get(n) === 'visiting') return [...stack.slice(stack.indexOf(n)), n];
      if (!state.has(n)) {
        const found = visit(n);
        if (found) return found;
      }
    }
    stack.pop();
    state.set(id, 'done');
    return null;
  }

  for (const n of nodes) {
    if (!state.has(n.id)) {
      const found = visit(n.id);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Leitet für jeden Knoten den angezeigten Status ab.
 *
 * - Behälter (ziel, teilziel) zeigen die schlechteste Voraussetzung: widerlegt → „gebrochen“,
 *   sorry oder in_arbeit → „offen“, sonst „belegt“.
 * - Annahmen, Schritte und Alternativen mit Voraussetzungen: alle Voraussetzungen belegt und der
 *   Knoten selbst nicht belegt → „bereit“; ist eine Voraussetzung schlechter → „blockiert“.
 * - Ohne Voraussetzungen zeigt ein Knoten seinen eigenen Status.
 *
 * Wirft CycleError, wenn die Voraussetzungen einen Zyklus bilden.
 */
export function derive(nodes: BpNode[]): Map<string, Derived> {
  const cycle = findCycle(nodes);
  if (cycle) throw new CycleError(cycle);

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const result = new Map<string, Derived>();

  function compute(id: string): Derived {
    const cached = result.get(id);
    if (cached) return cached;
    const node = byId.get(id)!;
    const prereqIds = prerequisites(nodes, node);
    const prereqEff = prereqIds.map((p) => compute(p).eff);
    const w = worst(prereqEff);
    let derived: Derived;

    if (isContainer(node)) {
      const eff: Effective = prereqIds.length === 0 ? 'sorry' : w;
      const shown: ShownStatus = eff === 'widerlegt' ? 'gebrochen' : eff === 'belegt' ? 'belegt' : 'offen';
      derived = { shown, eff, prerequisites: prereqIds };
    } else {
      const own = node.ownStatus ?? 'sorry';
      const ownEff = normalize(own);
      if (prereqIds.length === 0) {
        derived = { shown: own, eff: ownEff, prerequisites: prereqIds };
      } else {
        const eff = worst([ownEff, w]);
        let shown: ShownStatus;
        if (own === 'widerlegt') shown = 'widerlegt';
        else if (w !== 'belegt') shown = 'blockiert';
        else if (own === 'belegt' || own === 'entfallen') shown = own;
        else if (own === 'in_arbeit') shown = 'in_arbeit';
        else shown = 'bereit';
        derived = { shown, eff, prerequisites: prereqIds };
      }
    }
    result.set(id, derived);
    return derived;
  }

  for (const n of nodes) compute(n.id);
  return result;
}

/** Alle Knoten, die `id` direkt oder indirekt voraussetzen (nur aktive Knoten). */
export function dependentsOf(nodes: BpNode[], id: string): string[] {
  const reverse = new Map<string, string[]>();
  for (const n of nodes) {
    if (!isActive(n)) continue;
    for (const p of prerequisites(nodes, n)) {
      const list = reverse.get(p) ?? [];
      list.push(n.id);
      reverse.set(p, list);
    }
  }
  const seen = new Set<string>();
  const queue = [...(reverse.get(id) ?? [])];
  while (queue.length) {
    const cur = queue.shift()!;
    if (seen.has(cur) || cur === id) continue;
    seen.add(cur);
    queue.push(...(reverse.get(cur) ?? []));
  }
  return [...seen];
}

export interface Gap {
  node: BpNode;
  dependents: string[];
  score: number; // damageIfWrong × Anzahl abhängiger Knoten
}

/** Lücken-Report: alle offenen Annahmen, sortiert nach Schaden bei Irrtum mal Zahl der abhängigen Knoten. */
export function gapReport(nodes: BpNode[]): Gap[] {
  const gaps: Gap[] = [];
  for (const n of nodes) {
    if (!isActive(n) || (n.ownStatus ?? 'sorry') !== 'sorry') continue;
    if (n.kind !== 'annahme' && !(n.kind === 'alternative' && n.adopted)) continue;
    const dependents = dependentsOf(nodes, n.id);
    gaps.push({ node: n, dependents, score: (n.damageIfWrong ?? 0) * dependents.length });
  }
  return gaps.sort(
    (a, b) => b.score - a.score || b.dependents.length - a.dependents.length || a.node.title.localeCompare(b.node.title),
  );
}

/** „Worauf ruht das?“: alle offenen Annahmen, auf denen ein Knoten direkt oder indirekt ruht (Gegenstück zu #print axioms). */
export function restsOn(nodes: BpNode[], id: string): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const start = byId.get(id);
  if (!start) return [];
  const seen = new Set<string>([id]);
  const queue = prerequisites(nodes, start);
  const gaps: string[] = [];
  while (queue.length) {
    const cur = queue.shift()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    const n = byId.get(cur)!;
    if ((n.kind === 'annahme' || n.kind === 'alternative') && (n.ownStatus ?? 'sorry') === 'sorry') gaps.push(cur);
    queue.push(...prerequisites(nodes, n));
  }
  return gaps;
}
