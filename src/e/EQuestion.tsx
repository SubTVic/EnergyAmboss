import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatNumber, formatPercent } from '../shared/format';
import { store } from '../shared/store';
import { Unverified } from '../shared/ui';
import { brier, communityMedian, latestByParticipant } from './scoring';
import type { LeagueData, Me } from './useLeague';

const dateFmt = (iso: string) => new Date(iso).toLocaleDateString('de-DE');

export function EQuestion({ me, data }: { me: Me; data: LeagueData }) {
  const { id } = useParams();
  const { questions, forecasts, participants, loading, reload } = data;
  const q = questions.find((x) => x.id === id);
  const [value, setValue] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (loading) return <p className="muted">Lade …</p>;
  if (!q) return <p>Frage nicht gefunden. <Link to="/e">Zurück zur Liste</Link></p>;

  const today = new Date().toISOString().slice(0, 10);
  const resolved = q.outcome !== null;
  const closed = !q.practice && (resolved || q.close_date < today);
  const mine = latestByParticipant(forecasts, q).get(me.id);
  const myHistory = forecasts
    .filter((f) => f.question_id === q.id && f.participant_id === me.id)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  // Übungsfragen werden nach der ersten Prognose gesperrt, sonst wäre der Ausgang schon bekannt.
  const locked = closed || (q.practice && myHistory.length > 0);
  const current = value ?? Math.round((mine?.probability ?? 0.5) * 100);
  const nameOf = (pid: string) => participants.find((p) => p.id === pid)?.name ?? 'Unbekannt';

  const showCommunity = myHistory.length > 0 || resolved;
  const community = communityMedian(forecasts, q);
  const others = [...latestByParticipant(forecasts, q).values()].filter((f) => f.participant_id !== me.id && f.reason);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await store.addForecast({
        question_id: q!.id,
        participant_id: me.id,
        probability: current / 100,
        reason: reason.trim() || null,
      });
      setReason('');
      setValue(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function simulate(outcome: boolean) {
    await store.resolveLocal?.(q!.id, outcome);
    await reload();
  }

  const revealOutcome = resolved && (q.practice ? myHistory.length > 0 : true);

  return (
    <div className="stack">
      <p style={{ margin: 0 }}>
        <Link to="/e">← Fragenliste</Link>
      </p>
      <section className="box stack">
        <h3 style={{ margin: 0 }}>
          {q.title} <Unverified show={q.verify} />
        </h3>
        {q.details && <p style={{ margin: 0 }}>{q.details}</p>}
        <p className="small muted" style={{ margin: 0 }}>
          Stichtag: {dateFmt(q.close_date)} · Auflösung über: {q.resolution_source ?? 'noch offen'}
          {q.practice && ' · Übungsfrage'}
        </p>
      </section>

      {revealOutcome && (
        <section className="box stack">
          <strong>
            Ausgang: {q.outcome ? 'Ja' : 'Nein'}
            {q.verify && q.practice && <span className="small muted"> (Platzhalter, vom Team zu recherchieren)</span>}
          </strong>
          {mine && (
            <span>
              Deine Prognose {formatPercent(mine.probability)} ergibt einen Brier-Score von{' '}
              <strong>{formatNumber(brier(mine.probability, q.outcome!), 3)}</strong> (0 ist perfekt, 0,25 entspricht Raten bei 50 %).
            </span>
          )}
          {q.resolution_source && <span className="small muted">Quelle: {q.resolution_source}</span>}
        </section>
      )}

      {!locked && (
        <section className="box stack">
          <h4 style={{ margin: 0 }}>{mine ? 'Prognose aktualisieren' : 'Deine Prognose'}</h4>
          <div>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <span>Wahrscheinlichkeit, dass die Antwort „Ja“ lautet:</span>
              <strong style={{ fontSize: '1.4rem' }}>{current} %</strong>
            </div>
            <input type="range" min={0} max={100} step={1} value={current} onChange={(e) => setValue(Number(e.target.value))} />
          </div>
          <label>
            Begründung (kurz, andere sehen sie nach ihrer eigenen Prognose)
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {error && <p style={{ color: 'var(--broken)', margin: 0 }}>{error}</p>}
          <div>
            <button onClick={submit} disabled={busy}>
              {mine ? 'Prognose aktualisieren' : 'Prognose abgeben'}
            </button>
          </div>
        </section>
      )}
      {locked && !resolved && !q.practice && (
        <p className="muted">Der Stichtag ist vorbei; es wird auf die Auflösung gewartet.</p>
      )}

      {myHistory.length > 0 && (
        <section className="stack">
          <h4 style={{ margin: 0 }}>Dein Verlauf</h4>
          <ul style={{ margin: 0 }}>
            {myHistory.map((f, i) => (
              <li key={i}>
                {new Date(f.created_at).toLocaleString('de-DE')}: <strong>{formatPercent(f.probability)}</strong>
                {f.reason && <span className="muted"> – {f.reason}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {showCommunity ? (
        <section className="stack">
          <h4 style={{ margin: 0 }}>Community</h4>
          {community.median === null ? (
            <p className="muted">Noch keine Prognosen.</p>
          ) : (
            <p style={{ margin: 0 }}>
              Median: <strong>{formatPercent(community.median)}</strong> aus {community.count}{' '}
              {community.count === 1 ? 'Prognose' : 'Prognosen'}
            </p>
          )}
          {others.length > 0 && (
            <ul style={{ margin: 0 }}>
              {others.map((f) => (
                <li key={f.participant_id}>
                  {nameOf(f.participant_id)} ({formatPercent(f.probability)}): {f.reason}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <p className="small muted">
          Median und Begründungen der anderen erscheinen erst nach deiner eigenen Prognose, damit niemand ankert.
        </p>
      )}

      {store.mode === 'local' && store.resolveLocal && (
        <section className="box dashed stack">
          <span className="small">Nur Probemodus: Ausgang simulieren (sonst im Supabase-Dashboard, Felder outcome und resolved_at)</span>
          <div className="flex">
            <button className="btn-small" onClick={() => simulate(true)}>
              Ausgang: Ja
            </button>
            <button className="btn-small" onClick={() => simulate(false)}>
              Ausgang: Nein
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
