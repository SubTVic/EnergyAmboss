import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import { formatNumber, formatPercent } from '../shared/format';
import { useFeedbackPayload } from '../shared/feedbackBus';
import { calibrationBins, mean, scoreParticipant } from './scoring';
import type { LeagueData, Me } from './useLeague';

type Scope = 'echt' | 'uebung';

export function EMe({ me, data }: { me: Me; data: LeagueData }) {
  const [scope, setScope] = useState<Scope>('echt');
  const { questions, forecasts, loading } = data;

  const all = useMemo(() => scoreParticipant(questions, forecasts, me.id), [questions, forecasts, me.id]);
  const real = all.filter((i) => !i.question.practice);
  const practice = all.filter((i) => i.question.practice);
  const items = scope === 'echt' ? real : practice;

  const myBrier = mean(items.map((i) => i.brier));
  const communityItems = items.filter((i) => i.communityBrier !== null);
  const communityBrier = mean(communityItems.map((i) => i.communityBrier as number));
  const myBrierOnCommunitySet = mean(communityItems.map((i) => i.brier));
  const bins = calibrationBins(items.map((i) => ({ p: i.p, outcome: i.outcome })));
  const calibrationData = bins
    .filter((b) => b.n > 0)
    .map((b) => ({ x: Math.round((b.meanForecast ?? 0) * 100), y: Math.round((b.observed ?? 0) * 100), n: b.n, label: b.label }));

  // Verlauf: laufender Mittelwert des Brier-Scores in der Reihenfolge der Auflösung
  const ordered = [...items].sort(
    (a, b) => Date.parse(a.question.resolved_at ?? '') - Date.parse(b.question.resolved_at ?? ''),
  );
  const history = ordered.map((_, i) => ({
    nr: i + 1,
    ich: mean(ordered.slice(0, i + 1).map((x) => x.brier)),
    community: mean(ordered.slice(0, i + 1).map((x) => x.communityBrier ?? x.brier)),
  }));

  useFeedbackPayload('e', {
    brierEcht: mean(real.map((i) => i.brier)),
    brierUebung: mean(practice.map((i) => i.brier)),
    anzahlEcht: real.length,
    anzahlUebung: practice.length,
  });

  if (loading) return <p className="muted">Lade …</p>;

  return (
    <div className="stack">
      <div className="flex">
        <button className={scope === 'echt' ? 'btn-secondary' : ''} onClick={() => setScope('echt')}>
          Echte Fragen ({real.length})
        </button>
        <button className={scope === 'uebung' ? 'btn-secondary' : ''} onClick={() => setScope('uebung')}>
          Übungsfragen ({practice.length})
        </button>
      </div>

      {items.length === 0 ? (
        <p className="muted">
          Noch keine aufgelöste Frage mit deiner Prognose. {scope === 'uebung' ? 'Starte mit den Übungsfragen: ' : ''}
          <Link to="/e">zur Fragenliste</Link>
        </p>
      ) : (
        <>
          <section className="cards">
            <div className="box">
              <div className="small muted">Dein Brier-Score (Mittel, 0 = perfekt)</div>
              <div style={{ fontSize: '2rem' }}>{myBrier === null ? '–' : formatNumber(myBrier, 3)}</div>
              <div className="small muted">aus {items.length} Fragen</div>
            </div>
            <div className="box">
              <div className="small muted">Community-Median auf denselben Fragen</div>
              <div style={{ fontSize: '2rem' }}>{communityBrier === null ? '–' : formatNumber(communityBrier, 3)}</div>
              <div className="small muted">
                {myBrierOnCommunitySet !== null && communityBrier !== null
                  ? myBrierOnCommunitySet < communityBrier
                    ? 'Du liegst vorn.'
                    : myBrierOnCommunitySet > communityBrier
                      ? 'Der Median liegt vorn.'
                      : 'Gleichauf.'
                  : ''}
              </div>
            </div>
          </section>

          <section className="stack">
            <h4 style={{ margin: 0 }}>Kalibrierung</h4>
            <p className="small muted" style={{ margin: 0 }}>
              „Wenn du 70 % sagst, tritt es in x % der Fälle ein.“ Punkte auf der Diagonale heißen: gut kalibriert. Kleine
              Stichproben schwanken stark; die Zahl der Prognosen steht im Tooltip.
            </p>
            <div style={{ height: 280 }}>
              <ResponsiveContainer>
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" dataKey="x" name="Prognose" unit=" %" domain={[0, 100]} label={{ value: 'abgegebene Prognose', position: 'bottom' }} />
                  <YAxis type="number" dataKey="y" name="Trefferquote" unit=" %" domain={[0, 100]} />
                  <ZAxis type="number" dataKey="n" range={[80, 260]} name="Anzahl" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={[{ x: 0, y: 0, n: 1 }, { x: 100, y: 100, n: 1 }]} line={{ stroke: '#999', strokeDasharray: '5 5' }} shape={() => <g />} legendType="none" />
                  <Scatter data={calibrationData} fill="#41403e" isAnimationActive={false} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="stack">
            <h4 style={{ margin: 0 }}>Verlauf des Brier-Scores</h4>
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={history} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nr" label={{ value: 'aufgelöste Fragen', position: 'insideBottom', offset: -4 }} />
                  <YAxis domain={[0, 'auto']} />
                  <Tooltip formatter={(v) => formatNumber(Number(v), 3)} />
                  <Line type="monotone" dataKey="ich" name="Du" stroke="#41403e" strokeWidth={2} dot isAnimationActive={false} />
                  <Line type="monotone" dataKey="community" name="Community-Median" stroke="#999" strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="stack">
            <h4 style={{ margin: 0 }}>Frage für Frage</h4>
            <table className="simple">
              <thead>
                <tr>
                  <th>Frage</th>
                  <th>Deine Prognose</th>
                  <th>Median</th>
                  <th>Ausgang</th>
                  <th>Brier</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.question.id}>
                    <td>
                      <Link to={`/e/frage/${i.question.id}`}>{i.question.title}</Link>
                    </td>
                    <td>{formatPercent(i.p)}</td>
                    <td>{i.communityP === null ? '–' : formatPercent(i.communityP)}</td>
                    <td>{i.outcome ? 'Ja' : 'Nein'}</td>
                    <td>{formatNumber(i.brier, 3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
