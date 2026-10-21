import { describe, expect, it } from 'vitest';
import { cases, nodeById } from '../shared/content';
import { questions } from './data';
import {
  buildSession,
  cascadePoints,
  connectionRadar,
  effectivePanel,
  knowledgeSubgraph,
  mixQuestions,
  retriesFor,
  scoreAnswer,
  sctPoints,
} from './logic';
import type { Sct, QuestionResult } from './types';

describe('SCT-Wertung', () => {
  const panel = [0, 2, 6, 2, 0]; // Anzahlen für −2 … +2
  it('Panel [0, 2, 6, 2, 0]: Antwort 0 ergibt 1,0 Punkte', () => {
    expect(sctPoints(panel, 0)).toBe(1);
  });
  it('Antwort −1 ergibt rund 0,33 Punkte', () => {
    expect(sctPoints(panel, -1)).toBeCloseTo(1 / 3, 10);
    expect(sctPoints(panel, 1)).toBeCloseTo(1 / 3, 10);
  });
  it('Antwort −2 ergibt null Punkte', () => {
    expect(sctPoints(panel, -2)).toBe(0);
    expect(sctPoints(panel, 2)).toBe(0);
  });
  it('leeres Panel ergibt 0 statt NaN', () => {
    expect(sctPoints([0, 0, 0, 0, 0], 0)).toBe(0);
  });
});

describe('Panel: echt ab 5 Experten, sonst Platzhalter', () => {
  const q = questions.find((x) => x.type === 'sct') as Sct;
  const row = (expert: string, value: number, item = q.id) => ({ item_id: item, expert, value });

  it('nutzt das seedPanel als Platzhalter unter 5 Experten', () => {
    const p = effectivePanel(q, [row('a', 0), row('b', 0), row('c', 0), row('d', 0)]);
    expect(p.placeholder).toBe(true);
    expect(p.panel).toEqual([...q.seedPanel]);
    expect(p.experts).toBe(4);
  });
  it('wertet ab 5 Experten gegen das echte Panel', () => {
    const p = effectivePanel(q, [row('a', -1), row('b', -1), row('c', -1), row('d', 0), row('e', 2)]);
    expect(p.placeholder).toBe(false);
    expect(p.panel).toEqual([0, 3, 1, 0, 1]);
  });
  it('zählt je Experte nur die letzte Antwort und ignoriert andere Items', () => {
    const rows = [row('a', -2), row('a', 1), row('b', 1), row('c', 1), row('d', 1), row('e', 1), row('x', 0, 'anderes-item')];
    const p = effectivePanel(q, rows);
    expect(p.panel).toEqual([0, 0, 0, 5, 0]);
    expect(p.experts).toBe(5);
  });
});

describe('Kaskadenfrage', () => {
  it('1 Punkt pro richtigem Bereich, höchstens 3', () => {
    expect(cascadePoints(['recht', 'natur', 'vertraege'], ['recht', 'natur', 'vertraege'])).toBe(3);
    expect(cascadePoints(['recht', 'netz', 'logistik'], ['recht', 'natur', 'vertraege'])).toBe(1);
    expect(cascadePoints(['netz'], ['recht', 'natur', 'vertraege'])).toBe(0);
    expect(cascadePoints(['recht', 'recht', 'recht'], ['recht', 'natur', 'vertraege'])).toBe(1);
  });
});

describe('Inhalt: 20 Fragen, davon 8 im SCT-Format', () => {
  it('hat die Zielzahlen', () => {
    expect(questions).toHaveLength(20);
    expect(questions.filter((q) => q.type === 'sct')).toHaveLength(8);
    expect(questions.filter((q) => q.type === 'single')).toHaveLength(9);
    expect(questions.filter((q) => q.type === 'cascade')).toHaveLength(3);
  });
  it('hat eindeutige IDs und gültige Fälle', () => {
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    const caseIds = new Set(cases.map((c) => c.id));
    for (const q of questions) expect(caseIds.has(q.caseId), q.id).toBe(true);
  });
  it('deckt alle neun Fälle ab', () => {
    expect(new Set(questions.map((q) => q.caseId)).size).toBe(9);
  });
  it('jede Wissenskarte zeigt mindestens einen Knoten aus einem anderen Bereich als die Frage', () => {
    for (const q of questions) {
      expect(q.nodeIds.every((id) => nodeById(id)), `${q.id}: unbekannter Knoten`).toBe(true);
      const sub = knowledgeSubgraph(q);
      expect(sub.nodeIds.length, q.id).toBeGreaterThanOrEqual(2);
      expect(sub.nodeIds.length, q.id).toBeLessThanOrEqual(6);
      const other = sub.nodeIds.filter((id) => nodeById(id)!.domain !== q.domains[0]);
      expect(other.length, `${q.id}: Knoten aus anderem Bereich`).toBeGreaterThanOrEqual(1);
      // auch die Knoten der Frage selbst (vor dem Auffüllen mit Nachbarn) enthalten Querwissen
      expect(q.nodeIds.some((id) => nodeById(id)!.domain !== q.domains[0]), `${q.id}: nodeIds`).toBe(true);
    }
  });
  it('Kaskadenfragen nennen genau drei richtige Bereiche, die zu den Fall-Bereichen passen', () => {
    for (const q of questions) {
      if (q.type !== 'cascade') continue;
      expect(new Set(q.correctDomains).size).toBe(3);
      const caseDomains = cases.find((c) => c.id === q.caseId)!.domains;
      for (const d of q.correctDomains) expect(caseDomains, q.id).toContain(d);
    }
  });
  it('Platzhalter-Panels haben ein eindeutiges Maximum', () => {
    for (const q of questions) {
      if (q.type !== 'sct') continue;
      expect(Math.max(...q.seedPanel)).toBeGreaterThan(0);
    }
  });
});

describe('Session', () => {
  it('baut eine gemischte Session mit 10 Fragen ohne zwei gleiche Fälle direkt hintereinander', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const items = buildSession(questions, { count: 10, seed });
      expect(items).toHaveLength(10);
      expect(new Set(items.map((i) => i.questionId)).size).toBe(10);
      const byId = new Map(questions.map((q) => [q.id, q]));
      for (let i = 1; i < items.length; i++) {
        expect(byId.get(items[i].questionId)!.caseId, `Seed ${seed}, Position ${i}`).not.toBe(byId.get(items[i - 1].questionId)!.caseId);
      }
    }
  });
  it('mischt Optionen nur bei Einzelwahl', () => {
    const items = buildSession(questions, { count: 20, seed: 3 });
    for (const i of items) {
      const q = questions.find((x) => x.id === i.questionId)!;
      if (q.type === 'single') expect([...(i.optionOrder ?? [])].sort()).toEqual(q.options.map((o) => o.id).sort());
      else expect(i.optionOrder).toBeUndefined();
    }
  });
  it('kann nach Bereich filtern', () => {
    const items = buildSession(questions, { count: 20, domain: 'logistik', seed: 1 });
    expect(items.length).toBeGreaterThan(0);
    for (const i of items) expect(questions.find((q) => q.id === i.questionId)!.domains).toContain('logistik');
  });
  it('ist mit gleichem Seed reproduzierbar', () => {
    expect(buildSession(questions, { count: 10, seed: 5 })).toEqual(buildSession(questions, { count: 10, seed: 5 }));
    expect(mixQuestions(questions, 9).map((q) => q.id)).toEqual(mixQuestions(questions, 9).map((q) => q.id));
  });
  it('Wiederholung: falsch beantwortete Fragen kommen einmal am Ende wieder', () => {
    const results: QuestionResult[] = [
      { questionId: 'a-s1', retry: false, answer: { type: 'single', optionId: 'b' }, points: 0, max: 1, miss: true },
      { questionId: 'a-s2', retry: false, answer: { type: 'single', optionId: 'a' }, points: 1, max: 1, miss: false },
    ];
    const queue = retriesFor(results, []);
    expect(queue).toEqual([{ questionId: 'a-s1', retry: true }]);
    // keine zweite Wiederholung, auch wenn die Wiederholung wieder falsch ist
    const again = [...results, { ...results[0], retry: true }];
    expect(retriesFor(again, queue)).toEqual([]);
  });
});

describe('Bewertung und Verbindungs-Radar', () => {
  it('bewertet Einzelwahl, SCT und Kaskade', () => {
    const s1 = questions.find((q) => q.id === 'a-s1')!;
    expect(scoreAnswer(s1, { type: 'single', optionId: 'a' })).toEqual({ points: 1, max: 1, miss: false });
    expect(scoreAnswer(s1, { type: 'single', optionId: 'e' })).toEqual({ points: 0, max: 1, miss: true });
    const sct = questions.find((q) => q.id === 'a-sct1') as Sct;
    const best = scoreAnswer(sct, { type: 'sct', value: -1 });
    expect(best.points).toBe(1);
    expect(scoreAnswer(sct, { type: 'sct', value: 2 }).miss).toBe(true);
    const c1 = questions.find((q) => q.id === 'a-c1')!;
    expect(scoreAnswer(c1, { type: 'cascade', domains: ['recht', 'natur', 'netz'] })).toEqual({ points: 2, max: 3, miss: false });
    expect(scoreAnswer(c1, { type: 'cascade', domains: ['netz'] }).miss).toBe(true);
  });

  it('Radar: Fehlerquote je Bereichspaar aus domains[0] und domains[1], nur Erstversuche', () => {
    const mk = (id: string, miss: boolean, retry = false): QuestionResult => ({
      questionId: id,
      retry,
      answer: { type: 'single', optionId: 'a' },
      points: miss ? 0 : 1,
      max: 1,
      miss,
    });
    // a-sct1 und a-s3 (netz|vertraege? nein: a-sct1 = netz|vertraege, a-s3 = vertraege|netz), a-s7 = netz|technik
    const radar = connectionRadar([mk('a-sct1', true), mk('a-s7', false), mk('a-s7', true, true)], questions);
    const pairs = Object.fromEntries(radar.map((p) => [p.key, p]));
    expect(pairs['netz|vertraege'].errorRate).toBe(1);
    expect(pairs['netz|technik'].total).toBe(1);
    expect(pairs['netz|technik'].errorRate).toBe(0);
    expect(radar[0].key).toBe('netz|vertraege');
  });
});
