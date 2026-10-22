import { describe, expect, it } from 'vitest';
import { decisionLog } from './data';
import { compareLinks, whoToInform } from './logic';

describe('F: Inhalte', () => {
  it('verweist nur auf vorhandene Log-Einträge und lässt Einträge ohne Zusammenhang übrig', () => {
    const ids = decisionLog.log.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const l of decisionLog.decision.links) expect(ids, l.id).toContain(l.id);
    // Sonst wäre „alles ankreuzen“ immer richtig
    expect(decisionLog.decision.links.length).toBeLessThan(ids.length);
  });
});

describe('F: Abgleich', () => {
  it('trennt gefunden, übersehen und zusätzlich', () => {
    expect(compareLinks(['l2', 'l1'], ['l2', 'l3', 'l6'])).toEqual({ found: ['l2'], missed: ['l3', 'l6'], extra: ['l1'] });
    expect(compareLinks([], ['l2'])).toEqual({ found: [], missed: ['l2'], extra: [] });
  });

  it('nennt jede betroffene Abteilung einmal, ohne die eigene', () => {
    const linkIds = decisionLog.decision.links.map((l) => l.id);
    expect(whoToInform(decisionLog.log, linkIds, 'Projektleitung')).toEqual(['Netzplanung', 'Flächensicherung', 'Naturschutz']);
  });
});
