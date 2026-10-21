import { useState } from 'react';
import { getFeedbackPayload } from './feedbackBus';
import { store } from './store';
import { getTester, setTester } from './tester';

type Proto = 'a' | 'b' | 'c' | 'd' | 'e';

export const PROTO_NAMES: Record<Proto, string> = {
  a: 'A · Kreuzen',
  b: 'B · Beweisen',
  c: 'C · Rechnen',
  d: 'D · Spielen',
  e: 'E · Prognostizieren',
};

interface Props {
  proto: Proto;
  onClose: () => void;
}

/** Fragen aus dem Vergleichsraster des Konzeptdokuments. */
export function FeedbackModal({ proto, onClose }: Props) {
  const [tester, setTesterState] = useState(getTester());
  const [realism, setRealism] = useState<number | null>(null);
  const [aha, setAha] = useState('');
  const [wouldReturn, setWouldReturn] = useState<boolean | null>(null);
  const [pay, setPay] = useState('');
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit() {
    setState('sending');
    setTester(tester);
    try {
      await store.addFeedback({
        prototype: proto,
        tester: tester.trim() || null,
        realism,
        aha: aha.trim() || null,
        would_return: wouldReturn,
        willingness_to_pay: pay.trim() || null,
        comment: comment.trim() || null,
        payload: getFeedbackPayload(proto) ?? null,
      });
      setState('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState('error');
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal stack" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0 }}>Feedback zu {PROTO_NAMES[proto]}</h3>
        {store.mode === 'local' && (
          <p className="small muted" style={{ margin: 0 }}>
            Ohne Supabase-Verbindung wird das Feedback nur in diesem Browser gespeichert.
          </p>
        )}
        {state === 'done' ? (
          <>
            <p>Danke! Das Feedback ist gespeichert.</p>
            <button onClick={onClose}>Schließen</button>
          </>
        ) : (
          <>
            <label>
              Dein Kürzel
              <input value={tester} onChange={(e) => setTesterState(e.target.value)} placeholder="K1" />
            </label>
            <fieldset>
              <legend>Realismus: Stimmt das mit deiner Praxis überein?</legend>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="choice">
                    <input type="radio" name="realism" checked={realism === n} onChange={() => setRealism(n)} />
                    <span>{n}</span>
                  </label>
                ))}
                <span className="small muted">1 = gar nicht, 5 = genau so</span>
              </div>
            </fieldset>
            <label>
              Aha-Moment: Hat es dir eine Lücke oder Verbindung gezeigt, die du nicht auf dem Schirm hattest?
              <textarea rows={2} value={aha} onChange={(e) => setAha(e.target.value)} />
            </label>
            <fieldset>
              <legend>Wiederkehr: Würdest du es nächste Woche wieder öffnen?</legend>
              <div className="flex">
                <label className="choice">
                  <input type="radio" name="ret" checked={wouldReturn === true} onChange={() => setWouldReturn(true)} />
                  <span>ja</span>
                </label>
                <label className="choice">
                  <input type="radio" name="ret" checked={wouldReturn === false} onChange={() => setWouldReturn(false)} />
                  <span>nein</span>
                </label>
              </div>
            </fieldset>
            <label>
              Zahlungsbereitschaft: Wer würde dafür zahlen, und wie viel?
              <input value={pay} onChange={(e) => setPay(e.target.value)} />
            </label>
            <label>
              Kommentar: Welche Probleme sind dir aufgefallen? (Bitte Probleme und Nutzen nennen, keine Lösungen.)
              <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
            </label>
            {state === 'error' && <p style={{ color: 'var(--broken)' }}>Speichern fehlgeschlagen: {error}</p>}
            <div className="flex">
              <button onClick={submit} disabled={state === 'sending'}>
                {state === 'sending' ? 'Sende …' : 'Absenden'}
              </button>
              <button className="btn-secondary" onClick={onClose}>
                Abbrechen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
