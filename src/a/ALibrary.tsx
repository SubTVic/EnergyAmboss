import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { caseById, knowledgeEdges, knowledgeNodes, nodeById } from '../shared/content';
import { DOMAIN_LABELS, DOMAINS, EDGE_LABELS, type Domain } from '../shared/types';
import { Unverified } from '../shared/ui';
import { questionTitle, questions } from './data';

const KIND_LABELS = { norm: 'Norm', akteur: 'Akteur', schritt: 'Prozessschritt', risiko: 'Risiko', kennzahl: 'Kennzahl' } as const;

/** Bibliothek: alle Wissensknoten, filterbar nach Bereich; ein Klick zeigt Knoten, Nachbarn und die Fragen, die ihn nutzen. */
export function ALibrary() {
  const [params, setParams] = useSearchParams();
  const [domain, setDomain] = useState<Domain | ''>('');
  const selectedId = params.get('node');
  const selected = selectedId ? nodeById(selectedId) : undefined;

  const list = useMemo(
    () => knowledgeNodes.filter((n) => !domain || n.domain === domain).sort((a, b) => a.domain.localeCompare(b.domain) || a.label.localeCompare(b.label)),
    [domain],
  );

  const neighbors = selected
    ? knowledgeEdges
        .filter((e) => e.from === selected.id || e.to === selected.id)
        .map((e) => ({ edge: e, outgoing: e.from === selected.id, other: nodeById(e.from === selected.id ? e.to : e.from)! }))
    : [];
  const usedBy = selected ? questions.filter((q) => q.nodeIds.includes(selected.id)) : [];

  return (
    <div className="two-col">
      <section className="stack">
        <label>
          Bereich
          <select value={domain} onChange={(e) => setDomain(e.target.value as Domain | '')}>
            <option value="">alle ({knowledgeNodes.length})</option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                {DOMAIN_LABELS[d]} ({knowledgeNodes.filter((n) => n.domain === d).length})
              </option>
            ))}
          </select>
        </label>
        <table className="simple">
          <tbody>
            {list.map((n) => (
              <tr key={n.id} className={`clickable ${selectedId === n.id ? 'selected' : ''}`} onClick={() => setParams({ node: n.id })}>
                <td>
                  <strong>{n.label}</strong> <Unverified show={n.verify} />
                </td>
                <td className="small muted">
                  {DOMAIN_LABELS[n.domain]} · {KIND_LABELS[n.kind]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="box stack">
        {!selected ? (
          <p className="muted" style={{ margin: 0 }}>
            Wähle links einen Knoten.
          </p>
        ) : (
          <>
            <h3 style={{ margin: 0 }}>
              {selected.label} <Unverified show={selected.verify} />
            </h3>
            <div className="small muted">
              {DOMAIN_LABELS[selected.domain]} · {KIND_LABELS[selected.kind]}
              {selected.caseIds.length > 0 && ` · Belegstelle: ${selected.caseIds.map((id) => `${id} ${caseById(id)?.title ?? ''}`).join(', ')}`}
            </div>
            <p style={{ margin: 0 }}>{selected.summary}</p>

            <div className="stack">
              <strong className="small">Nachbarn im Wissensnetz</strong>
              {neighbors.length === 0 && <span className="small muted">keine</span>}
              <ul style={{ margin: 0 }}>
                {neighbors.map(({ edge, outgoing, other }, i) => (
                  <li key={i} className="small">
                    {outgoing ? (
                      <>
                        {selected.label} <em>{EDGE_LABELS[edge.kind]}</em>{' '}
                      </>
                    ) : (
                      <>
                        <em>{EDGE_LABELS[edge.kind]}</em> von{' '}
                      </>
                    )}
                    <a href="#" onClick={(e) => (e.preventDefault(), setParams({ node: other.id }))}>
                      {other.label}
                    </a>{' '}
                    <span className="muted">({DOMAIN_LABELS[other.domain]})</span>
                    {edge.note && <span className="muted"> – {edge.note}</span>}
                  </li>
                ))}
              </ul>
            </div>

            <div className="stack">
              <strong className="small">Fragen, die diesen Knoten nutzen</strong>
              {usedBy.length === 0 && <span className="small muted">keine</span>}
              <ul style={{ margin: 0 }}>
                {usedBy.map((q) => (
                  <li key={q.id} className="small">
                    {q.caseId}: {questionTitle(q)}
                  </li>
                ))}
              </ul>
              <Link to="/a" className="small">
                Zu einer Session
              </Link>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
