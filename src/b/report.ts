import { formatEuro } from '../shared/format';
import { gapReport, restsOn, type Derived } from './derive';
import { KIND_LABELS, OWN_STATUS_LABELS, type BpNode, type Project } from './types';
import { STATUS_STYLE } from './statusStyle';

/** Prüfbericht als Markdown, z. B. für Käufer, Bank oder Partner. */
export function buildReport(project: Project, nodes: BpNode[], derived: Map<string, Derived>, lawLabels: string[]): string {
  const lines: string[] = [];
  const root = nodes.find((n) => n.parentId === null);
  const gaps = gapReport(nodes);
  lines.push(`# Prüfbericht: ${project.name}`, '');
  lines.push(`Stand: ${new Date().toLocaleDateString('de-DE')} · Rechtsstand: ${lawLabels.length ? lawLabels.join(', ') : 'Ausgangsstand'}`, '');
  lines.push('*Prototyp: Inhalte fiktiv.*', '');
  if (root) lines.push(`**Ziel:** ${root.title} – Status: **${STATUS_STYLE[derived.get(root.id)!.shown].label}**`, '');

  lines.push('## Offene Annahmen (Lücken)', '');
  if (gaps.length === 0) lines.push('Keine offenen Annahmen.', '');
  for (const g of gaps) {
    lines.push(
      `- **${g.node.title}** – Schaden bei Irrtum: ${g.node.damageIfWrong ? formatEuro(g.node.damageIfWrong) : 'nicht angegeben'}, ` +
        `${g.dependents.length} abhängige Knoten, Score ${g.score.toLocaleString('de-DE')}` +
        (g.node.owner ? `, Verantwortlich: ${g.node.owner}` : ''),
    );
  }
  lines.push('', '## Beweisbaum', '');

  const walk = (id: string, depth: number) => {
    const n = nodes.find((x) => x.id === id)!;
    if (n.hidden) return;
    const d = derived.get(id)!;
    const own = n.ownStatus ? ` (eigener Status: ${OWN_STATUS_LABELS[n.ownStatus]})` : '';
    const rests = restsOn(nodes, id);
    lines.push(
      `${'  '.repeat(depth)}- **${n.title}** [${KIND_LABELS[n.kind]}] – ${STATUS_STYLE[d.shown].label}${own}` +
        (n.evidence ? ` – Beleg: ${n.evidence}` : '') +
        (n.owner ? ` – ${n.owner}` : '') +
        (rests.length && n.kind !== 'annahme' ? ` – ruht auf ${rests.length} offener Annahme(n)` : ''),
    );
    for (const c of nodes.filter((x) => x.parentId === id)) walk(c.id, depth + 1);
  };
  if (root) walk(root.id, 0);
  return lines.join('\n') + '\n';
}
