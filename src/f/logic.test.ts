import { describe, expect, it } from 'vitest';
import { nodeById } from '../shared/content';
import { decisionLog } from './data';
import { affectedDepts, compareLinks, evOptions, logAfter, logBefore, toLogEntry } from './logic';
import type { MyDecision } from './types';

const d1 = decisionLog.decisions[0];
const mineD1: MyDecision = {
  decisionId: 'd1',
  picks: ['l2', 'l1'],
  note: 'Gemeinde fragen',
  optionId: 'jetzt',
  reason: 'Die Genehmigung dauert ohnehin lange.',
  p: 0.4,
  pReason: 'die Auskunft nur mündlich ist',
};

describe('F: Inhalte', () => {
  it('verweist nur auf vorhandene Log-Einträge, Wissensknoten und Optionen', () => {
    const logIds = new Set(decisionLog.log.map((e) => e.id));
    decisionLog.decisions.forEach((d, i) => {
      // Ein Link darf auf das Start-Log oder auf frühere Entscheidungen zeigen
      const known = new Set([...logIds, ...decisionLog.decisions.slice(0, i).map((x) => x.id)]);
      for (const l of d.logLinks) expect(known.has(l.id), `${d.id} → ${l.id}`).toBe(true);
      for (const l of d.knowledgeLinks) expect(nodeById(l.id), `${d.id} → ${l.id}`).toBeDefined();
      for (const o of d.options) for (const id of o.restsOn) expect(logIds.has(id), `${o.id} → ${id}`).toBe(true);
      for (const id of d.breaks ?? []) expect(logIds.has(id)).toBe(true);
      if (d.estimate) {
        const optionIds = new Set(d.options.map((o) => o.id));
        for (const id of Object.values(d.estimate.optionIds)) expect(optionIds.has(id)).toBe(true);
      }
    });
    for (const e of decisionLog.log) for (const id of e.knowledgeIds) expect(nodeById(id), `${e.id} → ${id}`).toBeDefined();
  });

  it('verknüpft jede Entscheidung mit Wissen aus einem anderen Bereich', () => {
    for (const d of decisionLog.decisions) {
      const domains = new Set(d.knowledgeLinks.map((l) => nodeById(l.id)!.domain));
      expect(domains.size).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('F: Verbindungen abgleichen', () => {
  it('trennt gefunden, übersehen und zusätzlich', () => {
    expect(compareLinks(['l2', 'l1'], ['l2', 'l6', 'l3'])).toEqual({ found: ['l2'], missed: ['l6', 'l3'], extra: ['l1'] });
    expect(compareLinks([], ['l2'])).toEqual({ found: [], missed: ['l2'], extra: [] });
  });

  it('nennt betroffene Abteilungen ohne die eigene', () => {
    const log = logBefore(decisionLog, [], 0);
    expect(affectedDepts(log, ['l2', 'l6', 'l3', 'l4'], 'projektleitung')).toEqual([
      { dept: 'netzplanung', entryIds: ['l2', 'l6'] },
      { dept: 'flaechensicherung', entryIds: ['l3'] },
    ]);
  });
});

describe('F: Log fortschreiben', () => {
  it('schreibt die eigene Entscheidung mit Begründung und offenen Annahmen ins Log', () => {
    const entry = toLogEntry(d1, mineD1, decisionLog.log);
    expect(entry.id).toBe('d1');
    expect(entry.mine).toBe(true);
    expect(entry.reasons).toEqual([
      'Die Genehmigung dauert ohnehin lange.',
      'Schätzung Netzzusage: 40 %, weil die Auskunft nur mündlich ist',
      'Eigene Verbindung: Gemeinde fragen',
    ]);
    // „jetzt“ ruht auf L2 und L6, beide offen
    expect(entry.assumptions.map((a) => [a.text, a.status])).toEqual([
      ['Kapazität am UW Nord reicht', 'offen'],
      ['Alle Flurstücke der Trasse sicherbar', 'offen'],
    ]);
  });

  it('zeigt vor der zweiten Entscheidung den eigenen Eintrag und die widerlegte Trasse', () => {
    const before1 = logBefore(decisionLog, [mineD1], 0);
    expect(before1.map((e) => e.id)).toEqual(['l1', 'l2', 'l3', 'l4', 'l5', 'l6']);
    expect(before1.find((e) => e.id === 'l6')!.assumptions[0].status).toBe('offen');

    const before2 = logBefore(decisionLog, [mineD1], 1);
    expect(before2.map((e) => e.id)).toEqual(['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'd1']);
    expect(before2.find((e) => e.id === 'l6')!.assumptions[0]).toMatchObject({ status: 'widerlegt', note: 'mit der neuen Lage widerlegt' });
    expect(before2.find((e) => e.id === 'd1')!.assumptions[1].status).toBe('widerlegt');
  });
});

describe('F: Erwartungswert ab heute', () => {
  it('rechnet die Testwerte aus dem Konzept (p = 0,4)', () => {
    const r = evOptions(d1.estimate!, 0.4);
    expect(r.now).toBeCloseTo(400_000); // 0,4 · 0,5 · 5 Mio. − 600.000
    expect(r.wait).toBeCloseTo(615_000); // 0,4 · (2,5 Mio. − 600.000) − 145.000
    expect(r.voi).toBeCloseTo(360_000); // 600.000 · (1 − 0,4), wie in C
    expect(r.giveUp).toBe(0);
  });

  it('macht Warten wertlos, wenn die Zusage sicher ist', () => {
    const r = evOptions(d1.estimate!, 1);
    expect(r.voi).toBeCloseTo(0);
    expect(r.now).toBeGreaterThan(r.wait);
  });
});

describe('F: Log nach der Entscheidung', () => {
  it('enthält den eigenen Eintrag, aber noch nicht die nächste Lage', () => {
    const after = logAfter(decisionLog, [mineD1], 0);
    expect(after.map((e) => e.id)).toEqual(['l1', 'l2', 'l3', 'l4', 'l5', 'l6', 'd1']);
    expect(after.find((e) => e.id === 'l6')!.assumptions[0].status).toBe('offen');
  });
});
