import type { Domain } from '../shared/types';

export interface QuestionBase {
  id: string;
  caseId: string; // 'F1' … 'F9'
  domains: Domain[]; // erster Eintrag = Hauptbereich der Frage
  nodeIds: string[]; // Wissenskarte, mind. ein Knoten aus anderem Bereich
  verify?: boolean;
}

export interface SingleBest extends QuestionBase {
  type: 'single';
  stem: string;
  options: { id: string; text: string; correct: boolean; explanation: string }[]; // genau 5, eine richtig
}

export interface Sct extends QuestionBase {
  type: 'sct';
  hypothesis: string; // „Annahme: …“
  newInfo: string; // „Neue Information: …“
  explanation: string;
  seedPanel: [number, number, number, number, number]; // Platzhalter-Anzahlen für −2 … +2
}

export interface Cascade extends QuestionBase {
  type: 'cascade';
  stem: string;
  correctDomains: Domain[]; // genau 3
  explanation: string;
}

export type Question = SingleBest | Sct | Cascade;

export type SctAnswer = -2 | -1 | 0 | 1 | 2;
export const SCT_ANSWERS: SctAnswer[] = [-2, -1, 0, 1, 2];
export const SCT_LABELS: Record<SctAnswer, string> = {
  '-2': 'stark geschwächt',
  '-1': 'geschwächt',
  '0': 'weder noch',
  '1': 'gestärkt',
  '2': 'stark gestärkt',
};

/** Antwort einer Frage in einer Session. */
export type Answer =
  | { type: 'single'; optionId: string }
  | { type: 'sct'; value: SctAnswer }
  | { type: 'cascade'; domains: Domain[] };

export interface QuestionResult {
  questionId: string;
  retry: boolean; // Wiederholung am Ende der Session
  answer: Answer;
  points: number;
  max: number;
  miss: boolean; // unter 50 % der möglichen Punkte
}
