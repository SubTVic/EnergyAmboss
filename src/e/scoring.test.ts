import { describe, expect, it } from 'vitest';
import type { ForecastRow, QuestionRow } from '../shared/store';
import {
  brier,
  calibrationBins,
  communityMedian,
  latestByParticipant,
  mean,
  median,
  scoreParticipant,
} from './scoring';

const q = (over: Partial<QuestionRow> = {}): QuestionRow => ({
  id: 'q1',
  league: 'offen',
  title: 'Test',
  details: null,
  category: 'netz',
  close_date: '2027-06-30',
  resolution_source: null,
  practice: false,
  outcome: null,
  resolved_at: null,
  verify: false,
  ...over,
});

const f = (participant: string, p: number, at: string, question = 'q1'): ForecastRow => ({
  question_id: question,
  participant_id: participant,
  probability: p,
  reason: null,
  created_at: at,
});

describe('Brier-Score', () => {
  it('Prognose 0,7 bei Eintritt ergibt 0,09', () => {
    expect(brier(0.7, true)).toBeCloseTo(0.09, 10);
  });
  it('Prognose 0,2 bei Nicht-Eintritt ergibt 0,04', () => {
    expect(brier(0.2, false)).toBeCloseTo(0.04, 10);
  });
  it('Mittelwert der beiden ergibt 0,065', () => {
    expect(mean([brier(0.7, true), brier(0.2, false)])).toBeCloseTo(0.065, 10);
  });
  it('perfekte und völlig falsche Prognose', () => {
    expect(brier(1, true)).toBe(0);
    expect(brier(1, false)).toBe(1);
  });
  it('Mittelwert ohne Werte ist null', () => {
    expect(mean([])).toBeNull();
  });
});

describe('Median', () => {
  it('letzte Prognosen 0,2 / 0,5 / 0,9 ergeben 0,5', () => {
    expect(median([0.2, 0.5, 0.9])).toBe(0.5);
  });
  it('gerade Anzahl mittelt die beiden mittleren Werte', () => {
    expect(median([0.1, 0.3, 0.5, 0.9])).toBeCloseTo(0.4, 10);
  });
  it('leere Liste ergibt null', () => {
    expect(median([])).toBeNull();
  });
});

describe('letzte Prognose und Community-Median', () => {
  it('nimmt je Person die letzte Prognose', () => {
    const rows = [f('a', 0.2, '2026-11-01T10:00:00Z'), f('a', 0.6, '2026-12-01T10:00:00Z'), f('b', 0.9, '2026-11-15T10:00:00Z')];
    const latest = latestByParticipant(rows, q());
    expect(latest.get('a')?.probability).toBe(0.6);
    expect(latest.get('b')?.probability).toBe(0.9);
  });

  it('ignoriert Prognosen nach dem Stichtag, außer bei Übungsfragen', () => {
    const rows = [f('a', 0.3, '2027-06-01T10:00:00Z'), f('a', 0.95, '2027-07-05T10:00:00Z')];
    expect(latestByParticipant(rows, q()).get('a')?.probability).toBe(0.3);
    expect(latestByParticipant(rows, q({ practice: true })).get('a')?.probability).toBe(0.95);
  });

  it('Community-Median über die letzten Prognosen', () => {
    const rows = [f('a', 0.2, '2026-11-01T00:00:00Z'), f('b', 0.5, '2026-11-01T00:00:00Z'), f('c', 0.9, '2026-11-01T00:00:00Z')];
    expect(communityMedian(rows, q())).toEqual({ median: 0.5, count: 3 });
  });
});

describe('scoreParticipant', () => {
  it('bewertet nur aufgelöste Fragen mit eigener Prognose', () => {
    const questions = [q({ id: 'q1', outcome: true }), q({ id: 'q2', outcome: false }), q({ id: 'q3', outcome: null })];
    const rows = [
      f('me', 0.7, '2026-11-01T00:00:00Z', 'q1'),
      f('me', 0.2, '2026-11-01T00:00:00Z', 'q2'),
      f('me', 0.5, '2026-11-01T00:00:00Z', 'q3'),
      f('other', 0.9, '2026-11-01T00:00:00Z', 'q1'),
    ];
    const items = scoreParticipant(questions, rows, 'me');
    expect(items).toHaveLength(2);
    expect(mean(items.map((i) => i.brier))).toBeCloseTo(0.065, 10);
    // Community-Median für q1: 0,7 und 0,9 → 0,8
    expect(items[0].communityP).toBeCloseTo(0.8, 10);
  });
});

describe('Kalibrierung', () => {
  it('sortiert Prognosen in Zehnerklassen und zählt Treffer', () => {
    const bins = calibrationBins([
      { p: 0.72, outcome: true },
      { p: 0.78, outcome: false },
      { p: 0.75, outcome: true },
      { p: 1, outcome: true },
      { p: 0.05, outcome: false },
    ]);
    expect(bins).toHaveLength(10);
    expect(bins[7].n).toBe(3);
    expect(bins[7].observed).toBeCloseTo(2 / 3, 10);
    expect(bins[7].meanForecast).toBeCloseTo(0.75, 10);
    expect(bins[9].n).toBe(1); // p = 1 landet in der obersten Klasse
    expect(bins[0].observed).toBe(0);
    expect(bins[3].n).toBe(0);
    expect(bins[3].observed).toBeNull();
  });
});
