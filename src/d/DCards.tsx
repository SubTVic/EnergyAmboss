import { Link } from 'react-router-dom';
import { caseById, nodeById } from '../shared/content';
import { formatEuro } from '../shared/format';
import { gameData } from './data';
import { describeConditions, describeEffects } from './describe';
import { LEASE_PER_ROUND, MAX_ACTIONS, MAX_REASONS } from './engine';

/** Druckbare Aktions- und Ereigniskarten für die Tischspiel-Variante (A4, sechs pro Seite). */
export function DCards() {
  return (
    <div className="stack">
      <div className="flex no-print">
        <button onClick={() => window.print()}>Drucken</button>
        <Link to="/d">← Zurück</Link>
        <span className="small muted">Alle Kosten und Wahrscheinlichkeiten sind fiktiv. Würfel: 2W6, Erfolg bei Wurf ≥ Zielwert.</span>
      </div>

      <section className="print-card">
        <strong>Kurzregeln (Tischspiel)</strong>
        <ul style={{ margin: '4px 0 0' }}>
          <li>Pro Runde (6 Monate) bis zu {MAX_ACTIONS} Aktionen; zu jeder bis zu {MAX_REASONS} Begründungen nennen: gültig −1, ungültig +1 auf den Zielwert.</li>
          <li>Pacht {formatEuro(LEASE_PER_ROUND)} je gesicherter Fläche und Runde. Ab 7 Kontakten +1 bei Eigentümern und Gemeinde.</li>
          <li>Nach den Aktionen zieht die Spielleitung eine Ereigniskarte (nur wenn die Bedingung erfüllt ist).</li>
        </ul>
      </section>

      <h3 style={{ margin: 0 }}>Aktionskarten</h3>
      <div className="print-cards">
        {gameData.actions.map((a) => (
          <div key={a.id} className="print-card">
            <strong>{a.label}</strong> <span className="muted">({a.caseId})</span>
            <div>{a.summary}</div>
            <div>
              Kosten {formatEuro(a.cost)} · Zielwert ≥ {a.target}
              {a.needsSite ? ' · eine freie Fläche wählen' : ''}
            </div>
            <div>
              <u>Voraussetzung:</u> {describeConditions(a.requires)}
            </div>
            {a.modifiers && a.modifiers.length > 0 && (
              <div>
                <u>Zielwert:</u> {a.modifiers.map((m) => `${m.why} ${m.delta > 0 ? '+' : ''}${m.delta}`).join('; ')}
              </div>
            )}
            <div>
              <u>Erfolg:</u> {describeEffects(a.onSuccess)}
            </div>
            <div>
              <u>Misserfolg:</u> {describeEffects(a.onFailure)}
            </div>
            <div>
              <u>Begründungen:</u>
              <ul style={{ margin: 0 }}>
                {a.reasons.map((r) => (
                  <li key={r.id}>
                    ☐ {r.text} <span className="muted">[{r.valid ? 'gültig' : 'ungültig'}]</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="muted">Wissen: {a.knowledgeIds.map((id) => nodeById(id)?.label ?? id).join(', ')}</div>
          </div>
        ))}
      </div>

      <h3 style={{ margin: 0 }}>Ereigniskarten</h3>
      <div className="print-cards">
        {gameData.events.map((e) => (
          <div key={e.id} className="print-card">
            <strong>{e.title}</strong> <span className="muted">({e.caseId} {caseById(e.caseId)?.title})</span>
            <div>{e.text}</div>
            <div>
              <u>Gilt, wenn:</u> {describeConditions(e.when)}
            </div>
            {e.resist && (
              <div>
                <u>Gegenwehr:</u> {e.resist.label}, Ziel ≥ {e.resist.target}
              </div>
            )}
            <div>
              <u>Wirkung:</u> {describeEffects(e.effects)}
            </div>
            {e.resist && e.resistEffects && (
              <div>
                <u>Bei Abwehr:</u> {describeEffects(e.resistEffects)}
              </div>
            )}
            <div className="muted">
              Gewicht {e.weight} · Wissen: {e.knowledgeIds.map((id) => nodeById(id)?.label ?? id).join(', ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
