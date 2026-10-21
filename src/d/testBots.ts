// Spieler-Bots für Tests und Balance-Prüfung der Engine (nicht Teil der App).
import { blockedReason, MAX_ACTIONS, playRound } from './engine';
import { Rng } from './rng';
import type { ActionCard, ActionPick, GameData, GameState } from './types';

type Policy = (state: GameState, data: GameData, rng: Rng) => ActionPick[];

function candidates(state: GameState, card: ActionCard): ActionPick[] {
  if (card.needsSite) {
    return Object.entries(state.sites)
      .filter(([, s]) => s.status === card.needsSite)
      .map(([site]) => ({ actionId: card.id, site }))
      .filter((p) => blockedReason(state, card, p.site) === null);
  }
  return blockedReason(state, card) === null ? [{ actionId: card.id }] : [];
}

/** Wählt zufällig bis zu zwei gültige Aktionen, mit zufälligen Begründungen. */
export const randomPolicy: Policy = (state, data, rng) => {
  const options = data.actions.flatMap((c) => candidates(state, c));
  const picks: ActionPick[] = [];
  const count = Math.floor(rng.next() * (MAX_ACTIONS + 1));
  for (let i = 0; i < count && options.length; i++) {
    const o = options.splice(Math.floor(rng.next() * options.length), 1)[0];
    if (picks.some((p) => p.actionId === o.actionId && p.site === o.site)) continue;
    const card = data.actions.find((c) => c.id === o.actionId)!;
    const reasonIds = card.reasons.filter(() => rng.next() < 0.4).map((r) => r.id).slice(0, 3);
    picks.push({ ...o, reasonIds });
  }
  return picks;
};

interface SmartOptions {
  /** Anzahl gültiger Begründungen, die der Bot angibt (0–3). */
  validReasons: number;
  /** Holt die verbindliche Netzzusage rechtzeitig ein; sonst läuft der Bot in F1. */
  secureGrid: boolean;
}

/** Regelbasierter Spieler nach dem Ablauf des Projektierers im Interview. */
export function smartPolicy({ validReasons, secureGrid }: SmartOptions): Policy {
  return (state, data) => {
    const card = (id: string) => data.actions.find((a) => a.id === id)!;
    const can = (id: string, site?: string) => blockedReason(state, card(id), site) === null;
    const order: ActionPick[] = [];
    const add = (id: string, site?: string) => {
      if (can(id, site)) order.push({ actionId: id, site });
    };
    const free = Object.entries(state.sites).filter(([, s]) => s.status === 'frei').map(([id]) => id);
    const secured = Object.entries(state.sites).filter(([, s]) => s.status === 'gesichert');
    const preferred = ['W1', 'W7', 'W6', 'W2', 'W4', 'W3', 'W5', 'W8'];
    const nextSite = preferred.find((id) => free.includes(id));

    if (state.permit === 'erteilt' && state.grid === 'zusage') add('ausschreibung');
    if (state.permit === 'erteilt' && state.grid !== 'zusage') add('netzzusage');
    if (secureGrid && state.grid !== 'zusage' && state.grid !== 'keine' && secured.length > 0 && state.survey !== 'keins') add('netzzusage');
    if (state.survey === 'fertig' || state.survey === 'problem') add('genehmigung');
    add('gutachten');
    if (state.grid === 'keine') add('netzanfrage');
    if (secureGrid && secured.length > 0 && state.grid !== 'zusage' && state.grid !== 'keine') add('netzzusage');
    if (secured.length < 3 && nextSite) add('sichern', nextSite);
    if (secured.length > 0 && !state.flags.includes('trasse') && state.round >= 3) add('trasse');
    if (state.contacts < 7) add('eigentuemer');
    if (state.support < 6) add('gemeinde');
    if (state.permit === 'erteilt' && !state.award) add('ausschreibung');

    const unique: ActionPick[] = [];
    for (const p of order) if (!unique.some((u) => u.actionId === p.actionId && u.site === p.site)) unique.push(p);
    return unique.slice(0, MAX_ACTIONS).map((p) => {
      const c = card(p.actionId);
      const reasonIds = c.reasons.filter((r) => r.valid).slice(0, validReasons).map((r) => r.id);
      return { ...p, reasonIds };
    });
  };
}

export function playGame(seed: number, data: GameData, newGame: (seed: number, data: GameData) => GameState, policy: Policy): GameState {
  const rng = new Rng(seed * 7919 + 13);
  let state = newGame(seed, data);
  let guard = 0;
  while (!state.ended && guard++ < 50) state = playRound(state, policy(state, data, rng), data);
  return state;
}
