export type OwnStatus = 'belegt' | 'sorry' | 'widerlegt' | 'in_arbeit' | 'entfallen';
export type ShownStatus = OwnStatus | 'offen' | 'gebrochen' | 'bereit' | 'blockiert';
export type BpKind = 'ziel' | 'teilziel' | 'annahme' | 'schritt' | 'alternative';

export interface BpNode {
  id: string;
  parentId: string | null;
  title: string;
  kind: BpKind;
  ownStatus?: OwnStatus; // nur bei 'annahme', 'schritt', 'alternative'
  deps: string[]; // Querabhängigkeiten zusätzlich zu den Kindern
  evidence?: string; // Beleg, z. B. „Pachtverträge unterschrieben“
  owner?: string; // Elektroplaner, Gutachter, Jurist …
  damageIfWrong?: number; // € bei Irrtum
  alternativeFor?: string; // bei 'alternative': Knoten, den sie ersetzen kann
  adopted?: boolean; // Alternative übernommen
  hidden?: boolean; // Alternativen erscheinen erst nach einem Ereignis
  knowledgeIds?: string[];
}

export type PatchOp =
  | { op: 'setStatus'; nodeId: string; status: OwnStatus }
  | { op: 'addNode'; node: BpNode }
  | { op: 'reveal'; nodeId: string };

export interface Patch {
  id: string;
  title: string;
  caseId: string;
  ops: PatchOp[];
  explanation: string;
}

export interface Project {
  id: string;
  name: string;
  nodes: BpNode[];
  events: Patch[]; // auslösbare Ereignisse dieses Projekts
  applied: string[]; // bereits angewendete Patches (Ereignisse und Rechtsstand)
}

export const CONTAINER_KINDS: BpKind[] = ['ziel', 'teilziel'];
export const isContainer = (n: BpNode): boolean => CONTAINER_KINDS.includes(n.kind);

export const OWN_STATUS_LABELS: Record<OwnStatus, string> = {
  belegt: 'belegt',
  sorry: 'offen (sorry)',
  widerlegt: 'widerlegt',
  in_arbeit: 'in Arbeit',
  entfallen: 'entfallen',
};

export const KIND_LABELS: Record<BpKind, string> = {
  ziel: 'Ziel',
  teilziel: 'Teilziel',
  annahme: 'Annahme',
  schritt: 'Schritt',
  alternative: 'Alternative',
};
