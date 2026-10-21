import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { caseById } from '../shared/content';
import { store, type PanelRow } from '../shared/store';
import { questions } from './data';
import { SCT_ANSWERS, SCT_LABELS, type Sct, type SctAnswer } from './types';

/** Expertenmodus: nur SCT-Fragen, ohne Erklärungen. Speichert in sct_panel (`?expert=Name`). */
export function APanel() {
  const [params] = useSearchParams();
  const [expert, setExpert] = useState(params.get('expert') ?? '');
  const [answers, setAnswers] = useState<Record<string, SctAnswer>>({});
  const [rows, setRows] = useState<PanelRow[]>([]);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  const sctQuestions = useMemo(() => questions.filter((q): q is Sct => q.type === 'sct'), []);

  useEffect(() => {
    store.listPanel().then(setRows).catch(() => setRows([]));
  }, [state]);

  const countFor = (id: string) => new Set(rows.filter((r) => r.item_id === id).map((r) => r.expert)).size;
  const answeredCount = Object.keys(answers).length;

  async function save() {
    if (!expert.trim()) {
      setError('Bitte gib deinen Namen oder ein Kürzel ein.');
      setState('error');
      return;
    }
    setState('saving');
    try {
      for (const [item_id, value] of Object.entries(answers)) await store.addPanelAnswer({ item_id, expert: expert.trim(), value });
      setAnswers({});
      setState('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState('error');
    }
  }

  return (
    <div className="stack">
      <section className="box stack">
        <h3 style={{ margin: 0 }}>Panel-Modus für Expertinnen und Experten</h3>
        <p style={{ margin: 0 }}>
          Beurteile, wie die neue Information die Annahme verändert (−2 stark geschwächt … +2 stark gestärkt). Erklärungen gibt es hier nicht, damit nichts abfärbt. Die häufigste Antwort
          des Panels gibt später volle Punkte; ab 5 Experten ersetzt das echte Panel das Platzhalter-Panel.
        </p>
        <label style={{ maxWidth: 320 }}>
          Dein Name oder Kürzel
          <input value={expert} onChange={(e) => setExpert(e.target.value)} placeholder="z. B. Projektierer 1" />
        </label>
      </section>

      {sctQuestions.map((q, i) => (
        <section key={q.id} className="box stack">
          <div className="small muted">
            Frage {i + 1} von {sctQuestions.length} · {q.caseId} {caseById(q.caseId)?.title} · {countFor(q.id)} Experten bisher
          </div>
          <div>
            <strong>Annahme:</strong> {q.hypothesis}
          </div>
          <div>
            <strong>Neue Information:</strong> {q.newInfo}
          </div>
          <div className="flex">
            {SCT_ANSWERS.map((v) => (
              <label key={v} className="choice">
                <input type="radio" name={q.id} checked={answers[q.id] === v} onChange={() => setAnswers((a) => ({ ...a, [q.id]: v }))} />
                <span>
                  {v > 0 ? `+${v}` : v} {SCT_LABELS[v]}
                </span>
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="flex">
        <button onClick={save} disabled={state === 'saving' || answeredCount === 0}>
          {answeredCount} {answeredCount === 1 ? 'Antwort' : 'Antworten'} speichern
        </button>
        {state === 'saved' && <span style={{ color: 'var(--ok)' }}>Gespeichert. Danke!</span>}
        {state === 'error' && <span style={{ color: 'var(--broken)' }}>{error}</span>}
      </div>
    </div>
  );
}
