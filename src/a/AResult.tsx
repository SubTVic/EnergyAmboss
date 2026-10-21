import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { nodeById } from '../shared/content';
import { useFeedbackPayload } from '../shared/feedbackBus';
import { formatNumber } from '../shared/format';
import { DOMAIN_LABELS } from '../shared/types';
import { questions } from './data';
import { connectionRadar } from './logic';
import type { ASession } from './session';

export function AResult({ session }: { session: ASession | null }) {
  const first = useMemo(() => (session ? session.results.filter((r) => !r.retry) : []), [session]);
  const retries = useMemo(() => (session ? session.results.filter((r) => r.retry) : []), [session]);
  const radar = useMemo(() => (session ? connectionRadar(session.results, questions) : []), [session]);

  const points = first.reduce((s, r) => s + r.points, 0);
  const max = first.reduce((s, r) => s + r.max, 0);

  useFeedbackPayload(
    'a',
    useMemo(
      () => (session ? { punkte: points, max, fragen: first.length, schwacheVerbindungen: radar.filter((p) => p.misses > 0).map((p) => p.key) } : null),
      [session, points, max, first.length, radar],
    ),
  );

  if (!session || session.results.length === 0) {
    return (
      <p>
        Noch keine Session abgeschlossen. <Link to="/a">Session starten</Link>
      </p>
    );
  }

  const data = radar.map((p) => ({
    name: p.domains.map((d) => DOMAIN_LABELS[d]).join(' → '),
    fehlerquote: Math.round(p.errorRate * 100),
    misses: p.misses,
    total: p.total,
  }));
  const missed = radar.filter((p) => p.misses > 0);
  const missedQuestionIds = new Set(session.results.filter((r) => !r.retry && r.miss).map((r) => r.questionId));

  return (
    <div className="stack">
      <section className="box stack">
        <h3 style={{ margin: 0 }}>Ergebnis</h3>
        <div style={{ fontSize: '2rem' }}>
          {formatNumber(points, 1)} von {max} Punkten
        </div>
        <div className="small muted">
          Erstversuche: {first.length} Fragen
          {retries.length > 0 && `, Wiederholungen: ${retries.filter((r) => !r.miss).length} von ${retries.length} richtig`}.
        </div>
        <div>
          <Link to="/a" style={{ textDecoration: 'none' }}>
            <button>Neue Session</button>
          </Link>
        </div>
      </section>

      <section className="stack">
        <h4 style={{ margin: 0 }}>Verbindungs-Radar</h4>
        <p className="small muted" style={{ margin: 0 }}>
          Jede Frage zählt für das Bereichspaar aus ihrem Haupt- und ersten Nebenbereich. Der Balken zeigt die Fehlerquote je Paar: nicht nur, welches Fach schwach ist, sondern welche Verbindung.
        </p>
        <div style={{ height: Math.max(160, data.length * 48 + 40) }}>
          <ResponsiveContainer>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} unit=" %" />
              <YAxis type="category" dataKey="name" width={170} />
              <Tooltip formatter={(v, _n, item) => [`${v} % (${item.payload.misses} von ${item.payload.total} verfehlt)`, 'Fehlerquote']} />
              <Bar dataKey="fehlerquote" fill="#41403e" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="stack">
        <h4 style={{ margin: 0 }}>Verpasste Verbindungen</h4>
        {missed.length === 0 ? (
          <p style={{ margin: 0 }}>Keine. Alle Verbindungen dieser Session saßen.</p>
        ) : (
          missed.map((p) => (
            <div key={p.key} className="box stack">
              <strong>{p.domains.map((d) => DOMAIN_LABELS[d]).join(' → ')}</strong>
              <div className="small">
                {p.misses} von {p.total} Fragen verfehlt. In der Bibliothek nachlesen:
              </div>
              <div className="tag-list small">
                {[
                  ...new Set(
                    p.questionIds
                      .filter((id) => missedQuestionIds.has(id))
                      .flatMap((id) => questions.find((q) => q.id === id)?.nodeIds ?? []),
                  ),
                ].map((id) => (
                  <Link key={id} to={`/a/bibliothek?node=${id}`}>
                    {nodeById(id)?.label ?? id}
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
