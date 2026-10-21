import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPercent } from '../shared/format';
import { Unverified } from '../shared/ui';
import { latestByParticipant } from './scoring';
import type { LeagueData, Me } from './useLeague';

type Tab = 'offen' | 'uebung' | 'aufgeloest';

const CATEGORY_LABELS: Record<string, string> = {
  ausweisung: 'Ausweisung',
  netz: 'Netz',
  recht: 'Recht',
  markt: 'Markt',
  ausbau: 'Ausbau',
};

const dateFmt = (iso: string) => new Date(iso).toLocaleDateString('de-DE');

export function EList({ me, data }: { me: Me; data: LeagueData }) {
  const [tab, setTab] = useState<Tab>('offen');
  const { questions, forecasts, loading, error } = data;

  const groups: Record<Tab, typeof questions> = {
    offen: questions.filter((q) => !q.practice && q.outcome === null),
    uebung: questions.filter((q) => q.practice),
    aufgeloest: questions.filter((q) => !q.practice && q.outcome !== null),
  };
  const labels: Record<Tab, string> = { offen: 'Offen', uebung: 'Übung', aufgeloest: 'Aufgelöst' };
  const today = new Date().toISOString().slice(0, 10);

  if (loading) return <p className="muted">Lade Fragen …</p>;
  if (error) return <p style={{ color: 'var(--broken)' }}>Fehler beim Laden: {error}</p>;

  return (
    <div className="stack">
      <div className="flex">
        {(Object.keys(labels) as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'btn-secondary' : ''} onClick={() => setTab(t)}>
            {labels[t]} ({groups[t].length})
          </button>
        ))}
      </div>
      {tab === 'uebung' && (
        <p className="small muted" style={{ margin: 0 }}>
          Übungsfragen haben einen bekannten Ausgang: Du siehst gleich nach dem Absenden, wie gut deine Prognose war.
        </p>
      )}
      {groups[tab].length === 0 ? (
        <p className="muted">Keine Fragen in dieser Liste.</p>
      ) : (
        <table className="simple">
          <thead>
            <tr>
              <th>Frage</th>
              <th>Bereich</th>
              <th>Stichtag</th>
              <th>Deine Prognose</th>
            </tr>
          </thead>
          <tbody>
            {groups[tab].map((q) => {
              const mine = latestByParticipant(forecasts, q).get(me.id);
              return (
                <tr key={q.id}>
                  <td>
                    <Link to={`/e/frage/${q.id}`}>{q.title}</Link> <Unverified show={q.verify} />
                    {!q.practice && q.outcome === null && q.close_date < today && (
                      <div className="small muted">Stichtag vorbei, wartet auf Auflösung</div>
                    )}
                  </td>
                  <td>{q.category ? (CATEGORY_LABELS[q.category] ?? q.category) : ''}</td>
                  <td>{dateFmt(q.close_date)}</td>
                  <td>{mine ? formatPercent(mine.probability) : <span className="muted">offen</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
