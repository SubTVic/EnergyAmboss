/** Eine Aussage, die jemand aus dem Projekt aufschreibt: eine Tatsache, eine Entscheidung, eine Sorge. */
export interface Statement {
  id: string;
  text: string;
  who: string; // Abteilung
  kbIds: string[]; // verknüpfte Einträge der Wissensbasis (Wissensknoten)
}

/** Verknüpfung zwischen zwei Aussagen, mit dem Grund in eigenen Worten. Ohne Richtung. */
export interface StatementLink {
  from: string;
  to: string;
  why: string;
}

export interface Board {
  statements: Statement[];
  links: StatementLink[];
}

export interface StartBoard extends Board {
  project: string;
  depts: string[];
}
