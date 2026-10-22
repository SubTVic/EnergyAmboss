import { describe, expect, it } from 'vitest';
import { nodeById } from '../shared/content';
import { startBoard } from './data';
import { addLink, addStatement, linksOf, removeLink, removeStatement, statementsWithKb, toggleKb } from './logic';
import type { Board } from './types';

const board: Board = { statements: startBoard.statements, links: startBoard.links };

describe('F: Startinhalt', () => {
  it('verweist nur auf vorhandene Aussagen, Abteilungen und Wissenseinträge', () => {
    const ids = new Set(startBoard.statements.map((s) => s.id));
    expect(ids.size).toBe(startBoard.statements.length);
    for (const l of startBoard.links) {
      expect(ids.has(l.from) && ids.has(l.to), `${l.from} – ${l.to}`).toBe(true);
    }
    for (const s of startBoard.statements) {
      expect(startBoard.depts).toContain(s.who);
      for (const k of s.kbIds) expect(nodeById(k), `${s.id} → ${k}`).toBeDefined();
    }
  });
});

describe('F: Aussagen und Verknüpfungen', () => {
  it('legt Aussagen an, aber keine leeren', () => {
    const b = addStatement(board, { id: 'x', text: '  Gemeinde ist skeptisch  ', who: 'Projektleitung', kbIds: [] });
    expect(b.statements.at(-1)!.text).toBe('Gemeinde ist skeptisch');
    expect(addStatement(board, { id: 'y', text: '   ', who: 'Projektleitung', kbIds: [] })).toBe(board);
  });

  it('verknüpft ohne Richtung und ohne Doppelte oder Schleifen', () => {
    const b = addLink(board, 's3', 's1', ' Warten kostet Pacht ');
    expect(b.links.at(-1)).toEqual({ from: 's3', to: 's1', why: 'Warten kostet Pacht' });
    expect(addLink(b, 's1', 's3', 'nochmal')).toBe(b); // gibt es schon, andere Richtung
    expect(addLink(b, 's1', 's1', 'selbst')).toBe(b);
    expect(addLink(b, 's1', 'gibt-es-nicht', '')).toBe(b);
    expect(linksOf(b, 's1').map((l) => l.other)).toEqual(['s2', 's3']);
    expect(linksOf(b, 's3')).toEqual([{ other: 's1', why: 'Warten kostet Pacht' }]);
    expect(removeLink(b, 's1', 's3').links).toEqual(board.links);
  });

  it('löscht eine Aussage samt ihrer Verknüpfungen', () => {
    const b = removeStatement(board, 's2');
    expect(b.statements.map((s) => s.id)).toEqual(['s1', 's3', 's4']);
    expect(b.links).toEqual([]);
  });

  it('verbindet Aussagen mit der Wissensbasis und findet sie wieder', () => {
    const b = toggleKb(board, 's4', 'n-trasse');
    expect(statementsWithKb(b, 'n-trasse').map((s) => s.id)).toEqual(['s4']);
    expect(statementsWithKb(toggleKb(b, 's4', 'n-trasse'), 'n-trasse')).toEqual([]);
  });
});
