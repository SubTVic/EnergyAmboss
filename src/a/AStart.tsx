import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { store } from '../shared/store';
import { DOMAIN_LABELS, DOMAINS, type Domain } from '../shared/types';
import { questions } from './data';
import { buildSession, effectivePanel } from './logic';
import { isFinished, type ASession } from './session';
import type { Sct } from './types';

export function AStart({ session, onStart }: { session: ASession | null; onStart: (s: ASession) => void }) {
  const navigate = useNavigate();
  const [domain, setDomain] = useState<Domain | ''>('');
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    const seed = Math.floor(Math.random() * 1_000_000);
    const items = buildSession(questions, { count, domain: domain || undefined, seed });
    // Panel-Stand beim Start einfrieren; ohne Verbindung zum Panel gilt das Platzhalter-Panel
    let rows: { item_id: string; expert: string; value: number }[] = [];
    try {
      rows = await store.listPanel();
    } catch {
      rows = [];
    }
    const panels: ASession['panels'] = {};
    for (const q of questions) if (q.type === 'sct') panels[q.id] = effectivePanel(q as Sct, rows);
    onStart({ seed, domain: domain || null, items, index: 0, results: [], panels });
    navigate('/a/session');
  }

  const available = domain ? questions.filter((q) => q.domains.includes(domain)).length : questions.length;

  return (
    <div className="stack">
      <section className="box stack">
        <h3 style={{ margin: 0 }}>Das Prinzip</h3>
        <p style={{ margin: 0 }}>
          Gelernt wird über die Kette <strong>Fehler → kommentierte Erklärung → vernetztes Kapitel → verwandte Fragen</strong>. Die Frage ist nur der Einstieg.
        </p>
        <p style={{ margin: 0 }}>
          Es gibt drei Fragetypen: Einzelwahl mit fünf Optionen, „Was ändert sich?“ (Script-Concordance-Test: Wie verändert eine neue Information eine Annahme, von −2 bis +2?) und
          Kaskadenfragen („Welche drei Projektbereiche ändert diese Information am stärksten?“).
        </p>
      </section>

      <section className="box stack" style={{ maxWidth: 560 }}>
        <h4 style={{ margin: 0 }}>Session starten</h4>
        <label>
          Fragen
          <select value={domain} onChange={(e) => setDomain(e.target.value as Domain | '')}>
            <option value="">gemischt, alle Bereiche</option>
            {DOMAINS.map((d) => (
              <option key={d} value={d}>
                nach Bereich: {DOMAIN_LABELS[d]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Anzahl (höchstens {available})
          <input type="number" min={3} max={Math.min(20, available)} value={Math.min(count, available)} onChange={(e) => setCount(Number(e.target.value))} />
        </label>
        <p className="small muted" style={{ margin: 0 }}>
          Ähnliche, leicht verwechselbare Fälle werden bewusst gemischt. Falsch beantwortete Fragen kommen am Ende einmal wieder.
        </p>
        <div className="flex">
          <button onClick={start} disabled={busy}>
            Session starten
          </button>
          {session && (
            <Link to={isFinished(session) ? '/a/ergebnis' : '/a/session'} style={{ textDecoration: 'none' }}>
              <button className="btn-secondary">{isFinished(session) ? 'Letztes Ergebnis' : `Weiter (Frage ${session.index + 1} von ${session.items.length})`}</button>
            </Link>
          )}
        </div>
      </section>

      <section className="box dashed stack" style={{ maxWidth: 560 }}>
        <h4 style={{ margin: 0 }}>Für Fachleute: Panel-Modus</h4>
        <p className="small" style={{ margin: 0 }}>
          Die Wertung der „Was ändert sich?“-Fragen richtet sich nach der häufigsten Antwort eines Expertenpanels. Bis fünf Experten geantwortet haben, gilt ein
          Platzhalter-Panel. Projektierer können unter dem Panel-Link die Fragen ohne Erklärungen beantworten.
        </p>
        <div>
          <Link to="/a/panel">Zum Panel-Modus</Link>
        </div>
      </section>
    </div>
  );
}
