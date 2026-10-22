import { useState } from 'react';
import { openFeedback, useFeedbackPayload } from '../shared/feedbackBus';
import { readJson, removeKey, writeJson } from '../shared/storage';
import { PageHeader, Pill, ResetDemoButton } from '../shared/ui';
import { decisionLog } from './data';
import { compareLinks, whoToInform } from './logic';

interface FState {
  picks: string[];
  revealed: boolean;
  option: string | null;
  reason: string;
  done: boolean;
}

const KEY = 'f-einfach'; // neuer Schlüssel, damit ein Stand der früheren Fassung nicht stört
const initial = (): FState => ({ picks: [], revealed: false, option: null, reason: '', done: false });

const { project, log, decision } = decisionLog;
const linkIds = decision.links.map((l) => l.id);
const whyOf = new Map(decision.links.map((l) => [l.id, l.why]));

export default function FRoutes() {
  const [state, setStateRaw] = useState<FState>(() => readJson<FState>(KEY, initial()));
  const setState = (patch: Partial<FState>) =>
    setStateRaw((prev) => {
      const next = { ...prev, ...patch };
      writeJson(KEY, next);
      return next;
    });
  const { picks, revealed, option, reason, done } = state;
  const result = revealed ? compareLinks(picks, linkIds) : null;
  const inform = whoToInform(log, linkIds, decision.who);

  useFeedbackPayload('f', state);

  const toggle = (id: string) => {
    if (revealed) return;
    setState({ picks: picks.includes(id) ? picks.filter((x) => x !== id) : [...picks, id] });
  };

  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <PageHeader
        title="F · Entscheiden mit dem Projektlog"
        lead="Bevor du entscheidest: Was haben die anderen Abteilungen schon entschieden, das hier mit reinspielt?"
        actions={
          <ResetDemoButton
            onReset={() => {
              removeKey(KEY);
              setStateRaw(initial());
            }}
          />
        }
      />

      <section className="box stack" style={{ borderWidth: 3 }}>
        <span className="small muted">
          {project} · {decision.date} · Neue Entscheidung
        </span>
        <h3 style={{ margin: 0 }}>{decision.question}</h3>
        {!revealed && (
          <p style={{ margin: 0 }}>
            <strong>Schritt 1:</strong> Welche bisherigen Entscheidungen hängen damit zusammen? Tippe sie unten an.
          </p>
        )}
        {result && (
          <>
            <p style={{ margin: 0 }}>
              Du hast <strong>{result.found.length} von {linkIds.length}</strong> Zusammenhängen gefunden. Unten steht bei
              jedem, warum.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Wer muss Bescheid wissen:</strong> {inform.join(', ')}
            </p>
          </>
        )}
      </section>

      <h3 style={{ margin: 0 }}>Was bisher entschieden wurde</h3>
      {log.map((e) => {
        const picked = picks.includes(e.id);
        const linked = linkIds.includes(e.id);
        const color = !revealed ? (picked ? 'var(--ready)' : undefined) : linked ? (picked ? 'var(--ok)' : 'var(--open)') : undefined;
        return (
          <div
            key={e.id}
            className="box"
            onClick={() => toggle(e.id)}
            style={{ cursor: revealed ? 'default' : 'pointer', borderColor: color, borderWidth: color ? 3 : undefined }}
          >
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <span className="small muted">
                {e.date} · {e.who}
              </span>
              {!revealed && picked && <Pill status="ready">angetippt</Pill>}
              {revealed && linked && picked && <Pill status="ok">gefunden</Pill>}
              {revealed && linked && !picked && <Pill status="open">übersehen</Pill>}
              {revealed && !linked && picked && <Pill status="entfallen">hängt nicht direkt zusammen</Pill>}
            </div>
            <strong>{e.what}</strong>
            <div className="small">Warum: {e.why}</div>
            {revealed && linked && (
              <div className="small" style={{ marginTop: 6 }}>
                <strong>Zusammenhang:</strong> {whyOf.get(e.id)}
              </div>
            )}
          </div>
        );
      })}

      {done && option && (
        <div className="box" style={{ borderColor: 'var(--ready)', borderWidth: 3 }}>
          <div className="flex" style={{ justifyContent: 'space-between' }}>
            <span className="small muted">
              {decision.date} · Du ({decision.who})
            </span>
            <Pill status="ready">neu</Pill>
          </div>
          <strong>{option}</strong>
          <div className="small">Warum: {reason}</div>
        </div>
      )}

      {!revealed && (
        <button onClick={() => setState({ revealed: true })} disabled={picks.length === 0}>
          Auflösen
        </button>
      )}

      {revealed && !done && (
        <section className="box stack">
          <p style={{ margin: 0 }}>
            <strong>Schritt 2:</strong> Wie entscheidest du, und warum?
          </p>
          {decision.options.map((o) => (
            <div key={o}>
              <label className="choice">
                <input type="radio" name="option" checked={option === o} onChange={() => setState({ option: o })} />
                <span>{o}</span>
              </label>
            </div>
          ))}
          <label>
            Warum?
            <textarea rows={2} value={reason} onChange={(e) => setState({ reason: e.target.value })} />
          </label>
          <button onClick={() => setState({ done: true })} disabled={!option || !reason.trim()}>
            Ins Log schreiben
          </button>
        </section>
      )}

      {done && (
        <section className="box dashed stack">
          <p style={{ margin: 0 }}>
            Deine Entscheidung steht jetzt im Log. Wer hier als Nächstes entscheidet, sieht dein Warum. {inform.join(', ')}{' '}
            {inform.length === 1 ? 'wird' : 'werden'} informiert.
          </p>
          <button onClick={openFeedback}>Feedback geben</button>
        </section>
      )}
    </div>
  );
}
