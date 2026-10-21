// Rechenmodell für Prototyp C: Erwartungswert (EV) und Informationswert (VoI) einer Fläche.
// Reine Funktionen ohne Oberfläche; alle Zahlen sind fiktive Schätzwerte.

export type ProbKey = 'ausweisung' | 'flaeche' | 'netz' | 'genehmigung' | 'logistik' | 'zuschlag';

export const PROB_KEYS: ProbKey[] = ['ausweisung', 'flaeche', 'netz', 'genehmigung', 'logistik', 'zuschlag'];

export const PROB_LABELS: Record<ProbKey, string> = {
  ausweisung: 'Ausweisung',
  flaeche: 'Fläche (Eigentümer, Pacht)',
  netz: 'Netz',
  genehmigung: 'Genehmigung',
  logistik: 'Logistik',
  zuschlag: 'Zuschlag',
};

export interface Site {
  id: string; // 'W1' … 'W8', Polygon aus region.json
  p: Record<ProbKey, number>;
  reasons: Partial<Record<ProbKey, string>>;
  leasePerYear: number; // L, Pacht pro Jahr
  leaseYears: number; // T, Laufzeit
  survey: number; // G, Naturschutzgutachten
  planning: number; // P, Planung bis zur Genehmigung
  value: number; // V, Wert der Projektrechte bei Erfolg
}

/** Zeitpunkt der Netz-Klarheit: 0 vor Pacht, 1 nach Pacht, 2 nach Gutachten, 3 nach Genehmigung. */
export type Stage = 0 | 1 | 2 | 3;

export const STAGE_LABELS: Record<Stage, string> = {
  0: 'vor der Pacht',
  1: 'nach der Pacht',
  2: 'nach dem Gutachten',
  3: 'nach der Genehmigung',
};

/** Rücktrittsklausel: Restpacht entfällt bei negativer Netzzusage. years[k − 1] = t_k in Jahren seit Pachtbeginn. */
export interface Clause {
  active: boolean;
  years: [number, number, number];
}

export const DEFAULT_CLAUSE: Clause = { active: false, years: [0.5, 1.5, 3] };

export interface CalcInput {
  value: number; // V
  leasePerYear: number; // L
  leaseYears: number; // T
  survey: number; // G
  planning: number; // P
  pNetz: number; // p_N
  pRest: number; // p_R, Produkt der anderen fünf Wahrscheinlichkeiten
}

export function toInput(site: Site): CalcInput {
  const pRest = PROB_KEYS.filter((k) => k !== 'netz').reduce((prod, k) => prod * site.p[k], 1);
  return {
    value: site.value,
    leasePerYear: site.leasePerYear,
    leaseYears: site.leaseYears,
    survey: site.survey,
    planning: site.planning,
    pNetz: site.p.netz,
    pRest,
  };
}

/** P(Erfolg) = Produkt aller sechs Wahrscheinlichkeiten. */
export function pSuccess(site: Site): number {
  return PROB_KEYS.reduce((prod, k) => prod * site.p[k], 1);
}

/** Stufenkosten c₁ = L·T (Pacht), c₂ = G (Gutachten), c₃ = P (Planung) und ihre Summe C. */
export function stageCosts(i: CalcInput): { c1: number; c2: number; c3: number; total: number } {
  const c1 = i.leasePerYear * i.leaseYears;
  const c2 = i.survey;
  const c3 = i.planning;
  return { c1, c2, c3, total: c1 + c2 + c3 };
}

/** C_k: Summe der Stufen vor der Netz-Klarheit (k = 0 vor Pacht … 3 nach Genehmigung). */
export function costBefore(i: CalcInput, k: Stage): number {
  const { c1, c2, c3 } = stageCosts(i);
  return [0, c1, c1 + c2, c1 + c2 + c3][k];
}

/** R_k: Ersparnis durch die Klausel (Restpacht), nur wenn aktiv und die Pacht schon unterschrieben ist (k ≥ 1). */
export function clauseSaving(i: CalcInput, k: Stage, clause: Clause): number {
  if (!clause.active || k < 1) return 0;
  const t = clause.years[k - 1];
  return Math.max(0, i.leasePerYear * (i.leaseYears - t));
}

/** EV_Start(k, p_N) = −C_k + p_N · max(0, p_R·V − (C − C_k)) + (1 − p_N) · R_k */
export function evStart(i: CalcInput, k: Stage, clause: Clause = DEFAULT_CLAUSE, pNetz: number = i.pNetz): number {
  const total = stageCosts(i).total;
  const ck = costBefore(i, k);
  return -ck + pNetz * Math.max(0, i.pRest * i.value - (total - ck)) + (1 - pNetz) * clauseSaving(i, k, clause);
}

/** EV(k, p_N) = max(0, EV_Start): Wer im Minus landet, fängt gar nicht erst an. */
export function ev(i: CalcInput, k: Stage, clause: Clause = DEFAULT_CLAUSE, pNetz: number = i.pNetz): number {
  return Math.max(0, evStart(i, k, clause, pNetz));
}

/**
 * Informationswert einer Vorhersage mit Trefferquote a, die vor dem Start kommt; die echte
 * Netz-Klarheit kommt weiterhin bei k. Zweige mit Wahrscheinlichkeit 0 werden übersprungen.
 */
export function voi(i: CalcInput, k: Stage, clause: Clause, accuracy: number): number {
  const a = accuracy;
  const pN = i.pNetz;
  const pYes = a * pN + (1 - a) * (1 - pN);
  let withInfo = 0;
  if (pYes > 0) withInfo += pYes * ev(i, k, clause, (a * pN) / pYes);
  if (1 - pYes > 0) withInfo += (1 - pYes) * ev(i, k, clause, ((1 - a) * pN) / (1 - pYes));
  return withInfo - ev(i, k, clause, pN);
}

export interface TornadoBar {
  key: ProbKey;
  label: string;
  low: number; // EV bei p − 0,2
  high: number; // EV bei p + 0,2
  min: number;
  max: number;
  span: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Jede Wahrscheinlichkeit auf p ∓ 0,2 setzen (begrenzt auf 0…1), EV neu rechnen, nach Spannweite sortieren. */
export function tornado(site: Site, k: Stage, clause: Clause, delta = 0.2): TornadoBar[] {
  const bars = PROB_KEYS.map((key) => {
    const at = (p: number) => ev(toInput({ ...site, p: { ...site.p, [key]: clamp01(p) } }), k, clause);
    const low = at(site.p[key] - delta);
    const high = at(site.p[key] + delta);
    return { key, label: PROB_LABELS[key], low, high, min: Math.min(low, high), max: Math.max(low, high), span: Math.abs(high - low) };
  });
  return bars.sort((a, b) => b.span - a.span);
}

export interface Portfolio {
  totalEv: number;
  expectedSuccesses: number; // Σ P(Erfolg) über alle Flächen mit EV > 0
  boundLease: number; // Σ L·T über alle Flächen mit EV > 0
  pursued: number; // Anzahl Flächen mit EV > 0
  totalVoi: number;
}

export function portfolio(sites: Site[], k: Stage, clause: Clause, accuracy: number): Portfolio {
  const result: Portfolio = { totalEv: 0, expectedSuccesses: 0, boundLease: 0, pursued: 0, totalVoi: 0 };
  for (const s of sites) {
    const input = toInput(s);
    const e = ev(input, k, clause);
    result.totalEv += e;
    result.totalVoi += voi(input, k, clause, accuracy);
    if (e > 0) {
      result.expectedSuccesses += pSuccess(s);
      result.boundLease += s.leasePerYear * s.leaseYears;
      result.pursued += 1;
    }
  }
  return result;
}

export type Ampel = 'rot' | 'gelb' | 'gruen';

// Schwellen als Konstanten
export const LAYER_THRESHOLDS = { rot: 0.4, gelb: 0.7 } as const;
export const TOTAL_THRESHOLDS = { rot: 0.1, gelb: 0.25 } as const;

/** Ampel je Ebene: rot unter 0,4, gelb unter 0,7, sonst grün. */
export function ampel(p: number): Ampel {
  return p < LAYER_THRESHOLDS.rot ? 'rot' : p < LAYER_THRESHOLDS.gelb ? 'gelb' : 'gruen';
}

/** Gesamt-Ebene: rot unter 0,1, gelb unter 0,25, sonst grün. */
export function ampelTotal(p: number): Ampel {
  return p < TOTAL_THRESHOLDS.rot ? 'rot' : p < TOTAL_THRESHOLDS.gelb ? 'gelb' : 'gruen';
}
