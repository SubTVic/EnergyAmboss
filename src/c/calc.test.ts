import { describe, expect, it } from 'vitest';
import {
  ampel,
  ampelTotal,
  costBefore,
  ev,
  evStart,
  pSuccess,
  portfolio,
  stageCosts,
  toInput,
  tornado,
  voi,
  type CalcInput,
  type Clause,
  type Site,
} from './calc';

// Referenzfläche wie im Konzeptdokument: V = 5 Mio. €, L = 50.000 €, T = 5 Jahre,
// G = 150.000 €, P = 600.000 € (also C = 1 Mio. €), p_N = 0,4, p_R = 0,5.
const ref: CalcInput = {
  value: 5_000_000,
  leasePerYear: 50_000,
  leaseYears: 5,
  survey: 150_000,
  planning: 600_000,
  pNetz: 0.4,
  pRest: 0.5,
};
const noClause: Clause = { active: false, years: [0.5, 1.5, 3] };
const clause: Clause = { active: true, years: [0.5, 1.5, 3] };

describe('Stufenkosten', () => {
  it('c₁ = L·T, c₂ = G, c₃ = P, C = 1 Mio. €', () => {
    expect(stageCosts(ref)).toEqual({ c1: 250_000, c2: 150_000, c3: 600_000, total: 1_000_000 });
  });
  it('C_k summiert die Stufen vor der Netz-Klarheit', () => {
    expect([0, 1, 2, 3].map((k) => costBefore(ref, k as 0 | 1 | 2 | 3))).toEqual([0, 250_000, 400_000, 1_000_000]);
  });
});

describe('Erwartungswert (Testwerte aus dem Umsetzungsplan)', () => {
  it('k = 3, ohne Klausel (entspricht F1): EV = 0 €', () => {
    expect(ev(ref, 3, noClause)).toBeCloseTo(0, 6);
  });
  it('k = 0: EV = 600.000 €', () => {
    expect(ev(ref, 0, noClause)).toBeCloseTo(600_000, 6);
  });
  it('k = 1: EV = 450.000 €', () => {
    expect(ev(ref, 1, noClause)).toBeCloseTo(450_000, 6);
  });
  it('k = 2: EV = 360.000 €', () => {
    expect(ev(ref, 2, noClause)).toBeCloseTo(360_000, 6);
  });
  it('k = 1, Klausel, t = 0,5: EV = 585.000 €', () => {
    expect(ev(ref, 1, clause)).toBeCloseTo(585_000, 6);
  });
  it('k = 3, Klausel, t = 3: EV = 60.000 €', () => {
    expect(ev(ref, 3, clause)).toBeCloseTo(60_000, 6);
  });
  it('EV fällt, je später die Netz-Klarheit kommt', () => {
    const evs = [0, 1, 2, 3].map((k) => ev(ref, k as 0 | 1 | 2 | 3, noClause));
    expect(evs[0]).toBeGreaterThan(evs[1]);
    expect(evs[1]).toBeGreaterThan(evs[2]);
    expect(evs[2]).toBeGreaterThan(evs[3]);
  });
  it('EV_Start kann negativ sein, EV nie', () => {
    const bad = { ...ref, pNetz: 0.05 };
    expect(evStart(bad, 3, noClause)).toBeLessThan(0);
    expect(ev(bad, 3, noClause)).toBe(0);
  });
  it('die Klausel wirkt vor der Pacht (k = 0) nicht', () => {
    expect(ev(ref, 0, clause)).toBeCloseTo(ev(ref, 0, noClause), 6);
  });
});

describe('Informationswert (Vorhersage, k = 3)', () => {
  it('Trefferquote 1,0: VoI = 600.000 €', () => {
    expect(voi(ref, 3, noClause, 1)).toBeCloseTo(600_000, 4);
  });
  it('Trefferquote 0,8: VoI = 360.000 €', () => {
    expect(voi(ref, 3, noClause, 0.8)).toBeCloseTo(360_000, 4);
  });
  it('Trefferquote 0,5: VoI = 0 €', () => {
    expect(voi(ref, 3, noClause, 0.5)).toBeCloseTo(0, 6);
  });
  it('teilt nicht durch null, wenn die Vorhersage sicher ist (p_N = 1 oder 0)', () => {
    expect(Number.isFinite(voi({ ...ref, pNetz: 1 }, 3, noClause, 0.9))).toBe(true);
    expect(Number.isFinite(voi({ ...ref, pNetz: 0 }, 3, noClause, 0.9))).toBe(true);
    expect(Number.isFinite(voi(ref, 3, noClause, 1))).toBe(true);
  });
  it('ist nie negativ', () => {
    for (const a of [0.5, 0.6, 0.7, 0.8, 0.9, 1]) {
      for (const k of [0, 1, 2, 3] as const) expect(voi(ref, k, noClause, a)).toBeGreaterThanOrEqual(-1e-6);
    }
  });
});

const site = (over: Partial<Site> = {}): Site => ({
  id: 'W1',
  p: { ausweisung: 0.8, flaeche: 0.9, netz: 0.4, genehmigung: 0.8, logistik: 0.95, zuschlag: 0.9 },
  reasons: {},
  leasePerYear: 50_000,
  leaseYears: 5,
  survey: 150_000,
  planning: 600_000,
  value: 5_000_000,
  ...over,
});

describe('Fläche, Portfolio und Tornado', () => {
  it('P(Erfolg) ist das Produkt aller sechs Wahrscheinlichkeiten', () => {
    expect(pSuccess(site())).toBeCloseTo(0.8 * 0.9 * 0.4 * 0.8 * 0.95 * 0.9, 10);
  });
  it('toInput trennt p_N und das Produkt der anderen fünf', () => {
    const i = toInput(site());
    expect(i.pNetz).toBe(0.4);
    expect(i.pRest).toBeCloseTo(0.8 * 0.9 * 0.8 * 0.95 * 0.9, 10);
  });
  it('Portfolio summiert EV, erwartete Erfolge und gebundene Pacht nur über Flächen mit EV > 0', () => {
    const good = site({ id: 'W1', p: { ...site().p, netz: 0.9 } });
    const bad = site({ id: 'W2', p: { ...site().p, netz: 0.02 } });
    const pf = portfolio([good, bad], 3, noClause, 0.8);
    expect(pf.pursued).toBe(1);
    expect(pf.totalEv).toBeCloseTo(ev(toInput(good), 3, noClause), 6);
    expect(pf.expectedSuccesses).toBeCloseTo(pSuccess(good), 10);
    expect(pf.boundLease).toBe(250_000);
  });
  it('Tornado ist nach Spannweite sortiert und auf 0…1 begrenzt', () => {
    const bars = tornado(site({ p: { ...site().p, netz: 0.95 } }), 1, noClause);
    expect(bars).toHaveLength(6);
    for (let i = 1; i < bars.length; i++) expect(bars[i - 1].span).toBeGreaterThanOrEqual(bars[i].span);
    for (const b of bars) {
      expect(b.low).toBeGreaterThanOrEqual(0);
      expect(b.max).toBeGreaterThanOrEqual(b.min);
    }
  });
});

describe('Ampel', () => {
  it('Ebenen: rot unter 0,4, gelb unter 0,7, sonst grün', () => {
    expect([0.39, 0.4, 0.69, 0.7].map(ampel)).toEqual(['rot', 'gelb', 'gelb', 'gruen']);
  });
  it('Gesamt: rot unter 0,1, gelb unter 0,25, sonst grün', () => {
    expect([0.09, 0.1, 0.24, 0.25].map(ampelTotal)).toEqual(['rot', 'gelb', 'gelb', 'gruen']);
  });
});
