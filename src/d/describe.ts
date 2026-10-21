// Lesbare Beschreibung der Kartensprache (Bedingungen und Wirkungen) für die Druckkarten.
import { formatEuro } from '../shared/format';
import type { Condition, Effect, Range } from './types';

const list = (v: string | string[]) => (Array.isArray(v) ? v.join(' oder ') : v);

function range(label: string, r: Range): string {
  if (r.gte !== undefined && r.lte !== undefined) return `${label} ${r.gte}–${r.lte}`;
  if (r.gte !== undefined) return `${label} mindestens ${r.gte}`;
  return `${label} höchstens ${r.lte}`;
}

export function describeCondition(c: Condition): string {
  const parts: string[] = [];
  if (c.grid !== undefined) parts.push(`Netz: ${list(c.grid)}`);
  if (c.survey !== undefined) parts.push(`Gutachten: ${list(c.survey)}`);
  if (c.permit !== undefined) parts.push(`Genehmigung: ${list(c.permit)}`);
  if (c.award !== undefined) parts.push(c.award ? 'Zuschlag erhalten' : 'noch kein Zuschlag');
  if (c.round) parts.push(range('Runde', c.round));
  if (c.budget) parts.push(range('Budget', c.budget));
  if (c.contacts) parts.push(range('Kontakte', c.contacts));
  if (c.support) parts.push(range('Rückhalt', c.support));
  if (c.securedSites) parts.push(range('gesicherte Flächen', c.securedSites));
  if (c.freeSites) parts.push(range('freie Flächen', c.freeSites));
  if (c.designatedSecured) parts.push(range('gesicherte und ausgewiesene Flächen', c.designatedSecured));
  if (c.siteStatus) parts.push(`Fläche ${c.siteStatus.site} ${c.siteStatus.status}`);
  if (c.flag) parts.push(`Merker „${c.flag}“ gesetzt`);
  if (c.noFlag) parts.push(`Merker „${c.noFlag}“ nicht gesetzt`);
  return parts.join(', ');
}

export function describeEffect(e: Effect): string {
  if (e.if) return `Falls ${describeCondition(e.if)}: ${(e.then ?? []).map(describeEffect).join('; ')}`;
  if (e.later !== undefined) return `in ${e.later} ${e.later === 1 ? 'Runde' : 'Runden'}: ${e.text ?? ''}`;
  const parts: string[] = [];
  if (e.budget) parts.push(`Budget ${e.budget > 0 ? '+' : '−'}${formatEuro(Math.abs(e.budget))}`);
  if (e.months) parts.push(`${e.months > 0 ? '+' : ''}${e.months} Monate Verzögerung (Pacht läuft weiter)`);
  if (e.contacts) parts.push(`Kontakte ${e.contacts > 0 ? '+' : ''}${e.contacts}`);
  if (e.support) parts.push(`Rückhalt ${e.support > 0 ? '+' : ''}${e.support}`);
  if (e.grid) parts.push(`Netz: ${e.grid}`);
  if (e.survey) parts.push(`Gutachten: ${e.survey}`);
  if (e.permit) parts.push(`Genehmigung: ${e.permit}`);
  if (e.award !== undefined) parts.push(e.award ? 'Zuschlag erhalten' : 'Zuschlag weg');
  if (e.site && e.status) {
    const where = e.site === '$target' ? 'gewählte Fläche' : e.site === 'random:gesichert' ? 'eine gesicherte Fläche (zufällig)' : e.site === 'random:frei' ? 'eine freie Fläche (zufällig)' : `Fläche ${e.site}`;
    parts.push(`${where}: ${e.status}`);
  }
  if (e.flag) parts.push(`Merker „${e.flag}“ setzen`);
  if (e.clearFlag) parts.push(`Merker „${e.clearFlag}“ löschen`);
  return parts.join(', ');
}

export const describeEffects = (es: Effect[]): string => es.map(describeEffect).filter(Boolean).join('; ') || 'keine Wirkung';
export const describeConditions = (cs: Condition[]): string => cs.map(describeCondition).filter(Boolean).join('; ') || 'immer';
