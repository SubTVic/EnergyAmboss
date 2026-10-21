import { describe, expect, it } from 'vitest';
import { cases, knowledgeEdges, knowledgeNodes, region } from './content';

describe('Gemeinsame Inhalte', () => {
  it('enthält das Fallpaket F1 bis F9', () => {
    expect(cases.map((c) => c.id)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9']);
  });

  it('hat einen Wissensgraphen im Startumfang (Knoten und Kanten)', () => {
    expect(knowledgeNodes.length).toBeGreaterThanOrEqual(25);
    expect(knowledgeNodes.length).toBeLessThanOrEqual(35);
    expect(knowledgeEdges.length).toBeGreaterThanOrEqual(35);
  });

  it('hat eindeutige Knoten-IDs und gültige Kanten', () => {
    const ids = new Set(knowledgeNodes.map((n) => n.id));
    expect(ids.size).toBe(knowledgeNodes.length);
    for (const e of knowledgeEdges) {
      expect(ids.has(e.from), `Kante von ${e.from}`).toBe(true);
      expect(ids.has(e.to), `Kante nach ${e.to}`).toBe(true);
      expect(e.from).not.toBe(e.to);
    }
  });

  it('verweist nur auf vorhandene Fälle', () => {
    const caseIds = new Set(cases.map((c) => c.id));
    for (const n of knowledgeNodes) for (const id of n.caseIds) expect(caseIds.has(id), `${n.id} → ${id}`).toBe(true);
    for (const s of region.sites) for (const id of s.caseIds) expect(caseIds.has(id), `${s.id} → ${id}`).toBe(true);
  });

  it('hat die Musterregion mit acht Flächen W1 bis W8', () => {
    expect(region.sites.map((s) => s.id)).toEqual(['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']);
    expect(region.villages).toHaveLength(4);
    expect(region.substations.map((s) => s.name)).toEqual(['UW Nord', 'UW Süd']);
    expect(region.sites.find((s) => s.id === 'W8')?.tech).toBe('pv');
  });
});
