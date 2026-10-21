export type Domain =
  | 'recht'
  | 'netz'
  | 'natur'
  | 'vertraege'
  | 'technik'
  | 'finanzen'
  | 'logistik'
  | 'genehmigung';

export const DOMAINS: Domain[] = [
  'recht',
  'netz',
  'natur',
  'vertraege',
  'technik',
  'finanzen',
  'logistik',
  'genehmigung',
];

export const DOMAIN_LABELS: Record<Domain, string> = {
  recht: 'Recht',
  netz: 'Netz',
  natur: 'Natur',
  vertraege: 'Verträge',
  technik: 'Technik',
  finanzen: 'Finanzen',
  logistik: 'Logistik',
  genehmigung: 'Genehmigung',
};

export interface Case {
  id: string; // 'F1' … 'F9'
  title: string;
  situation: string;
  domains: Domain[];
  source: 'Interview' | 'Recherche';
}

export type KnowledgeKind = 'norm' | 'akteur' | 'schritt' | 'risiko' | 'kennzahl';

export interface KnowledgeNode {
  id: string;
  label: string;
  kind: KnowledgeKind;
  domain: Domain;
  summary: string; // 1–2 Sätze
  caseIds: string[]; // Belegstelle im Fallpaket
  verify?: boolean; // true = nicht aus dem Konzeptdokument, vor dem Test prüfen
}

export type EdgeKind = 'setzt_voraus' | 'verzoegert' | 'verteuert' | 'schliesst_aus';

export const EDGE_LABELS: Record<EdgeKind, string> = {
  setzt_voraus: 'setzt voraus',
  verzoegert: 'verzögert',
  verteuert: 'verteuert',
  schliesst_aus: 'schließt aus',
};

export interface KnowledgeEdge {
  from: string;
  to: string;
  kind: EdgeKind;
  note?: string;
}

export interface Region {
  viewBox: [number, number];
  villages: { id: string; name: string; x: number; y: number; bufferRadius: number }[];
  substations: { id: string; name: string; x: number; y: number; operator: 'nord' | 'sued' }[];
  lines: {
    id: string;
    points: [number, number][];
    kind: 'netz' | 'alt_110kv' | 'autobahn' | 'strasse';
  }[];
  areas: {
    id: string;
    kind: 'schutzgebiet' | 'wald' | 'netzgrenze';
    polygon: [number, number][];
  }[];
  sites: {
    id: string;
    name: string;
    polygon: [number, number][];
    caseIds: string[];
    tech: 'wind' | 'pv';
  }[];
}
