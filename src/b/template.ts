import type { BpNode, Project } from './types';

/** Vorlage „Neues Projekt“: Ziel plus die Teilziele Fläche, Netzanschluss, Genehmigung, Transport, EEG-Zuschlag und Wirtschaftlichkeit. */
const GOALS: { id: string; title: string; assumptions: string[] }[] = [
  { id: 'flaeche', title: 'Fläche', assumptions: ['Eigentümer gefunden und Pacht gesichert', 'Abstände und Schutzgebiete geprüft'] },
  { id: 'netz', title: 'Netzanschluss', assumptions: ['Kapazität am Umspannwerk bestätigt', 'Trasse über alle Flurstücke gesichert'] },
  { id: 'genehmigung', title: 'Genehmigung', assumptions: ['Naturschutzgutachten liegt vor', 'Genehmigung nach Immissionsschutzrecht erteilt'] },
  { id: 'transport', title: 'Transport', assumptions: ['Transportroute und Genehmigungen geklärt'] },
  { id: 'eeg', title: 'EEG-Zuschlag', assumptions: ['Zuschlag in der EEG-Ausschreibung erhalten'] },
  { id: 'wirtschaft', title: 'Wirtschaftlichkeit', assumptions: ['Ertrag nach Betriebsauflagen trägt das Projekt'] },
];

export function templateNodes(goalTitle: string): BpNode[] {
  const nodes: BpNode[] = [{ id: 'ziel', parentId: null, title: goalTitle, kind: 'ziel', deps: [] }];
  for (const g of GOALS) {
    nodes.push({ id: `t-${g.id}`, parentId: 'ziel', title: g.title, kind: 'teilziel', deps: [] });
    g.assumptions.forEach((a, i) =>
      nodes.push({ id: `a-${g.id}-${i + 1}`, parentId: `t-${g.id}`, title: a, kind: 'annahme', ownStatus: 'sorry', deps: [] }),
    );
  }
  return nodes;
}

export function newProjectFromTemplate(name: string, id: string): Project {
  return { id, name, nodes: templateNodes(`${name} geht wirtschaftlich in Betrieb`), events: [], applied: [] };
}
