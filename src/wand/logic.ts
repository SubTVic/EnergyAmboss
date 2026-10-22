// Reine Logik der Projektwand: Antworten absichern und für die Anzeige aufbereiten.
import type { Law, Step, WallReading } from './schema';

/** Verwirft alles, was nicht auf ein gelesenes Post-it oder einen Katalogeintrag zeigt. Kein erfundenes Gesetz erreicht die Wand. */
export function sanitize(reading: WallReading, catalogIds: Set<string>): WallReading {
  const noteIds = new Set(reading.notes.map((n) => n.id));
  return {
    notes: reading.notes,
    references: reading.references.filter((r) => noteIds.has(r.noteId) && catalogIds.has(r.targetId)),
    noteLinks: reading.noteLinks.filter((l) => l.a !== l.b && noteIds.has(l.a) && noteIds.has(l.b)),
  };
}

/** Demo: nur die ersten `count` Post-its mit ihren Verweisen und Verbindungen. */
export function firstNotes(reading: WallReading, count: number): WallReading {
  const notes = reading.notes.slice(0, count);
  const ids = new Set(notes.map((n) => n.id));
  return {
    notes,
    references: reading.references.filter((r) => ids.has(r.noteId)),
    noteLinks: reading.noteLinks.filter((l) => ids.has(l.a) && ids.has(l.b)),
  };
}

export type Target = { kind: 'law'; law: Law } | { kind: 'step'; step: Step };

export function findTarget(id: string, laws: Law[], steps: Step[]): Target | null {
  const law = laws.find((l) => l.id === id);
  if (law) return { kind: 'law', law };
  const step = steps.find((s) => s.id === id);
  return step ? { kind: 'step', step } : null;
}
