// Logik für Prototyp F: Aussagen anlegen, verknüpfen, mit der Wissensbasis verbinden.
// Reine Funktionen; jede gibt ein neues Board zurück.
import type { Board, Statement, StatementLink } from './types';

const sameLink = (l: StatementLink, a: string, b: string) => (l.from === a && l.to === b) || (l.from === b && l.to === a);

export function addStatement(board: Board, s: Statement): Board {
  if (!s.text.trim()) return board;
  return { ...board, statements: [...board.statements, { ...s, text: s.text.trim() }] };
}

/** Aussage löschen, samt ihrer Verknüpfungen. */
export function removeStatement(board: Board, id: string): Board {
  return {
    statements: board.statements.filter((s) => s.id !== id),
    links: board.links.filter((l) => l.from !== id && l.to !== id),
  };
}

/** Zwei Aussagen verknüpfen; keine Schleife auf sich selbst, keine doppelte Verknüpfung (in keiner Richtung). */
export function addLink(board: Board, from: string, to: string, why: string): Board {
  if (from === to || board.links.some((l) => sameLink(l, from, to))) return board;
  const ids = new Set(board.statements.map((s) => s.id));
  if (!ids.has(from) || !ids.has(to)) return board;
  return { ...board, links: [...board.links, { from, to, why: why.trim() }] };
}

export function removeLink(board: Board, a: string, b: string): Board {
  return { ...board, links: board.links.filter((l) => !sameLink(l, a, b)) };
}

/** Verknüpfungen einer Aussage, aus ihrer Sicht: die andere Aussage und der Grund. */
export function linksOf(board: Board, id: string): { other: string; why: string }[] {
  return board.links
    .filter((l) => l.from === id || l.to === id)
    .map((l) => ({ other: l.from === id ? l.to : l.from, why: l.why }));
}

export function toggleKb(board: Board, statementId: string, kbId: string): Board {
  return {
    ...board,
    statements: board.statements.map((s) =>
      s.id !== statementId ? s : { ...s, kbIds: s.kbIds.includes(kbId) ? s.kbIds.filter((k) => k !== kbId) : [...s.kbIds, kbId] },
    ),
  };
}

/** Aussagen, die auf einen Eintrag der Wissensbasis verweisen. */
export const statementsWithKb = (board: Board, kbId: string): Statement[] => board.statements.filter((s) => s.kbIds.includes(kbId));
