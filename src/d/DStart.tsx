import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatEuro } from '../shared/format';
import { gameData } from './data';
import { LEASE_PER_ROUND, MAX_ACTIONS, MAX_ROUNDS, START_BUDGET, newGame } from './engine';
import type { SavedGame } from './gameStore';
import { LLM_AVAILABLE } from './judge';

export function DStart({ game, onStart }: { game: SavedGame | null; onStart: (g: SavedGame) => void }) {
  const navigate = useNavigate();
  const [seed, setSeed] = useState(String(Math.floor(Math.random() * 100000)));
  const [llm, setLlm] = useState(false);

  function start() {
    const n = Number(seed);
    const s = Number.isFinite(n) && seed.trim() !== '' ? Math.floor(n) : Math.floor(Math.random() * 100000);
    onStart({ state: newGame(s, gameData), llm: LLM_AVAILABLE && llm, report: null, aar: {} });
    navigate('/d/spiel');
  }

  return (
    <div className="stack">
      <section className="box stack">
        <h3 style={{ margin: 0 }}>Regeln auf einer Seite</h3>
        <ul style={{ margin: 0 }}>
          <li>
            <strong>Ziel:</strong> Hole den <strong>Zuschlag in der EEG-Ausschreibung</strong> und eine <strong>verbindliche Netzzusage</strong>, bevor Runde {MAX_ROUNDS} endet
            (eine Runde = 6 Monate, also 6 Jahre) und bevor das Budget von {formatEuro(START_BUDGET)} (fiktiv) aufgebraucht ist.
          </li>
          <li>
            <strong>Pro Runde</strong> wählst du bis zu {MAX_ACTIONS} Aktionen. Jede Aktion hat Kosten und einen Zielwert: Du würfelst mit 2 Würfeln (2W6) und hast Erfolg bei
            Wurf ≥ Zielwert.
          </li>
          <li>
            <strong>Begründungen:</strong> Zu jeder Aktion wählst du bis zu 3 Begründungen. Jede gültige senkt den Zielwert um 1, jede ungültige hebt ihn um 1. So wird Querwissen
            belohnt. {LLM_AVAILABLE && 'Mit der KI-Spielleitung schreibst du die Begründung stattdessen frei.'}
          </li>
          <li>
            <strong>Ressourcen:</strong> Budget, Zeit, Kontakte (0–10; ab 7 gibt es +1 auf Aktionen mit Eigentümern und Gemeinde, denn Kontakte sind „immer was wert“) und Rückhalt in
            der Gemeinde (0–10).
          </li>
          <li>
            <strong>Pacht:</strong> Jede gesicherte Fläche kostet {formatEuro(LEASE_PER_ROUND)} pro Runde, auch wenn sie nie ausgewiesen wird. Verzögerungen kosten Pacht mit.
          </li>
          <li>
            <strong>Ausweisung:</strong> Die Regionalplanung weist verdeckt einzelne Flächen aus (Runde 5 und 7). Gutachten und Genehmigung brauchen eine gesicherte, ausgewiesene Fläche.
            Wer nur sichert, was am Ende nicht ausgewiesen wird, zahlt Pacht für nichts.
          </li>
          <li>
            <strong>Nach deinen Zügen</strong> macht die Welt einen Zug: Pacht, verzögerte Ergebnisse (das Gutachten braucht eine Brutperiode, also zwei Runden) und ein Ereignis
            aus dem Fallpaket (Konkurrent, Eigentümer, Netzbetreiber, Behörden, Gesetzgeber).
          </li>
          <li>
            <strong>Nachbesprechung:</strong> Am Ende siehst du, welche frühe Entscheidung welche späte Folge hatte, und welche Entscheidung am meisten gekostet hat.
          </li>
        </ul>
        <p className="small muted" style={{ margin: 0 }}>
          Alle Kosten und Wahrscheinlichkeiten sind fiktiv. Gleicher Seed und gleiche Entscheidungen ergeben denselben Verlauf. Ein Spiel dauert 20–30 Minuten. Es gibt auch eine
          <Link to="/d/karten"> druckbare Tischspiel-Variante</Link>.
        </p>
      </section>

      <section className="box stack" style={{ maxWidth: 520 }}>
        <h4 style={{ margin: 0 }}>Neues Spiel</h4>
        <label>
          Seed (gleicher Seed = gleiche Würfe und Ereignisse)
          <input value={seed} onChange={(e) => setSeed(e.target.value)} inputMode="numeric" />
        </label>
        {LLM_AVAILABLE && (
          <label className="choice">
            <input type="checkbox" checked={llm} onChange={(e) => setLlm(e.target.checked)} />
            <span>KI-Spielleitung (Begründungen frei schreiben)</span>
          </label>
        )}
        <div className="flex">
          <button onClick={start}>Spiel starten</button>
          {game && (
            <Link to={game.state.ended ? '/d/nachbesprechung' : '/d/spiel'} style={{ textDecoration: 'none' }}>
              <button className="btn-secondary">{game.state.ended ? 'Zur Nachbesprechung' : `Weiterspielen (Runde ${game.state.round})`}</button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
