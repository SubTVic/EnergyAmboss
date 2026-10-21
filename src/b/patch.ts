// Änderungen am Beweisbaum: Ereignisse, Rechtsstand-Updates, Alternativen übernehmen, Bearbeiten.
// Alle Funktionen sind rein und geben neue Arrays zurück, damit „Rückgängig“ einfach Snapshots zurückholt.
import { derive } from './derive';
import { CONTAINER_KINDS, isContainer, type BpKind, type BpNode, type OwnStatus, type Patch } from './types';

export interface PatchResult {
  nodes: BpNode[];
  /** Direkt geänderte Knoten plus Knoten, deren angezeigter Status sich dadurch geändert hat. */
  changed: string[];
  /** Operationen, die nicht angewendet werden konnten (fehlender Knoten o. Ä.). */
  skipped: string[];
}

function shownMap(nodes: BpNode[]): Map<string, string> {
  try {
    return new Map([...derive(nodes)].map(([id, d]) => [id, d.shown]));
  } catch {
    return new Map();
  }
}

/** Knoten, deren angezeigter Status sich zwischen zwei Ständen geändert hat (neue Knoten zählen mit). */
export function statusDiff(before: BpNode[], after: BpNode[]): string[] {
  const a = shownMap(before);
  const b = shownMap(after);
  return [...b].filter(([id, s]) => a.get(id) !== s).map(([id]) => id);
}

export function applyPatch(nodes: BpNode[], patch: Patch): PatchResult {
  let next = nodes.map((n) => ({ ...n }));
  const touched = new Set<string>();
  const skipped: string[] = [];

  for (const op of patch.ops) {
    if (op.op === 'setStatus') {
      const node = next.find((n) => n.id === op.nodeId);
      if (!node) skipped.push(`Knoten „${op.nodeId}“ nicht vorhanden`);
      else if (isContainer(node)) skipped.push(`„${node.title}“ ist ein Behälter und hat keinen eigenen Status`);
      else {
        next = next.map((n) => (n.id === op.nodeId ? { ...n, ownStatus: op.status } : n));
        touched.add(op.nodeId);
      }
    } else if (op.op === 'addNode') {
      const parentOk = op.node.parentId === null || next.some((n) => n.id === op.node.parentId);
      if (next.some((n) => n.id === op.node.id)) skipped.push(`Knoten „${op.node.id}“ existiert schon`);
      else if (!parentOk) skipped.push(`Elternknoten „${op.node.parentId}“ nicht vorhanden`);
      else {
        next = [...next, { ...op.node }];
        touched.add(op.node.id);
      }
    } else if (op.op === 'reveal') {
      const node = next.find((n) => n.id === op.nodeId);
      if (!node) skipped.push(`Knoten „${op.nodeId}“ nicht vorhanden`);
      else {
        next = next.map((n) => (n.id === op.nodeId ? { ...n, hidden: false } : n));
        touched.add(op.nodeId);
      }
    }
  }

  const changed = new Set([...touched, ...statusDiff(nodes, next)]);
  return { nodes: next, changed: [...changed], skipped };
}

/**
 * „Alternative übernehmen“: Der Originalknoten wird `entfallen`, die Alternative zählt ab jetzt
 * als Voraussetzung (ihr eigener Status bleibt zunächst `sorry`).
 */
export function adoptAlternative(nodes: BpNode[], altId: string): PatchResult {
  const alt = nodes.find((n) => n.id === altId);
  const skipped: string[] = [];
  if (!alt || alt.kind !== 'alternative' || alt.hidden) {
    return { nodes, changed: [], skipped: ['Alternative nicht verfügbar'] };
  }
  const next = nodes.map((n) => {
    if (n.id === altId) return { ...n, adopted: true, ownStatus: n.ownStatus ?? ('sorry' as OwnStatus) };
    if (n.id === alt.alternativeFor) return { ...n, ownStatus: 'entfallen' as OwnStatus };
    return n;
  });
  if (alt.alternativeFor && !nodes.some((n) => n.id === alt.alternativeFor)) skipped.push('Originalknoten nicht vorhanden');
  const changed = new Set([altId, ...(alt.alternativeFor ? [alt.alternativeFor] : []), ...statusDiff(nodes, next)]);
  return { nodes: next, changed: [...changed], skipped };
}

// --- Bearbeiten ---------------------------------------------------------------------------

export function uniqueId(nodes: BpNode[], prefix: string): string {
  const ids = new Set(nodes.map((n) => n.id));
  let i = nodes.length + 1;
  while (ids.has(`${prefix}-${i}`)) i += 1;
  return `${prefix}-${i}`;
}

const KIND_PREFIX: Record<BpKind, string> = { ziel: 'z', teilziel: 't', annahme: 'a', schritt: 's', alternative: 'alt' };

export function addChild(nodes: BpNode[], parentId: string, kind: BpKind, title: string): { nodes: BpNode[]; id: string } {
  const id = uniqueId(nodes, KIND_PREFIX[kind]);
  const node: BpNode = {
    id,
    parentId,
    title,
    kind,
    deps: [],
    ...(CONTAINER_KINDS.includes(kind) ? {} : { ownStatus: 'sorry' as OwnStatus }),
  };
  return { nodes: [...nodes, node], id };
}

export function updateNode(nodes: BpNode[], id: string, patch: Partial<BpNode>): BpNode[] {
  return nodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
}

/** Löscht den Knoten samt Teilbaum und entfernt Verweise in `deps` und `alternativeFor`. */
export function deleteNode(nodes: BpNode[], id: string): BpNode[] {
  const doomed = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of nodes) {
      if (n.parentId && doomed.has(n.parentId) && !doomed.has(n.id)) {
        doomed.add(n.id);
        grew = true;
      }
    }
  }
  return nodes
    .filter((n) => !doomed.has(n.id))
    .map((n) => ({
      ...n,
      deps: n.deps.filter((d) => !doomed.has(d)),
      alternativeFor: n.alternativeFor && doomed.has(n.alternativeFor) ? undefined : n.alternativeFor,
    }));
}

/** Setzt eine Querabhängigkeit, sofern sie keinen Zyklus erzeugt. Gibt null zurück, wenn sie abgelehnt wird. */
export function addDep(nodes: BpNode[], id: string, depId: string): BpNode[] | null {
  if (id === depId) return null;
  const next = updateNode(nodes, id, { deps: [...new Set([...(nodes.find((n) => n.id === id)?.deps ?? []), depId])] });
  try {
    derive(next);
    return next;
  } catch {
    return null;
  }
}
