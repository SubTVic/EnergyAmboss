import { useMemo } from 'react';
import type cytoscape from 'cytoscape';
import { Link } from 'react-router-dom';
import { CytoGraph, type GraphEdge, type GraphNode } from '../shared/CytoGraph';
import { openFeedback, useFeedbackPayload } from '../shared/feedbackBus';
import { formatEuro, formatEuroShort } from '../shared/format';
import { buildDebrief, type EventSummary } from './debrief';
import { gameData } from './data';
import { END_LABELS, MONTH_VALUE } from './engine';
import type { SavedGame } from './gameStore';

const AAR_QUESTIONS: { key: string; label: string }[] = [
  { key: 'geplant', label: 'Was war geplant?' },
  { key: 'passiert', label: 'Was ist passiert?' },
  { key: 'warum', label: 'Warum?' },
  { key: 'mitnehmen', label: 'Was nehme ich mit?' },
];

const LAYOUT = { name: 'breadthfirst', directed: true, spacingFactor: 1.1, padding: 10, animate: false } as cytoscape.LayoutOptions;

function EventBlock({ ev }: { ev: EventSummary }) {
  return (
    <div className="small" style={{ marginLeft: 16 }}>
      <strong>→ Ereignis in Runde {ev.round}: {ev.title}</strong> {ev.caseId && <span className="muted">({ev.caseId})</span>}
      <ul style={{ margin: 0 }}>
        {ev.entries.map((c, i) => (
          <li key={i}>
            {c.entry.text}
            {c.cost > 0 && <strong> · −{formatEuroShort(c.cost)}</strong>}
            {c.delayMonths !== 0 && <strong> · +{c.delayMonths} Monate</strong>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DDebrief({ game, onChange }: { game: SavedGame | null; onChange: (g: SavedGame | null) => void }) {
  const debrief = useMemo(() => (game ? buildDebrief(game.state, gameData) : null), [game]);
  const aar = game?.aar ?? {};

  // AAR-Antworten gehen zusammen mit dem Feedback in die Datenbank (Feld payload)
  const payload = useMemo(
    () =>
      game
        ? {
            aar: game.aar,
            seed: game.state.seed,
            ergebnis: game.state.ended?.reason ?? 'laufend',
            runden: game.state.round,
            budget: game.state.budget,
            teuersteEntscheidung: debrief?.mostExpensive?.decision.id ?? null,
            ki: game.llm,
          }
        : null,
    [game, debrief],
  );
  useFeedbackPayload('d', payload);

  const graph = useMemo(() => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    if (!debrief) return { nodes, edges };
    for (const d of debrief.decisions) {
      const id = `d:${d.decision.id}@${d.decision.round}`;
      const worst = debrief.mostExpensive?.decision === d.decision;
      nodes.push({
        id,
        label: `R${d.decision.round}: ${d.decision.label}${d.decision.site ? ' ' + d.decision.site : ''}\n${formatEuroShort(d.total)}`,
        bg: '#bbdefb',
        border: worst ? '#c62828' : '#1565c0',
        borderWidth: worst ? 5 : 2,
      });
      for (const e of d.events) {
        const eid = `e:${e.id}@${e.round}`;
        nodes.push({ id: eid, label: `R${e.round}: ${e.title}\n${formatEuroShort(e.total)}`, bg: '#ffe0b2', border: '#e08a00' });
        edges.push({ source: id, target: eid, label: 'löst aus' });
      }
    }
    if (debrief.unattached.length) {
      nodes.push({ id: 'umwelt', label: 'Zufall, Wettbewerb, Gesetzgeber', bg: '#eeeeee', border: '#777777', dashed: true });
      for (const e of debrief.unattached) {
        const eid = `e:${e.id}@${e.round}`;
        nodes.push({ id: eid, label: `R${e.round}: ${e.title}\n${formatEuroShort(e.total)}`, bg: '#ffe0b2', border: '#e08a00' });
        edges.push({ source: 'umwelt', target: eid });
      }
    }
    return { nodes, edges };
  }, [debrief]);

  if (!game || !debrief) {
    return (
      <p>
        Noch kein Spiel vorhanden. <Link to="/d">Spiel starten</Link>
      </p>
    );
  }
  const { state } = game;
  const worst = debrief.mostExpensive;

  return (
    <div className="stack">
      <section className="box stack">
        <h3 style={{ margin: 0 }}>Nachbesprechung (After Action Review)</h3>
        <p style={{ margin: 0 }}>
          {state.ended ? END_LABELS[state.ended.reason] : 'Das Spiel läuft noch.'} Seed {state.seed}, Budget {formatEuro(state.budget)}, {state.months} Monate.
        </p>
        {worst && worst.total > 0 && (
          <p style={{ margin: 0 }}>
            <strong>Teuerste Entscheidung:</strong> Runde {worst.decision.round}, {worst.decision.label}
            {worst.decision.site ? ` ${worst.decision.site}` : ''} mit Kosten und Folgen von {formatEuro(worst.cost)} und {worst.delayMonths} Monaten Verzögerung (bewertet mit {formatEuro(worst.delayMonths * MONTH_VALUE)}), zusammen{' '}
            <strong>{formatEuro(worst.total)}</strong>.
          </p>
        )}
        <div className="flex no-print">
          <Link to="/d" style={{ textDecoration: 'none' }}>
            <button className="btn-secondary">Neues Spiel</button>
          </Link>
          <button onClick={openFeedback}>Feedback geben</button>
        </div>
      </section>

      <section className="box stack">
        <h4 style={{ margin: 0 }}>Vier Fragen</h4>
        {AAR_QUESTIONS.map((q) => (
          <label key={q.key}>
            {q.label}
            <textarea rows={2} value={aar[q.key] ?? ''} onChange={(e) => onChange({ ...game, aar: { ...aar, [q.key]: e.target.value } })} />
          </label>
        ))}
        <p className="small muted" style={{ margin: 0 }}>
          Die Antworten werden mit deinem Feedback gespeichert.
        </p>
      </section>

      <section className="stack">
        <h4 style={{ margin: 0 }}>Kaskadenkarte: Entscheidung → Ereignis</h4>
        {graph.nodes.length > 0 ? (
          <CytoGraph nodes={graph.nodes} edges={graph.edges} layout={LAYOUT} height={380} />
        ) : (
          <p className="muted">Es gab keine Entscheidungen.</p>
        )}
        <p className="small muted" style={{ margin: 0 }}>
          Rot umrandet: die teuerste Entscheidung. Betrag = Kosten plus Verzögerung (je Monat {formatEuro(MONTH_VALUE)}, fiktiv).
        </p>
      </section>

      <section className="stack">
        <h4 style={{ margin: 0 }}>Kaskadenliste je Entscheidung</h4>
        {debrief.decisions.map((d, i) => (
          <div key={i} className="box stack" style={{ borderColor: worst && worst.decision === d.decision ? 'var(--broken)' : undefined }}>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <strong>
                Runde {d.decision.round}: {d.decision.label}
                {d.decision.site ? ` ${d.decision.site}` : ''}
              </strong>
              <span className="small">
                🎲 {d.decision.roll[0]} + {d.decision.roll[1]} (Ziel ≥ {d.decision.target}) → {d.decision.success ? 'Erfolg' : 'Misserfolg'} · Summe {formatEuro(d.total)}
              </span>
            </div>
            <ul style={{ margin: 0 }} className="small">
              {d.direct.map((c, j) => (
                <li key={j}>
                  <span className="mono">R{c.entry.round}</span> {c.entry.text}
                  {c.cost > 0 && <strong> · −{formatEuroShort(c.cost)}</strong>}
                  {c.delayMonths !== 0 && <strong> · +{c.delayMonths} Monate</strong>}
                </li>
              ))}
            </ul>
            {d.events.map((e) => (
              <EventBlock key={`${e.id}@${e.round}`} ev={e} />
            ))}
          </div>
        ))}
        {debrief.unattached.length > 0 && (
          <div className="box dashed stack">
            <strong>Ereignisse ohne auslösende Entscheidung</strong>
            {debrief.unattached.map((e) => (
              <EventBlock key={`${e.id}@${e.round}`} ev={e} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
