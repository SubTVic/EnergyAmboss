import { formatEuro } from '../shared/format';
import { gapReport } from './derive';
import type { BpNode } from './types';

/** Lücken-Report: alle offenen Annahmen, sortiert nach Schaden bei Irrtum × Zahl der abhängigen Knoten. */
export function GapPanel({ nodes, onSelect }: { nodes: BpNode[]; onSelect: (id: string) => void }) {
  const gaps = gapReport(nodes);
  const titleOf = (id: string) => nodes.find((n) => n.id === id)?.title ?? id;
  return (
    <section className="box stack">
      <h3 style={{ margin: 0 }}>Lücken-Report</h3>
      <p className="small muted" style={{ margin: 0 }}>
        Offene Annahmen (sorry), sortiert nach Schaden bei Irrtum mal Zahl der Knoten, die darauf ruhen. Oben steht, was du zuerst klären solltest.
      </p>
      {gaps.length === 0 ? (
        <p style={{ margin: 0 }}>Keine offenen Annahmen. Der Baum ruht auf Belegen.</p>
      ) : (
        <table className="simple">
          <thead>
            <tr>
              <th>#</th>
              <th>Annahme</th>
              <th className="right">Schaden bei Irrtum</th>
              <th className="right">Abhängige</th>
              <th className="right">Score</th>
            </tr>
          </thead>
          <tbody>
            {gaps.map((g, i) => (
              <tr key={g.node.id} className="clickable" onClick={() => onSelect(g.node.id)}>
                <td>{i + 1}</td>
                <td>
                  <strong>{g.node.title}</strong>
                  {g.node.owner && <div className="small muted">Verantwortlich: {g.node.owner}</div>}
                  <div className="small muted">trägt: {g.dependents.map(titleOf).join(', ') || '–'}</div>
                </td>
                <td className="right">{g.node.damageIfWrong ? formatEuro(g.node.damageIfWrong) : <span className="muted">offen</span>}</td>
                <td className="right">{g.dependents.length}</td>
                <td className="right">{g.score.toLocaleString('de-DE')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
