import { useMemo } from 'react';
import type cytoscape from 'cytoscape';
import { useNavigate } from 'react-router-dom';
import { CytoGraph, type GraphEdge, type GraphNode } from '../shared/CytoGraph';
import { nodeById } from '../shared/content';
import { DOMAIN_LABELS } from '../shared/types';
import { knowledgeSubgraph } from './logic';
import type { Question } from './types';

const LAYOUT = { name: 'preset', animate: false, padding: 24 } as cytoscape.LayoutOptions;

/** Wissenskarte unter jeder Erklärung: 3–6 Knoten, der Bereich der Frage ist hervorgehoben. */
export function KnowledgeMap({ question }: { question: Question }) {
  const navigate = useNavigate();
  const { nodes, edges } = useMemo(() => {
    const sub = knowledgeSubgraph(question, 6);
    const main = question.domains[0];
    const gNodes: GraphNode[] = sub.nodeIds.map((id, i) => {
      const n = nodeById(id)!;
      const own = n.domain === main;
      // Knoten auf einer breiten Ellipse anordnen, damit die volle Breite genutzt wird
      const angle = (2 * Math.PI * i) / sub.nodeIds.length - Math.PI / 2;
      return {
        id,
        label: `${n.label}\n(${DOMAIN_LABELS[n.domain]})`,
        bg: own ? '#d9d9d6' : '#ffffff',
        border: '#41403e',
        borderWidth: own ? 4 : 1.5,
        dashed: !question.nodeIds.includes(id),
        x: 340 * Math.cos(angle),
        y: 120 * Math.sin(angle),
      };
    });
    const gEdges: GraphEdge[] = sub.edges.map((e, i) => ({
      id: `k${i}`,
      source: e.from,
      target: e.to,
      label: e.kind.replace('_', ' '),
    }));
    return { nodes: gNodes, edges: gEdges };
  }, [question]);

  return (
    <div className="stack">
      <CytoGraph nodes={nodes} edges={edges} layout={LAYOUT} height={320} onNodeTap={(id) => navigate(`/a/bibliothek?node=${id}`)} />
      <p className="small muted" style={{ margin: 0 }}>
        Dick umrandet: Knoten aus dem Bereich der Frage ({DOMAIN_LABELS[question.domains[0]]}). Gestrichelt: Nachbarn. Ein Klick öffnet die Bibliothek.
      </p>
    </div>
  );
}
