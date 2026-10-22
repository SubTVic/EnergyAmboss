import { Link } from 'react-router-dom';
import { cases } from './shared/content';
import { store } from './shared/store';
import { getTester } from './shared/tester';

const PROTOTYPES = [
  {
    to: '/a',
    key: 'A',
    verb: 'Kreuzen',
    vorbild: 'AMBOSS (Medizin)',
    text: 'Praxisfälle kreuzen; jede Erklärung führt ins Wissensnetz über alle Fachbereiche.',
    focus: 'Lernen',
  },
  {
    to: '/b',
    key: 'B',
    verb: 'Beweisen',
    vorbild: 'Lean mit Blueprint (Mathematik)',
    text: 'Das Projekt als Beweisbaum führen; offene Annahmen werden sichtbar, Rechtsänderungen färben betroffene Knoten um.',
    focus: 'Prüfen',
  },
  {
    to: '/c',
    key: 'C',
    verb: 'Rechnen',
    vorbild: 'Play-Based Exploration (Öl und Gas)',
    text: 'Flächen nach Erfolgswahrscheinlichkeit und Informationswert bewerten; was ist eine sichere Netzauskunft wert?',
    focus: 'Entscheiden',
  },
  {
    to: '/d',
    key: 'D',
    verb: 'Spielen',
    vorbild: 'Wargaming (Militär)',
    text: 'Ein Windprojekt rundenbasiert gegen Konkurrenz, Netzbetreiber und Behörden spielen; Kaskaden erleben statt lesen.',
    focus: 'Lernen',
  },
  {
    to: '/e',
    key: 'E',
    verb: 'Prognostizieren',
    vorbild: 'Superforecasting (Prognoseforschung)',
    text: 'Wahrscheinlichkeiten zu Ausweisung, Netz und Recht abgeben und kalibrieren.',
    focus: 'Lernen und Daten',
  },
  {
    to: '/f',
    key: 'F',
    verb: 'Entscheiden',
    vorbild: 'Kombination aus A–E',
    text: 'Ein Projektlog mit allen Standortentscheidungen und Begründungen. Vor der nächsten Entscheidung erst selbst verknüpfen, dann sehen, was alles daran hängt und wer davon wissen muss.',
    focus: 'Lernen im laufenden Projekt',
  },
];

export function Home() {
  return (
    <div className="stack">
      <header className="stack">
        <h1 style={{ margin: 0 }}>Sechs Prototypen für Projektentwickler</h1>
        <p style={{ margin: 0 }}>
          Fünf Versionen, fünf Vorbilder, fünf Verben, alle auf denselben neun Fällen aus dem Interview, dazu F als
          Kombination der besten Teile. Vergleiche die Form, nicht den Inhalt. Jeder Bereich hat oben rechts einen
          Feedback-Knopf.
        </p>
        <p className="small muted" style={{ margin: 0 }}>
          Tester-Kürzel: <span className="mono">{getTester() || 'noch keins (per ?t=K1 in der URL oder beim ersten Feedback)'}</span>
          {' · '}Datenspeicher: {store.mode === 'supabase' ? 'Supabase' : 'lokaler Probemodus (kein Supabase)'}
        </p>
      </header>

      <div className="cards">
        {PROTOTYPES.map((p) => (
          <Link key={p.key} to={p.to} className="card-link">
            <div className="card">
              <div style={{ padding: '4px 8px 10px' }}>
                <h3 className="card-title" style={{ marginTop: 0 }}>
                  {p.key} · {p.verb}
                </h3>
                <p className="small muted" style={{ margin: '0 0 6px' }}>
                  Vorbild: {p.vorbild} · Schwerpunkt: {p.focus}
                </p>
                <p style={{ margin: 0 }}>{p.text}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <section className="box dashed stack">
        <h3 style={{ margin: 0 }}>Das gemeinsame Fallpaket</h3>
        <ul style={{ margin: 0 }}>
          {cases.map((c) => (
            <li key={c.id}>
              <strong>{c.id}</strong> {c.title}
              {c.source === 'Recherche' && <span className="small muted"> (aus der Recherche)</span>}
            </li>
          ))}
        </ul>
        <p className="small muted" style={{ margin: 0 }}>
          Alle Zahlen, Wahrscheinlichkeiten und Projektdaten sind fiktiv. Nur die Kostenarten und Abläufe stammen aus dem
          Interview. Keine Rechtsberatung.
        </p>
      </section>
    </div>
  );
}
