import { describe, expect, it } from 'vitest';
import { buildDebrief } from './debrief';
import { gameData } from './data';
import {
  LEASE_PER_ROUND,
  MAX_ROUNDS,
  START_BUDGET,
  blockedReason,
  effectiveTarget,
  newGame,
  playRound,
  successChance,
} from './engine';
import { playGame, randomPolicy, smartPolicy } from './testBots';
import type { ActionPick, EventCard, GameData, GameState } from './types';

const card = (id: string) => gameData.actions.find((a) => a.id === id)!;
const event = (id: string) => gameData.events.find((e) => e.id === id)!;
const only = (...ids: string[]): GameData => ({ ...gameData, events: ids.map(event) });
const noEvents: GameData = { ...gameData, events: [] };

describe('Inhalt', () => {
  it('hat mindestens 10 Aktionen und 15 Ereignisse mit Fall und Wissensknoten', () => {
    expect(gameData.actions.length).toBeGreaterThanOrEqual(10);
    expect(gameData.events.length).toBeGreaterThanOrEqual(15);
    for (const c of [...gameData.actions, ...gameData.events]) {
      expect(c.caseId).toMatch(/^F[1-9]$/);
      expect(c.knowledgeIds.length).toBeGreaterThanOrEqual(1);
      expect(c.knowledgeIds.length).toBeLessThanOrEqual(2);
    }
  });
  it('Aktionen haben 4–6 Begründungen, davon 2–3 gültig', () => {
    for (const a of gameData.actions) {
      const valid = a.reasons.filter((r) => r.valid).length;
      expect(a.reasons.length, a.id).toBeGreaterThanOrEqual(4);
      expect(a.reasons.length, a.id).toBeLessThanOrEqual(6);
      expect(valid, a.id).toBeGreaterThanOrEqual(2);
      expect(valid, a.id).toBeLessThanOrEqual(3);
    }
  });
  it('deckt die Fälle F1 bis F9 mit Ereignissen ab', () => {
    const cases = new Set(gameData.events.map((e) => e.caseId));
    for (const id of ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9']) expect(cases.has(id), id).toBe(true);
  });
  it('causedBy verweist auf vorhandene Aktionen', () => {
    for (const e of gameData.events) if (e.causedBy) expect(gameData.actions.some((a) => a.id === e.causedBy), e.id).toBe(true);
  });
});

describe('Start', () => {
  it('beginnt mit 1,5 Mio. € Budget, acht freien Flächen und verdeckten Ausweisungen', () => {
    const s = newGame(42, gameData);
    expect(s.budget).toBe(START_BUDGET);
    expect(s.round).toBe(1);
    expect(Object.keys(s.sites)).toHaveLength(8);
    expect(Object.values(s.sites).every((x) => x.status === 'frei')).toBe(true);
    expect(s.designations.map((d) => d.round)).toEqual([5, 5, 7]);
    expect(s.sites['W8'].designated).toBe(true); // PV braucht keine Ausweisung
    expect(s.designations.every((d) => d.site !== 'W8')).toBe(true);
  });
});

describe('Seed und Determinismus', () => {
  const picks: ActionPick[][] = [
    [{ actionId: 'sichern', site: 'W1', reasonIds: ['konkurrenz'] }, { actionId: 'netzanfrage' }],
    [{ actionId: 'sichern', site: 'W7' }, { actionId: 'eigentuemer' }],
    [{ actionId: 'gemeinde' }],
    [],
    [{ actionId: 'trasse' }],
  ];
  // Auswahl je Runde auf das beschränken, was im jeweiligen Spielstand möglich ist
  const run = (seed: number) =>
    picks.reduce(
      (s, p) =>
        playRound(
          s,
          p.filter((x) => blockedReason(s, card(x.actionId), x.site) === null),
          gameData,
        ),
      newGame(seed, gameData),
    );

  it('gleicher Seed und gleiche Entscheidungen ergeben denselben Verlauf', () => {
    expect(JSON.stringify(run(2026))).toBe(JSON.stringify(run(2026)));
  });
  it('ein anderer Seed führt zu einem anderen Verlauf', () => {
    const logs = new Set([1, 2, 3, 4, 5, 6].map((seed) => JSON.stringify(run(seed).log)));
    expect(logs.size).toBeGreaterThan(1);
  });
  it('verändert den Eingabezustand nicht', () => {
    const s = newGame(7, gameData);
    const before = JSON.stringify(s);
    playRound(s, [{ actionId: 'netzanfrage' }], gameData);
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('Auswahl und Zielwert', () => {
  const s = newGame(1, gameData);
  it('Fläche sichern braucht eine freie Fläche; Gutachten braucht eine ausgewiesene, gesicherte Fläche', () => {
    expect(blockedReason(s, card('sichern'))).toMatch(/Fläche wählen/);
    expect(blockedReason(s, card('sichern'), 'W1')).toBeNull();
    expect(blockedReason(s, card('gutachten'))).toMatch(/Voraussetzung/);
    expect(blockedReason(s, card('genehmigung'))).toMatch(/Voraussetzung/);
    expect(blockedReason(s, card('ausschreibung'))).toMatch(/Voraussetzung/);
  });
  it('lehnt mehr als zwei Aktionen und unmögliche Aktionen ab', () => {
    expect(() => playRound(s, [{ actionId: 'gemeinde' }, { actionId: 'eigentuemer' }, { actionId: 'netzanfrage' }], gameData)).toThrow();
    expect(() => playRound(s, [{ actionId: 'gutachten' }], gameData)).toThrow(/Voraussetzung/);
    expect(() => playRound(s, [{ actionId: 'sichern', site: 'W1' }, { actionId: 'sichern', site: 'W1' }], gameData)).toThrow(/einmal/);
  });
  it('jede gültige Begründung senkt den Zielwert um 1, jede ungültige hebt ihn um 1', () => {
    const c = card('sichern');
    const base = effectiveTarget(s, c).target;
    expect(base).toBe(5);
    expect(effectiveTarget(s, c, { actionId: 'sichern', reasonIds: ['konkurrenz'] }).target).toBe(base - 1);
    expect(effectiveTarget(s, c, { actionId: 'sichern', reasonIds: ['konkurrenz', 'nicht-alle'] }).target).toBe(base - 2);
    expect(effectiveTarget(s, c, { actionId: 'sichern', reasonIds: ['antrag'] }).target).toBe(base + 1);
    expect(effectiveTarget(s, c, { actionId: 'sichern', reasonIds: ['konkurrenz', 'nicht-alle', 'weissflaeche', 'antrag'] }).target).toBe(base - 3);
  });
  it('mit KI-Spielleitung senkt die Zahl gültiger Begründungen den Zielwert', () => {
    expect(effectiveTarget(s, card('sichern'), { actionId: 'sichern', llmValidReasons: 2 }).target).toBe(3);
  });
  it('ab 7 Kontakten gibt es +1 auf Aktionen mit Eigentümern und Gemeinde, aber nicht auf andere', () => {
    const rich: GameState = { ...s, contacts: 7 };
    expect(effectiveTarget(rich, card('sichern')).target).toBe(4);
    expect(effectiveTarget(rich, card('gemeinde')).target).toBe(4);
    expect(effectiveTarget(rich, card('netzanfrage')).target).toBe(card('netzanfrage').target);
    expect(effectiveTarget({ ...s, contacts: 6 }, card('gemeinde')).target).toBe(5);
  });
  it('der Zielwert bleibt zwischen 2 und 13', () => {
    const all = card('sichern').reasons.map((r) => r.id);
    expect(effectiveTarget({ ...s, contacts: 9 }, card('netzanfrage'), { actionId: 'netzanfrage', llmValidReasons: 3 }).target).toBe(2);
    expect(effectiveTarget(s, card('trasse'), { actionId: 'trasse', reasonIds: ['mehrheit', 'netzbetreiber-erwirbt', 'mehrheit'] }).target).toBeLessThanOrEqual(13);
    expect(all.length).toBeGreaterThan(0);
  });
  it('Erfolgschance bei 2W6', () => {
    expect(successChance(2)).toBe(1);
    expect(successChance(7)).toBeCloseTo(21 / 36, 10);
    expect(successChance(12)).toBeCloseTo(1 / 36, 10);
    expect(successChance(13)).toBe(0);
  });
});

describe('Rundenablauf', () => {
  it('Aktion kostet immer, würfelt sichtbar und wirkt bei Erfolg', () => {
    let found = false;
    for (let seed = 1; seed <= 40 && !found; seed++) {
      const next = playRound(newGame(seed, gameData), [{ actionId: 'sichern', site: 'W1' }], noEvents);
      const d = next.decisions[0];
      expect(d.roll).toHaveLength(2);
      expect(next.log[0].roll).toEqual(d.roll);
      expect(next.log[0].budgetDelta).toBe(-card('sichern').cost);
      if (d.success) {
        found = true;
        expect(next.sites['W1'].status).toBe('gesichert');
        expect(next.sites['W1'].securedRound).toBe(1);
        // Pacht: 25.000 € je gesicherter Fläche und Runde, mit Ursache „Fläche sichern, Runde 1“
        const rent = next.log.find((e) => e.cause.kind === 'upkeep')!;
        expect(rent.budgetDelta).toBe(-LEASE_PER_ROUND);
        expect(rent.cause).toEqual({ kind: 'upkeep', id: 'sichern:W1', round: 1 });
        expect(next.budget).toBe(START_BUDGET - card('sichern').cost - LEASE_PER_ROUND);
      }
    }
    expect(found).toBe(true);
  });

  it('Verzögerung lässt die Pacht weiterlaufen (F4: 9 Monate)', () => {
    const base = newGame(3, only('ev-f4-grenzgebiet'));
    base.sites['W3'] = { status: 'gesichert', designated: false, securedRound: 1 };
    let fired = false;
    for (let seed = 1; seed <= 40 && !fired; seed++) {
      const next = playRound({ ...base, rng: seed }, [], only('ev-f4-grenzgebiet'));
      const entry = next.log.find((e) => e.cause.id === 'ev-f4-grenzgebiet');
      if (!entry) continue;
      fired = true;
      expect(entry.monthsDelta).toBe(9);
      // 9 Monate ≙ 1,5 Runden Pacht für eine gesicherte Fläche
      expect(entry.budgetDelta).toBe(-Math.round((LEASE_PER_ROUND * 9) / 6));
      expect(next.months).toBe(9 + 6);
    }
    expect(fired).toBe(true);
  });

  it('F1: Genehmigung da, Anschluss vage → der Anschluss scheitert', () => {
    const base = newGame(5, only('ev-f1-anschluss'));
    base.permit = 'erteilt';
    base.grid = 'vage';
    base.sites['W1'] = { status: 'gesichert', designated: true, securedRound: 1 };
    let fired = false;
    for (let seed = 1; seed <= 40 && !fired; seed++) {
      const next = playRound({ ...base, rng: seed }, [], only('ev-f1-anschluss'));
      if (!next.firedEvents.includes('ev-f1-anschluss')) continue;
      fired = true;
      expect(next.grid).toBe('absage');
      expect(next.budget).toBeLessThan(base.budget - 300_000);
    }
    expect(fired).toBe(true);
  });

  it('F1 tritt nicht auf, wenn die Netzzusage vorliegt', () => {
    const base = newGame(5, only('ev-f1-anschluss'));
    base.permit = 'erteilt';
    base.grid = 'zusage';
    for (let seed = 1; seed <= 40; seed++) {
      expect(playRound({ ...base, rng: seed }, [], only('ev-f1-anschluss')).firedEvents).toEqual([]);
    }
  });

  it('Ereignisse treten höchstens einmal auf', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const end = playGame(seed, gameData, newGame, randomPolicy);
      expect(new Set(end.firedEvents).size).toBe(end.firedEvents.length);
    }
  });

  it('Ausweisungen kommen verdeckt in Runde 5 und 7', () => {
    const s = playGame(11, gameData, newGame, () => []);
    const plan = newGame(11, gameData).designations;
    for (const d of plan) expect(s.sites[d.site].designated).toBe(true);
    const log5 = s.log.find((e) => e.cause.id === 'ausweisung' && e.round === 5);
    expect(log5).toBeDefined();
  });

  it('Verzögerte Ergebnisse: Gutachten kommt zwei Runden später', () => {
    let s = newGame(9, noEvents);
    s.sites['W1'] = { status: 'gesichert', designated: true, securedRound: 1 };
    s.budget = START_BUDGET;
    let tries = 0;
    while (s.survey === 'keins' && tries++ < 10) s = playRound(s, [{ actionId: 'gutachten' }], noEvents);
    expect(s.survey).toBe('laeuft');
    const orderedIn = s.round - 1;
    s = playRound(s, [], noEvents);
    expect(s.survey).toBe('laeuft');
    s = playRound(s, [], noEvents);
    expect(s.survey).toBe('fertig');
    expect(s.round).toBe(orderedIn + 3);
  });
});

describe('Spielende', () => {
  it('endet nach höchstens 12 Runden', () => {
    const s = playGame(4, gameData, newGame, () => []);
    expect(s.ended?.reason).toBe('zeit');
    expect(s.round).toBe(MAX_ROUNDS);
    expect(() => playRound(s, [], gameData)).toThrow();
  });
  it('endet bei Budget unter null', () => {
    const s = newGame(1, noEvents);
    s.budget = 5_000;
    const next = playRound(s, [{ actionId: 'netzzusage', reasonIds: [] }].filter(() => false), noEvents);
    expect(next.ended).toBeNull();
    const broke = playRound({ ...s, budget: -1 }, [], noEvents);
    expect(broke.ended?.reason).toBe('pleite');
  });
  it('endet mit Zuschlag plus Netzzusage', () => {
    const s = newGame(1, noEvents);
    s.award = true;
    s.grid = 'zusage';
    expect(playRound(s, [], noEvents).ended?.reason).toBe('sieg');
  });
});

describe('Nachbesprechung', () => {
  it('zeigt für jede Entscheidung mindestens eine Folge mit Ursache', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const end = playGame(seed, gameData, newGame, smartPolicy({ validReasons: 2, secureGrid: false }));
      const debrief = buildDebrief(end, gameData);
      expect(debrief.decisions.length).toBe(end.decisions.length);
      for (const d of debrief.decisions) {
        expect(d.direct.length, `${d.decision.id} in Runde ${d.decision.round}`).toBeGreaterThanOrEqual(1);
        for (const c of d.direct) expect(c.entry.cause.id).toBe(d.decision.id);
      }
    }
  });

  it('hängt Ereignisse an die auslösende Entscheidung und findet die teuerste', () => {
    let seen = false;
    for (let seed = 1; seed <= 60 && !seen; seed++) {
      const end = playGame(seed, gameData, newGame, smartPolicy({ validReasons: 1, secureGrid: false }));
      const debrief = buildDebrief(end, gameData);
      const f1 = debrief.decisions.find((d) => d.events.some((e) => e.id === 'ev-f1-anschluss'));
      if (!f1) continue;
      seen = true;
      expect(f1.decision.actionId).toBe('netzanfrage');
      expect(f1.total).toBeGreaterThanOrEqual(300_000);
      // „Teuerste Entscheidung“ ist die mit der größten Summe aus Kosten und Verzögerung
      const max = Math.max(...debrief.decisions.map((d) => d.total));
      expect(debrief.mostExpensive?.total).toBe(max);
    }
    expect(seen).toBe(true);
  });

  it('Summe der Kosten über Entscheidungen und freie Ereignisse entspricht dem ausgegebenen Budget', () => {
    const end = playGame(8, gameData, newGame, smartPolicy({ validReasons: 2, secureGrid: true }));
    const debrief = buildDebrief(end, gameData);
    const spent = debrief.decisions.reduce((s, d) => s + d.cost, 0) + debrief.unattached.reduce((s, e) => s + e.entries.reduce((a, c) => a + c.cost, 0), 0);
    expect(spent).toBe(START_BUDGET - end.budget);
  });
});

describe('Fuzz und Balance', () => {
  it('Zufallsspieler: kein Absturz, Wertebereiche gültig, Spielstand serialisierbar', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const end = playGame(seed, gameData, newGame, randomPolicy);
      expect(end.ended).not.toBeNull();
      expect(end.round).toBeLessThanOrEqual(MAX_ROUNDS);
      expect(Number.isFinite(end.budget)).toBe(true);
      expect(end.contacts).toBeGreaterThanOrEqual(0);
      expect(end.contacts).toBeLessThanOrEqual(10);
      expect(end.support).toBeGreaterThanOrEqual(0);
      expect(end.support).toBeLessThanOrEqual(10);
      expect(JSON.parse(JSON.stringify(end))).toEqual(end);
      for (const e of end.log) expect(e.cause.id).toBeTruthy();
    }
  });

  const winRate = (policy: ReturnType<typeof smartPolicy>, n = 300) => {
    let wins = 0;
    for (let seed = 1; seed <= n; seed++) if (playGame(seed, gameData, newGame, policy).ended?.reason === 'sieg') wins++;
    return wins / n;
  };

  it('ein kluger Spieler gewinnt öfter, wenn er die Netzzusage rechtzeitig einholt (F1)', () => {
    const careful = winRate(smartPolicy({ validReasons: 2, secureGrid: true }));
    const careless = winRate(smartPolicy({ validReasons: 2, secureGrid: false }));
    // Ausgabe für die Balance-Prüfung
    console.log(`Siegquote kluger Spieler: ${(careful * 100).toFixed(0)} %, ohne frühe Netzzusage: ${(careless * 100).toFixed(0)} %`);
    expect(careful).toBeGreaterThan(careless);
    expect(careful).toBeGreaterThan(0.2);
    expect(careful).toBeLessThan(0.95);
  });

  it('ohne Begründungen ist das Spiel schwerer', () => {
    const noReasons = winRate(smartPolicy({ validReasons: 0, secureGrid: true }));
    const reasons = winRate(smartPolicy({ validReasons: 3, secureGrid: true }));
    expect(reasons).toBeGreaterThan(noReasons);
  });
});

// Typ-Prüfung, dass Ereigniskarten ohne Unfall nutzbar sind
export type _EventCheck = EventCard;
