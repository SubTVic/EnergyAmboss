import questionsJson from '../../content/e-questions.json';
import { supabase } from './supabase';
import { readJson, writeJson } from './storage';

export interface QuestionRow {
  id: string;
  league: string;
  title: string;
  details: string | null;
  category: string | null;
  close_date: string; // yyyy-mm-dd
  resolution_source: string | null;
  practice: boolean;
  outcome: boolean | null;
  resolved_at: string | null;
  verify: boolean;
}

export interface ParticipantRow {
  id: string;
  name: string;
  league: string;
  created_at?: string;
}

export interface ForecastRow {
  question_id: string;
  participant_id: string;
  probability: number;
  reason: string | null;
  created_at: string;
}

export interface PanelRow {
  item_id: string;
  expert: string;
  value: number;
  created_at?: string;
}

export interface FeedbackInput {
  prototype: 'a' | 'b' | 'c' | 'd' | 'e';
  tester: string | null;
  realism: number | null;
  aha: string | null;
  would_return: boolean | null;
  willingness_to_pay: string | null;
  comment: string | null;
  payload?: unknown;
}

/**
 * Gemeinsame Schnittstelle für alles, was mehrere Personen betrifft:
 * Prognosen (E), Panel-Antworten (A) und Feedback. Mit Supabase landen die Daten
 * in der Datenbank, ohne Supabase im lokalen Probemodus (nur dieser Browser).
 */
export interface DataStore {
  mode: 'supabase' | 'local';
  listQuestions(): Promise<QuestionRow[]>;
  listForecasts(): Promise<ForecastRow[]>;
  listParticipants(): Promise<ParticipantRow[]>;
  addParticipant(p: ParticipantRow): Promise<void>;
  addForecast(f: Omit<ForecastRow, 'created_at'>): Promise<void>;
  listPanel(): Promise<PanelRow[]>;
  addPanelAnswer(row: PanelRow): Promise<void>;
  addFeedback(fb: FeedbackInput): Promise<void>;
  /** Nur im lokalen Probemodus: Ausgang einer Frage simulieren (sonst im Supabase-Dashboard). */
  resolveLocal?(questionId: string, outcome: boolean): Promise<void>;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

const supabaseStore: DataStore = {
  mode: 'supabase',
  async listQuestions() {
    const { data, error } = await supabase!.from('questions').select('*').order('close_date');
    fail(error);
    return (data ?? []) as QuestionRow[];
  },
  async listForecasts() {
    const { data, error } = await supabase!
      .from('forecasts')
      .select('question_id, participant_id, probability, reason, created_at')
      .order('created_at');
    fail(error);
    return ((data ?? []) as ForecastRow[]).map((f) => ({ ...f, probability: Number(f.probability) }));
  },
  async listParticipants() {
    const { data, error } = await supabase!.from('participants').select('*');
    fail(error);
    return (data ?? []) as ParticipantRow[];
  },
  async addParticipant(p) {
    const { error } = await supabase!.from('participants').insert(p);
    // 23505 = Person existiert schon (zweiter Beitritt im selben Browser)
    if (error && (error as { code?: string }).code !== '23505') fail(error);
  },
  async addForecast(f) {
    const { error } = await supabase!.from('forecasts').insert(f);
    fail(error);
  },
  async listPanel() {
    const { data, error } = await supabase!.from('sct_panel').select('item_id, expert, value');
    fail(error);
    return (data ?? []) as PanelRow[];
  },
  async addPanelAnswer(row) {
    const { error } = await supabase!.from('sct_panel').insert(row);
    fail(error);
  },
  async addFeedback(fb) {
    const { error } = await supabase!.from('feedback').insert(fb);
    fail(error);
  },
};

const K = {
  forecasts: 'local-forecasts',
  participants: 'local-participants',
  panel: 'local-panel',
  feedback: 'local-feedback',
  outcomes: 'local-outcomes',
};

const localStore: DataStore = {
  mode: 'local',
  async listQuestions() {
    const outcomes = readJson<Record<string, boolean>>(K.outcomes, {});
    return (questionsJson as QuestionRow[]).map((q) =>
      q.id in outcomes
        ? { ...q, outcome: outcomes[q.id], resolved_at: q.resolved_at ?? new Date().toISOString() }
        : q,
    );
  },
  async listForecasts() {
    return readJson<ForecastRow[]>(K.forecasts, []);
  },
  async listParticipants() {
    return readJson<ParticipantRow[]>(K.participants, []);
  },
  async addParticipant(p) {
    const all = readJson<ParticipantRow[]>(K.participants, []);
    if (!all.some((x) => x.id === p.id)) writeJson(K.participants, [...all, p]);
  },
  async addForecast(f) {
    const all = readJson<ForecastRow[]>(K.forecasts, []);
    writeJson(K.forecasts, [...all, { ...f, created_at: new Date().toISOString() }]);
  },
  async listPanel() {
    return readJson<PanelRow[]>(K.panel, []);
  },
  async addPanelAnswer(row) {
    const all = readJson<PanelRow[]>(K.panel, []);
    writeJson(K.panel, [...all, row]);
  },
  async addFeedback(fb) {
    const all = readJson<unknown[]>(K.feedback, []);
    writeJson(K.feedback, [...all, { ...fb, created_at: new Date().toISOString() }]);
  },
  async resolveLocal(questionId, outcome) {
    const all = readJson<Record<string, boolean>>(K.outcomes, {});
    writeJson(K.outcomes, { ...all, [questionId]: outcome });
  },
};

export const store: DataStore = supabase ? supabaseStore : localStore;
