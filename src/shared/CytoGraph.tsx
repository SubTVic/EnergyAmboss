import { useEffect, useMemo, useRef } from 'react';
import type cytoscape from 'cytoscape';
import CytoscapeComponent from 'react-cytoscapejs';

export interface GraphNode {
  id: string;
  label: string;
  bg?: string;
  border?: string;
  borderWidth?: number;
  shape?: string;
  dashed?: boolean;
  /** Feste Position (für layout: { name: 'preset' }). */
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id?: string;
  source: string;
  target: string;
  label?: string;
  dashed?: boolean;
  color?: string;
}

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout?: cytoscape.LayoutOptions;
  height?: number;
  onNodeTap?: (id: string) => void;
}

const STYLE: cytoscape.StylesheetJson = [
  {
    selector: 'node',
    style: {
      label: 'data(label)',
      'text-wrap': 'wrap',
      'text-max-width': '116px',
      'font-size': 10,
      'text-valign': 'center',
      'text-halign': 'center',
      color: '#222',
      shape: 'data(shape)' as unknown as 'round-rectangle',
      'background-color': 'data(bg)',
      'border-width': 'data(borderWidth)',
      'border-color': 'data(border)',
      'border-style': 'data(borderStyle)' as unknown as 'solid',
      width: 128,
      height: 48,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 1.5,
      'line-color': 'data(color)',
      'target-arrow-color': 'data(color)',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'line-style': 'data(lineStyle)' as unknown as 'solid',
      label: 'data(label)',
      'font-size': 8,
      color: '#666',
      'text-background-color': '#fff',
      'text-background-opacity': 0.8,
    },
  },
];

const DEFAULT_LAYOUT: cytoscape.LayoutOptions = { name: 'cose', animate: false, padding: 20 } as cytoscape.LayoutOptions;

/** Dünner Wrapper um react-cytoscapejs für Wissenskarte (A), Beweisgraph (B) und Kaskadenkarte (D). */
export function CytoGraph({ nodes, edges, layout = DEFAULT_LAYOUT, height = 340, onNodeTap }: Props) {
  const cyRef = useRef<cytoscape.Core | null>(null);
  const tapRef = useRef(onNodeTap);
  tapRef.current = onNodeTap;

  const elements = useMemo(
    () => [
      ...nodes.map((n) => ({
        ...(n.x !== undefined && n.y !== undefined ? { position: { x: n.x, y: n.y } } : {}),
        data: {
          id: n.id,
          label: n.label,
          bg: n.bg ?? '#ffffff',
          border: n.border ?? '#41403e',
          borderWidth: n.borderWidth ?? 2,
          shape: n.shape ?? 'round-rectangle',
          borderStyle: n.dashed ? 'dashed' : 'solid',
        },
      })),
      ...edges.map((e, i) => ({
        data: {
          id: e.id ?? `e${i}-${e.source}-${e.target}`,
          source: e.source,
          target: e.target,
          label: e.label ?? '',
          color: e.color ?? '#888888',
          lineStyle: e.dashed ? 'dashed' : 'solid',
        },
      })),
    ],
    [nodes, edges],
  );

  const signature = useMemo(() => JSON.stringify(elements.map((e) => e.data)), [elements]);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || cy.destroyed()) return;
    cy.layout(layout).run();
    // Layout nur bei echter Änderung der Elemente neu berechnen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return (
    <CytoscapeComponent
      elements={elements}
      stylesheet={STYLE}
      layout={layout}
      style={{ width: '100%', height, border: '2px solid #41403e', borderRadius: 8, background: 'white' }}
      cy={(cy: cytoscape.Core) => {
        if (cyRef.current === cy) return;
        cyRef.current = cy;
        cy.on('tap', 'node', (evt) => tapRef.current?.(evt.target.id()));
      }}
    />
  );
}
