import { useCallback, useEffect, useState } from 'react';
import { readJson, removeKey, writeJson } from '../shared/storage';
import { store, type ForecastRow, type ParticipantRow, type QuestionRow } from '../shared/store';

export interface Me {
  id: string;
  name: string;
  league: string;
}

const ME_KEY = 'e-participant';

export function loadMe(): Me | null {
  return readJson<Me | null>(ME_KEY, null);
}

export function saveMe(me: Me): void {
  writeJson(ME_KEY, me);
}

/** „Demo zurücksetzen“: Beitritt vergessen; im lokalen Probemodus auch die lokalen Prognosen löschen. */
export function resetE(): void {
  removeKey(ME_KEY);
  if (store.mode === 'local') {
    for (const k of ['local-forecasts', 'local-participants', 'local-outcomes']) removeKey(k);
  }
}

export interface LeagueData {
  questions: QuestionRow[];
  forecasts: ForecastRow[];
  participants: ParticipantRow[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

export function useLeagueData(me: Me | null): LeagueData {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [forecasts, setForecasts] = useState<ForecastRow[]>([]);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [q, f, p] = await Promise.all([store.listQuestions(), store.listForecasts(), store.listParticipants()]);
      setQuestions(q.filter((x) => !me || x.league === 'offen' || x.league === me.league));
      setForecasts(f);
      setParticipants(p);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { questions, forecasts, participants, loading, error, reload };
}
