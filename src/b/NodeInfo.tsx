import { useState } from 'react';
import { Link } from 'react-router-dom';
import { nodeById } from '../shared/content';
import { formatEuro } from '../shared/format';
import { Pill } from '../shared/ui';
import { restsOn, type Derived } from './derive';
import { STATUS_STYLE } from './statusStyle';
import {
  KIND_LABELS,
  OWN_STATUS_LABELS,
  isContainer,
  type BpKind,
  type BpNode,
  type OwnStatus,
} from './types';

interface Props {
  node: BpNode;
  nodes: BpNode[];
  derived: Map<string, Derived>;
  onSelect: (id: string) => void;
  /** Texteingaben: ohne Eintrag im Rückgängig-Verlauf. */
  onEditText: (patch: Partial<BpNode>) => void;
  /** Strukturelle Änderungen: mit Eintrag im Verlauf. */
  onStatus: (status: OwnStatus) => void;
  onDamage: (damage: number | undefined) => void;
  onAddChild: (kind: BpKind, title: string) => void;
  onDelete: () => void;
  onAdopt: () => void;
  onAddDep: (depId: string) => string | null;
  onRemoveDep: (depId: string) => void;
}

/** Infoview eines Knotens: Ziel, Voraussetzungen, Belege, Verantwortliche und die Lücken, auf denen er ruht. */
export function NodeInfo(p: Props) {
  const { node, nodes, derived } = p;
  const d = derived.get(node.id)!;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rests = restsOn(nodes, node.id);
  const container = isContainer(node);
  const [childKind, setChildKind] = useState<BpKind>(node.kind === 'ziel' ? 'teilziel' : 'annahme');
  const [childTitle, setChildTitle] = useState('');
  const [depId, setDepId] = useState('');
  const [depError, setDepError] = useState('');

  const depOptions = nodes.filter((n) => n.id !== node.id && !n.hidden && !node.deps.includes(n.id));
  const canAddChild = node.kind === 'ziel' || node.kind === 'teilziel';

  return (
    <section className="box stack">
      <div className="flex" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>Infoview</h3>
        <Pill status={d.shown}>{STATUS_STYLE[d.shown].label}</Pill>
      </div>

      <label>
        {KIND_LABELS[node.kind]}
        <input value={node.title} onChange={(e) => p.onEditText({ title: e.target.value })} />
      </label>

      {!container && (
        <label>
          Eigener Status
          <select value={node.ownStatus ?? 'sorry'} onChange={(e) => p.onStatus(e.target.value as OwnStatus)}>
            {(Object.keys(OWN_STATUS_LABELS) as OwnStatus[]).map((s) => (
              <option key={s} value={s}>
                {OWN_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      )}

      {d.prerequisites.length > 0 && (
        <div>
          <strong className="small">Voraussetzungen</strong>
          <div className="tag-list">
            {d.prerequisites.map((id) => (
              <button key={id} className="btn-small" onClick={() => p.onSelect(id)}>
                <Pill status={derived.get(id)!.shown}>{STATUS_STYLE[derived.get(id)!.shown].label}</Pill> {byId.get(id)?.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <strong className="small">Ruht auf (offene Annahmen)</strong>
        {rests.length === 0 ? (
          <div className="small muted">{node.kind === 'annahme' && (node.ownStatus ?? 'sorry') === 'sorry' ? 'Diese Annahme ist selbst eine Lücke.' : 'Keine offene Annahme darunter.'}</div>
        ) : (
          <div className="tag-list">
            {rests.map((id) => (
              <button key={id} className="btn-small" onClick={() => p.onSelect(id)}>
                {byId.get(id)?.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {!container && (
        <>
          <label>
            Beleg
            <textarea rows={2} value={node.evidence ?? ''} onChange={(e) => p.onEditText({ evidence: e.target.value || undefined })} placeholder="Dokument oder Quelle" />
          </label>
          <div className="flex">
            <label style={{ flex: 1, minWidth: 140 }}>
              Verantwortlich
              <input value={node.owner ?? ''} onChange={(e) => p.onEditText({ owner: e.target.value || undefined })} placeholder="Elektroplaner, Gutachter, Jurist …" />
            </label>
            <label style={{ flex: 1, minWidth: 140 }}>
              Schaden bei Irrtum (€)
              <input
                type="number"
                min={0}
                step={50000}
                value={node.damageIfWrong ?? ''}
                onChange={(e) => p.onDamage(e.target.value === '' ? undefined : Number(e.target.value))}
              />
            </label>
          </div>
          {node.damageIfWrong ? <div className="small muted">= {formatEuro(node.damageIfWrong)} (fiktiv)</div> : null}
        </>
      )}

      <div className="stack">
        <strong className="small">Querabhängigkeit (setzt zusätzlich voraus)</strong>
        {node.deps.length > 0 && (
          <div className="tag-list">
            {node.deps.map((id) => (
              <span key={id} className="pill">
                {byId.get(id)?.title ?? id}{' '}
                <a href="#" onClick={(e) => (e.preventDefault(), p.onRemoveDep(id))} aria-label="Entfernen">
                  ×
                </a>
              </span>
            ))}
          </div>
        )}
        <div className="flex">
          <select value={depId} onChange={(e) => setDepId(e.target.value)} style={{ flex: 1 }}>
            <option value="">Knoten wählen …</option>
            {depOptions.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
          <button
            className="btn-small"
            disabled={!depId}
            onClick={() => {
              const err = p.onAddDep(depId);
              setDepError(err ?? '');
              if (!err) setDepId('');
            }}
          >
            Hinzufügen
          </button>
        </div>
        {depError && <div className="small" style={{ color: 'var(--broken)' }}>{depError}</div>}
      </div>

      {node.knowledgeIds && node.knowledgeIds.length > 0 && (
        <div>
          <strong className="small">Wissen</strong>
          <div className="tag-list">
            {node.knowledgeIds.map((id) => (
              <Link key={id} to={`/a/bibliothek?node=${id}`} className="small">
                {nodeById(id)?.label ?? id}
              </Link>
            ))}
          </div>
        </div>
      )}

      {node.kind === 'alternative' && !node.adopted && !node.hidden && (
        <div className="box dashed stack">
          <span className="small">Diese Alternative ersetzt „{byId.get(node.alternativeFor ?? '')?.title ?? 'den Originalknoten'}“.</span>
          <div>
            <button onClick={p.onAdopt}>Alternative übernehmen</button>
          </div>
        </div>
      )}

      {canAddChild && (
        <div className="stack">
          <strong className="small">Knoten darunter anlegen</strong>
          <div className="flex">
            <select value={childKind} onChange={(e) => setChildKind(e.target.value as BpKind)} style={{ width: 130 }}>
              {(node.kind === 'ziel' ? (['teilziel', 'annahme', 'schritt'] as BpKind[]) : (['annahme', 'schritt', 'teilziel'] as BpKind[])).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABELS[k]}
                </option>
              ))}
            </select>
            <input style={{ flex: 1 }} value={childTitle} onChange={(e) => setChildTitle(e.target.value)} placeholder="Titel" />
            <button
              className="btn-small"
              disabled={!childTitle.trim()}
              onClick={() => {
                p.onAddChild(childKind, childTitle.trim());
                setChildTitle('');
              }}
            >
              Anlegen
            </button>
          </div>
        </div>
      )}

      <div>
        <button
          className="btn-small btn-danger"
          onClick={() => {
            if (window.confirm(`„${node.title}“ samt allem darunter löschen?`)) p.onDelete();
          }}
        >
          Knoten löschen
        </button>
      </div>
    </section>
  );
}
