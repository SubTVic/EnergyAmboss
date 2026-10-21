import type { ForecastRow, QuestionRow } from '../shared/store';

/** Brier-Score einer Prognose: (p − o)², 0 ist perfekt. */
export function brier(p: number, outcome: boolean): number {
  const o = outcome ? 1 : 0;
  return (p - o) ** 2;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Ende des Stichtags (UTC) als Zeitpunkt; Prognosen danach zählen nicht mehr. */
export function closeInstant(closeDate: string): number {
  return Date.parse(`${closeDate}T23:59:59.999Z`);
}

/**
 * Letzte Prognose je Person für eine Frage. Bei normalen Fragen zählt nur, was bis zum
 * Stichtag abgegeben wurde; Übungsfragen haben einen vergangenen Stichtag und zählen komplett.
 */
export function latestByParticipant(
  forecasts: ForecastRow[],
  question: Pick<QuestionRow, 'id' | 'close_date' | 'practice'>,
): Map<string, ForecastRow> {
  const cutoff = question.practice ? Infinity : closeInstant(question.close_date);
  const latest = new Map<string, ForecastRow>();
  for (const f of forecasts) {
    if (f.question_id !== question.id) continue;
    if (Date.parse(f.created_at) > cutoff) continue;
    const prev = latest.get(f.participant_id);
    if (!prev || Date.parse(f.created_at) >= Date.parse(prev.created_at)) latest.set(f.participant_id, f);
  }
  return latest;
}

/** Median der jeweils letzten Prognose aller Teilnehmenden. */
export function communityMedian(
  forecasts: ForecastRow[],
  question: Pick<QuestionRow, 'id' | 'close_date' | 'practice'>,
): { median: number | null; count: number } {
  const latest = latestByParticipant(forecasts, question);
  const values = [...latest.values()].map((f) => f.probability);
  return { median: median(values), count: values.length };
}

export interface ScoredItem {
  question: QuestionRow;
  p: number;
  outcome: boolean;
  brier: number;
  communityP: number | null;
  communityBrier: number | null;
}

/** Alle aufgelösten Fragen, zu denen die Person eine Prognose abgegeben hat. */
export function scoreParticipant(
  questions: QuestionRow[],
  forecasts: ForecastRow[],
  participantId: string,
): ScoredItem[] {
  const items: ScoredItem[] = [];
  for (const q of questions) {
    if (q.outcome === null) continue;
    const mine = latestByParticipant(forecasts, q).get(participantId);
    if (!mine) continue;
    const { median: cm } = communityMedian(forecasts, q);
    items.push({
      question: q,
      p: mine.probability,
      outcome: q.outcome,
      brier: brier(mine.probability, q.outcome),
      communityP: cm,
      communityBrier: cm === null ? null : brier(cm, q.outcome),
    });
  }
  return items;
}

export interface CalibrationBin {
  bin: number; // 0 … 9
  label: string; // „70–80 %“
  meanForecast: number | null;
  observed: number | null;
  n: number;
}

/** Prognosen in Zehnerklassen; je Klasse mittlere Prognose gegen beobachtete Trefferquote. */
export function calibrationBins(items: { p: number; outcome: boolean }[], binCount = 10): CalibrationBin[] {
  const bins: { ps: number[]; hits: number }[] = Array.from({ length: binCount }, () => ({ ps: [], hits: 0 }));
  for (const it of items) {
    const idx = Math.min(binCount - 1, Math.floor(it.p * binCount));
    bins[idx].ps.push(it.p);
    if (it.outcome) bins[idx].hits += 1;
  }
  return bins.map((b, i) => ({
    bin: i,
    label: `${Math.round((i * 100) / binCount)}–${Math.round(((i + 1) * 100) / binCount)} %`,
    meanForecast: mean(b.ps),
    observed: b.ps.length ? b.hits / b.ps.length : null,
    n: b.ps.length,
  }));
}
