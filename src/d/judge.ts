import { z } from 'zod';
import { caseById, nodeById } from '../shared/content';
import type { ActionCard, GameState } from './types';

/** Die KI-Spielleitung ist nur mit VITE_LLM_JUDGE=1 im Build sichtbar. */
export const LLM_AVAILABLE = import.meta.env.VITE_LLM_JUDGE === '1';

const JudgementSchema = z.object({
  validReasons: z.number().int().min(0).max(3),
  feedback: z.string(),
  missing: z.string(),
});

export type Judgement = z.infer<typeof JudgementSchema>;

/** Faktenkarten der Aktion: Fallpaket, Wissensknoten und die Begründungen der Karte. Nur daraus darf die Spielleitung urteilen. */
export function factsFor(card: ActionCard): string[] {
  const facts = [card.summary];
  const c = caseById(card.caseId);
  if (c) facts.push(`${c.id} ${c.title}: ${c.situation}`);
  for (const id of card.knowledgeIds) {
    const n = nodeById(id);
    if (n) facts.push(`${n.label}: ${n.summary}`);
  }
  for (const r of card.reasons) facts.push(r.why);
  return facts;
}

/** Kurzer Spielstand für die Spielleitung. */
export function briefState(state: GameState): Record<string, string | number | boolean> {
  return {
    runde: state.round,
    budget: state.budget,
    netz: state.grid,
    gutachten: state.survey,
    genehmigung: state.permit,
    zuschlag: state.award,
    gesicherteFlaechen: Object.values(state.sites).filter((s) => s.status === 'gesichert').length,
    kontakte: state.contacts,
    rueckhalt: state.support,
  };
}

/** Ruft /api/judge auf; Zeitlimit 10 Sekunden. Bei jedem Fehler wird geworfen, damit das Spiel in den Listenmodus zurückfällt. */
export async function judgeReasoning(card: ActionCard, state: GameState, reasoning: string, timeoutMs = 10_000): Promise<Judgement> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api/judge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        action: { id: card.id, label: card.label },
        state: briefState(state),
        reasoning: reasoning.slice(0, 600),
        facts: factsFor(card).slice(0, 16),
      }),
    });
    if (!res.ok) throw new Error(`Spielleitung antwortet mit ${res.status}`);
    return JudgementSchema.parse(await res.json());
  } finally {
    clearTimeout(timer);
  }
}
