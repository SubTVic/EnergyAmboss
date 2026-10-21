export type GridState = 'keine' | 'angefragt' | 'vage' | 'zusage' | 'absage';
export type SurveyState = 'keins' | 'laeuft' | 'fertig' | 'problem';
export type PermitState = 'keine' | 'beantragt' | 'erteilt';
export type SiteStatus = 'frei' | 'gesichert' | 'verloren';

export interface Range {
  gte?: number;
  lte?: number;
}

/** Kleine Datensprache für Bedingungen; alle angegebenen Schlüssel müssen gelten. Keine Funktionen im JSON. */
export interface Condition {
  grid?: GridState | GridState[];
  survey?: SurveyState | SurveyState[];
  permit?: PermitState | PermitState[];
  award?: boolean;
  round?: Range;
  budget?: Range;
  contacts?: Range;
  support?: Range;
  securedSites?: Range; // Anzahl gesicherter Flächen
  freeSites?: Range; // Anzahl freier Flächen
  designatedSecured?: Range; // gesichert UND ausgewiesen
  siteStatus?: { site: string; status: SiteStatus };
  flag?: string;
  noFlag?: string;
}

/**
 * Kleine Datensprache für Wirkungen, z. B. `{ "budget": -150000 }` oder `{ "site": "W3", "status": "verloren" }`.
 * Besondere Formen: `{ if, then }` (bedingt) und `{ later, text, effects }` (verzögert, in n Runden).
 */
export interface Effect {
  budget?: number;
  months?: number; // Verzögerung; die Pacht läuft in dieser Zeit weiter
  contacts?: number;
  support?: number;
  grid?: GridState;
  survey?: SurveyState;
  permit?: PermitState;
  award?: boolean;
  site?: string; // 'W3', '$target' (gewählte Fläche), 'random:gesichert' oder 'random:frei'
  status?: SiteStatus;
  flag?: string;
  clearFlag?: string;
  if?: Condition;
  then?: Effect[];
  later?: number;
  text?: string;
  effects?: Effect[];
}

export interface Reason {
  id: string;
  text: string;
  valid: boolean;
  why: string;
}

export interface ActionCard {
  id: string;
  label: string;
  summary: string;
  cost: number;
  target: number; // Erfolg bei 2W6 ≥ target
  needsSite?: SiteStatus; // gewählte Fläche muss diesen Status haben
  tags?: ('eigentuemer' | 'gemeinde')[];
  requires: Condition[];
  modifiers?: { when: Condition; delta: number; why: string }[];
  onSuccess: Effect[];
  onFailure: Effect[];
  successText: string;
  failureText: string;
  caseId: string;
  knowledgeIds: string[];
  reasons: Reason[]; // 4–6, davon 2–3 gültig
}

export interface EventCard {
  id: string;
  title: string;
  text: string;
  caseId: string; // F1 … F9
  when: Condition[];
  weight: number;
  effects: Effect[];
  causedBy?: string; // Aktion, deren frühere Ausführung das Ereignis möglich macht
  resist?: { target: number; label: string };
  resistEffects?: Effect[];
  knowledgeIds: string[];
}

export interface LogCause {
  kind: 'action' | 'event' | 'upkeep';
  id: string;
  round: number;
}

export interface LogEntry {
  round: number;
  text: string;
  budgetDelta?: number;
  monthsDelta?: number;
  cause: LogCause;
  roll?: [number, number];
  success?: boolean;
}

export interface Timer {
  dueRound: number;
  text: string;
  effects: Effect[];
  cause: LogCause;
}

export interface Decision {
  id: string; // Aktion plus gewählte Fläche, z. B. „sichern:W3“
  actionId: string;
  label: string;
  site?: string;
  round: number;
  roll: [number, number];
  target: number;
  success: boolean;
}

export interface GameState {
  seed: number;
  rng: number; // Zustand der einzigen Zufallsquelle
  round: number; // 1 Runde = 6 Monate, höchstens 12
  months: number; // inkl. Verzögerungen
  budget: number; // Start 1.500.000 € (fiktiv)
  contacts: number; // 0–10
  support: number; // Rückhalt in der Gemeinde, 0–10
  sites: Record<string, { status: SiteStatus; designated: boolean; securedRound?: number }>;
  grid: GridState;
  survey: SurveyState;
  permit: PermitState;
  award: boolean;
  flags: string[];
  timers: Timer[];
  designations: { round: number; site: string }[]; // geplante Ausweisungen (für den Spieler verdeckt)
  firedEvents: string[];
  decisions: Decision[];
  log: LogEntry[];
  ended: null | { reason: 'sieg' | 'pleite' | 'zeit'; round: number };
}

export interface ActionPick {
  actionId: string;
  site?: string;
  /** Listenmodus: gewählte Begründungen (höchstens 3). */
  reasonIds?: string[];
  /** KI-Spielleitung: Zahl der gültigen Begründungen (0–3) aus der Bewertung des Freitexts. */
  llmValidReasons?: number;
}

export interface GameData {
  actions: ActionCard[];
  events: EventCard[];
  siteIds: string[];
  pvSiteIds: string[];
}
