import { describe, expect, it } from 'vitest';
import lawJson from '../../content/b-law-updates.json';
import projectJson from '../../content/b-project-windpark-x.json';
import { CycleError, derive, findCycle, gapReport, restsOn } from './derive';
import { addChild, addDep, adoptAlternative, applyPatch, deleteNode } from './patch';
import { PatchSchema, validateProject } from './schema';
import { newProjectFromTemplate } from './template';
import type { BpNode, Patch, Project } from './types';

const project = validateProject(projectJson).project as Project;
const law = (lawJson as unknown[]).map((l) => PatchSchema.parse(l)) as Patch[];
const f3 = project.events.find((e) => e.id === 'ev-f3')!;
const shown = (nodes: BpNode[]) => Object.fromEntries([...derive(nodes)].map(([id, d]) => [id, d.shown]));

describe('Demo „Windpark X“: Startzustand', () => {
  const s = shown(project.nodes);
  it('Ziel offen, Netzanschluss offen, Genehmigung belegt, EEG-Zuschlag bereit', () => {
    expect(s['ziel']).toBe('offen');
    expect(s['t-netz']).toBe('offen');
    expect(s['t-genehmigung']).toBe('belegt');
    expect(s['s-eeg']).toBe('bereit');
  });
  it('Lücken-Report: Kapazität am Umspannwerk steht oben', () => {
    const gaps = gapReport(project.nodes);
    expect(gaps[0].node.id).toBe('a-kapazitaet');
    expect(gaps[0].dependents.sort()).toEqual(['t-netz', 'ziel']);
    expect(gaps[0].score).toBe(2_000_000);
    expect(gaps.map((g) => g.node.id)).toEqual(['a-kapazitaet', 'a-trasse']);
  });
  it('„Worauf ruht das?“ nennt die offenen Annahmen unter dem Ziel', () => {
    expect(restsOn(project.nodes, 'ziel').sort()).toEqual(['a-kapazitaet', 'a-trasse']);
    expect(restsOn(project.nodes, 't-genehmigung')).toEqual([]);
  });
  it('hat 11 sichtbare Knoten und eine Querabhängigkeit', () => {
    expect(project.nodes.filter((n) => !n.hidden)).toHaveLength(11);
    expect(project.nodes.filter((n) => n.deps.length > 0)).toHaveLength(1);
  });
});

describe('Ereignis F3 „Eigentümer verweigert Flurstück“', () => {
  const result = applyPatch(project.nodes, f3);
  const s = shown(result.nodes);
  it('Netzanschluss und Ziel werden gebrochen, drei Alternativen erscheinen', () => {
    expect(s['t-netz']).toBe('gebrochen');
    expect(s['ziel']).toBe('gebrochen');
    expect(s['a-trasse']).toBe('widerlegt');
    const revealed = result.nodes.filter((n) => n.kind === 'alternative' && !n.hidden).map((n) => n.id);
    expect(revealed.sort()).toEqual(['alt-gemeinsam', 'alt-mast', 'alt-trasse']);
    expect(result.skipped).toEqual([]);
  });
  it('markiert geänderte Knoten', () => {
    expect(result.changed).toEqual(expect.arrayContaining(['a-trasse', 't-netz', 'ziel', 'alt-trasse']));
    expect(result.changed).not.toContain('t-genehmigung');
  });
  it('ist rein: der Startzustand bleibt unverändert (Rückgängig stellt ihn her)', () => {
    const before = structuredClone(project.nodes);
    applyPatch(project.nodes, f3);
    expect(project.nodes).toEqual(before);
    expect(shown(project.nodes)['t-netz']).toBe('offen');
  });
  it('„Alternative übernehmen“: Original entfällt, Alternative zählt als offene Voraussetzung', () => {
    const adopted = adoptAlternative(result.nodes, 'alt-gemeinsam');
    const a = shown(adopted.nodes);
    expect(a['a-trasse']).toBe('entfallen');
    expect(a['alt-gemeinsam']).toBe('sorry');
    expect(a['t-netz']).toBe('offen');
    expect(a['ziel']).toBe('offen');
    expect(gapReport(adopted.nodes).some((g) => g.node.id === 'alt-gemeinsam')).toBe(true);
  });
  it('nicht übernommene Alternativen zählen nicht', () => {
    expect(derive(result.nodes).get('t-netz')?.prerequisites).not.toContain('alt-mast');
  });
});

describe('Rechtsstand-Update § 6b WindBG (F9)', () => {
  const result = applyPatch(project.nodes, law[0]);
  const s = shown(result.nodes);
  it('Artenschutz entfallen, neue sorry-Annahme unter Genehmigung', () => {
    expect(s['a-artenschutz']).toBe('entfallen');
    const added = result.nodes.find((n) => n.id === 'a-klagerisiko')!;
    expect(added.parentId).toBe('t-genehmigung');
    expect(added.ownStatus).toBe('sorry');
  });
  it('Genehmigung offen, EEG-Zuschlag blockiert', () => {
    expect(s['t-genehmigung']).toBe('offen');
    expect(s['s-eeg']).toBe('blockiert');
    expect(s['ziel']).toBe('offen');
  });
  it('die neue Lücke steht im Lücken-Report und ruht unter Genehmigung und EEG', () => {
    const gap = gapReport(result.nodes).find((g) => g.node.id === 'a-klagerisiko')!;
    expect(gap.dependents.sort()).toEqual(['s-eeg', 't-genehmigung', 'ziel']);
    expect(restsOn(result.nodes, 's-eeg')).toEqual(['a-klagerisiko']);
  });
  it('überspringt Operationen auf fehlende Knoten statt abzustürzen', () => {
    const other = newProjectFromTemplate('Anderes Projekt', 'x');
    const r = applyPatch(other.nodes, law[0]);
    expect(r.skipped.length).toBeGreaterThan(0);
  });
});

describe('Statusregeln', () => {
  const n = (id: string, over: Partial<BpNode> = {}): BpNode => ({
    id,
    parentId: 'z',
    title: id,
    kind: 'annahme',
    ownStatus: 'belegt',
    deps: [],
    ...over,
  });
  const goal: BpNode = { id: 'z', parentId: null, title: 'Ziel', kind: 'ziel', deps: [] };

  it('Rangfolge widerlegt > sorry > in_arbeit > belegt', () => {
    expect(shown([goal, n('a'), n('b', { ownStatus: 'in_arbeit' })]).z).toBe('offen');
    expect(shown([goal, n('a', { ownStatus: 'sorry' }), n('b', { ownStatus: 'widerlegt' })]).z).toBe('gebrochen');
    expect(shown([goal, n('a'), n('b', { ownStatus: 'entfallen' })]).z).toBe('belegt');
  });
  it('Annahme ohne Voraussetzungen zeigt ihren eigenen Status', () => {
    expect(shown([goal, n('a', { ownStatus: 'in_arbeit' })]).a).toBe('in_arbeit');
  });
  it('Behälter ohne Voraussetzungen ist offen', () => {
    expect(shown([goal]).z).toBe('offen');
  });
  it('versteckte Knoten zählen nicht', () => {
    expect(shown([goal, n('a'), n('h', { hidden: true, ownStatus: 'widerlegt' })]).z).toBe('belegt');
  });
  it('Schritt ist bereit, wenn alle Voraussetzungen belegt sind, und blockiert, wenn nicht', () => {
    const step = n('s', { kind: 'schritt', ownStatus: 'sorry', deps: ['a'] });
    expect(shown([goal, n('a'), step]).s).toBe('bereit');
    expect(shown([goal, n('a', { ownStatus: 'sorry' }), step]).s).toBe('blockiert');
  });
});

describe('Zyklen und Bearbeiten', () => {
  it('erkennt Zyklen und wirft beim Ableiten eine Fehlermeldung', () => {
    const a: BpNode = { id: 'a', parentId: null, title: 'A', kind: 'teilziel', deps: ['b'] };
    const b: BpNode = { id: 'b', parentId: null, title: 'B', kind: 'teilziel', deps: ['a'] };
    expect(findCycle([a, b])).not.toBeNull();
    expect(() => derive([a, b])).toThrow(CycleError);
    expect(validateProject({ id: 'x', name: 'x', nodes: [a, b], events: [], applied: [] }).errors[0]).toMatch(/Zyklus/);
  });
  it('lehnt Querabhängigkeiten ab, die einen Zyklus erzeugen', () => {
    // t-genehmigung ruht auf a-bimschg; eine Abhängigkeit zurück auf den Elternknoten wäre ein Zyklus
    expect(addDep(project.nodes, 'a-bimschg', 't-genehmigung')).toBeNull();
    expect(addDep(project.nodes, 'a-pacht', 'a-bimschg')).not.toBeNull();
  });
  it('löscht Knoten samt Teilbaum und räumt Verweise auf', () => {
    const next = deleteNode(project.nodes, 't-genehmigung');
    expect(next.some((n) => n.id === 'a-bimschg')).toBe(false);
    expect(next.find((n) => n.id === 's-eeg')?.deps).toEqual([]);
    expect(() => derive(next)).not.toThrow();
  });
  it('Neues Projekt aus Vorlage: Ziel, sechs Teilziele, leere Annahmen, exportier- und importierbar', () => {
    const p = newProjectFromTemplate('Test', 'p1');
    expect(p.nodes.filter((n) => n.kind === 'teilziel').map((n) => n.title)).toEqual([
      'Fläche',
      'Netzanschluss',
      'Genehmigung',
      'Transport',
      'EEG-Zuschlag',
      'Wirtschaftlichkeit',
    ]);
    const { nodes, id } = addChild(p.nodes, 't-netz', 'annahme', 'Neu');
    expect(nodes.find((n) => n.id === id)?.ownStatus).toBe('sorry');
    const roundTrip = validateProject(JSON.parse(JSON.stringify({ ...p, nodes })));
    expect(roundTrip.errors).toEqual([]);
    expect(roundTrip.project?.nodes).toHaveLength(nodes.length);
  });
});
