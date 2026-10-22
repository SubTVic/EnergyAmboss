import { useMemo } from 'react';
import type cytoscape from 'cytoscape';
import { useNavigate } from 'react-router-dom';
import { CytoGraph, type GraphEdge, type GraphNode } from '../shared/CytoGraph';
import { nodeById } from '../shared/content';
import { DOMAIN_LABELS } from '../shared/types';
import type { LinkComparison } from './logic';
import type { AssumptionStatus, Decision, LogEntry } from './types';

const LAYOUT = { name: 'preset', animate: false, padding: 20 } as cytoscape.LayoutOptions;

// Farbe nur mit Bedeutung: Rand eines Log-Eintrags = schlechtester Stand seiner Annahmen
const STATUS_BORDER: Record<AssumptionStatus, string> = { belegt: '#2e7d32', offen: '#e08a00', widerlegt: '#c62828' };
const EDGE = { found: '#2e7d32', missed: '#e08a00', extra: '#777777', knowledge: '#888888' };

function worstStatus(e: LogEntry): AssumptionStatus | null {
  const s = e.assumptions.map((a) => a.status);
  return s.includes('widerlegt') ? 'widerlegt' : s.includes('offen') ? 'offen' : s.includes('belegt') ? 'belegt' : null;
}

const short = (t: string, n = 38) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

/** Zusammenhangskarte: links die verknüpften Log-Einträge, in der Mitte die Entscheidung, rechts Wissen aus anderen Bereichen. */
export function LinkGraph({ decision, entries, comparison }: { decision: Decision; entries: LogEntry[]; comparison: LinkComparison }) {
  const navigate = useNavigate();
  const { nodes, edges } = useMemo(() => {
    const logIds = [...comparison.found, ...comparison.missed, ...comparison.extra];
    const column = (count: number, i: number) => (i - (count - 1) / 2) * 72;
    const gNodes: GraphNode[] = [
      { id: decision.id, label: short(decision.question, 44), bg: '#f3f3f1', borderWidth: 4, x: 0, y: 0 },
      ...logIds.map((id, i): GraphNode => {
        const e = entries.find((x) => x.id === id);
        const status = e ? worstStatus(e) : null;
        return {
          id: `log-${id}`,
          label: `${id.toUpperCase()} ${short(e?.title ?? id)}`,
          border: status ? STATUS_BORDER[status] : '#41403e',
          borderWidth: status && status !== 'belegt' ? 3 : 1.5,
          x: -340,
          y: column(logIds.length, i),
        };
      }),
      ...decision.knowledgeLinks.map((l, i): GraphNode => {
        const n = nodeById(l.id)!;
        return {
          id: l.id,
          label: `${n.label}\n(${DOMAIN_LABELS[n.domain]})`,
          shape: n.kind === 'akteur' ? 'ellipse' : 'round-rectangle',
          x: 340,
          y: column(decision.knowledgeLinks.length, i),
        };
      }),
    ];
    const gEdges: GraphEdge[] = [
      ...comparison.found.map((id) => ({ source: `log-${id}`, target: decision.id, color: EDGE.found, label: 'gefunden' })),
      ...comparison.missed.map((id) => ({ source: `log-${id}`, target: decision.id, color: EDGE.missed, dashed: true, label: 'übersehen' })),
      ...comparison.extra.map((id) => ({ source: `log-${id}`, target: decision.id, color: EDGE.extra, dashed: true, label: 'deine' })),
      ...decision.knowledgeLinks.map((l) => ({ source: decision.id, target: l.id, color: EDGE.knowledge })),
    ];
    return { nodes: gNodes, edges: gEdges };
  }, [decision, entries, comparison]);

  return (
    <div className="stack">
      <CytoGraph
        nodes={nodes}
        edges={edges}
        layout={LAYOUT}
        height={420}
        onNodeTap={(id) => {
          if (id.startsWith('n-')) navigate(`/a/bibliothek?node=${id}`);
        }}
      />
      <p className="small muted" style={{ margin: 0 }}>
        Links das Log (Rand: orange offen, rot widerlegt), rechts Wissen aus anderen Bereichen; Ellipsen sind Gegenspieler.
        Ein Klick auf einen Wissensknoten öffnet die Bibliothek aus A.
      </p>
    </div>
  );
}
