import { Pill } from '../shared/ui';
import { STATUS_STYLE } from './statusStyle';
import type { Derived } from './derive';
import type { BpNode } from './types';

interface Props {
  nodes: BpNode[];
  derived: Map<string, Derived>;
  selectedId: string | null;
  changed: Set<string>;
  onSelect: (id: string) => void;
}

function Row({ node, nodes, derived, selectedId, changed, onSelect }: Props & { node: BpNode }) {
  const children = nodes.filter((n) => n.parentId === node.id && !n.hidden);
  const d = derived.get(node.id)!;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pendingAlt = node.kind === 'alternative' && !node.adopted;
  const deps = node.deps.map((id) => byId.get(id)?.title).filter(Boolean);

  return (
    <li>
      <div
        className={`row-node ${selectedId === node.id ? 'selected' : ''} ${changed.has(node.id) ? 'changed' : ''}`}
        onClick={() => onSelect(node.id)}
        role="button"
      >
        <Pill status={d.shown}>{STATUS_STYLE[d.shown].label}</Pill>
        <span style={{ fontWeight: node.kind === 'ziel' || node.kind === 'teilziel' ? 'bold' : undefined, color: pendingAlt ? 'var(--muted)' : undefined }}>
          {pendingAlt && 'Alternative: '}
          {node.title}
        </span>
        {deps.length > 0 && <span className="small muted">↪ setzt voraus: {deps.join(', ')}</span>}
        {changed.has(node.id) && <span className="small">★ geändert</span>}
      </div>
      {children.length > 0 && (
        <ul>
          {children.map((c) => (
            <Row key={c.id} node={c} nodes={nodes} derived={derived} selectedId={selectedId} changed={changed} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Der Beweisbaum als eingerückte Liste mit Status-Pillen. */
export function TreeView(props: Props) {
  const roots = props.nodes.filter((n) => n.parentId === null && !n.hidden);
  return (
    <div className="tree">
      <ul>
        {roots.map((r) => (
          <Row key={r.id} node={r} {...props} />
        ))}
      </ul>
    </div>
  );
}
