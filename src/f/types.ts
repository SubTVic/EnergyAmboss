/** Ein Eintrag im Projektlog: wann, wer, was, warum. */
export interface LogEntry {
  id: string;
  date: string; // 'MM/JJJJ'
  who: string; // Abteilung
  what: string;
  why: string;
}

export interface Decision {
  date: string;
  who: string;
  question: string;
  links: { id: string; why: string }[]; // Log-Einträge, die mit der Entscheidung zusammenhängen
  options: string[];
}

export interface DecisionLog {
  project: string;
  log: LogEntry[];
  decision: Decision;
}
