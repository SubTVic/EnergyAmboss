import { describe, expect, it } from 'vitest';
import { demo, laws, steps } from './data';
import { findTarget, firstNotes, sanitize } from './logic';

const catalog = new Set([...laws.map((l) => l.id), ...steps.map((s) => s.id)]);

describe('Projektwand: Inhalte', () => {
  it('Demo verweist nur auf vorhandene Post-its und Katalogeinträge', () => {
    expect(sanitize(demo, catalog)).toEqual(demo);
    expect(demo.notes).toHaveLength(3);
  });

  it('markiert jedes Gesetz als ungeprüft, bis es juristisch geprüft ist', () => {
    for (const l of laws) expect(l.verify, l.id).toBe(true);
  });

  it('hat eindeutige IDs über beide Kataloge', () => {
    expect(catalog.size).toBe(laws.length + steps.length);
  });
});

describe('Projektwand: Absichern', () => {
  it('verwirft erfundene Gesetze, unbekannte Post-its und Schleifen', () => {
    const r = sanitize(
      {
        notes: [{ id: 'a', text: 'x' }, { id: 'b', text: 'y' }],
        references: [
          { noteId: 'a', targetId: 'bgb-581', why: 'ok' },
          { noteId: 'a', targetId: 'erfunden-123', why: 'weg' },
          { noteId: 'z', targetId: 'eeg-8', why: 'weg' },
        ],
        noteLinks: [
          { a: 'a', b: 'b', why: 'ok' },
          { a: 'a', b: 'a', why: 'weg' },
          { a: 'a', b: 'z', why: 'weg' },
        ],
      },
      catalog,
    );
    expect(r.references.map((x) => x.targetId)).toEqual(['bgb-581']);
    expect(r.noteLinks).toHaveLength(1);
  });

  it('zeigt in der Demo nur, was zu den ersten Post-its gehört', () => {
    const two = firstNotes(demo, 2);
    expect(two.notes.map((n) => n.id)).toEqual(['n1', 'n2']);
    expect(two.references.every((r) => r.noteId !== 'n3')).toBe(true);
    expect(two.noteLinks).toEqual([]);
    expect(firstNotes(demo, 3).noteLinks).toHaveLength(2);
  });

  it('findet Gesetze und Projektschritte', () => {
    expect(findTarget('eeg-8', laws, steps)?.kind).toBe('law');
    expect(findTarget('s-trasse', laws, steps)?.kind).toBe('step');
    expect(findTarget('nichts', laws, steps)).toBeNull();
  });
});
