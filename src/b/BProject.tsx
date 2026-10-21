import { useEffect, useMemo, useState } from 'react';
import type cytoscape from 'cytoscape';
import { Link, useParams } from 'react-router-dom';
import { CytoGraph, type GraphEdge, type GraphNode } from '../shared/CytoGraph';
import { downloadText } from '../shared/download';
import { GapPanel } from './GapPanel';
import { NodeInfo } from './NodeInfo';
import { TreeView } from './TreeView';
import { CycleError, derive, type Derived } from './derive';
import { LAW_UPDATES } from './projects';
import { addChild, addDep, adoptAlternative, applyPatch, deleteNode, statusDiff, updateNode } from './patch';
import { buildReport } from './report';
import { STATUS_STYLE } from './statusStyle';
import type { BpKind, BpNode, OwnStatus, Patch, Project } from './types';

interface Snapshot {
  nodes: BpNode[];
  applied: string[];
  changed: string[];
  message: Message | null;
}

interface Message {
  title: string;
  text: string;
  skipped: string[];
}

const GRAPH_LAYOUT = { name: 'breadthfirst', directed: true, spacingFactor: 1.15, padding: 10, animate: false } as cytoscape.LayoutOptions;

export function BProject({ projects, onUpdate }: { projects: Project[]; onUpdate: (p: Project) => void }) {
  const { projectId } = useParams();
  const project = projects.find((p) => p.id === projectId);
  if (!project) {
    return (
      <p>
        Projekt nicht gefunden. <Link to="/b">Zurück zur Projektliste</Link>
      </p>
    );
  }
  return <Editor key={project.id} project={project} onUpdate={onUpdate} />;
}

function Editor({ project, onUpdate }: { project: Project; onUpdate: (p: Project) => void }) {
  const [nodes, setNodes] = useState<BpNode[]>(project.nodes);
  const [applied, setApplied] = useState<string[]>(project.applied);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<Message | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(project.nodes.find((n) => n.parentId === null)?.id ?? null);
  const [view, setView] = useState<'liste' | 'graph'>('liste');
  const [showGaps, setShowGaps] = useState(false);
  const [eventId, setEventId] = useState('');
  const [lawId, setLawId] = useState('');
  const [notice, setNotice] = useState('');

  // Speichern in localStorage über den Elternknoten
  useEffect(() => {
    onUpdate({ ...project, nodes, applied });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, applied]);

  const { derived, error } = useMemo<{ derived: Map<string, Derived> | null; error: string | null }>(() => {
    try {
      return { derived: derive(nodes), error: null };
    } catch (e) {
      return { derived: null, error: e instanceof CycleError ? e.message : String(e) };
    }
  }, [nodes]);

  const pendingEvents = project.events.filter((e) => !applied.includes(e.id));
  const pendingLaws = LAW_UPDATES.filter((l) => !applied.includes(l.id));
  const appliedLaws = LAW_UPDATES.filter((l) => applied.includes(l.id));

  function snapshot(): Snapshot {
    return { nodes, applied, changed: [...changed], message };
  }

  /** Strukturelle Änderung: alter Stand kommt auf den Rückgängig-Stapel. */
  function commit(next: { nodes: BpNode[]; applied?: string[]; changed?: string[]; message?: Message | null }) {
    setHistory((h) => [...h, snapshot()]);
    setNodes(next.nodes);
    if (next.applied) setApplied(next.applied);
    setChanged(new Set(next.changed ?? []));
    setMessage(next.message ?? null);
    setNotice('');
  }

  function undo() {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setNodes(last.nodes);
    setApplied(last.applied);
    setChanged(new Set(last.changed));
    setMessage(last.message);
    setNotice('Letzte Änderung zurückgenommen.');
  }

  function runPatch(patch: Patch) {
    const result = applyPatch(nodes, patch);
    commit({
      nodes: result.nodes,
      applied: [...applied, patch.id],
      changed: result.changed,
      message: { title: patch.title, text: patch.explanation, skipped: result.skipped },
    });
    // Fokus auf den Knoten, dessen Status das Ereignis setzt
    const focus = patch.ops.find((o) => o.op === 'setStatus');
    if (focus && focus.op === 'setStatus') setSelectedId(focus.nodeId);
  }

  const selected = nodes.find((n) => n.id === selectedId) ?? null;
  const select = (id: string) => {
    setSelectedId(id);
    setChanged(new Set()); // geänderte Knoten bleiben bis zum nächsten Klick markiert
  };

  const graph = useMemo(() => {
    if (!derived) return { nodes: [] as GraphNode[], edges: [] as GraphEdge[] };
    const visible = nodes.filter((n) => !n.hidden);
    const ids = new Set(visible.map((n) => n.id));
    const gNodes: GraphNode[] = visible.map((n) => {
      const st = STATUS_STYLE[derived.get(n.id)!.shown];
      return {
        id: n.id,
        label: n.title.length > 42 ? `${n.title.slice(0, 40)}…` : n.title,
        bg: st.bg,
        border: st.border,
        dashed: st.dashed,
        borderWidth: changed.has(n.id) || n.id === selectedId ? 4 : 2,
        shape: n.kind === 'ziel' ? 'round-rectangle' : n.kind === 'teilziel' ? 'rectangle' : n.kind === 'schritt' ? 'diamond' : 'ellipse',
      };
    });
    const gEdges: GraphEdge[] = [];
    for (const n of visible) {
      if (n.parentId && ids.has(n.parentId)) gEdges.push({ id: `p-${n.id}`, source: n.parentId, target: n.id });
      for (const d of n.deps) if (ids.has(d)) gEdges.push({ id: `d-${n.id}-${d}`, source: n.id, target: d, dashed: true, color: '#1565c0' });
    }
    return { nodes: gNodes, edges: gEdges };
  }, [nodes, derived, changed, selectedId]);

  const lawLabels = appliedLaws.map((l) => l.title);

  return (
    <div className="stack">
      <div className="flex" style={{ justifyContent: 'space-between' }}>
        <div>
          <Link to="/b">← Projekte</Link> · <strong>{project.name}</strong>
          <div className="small muted">Rechtsstand: {lawLabels.length ? `Ausgangsstand + ${lawLabels.join(', ')}` : 'Ausgangsstand'}</div>
        </div>
        <div className="flex small">
          {(['belegt', 'offen', 'gebrochen', 'bereit'] as const).map((s) => (
            <span key={s} className={`pill ${s}`}>
              {STATUS_STYLE[s].label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex">
        <button className={showGaps ? 'btn-secondary' : ''} onClick={() => setShowGaps((v) => !v)} disabled={!derived}>
          Lücken-Report
        </button>
        <span className="flex">
          <select value={eventId} onChange={(e) => setEventId(e.target.value)} style={{ width: 'auto', maxWidth: 260 }}>
            <option value="">Ereignis auslösen …</option>
            {pendingEvents.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
          <button
            disabled={!eventId}
            onClick={() => {
              const patch = project.events.find((e) => e.id === eventId);
              if (patch) runPatch(patch);
              setEventId('');
            }}
          >
            Auslösen
          </button>
        </span>
        <span className="flex">
          <select value={lawId} onChange={(e) => setLawId(e.target.value)} style={{ width: 'auto', maxWidth: 260 }}>
            <option value="">Rechtsstand aktualisieren …</option>
            {pendingLaws.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
          <button
            disabled={!lawId}
            onClick={() => {
              const patch = LAW_UPDATES.find((l) => l.id === lawId);
              if (patch) runPatch(patch);
              setLawId('');
            }}
          >
            Einspielen
          </button>
        </span>
        <button onClick={undo} disabled={history.length === 0}>
          Rückgängig
        </button>
        <span className="flex">
          <button
            onClick={() => downloadText(`${project.id}.json`, JSON.stringify({ ...project, nodes, applied }, null, 2))}
          >
            Exportieren (JSON)
          </button>
          <button
            disabled={!derived}
            onClick={() => derived && downloadText(`pruefbericht-${project.id}.md`, buildReport(project, nodes, derived, lawLabels), 'text/markdown')}
          >
            Prüfbericht (Markdown)
          </button>
        </span>
        <span className="flex" style={{ marginLeft: 'auto' }}>
          <button className={view === 'liste' ? 'btn-secondary' : ''} onClick={() => setView('liste')}>
            Liste
          </button>
          <button className={view === 'graph' ? 'btn-secondary' : ''} onClick={() => setView('graph')}>
            Graph
          </button>
        </span>
      </div>

      {error && (
        <p className="box" style={{ borderColor: 'var(--broken)', color: 'var(--broken)', margin: 0 }}>
          {error}. Bitte eine Querabhängigkeit entfernen, sonst lässt sich der Status nicht ableiten.
        </p>
      )}
      {notice && <p className="small muted" style={{ margin: 0 }}>{notice}</p>}
      {message && (
        <section className="box stack" style={{ background: '#fff6d6' }}>
          <div>
            <strong>{message.title}</strong>
          </div>
          <div>{message.text}</div>
          {message.skipped.length > 0 && (
            <div className="small muted">Nicht anwendbar in diesem Projekt: {message.skipped.join('; ')}</div>
          )}
          <div className="small muted">Geänderte Knoten sind mit ★ markiert, bis du den nächsten Knoten anklickst.</div>
        </section>
      )}

      {showGaps && derived && <GapPanel nodes={nodes} onSelect={select} />}

      {derived && (
        <div className="two-col">
          <section>
            {view === 'liste' ? (
              <TreeView nodes={nodes} derived={derived} selectedId={selectedId} changed={changed} onSelect={select} />
            ) : (
              <>
                <CytoGraph nodes={graph.nodes} edges={graph.edges} layout={GRAPH_LAYOUT} height={520} onNodeTap={select} />
                <p className="small muted" style={{ margin: '6px 0 0' }}>
                  Durchgezogene Pfeile: Ziel zerfällt in Teilziele. Blau gestrichelt: Querabhängigkeit. Mit dem Mausrad zoomen, mit der Maus verschieben.
                </p>
              </>
            )}
          </section>
          <section>
            {selected ? (
              <NodeInfo
                key={selected.id}
                node={selected}
                nodes={nodes}
                derived={derived}
                onSelect={select}
                onEditText={(patch) => setNodes((ns) => updateNode(ns, selected.id, patch))}
                onStatus={(status: OwnStatus) => {
                  const next = updateNode(nodes, selected.id, { ownStatus: status });
                  commit({ nodes: next, changed: [selected.id, ...statusDiff(nodes, next)] });
                }}
                onDamage={(damage) => setNodes((ns) => updateNode(ns, selected.id, { damageIfWrong: damage }))}
                onAddChild={(kind: BpKind, title: string) => {
                  const { nodes: next, id } = addChild(nodes, selected.id, kind, title);
                  commit({ nodes: next, changed: [id] });
                  setSelectedId(id);
                }}
                onDelete={() => {
                  const parent = selected.parentId;
                  commit({ nodes: deleteNode(nodes, selected.id) });
                  setSelectedId(parent);
                }}
                onAdopt={() => {
                  const r = adoptAlternative(nodes, selected.id);
                  commit({
                    nodes: r.nodes,
                    changed: r.changed,
                    message: {
                      title: `Alternative übernommen: ${selected.title}`,
                      text: 'Der Originalknoten entfällt, die Alternative zählt ab jetzt als Voraussetzung und ist zunächst offen (sorry).',
                      skipped: r.skipped,
                    },
                  });
                }}
                onAddDep={(depId) => {
                  const next = addDep(nodes, selected.id, depId);
                  if (!next) return 'Diese Querabhängigkeit würde einen Zyklus erzeugen.';
                  commit({ nodes: next, changed: [selected.id, ...statusDiff(nodes, next)] });
                  return null;
                }}
                onRemoveDep={(depId) => {
                  const next = updateNode(nodes, selected.id, { deps: selected.deps.filter((d) => d !== depId) });
                  commit({ nodes: next, changed: [selected.id, ...statusDiff(nodes, next)] });
                }}
              />
            ) : (
              <p className="muted">Wähle einen Knoten.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
