import { useMemo, useState } from 'react';
import type cytoscape from 'cytoscape';
import { CytoGraph, type GraphEdge, type GraphNode } from '../shared/CytoGraph';
import { knowledgeNodes, nodeById } from '../shared/content';
import { useFeedbackPayload } from '../shared/feedbackBus';
import { readJson, removeKey, writeJson } from '../shared/storage';
import { uuid } from '../shared/tester';
import { DOMAIN_LABELS } from '../shared/types';
import { PageHeader, ResetDemoButton } from '../shared/ui';
import { startBoard } from './data';
import { addLink, addStatement, linksOf, removeLink, removeStatement, statementsWithKb, toggleKb } from './logic';
import type { Board, Statement } from './types';

const KEY = 'f-aussagen';
const initial = (): Board => ({ statements: startBoard.statements, links: startBoard.links });
const short = (t: string, n = 60) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
// Feste Anordnung: Aussagen auf einer Ellipse, Wissen außen neben der ersten Aussage, die es nutzt
const MAP_LAYOUT = { name: 'preset', animate: false, padding: 16 } as cytoscape.LayoutOptions;

export default function FRoutes() {
  const [board, setBoardRaw] = useState<Board>(() => readJson<Board>(KEY, initial()));
  const [selectedKb, setSelectedKb] = useState<string | null>(null);
  const setBoard = (next: Board) => {
    writeJson(KEY, next);
    setBoardRaw(next);
  };

  useFeedbackPayload('f', board);

  return (
    <div className="stack">
      <PageHeader
        title="F · Aussagen verknüpfen"
        lead={`${startBoard.project}: Jede Abteilung schreibt auf, was sie weiß oder entschieden hat. Dann verknüpft ihr die Aussagen und sagt, warum sie zusammenhängen.`}
        actions={
          <ResetDemoButton
            onReset={() => {
              removeKey(KEY);
              setBoardRaw(initial());
            }}
          />
        }
      />

      <div className="two-col">
        <section className="stack">
          <h3 style={{ margin: 0 }}>Aussagen</h3>
          <NewStatement onAdd={(s) => setBoard(addStatement(board, s))} />
          {board.statements.map((s) => (
            <StatementCard key={s.id} statement={s} board={board} setBoard={setBoard} onShowKb={setSelectedKb} />
          ))}
        </section>

        <section className="stack">
          <h3 style={{ margin: 0 }}>Wissensbasis</h3>
          <KnowledgeBase board={board} selected={selectedKb} onSelect={setSelectedKb} />
        </section>
      </div>

      <section className="stack">
        <h3 style={{ margin: 0 }}>Karte</h3>
        <BoardMap board={board} onShowKb={setSelectedKb} />
      </section>
    </div>
  );
}

function NewStatement({ onAdd }: { onAdd: (s: Statement) => void }) {
  const [text, setText] = useState('');
  const [who, setWho] = useState(startBoard.depts[0]);
  return (
    <div className="box dashed stack">
      <label>
        Neue Aussage: Was weißt du, was wurde entschieden, was macht dir Sorgen?
        <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Die Gemeinde will erst nach der Kommunalwahl entscheiden." />
      </label>
      <div className="flex">
        <select value={who} onChange={(e) => setWho(e.target.value)} style={{ width: 'auto' }}>
          {startBoard.depts.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <button
          disabled={!text.trim()}
          onClick={() => {
            onAdd({ id: uuid(), text, who, kbIds: [] });
            setText('');
          }}
        >
          Hinzufügen
        </button>
      </div>
    </div>
  );
}

function StatementCard(p: { statement: Statement; board: Board; setBoard: (b: Board) => void; onShowKb: (id: string) => void }) {
  const { statement: s, board, setBoard } = p;
  const [mode, setMode] = useState<'none' | 'link' | 'kb'>('none');
  const [target, setTarget] = useState('');
  const [why, setWhy] = useState('');
  const [kb, setKb] = useState('');
  const links = linksOf(board, s.id);
  const linkable = board.statements.filter((o) => o.id !== s.id && !links.some((l) => l.other === o.id));
  const textOf = (id: string) => board.statements.find((x) => x.id === id)?.text ?? id;
  const close = () => {
    setMode('none');
    setTarget('');
    setWhy('');
    setKb('');
  };

  return (
    <div className="box stack">
      <div>
        <span className="small muted">{s.who}</span>
        <div>
          <strong>{s.text}</strong>
        </div>
      </div>

      {links.length > 0 && (
        <div className="small stack">
          {links.map((l) => (
            <div key={l.other}>
              ↔ „{short(textOf(l.other), 80)}“{l.why && <span className="muted">, weil {l.why}</span>}{' '}
              <button className="btn-small" title="Verknüpfung lösen" onClick={() => setBoard(removeLink(board, s.id, l.other))}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {s.kbIds.length > 0 && (
        <div className="flex small" style={{ gap: 6 }}>
          Wissen:
          {s.kbIds.map((k) => (
            <span key={k} className="pill" style={{ cursor: 'pointer' }} onClick={() => p.onShowKb(k)}>
              {nodeById(k)?.label ?? k}{' '}
              <span
                title="Entfernen"
                onClick={(e) => {
                  e.stopPropagation();
                  setBoard(toggleKb(board, s.id, k));
                }}
              >
                ×
              </span>
            </span>
          ))}
        </div>
      )}

      {mode === 'none' && (
        <div className="flex" style={{ gap: 6 }}>
          <button className="btn-small" onClick={() => setMode('link')} disabled={linkable.length === 0}>
            + Verknüpfen
          </button>
          <button className="btn-small" onClick={() => setMode('kb')}>
            + Wissen
          </button>
          <button className="btn-small" onClick={() => setBoard(removeStatement(board, s.id))}>
            Löschen
          </button>
        </div>
      )}

      {mode === 'link' && (
        <div className="stack small">
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Mit welcher Aussage?</option>
            {linkable.map((o) => (
              <option key={o.id} value={o.id}>
                {short(o.text, 90)}
              </option>
            ))}
          </select>
          <input value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Hängt zusammen, weil …" />
          <div className="flex" style={{ gap: 6 }}>
            <button
              className="btn-small"
              disabled={!target}
              onClick={() => {
                setBoard(addLink(board, s.id, target, why));
                close();
              }}
            >
              Speichern
            </button>
            <button className="btn-small" onClick={close}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {mode === 'kb' && (
        <div className="stack small">
          <select value={kb} onChange={(e) => setKb(e.target.value)}>
            <option value="">Welcher Eintrag aus der Wissensbasis?</option>
            {knowledgeNodes
              .filter((n) => !s.kbIds.includes(n.id))
              .map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label} ({DOMAIN_LABELS[n.domain]})
                </option>
              ))}
          </select>
          <div className="flex" style={{ gap: 6 }}>
            <button
              className="btn-small"
              disabled={!kb}
              onClick={() => {
                setBoard(toggleKb(board, s.id, kb));
                close();
              }}
            >
              Speichern
            </button>
            <button className="btn-small" onClick={close}>
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function KnowledgeBase(p: { board: Board; selected: string | null; onSelect: (id: string | null) => void }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const list = knowledgeNodes.filter((n) => !q || `${n.label} ${n.summary} ${DOMAIN_LABELS[n.domain]}`.toLowerCase().includes(q));
  return (
    <div className="stack">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Suchen, z. B. Netz, Pacht, Gutachten" />
      <p className="small muted" style={{ margin: 0 }}>
        Gesammeltes Fachwissen aus allen Bereichen. Hänge Einträge an deine Aussagen, damit andere nachlesen können.
      </p>
      {list.map((n) => {
        const open = p.selected === n.id;
        const used = statementsWithKb(p.board, n.id);
        return (
          <div
            key={n.id}
            className={open ? 'box small' : 'small'}
            style={{ cursor: 'pointer', padding: open ? undefined : '4px 2px', borderBottom: open ? undefined : '1px solid #ccc' }}
            onClick={() => p.onSelect(open ? null : n.id)}
          >
            <strong>{n.label}</strong> <span className="muted">({DOMAIN_LABELS[n.domain]})</span>
            {used.length > 0 && <span className="muted"> · in {used.length} {used.length === 1 ? 'Aussage' : 'Aussagen'}</span>}
            {open && (
              <div className="stack" style={{ marginTop: 6 }}>
                <div>{n.summary}</div>
                {used.length > 0 && (
                  <div>
                    <strong>Verwendet in:</strong>
                    <ul style={{ margin: 0 }}>
                      {used.map((s) => (
                        <li key={s.id}>
                          {short(s.text, 90)} <span className="muted">({s.who})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function BoardMap({ board, onShowKb }: { board: Board; onShowKb: (id: string) => void }) {
  const { nodes, edges } = useMemo(() => {
    const angle = (i: number) => (2 * Math.PI * i) / Math.max(1, board.statements.length) - Math.PI / 2;
    const gNodes: GraphNode[] = board.statements.map((s, i) => ({
      id: s.id,
      label: `${short(s.text, 48)}\n(${s.who})`,
      x: 360 * Math.cos(angle(i)),
      y: 140 * Math.sin(angle(i)),
    }));
    const placed = new Set<string>();
    board.statements.forEach((s, i) => {
      s.kbIds
        .filter((k) => !placed.has(k))
        .forEach((k, j) => {
          placed.add(k);
          gNodes.push({
            id: k,
            label: nodeById(k)?.label ?? k,
            shape: 'ellipse',
            bg: '#f3f3f1',
            borderWidth: 1,
            x: 580 * Math.cos(angle(i)),
            y: 230 * Math.sin(angle(i)) + 56 * j,
          });
        });
    });
    const gEdges: GraphEdge[] = [
      ...board.links.map((l) => ({ source: l.from, target: l.to, color: '#41403e', noArrow: true })),
      ...board.statements.flatMap((s) => s.kbIds.map((k) => ({ source: s.id, target: k, dashed: true, noArrow: true }))),
    ];
    return { nodes: gNodes, edges: gEdges };
  }, [board]);
  return (
    <div className="stack">
      <CytoGraph nodes={nodes} edges={edges} layout={MAP_LAYOUT} height={420} onNodeTap={(id) => nodeById(id) && onShowKb(id)} />
      <p className="small muted" style={{ margin: 0 }}>
        Kästen sind Aussagen, durchgezogene Linien eure Verknüpfungen. Ovale sind Einträge aus der Wissensbasis.
      </p>
    </div>
  );
}
