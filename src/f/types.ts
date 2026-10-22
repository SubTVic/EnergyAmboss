import type { Domain } from '../shared/types';

export type Dept = 'projektleitung' | 'netzplanung' | 'flaechensicherung' | 'naturschutz' | 'genehmigung' | 'controlling';

export const DEPT_LABELS: Record<Dept, string> = {
  projektleitung: 'Projektleitung',
  netzplanung: 'Netzplanung',
  flaechensicherung: 'Flächensicherung',
  naturschutz: 'Naturschutz',
  genehmigung: 'Genehmigung',
  controlling: 'Controlling',
};

export type AssumptionStatus = 'belegt' | 'offen' | 'widerlegt';

export interface Assumption {
  text: string;
  status: AssumptionStatus;
  note?: string;
}

/** Ein Eintrag im Entscheidungslog: was entschieden wurde, von wem, warum und worauf es ruht. */
export interface LogEntry {
  id: string;
  date: string; // 'MM/JJJJ'
  title: string;
  dept: Dept;
  domains: Domain[];
  reasons: string[];
  assumptions: Assumption[];
  knowledgeIds: string[];
  mine?: boolean; // im Prototyp selbst getroffen
}

export interface Link {
  id: string; // Log-Eintrag (l…, d…) oder Wissensknoten (n-…)
  why: string;
}

export interface Option {
  id: string;
  label: string;
  restsOn: string[]; // Log-Einträge mit offenen Annahmen, auf denen die Option ruht
  outlook: string; // fiktiver Ausblick nach der Entscheidung
}

/** Rechnung zum Informationswert einer verbindlichen Netzzusage (wie in C). */
export interface Estimate {
  question: string;
  value: number; // V, Wert der Projektrechte bei Erfolg
  pRest: number; // alles andere klappt
  planning: number; // P, Planung bis zur Genehmigung
  waitCost: number; // Kosten des Wartens auf die Zusage
  waitNote: string;
  optionIds: { now: string; wait: string; giveUp: string };
}

export interface Decision {
  id: string;
  date: string;
  question: string;
  situation: string;
  dept: Dept;
  domains: Domain[];
  breaks?: string[]; // Log-Einträge, deren offene Annahmen mit dieser Lage widerlegt sind
  logLinks: Link[];
  knowledgeLinks: Link[];
  options: Option[];
  estimate?: Estimate;
}

export interface DecisionLog {
  project: string;
  site: string;
  log: LogEntry[];
  decisions: Decision[];
}

/** Was die Person bei einer Entscheidung getan hat; daraus wird ihr Log-Eintrag. */
export interface MyDecision {
  decisionId: string;
  picks: string[]; // selbst verknüpfte Log-Einträge, vor dem Aufdecken
  note: string; // eigene Verbindung, die nicht im Log steht
  optionId: string;
  reason: string;
  p?: number;
  pReason?: string;
}
