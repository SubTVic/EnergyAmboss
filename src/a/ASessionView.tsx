import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { caseById, nodeById } from '../shared/content';
import { DOMAIN_LABELS, DOMAINS, type Domain } from '../shared/types';
import { Unverified } from '../shared/ui';
import { KnowledgeMap } from './KnowledgeMap';
import { questionById } from './data';
import { retriesFor, scoreAnswer } from './logic';
import type { ASession } from './session';
import { SCT_ANSWERS, SCT_LABELS, type Answer, type Cascade, type Question, type Sct, type SctAnswer, type SingleBest } from './types';

interface Props {
  session: ASession | null;
  onChange: (s: ASession | null) => void;
}

export function ASessionView({ session, onChange }: Props) {
  const navigate = useNavigate();
  // lokale Auswahl vor dem Absenden
  const [single, setSingle] = useState<string | null>(null);
  const [sct, setSct] = useState<SctAnswer | null>(null);
  const [domains, setDomains] = useState<Domain[]>([]);

  if (!session) return <Navigate to="/a" replace />;
  if (session.index >= session.items.length) return <Navigate to="/a/ergebnis" replace />;

  const item = session.items[session.index];
  const q = questionById(item.questionId);
  if (!q) return <p>Frage nicht gefunden.</p>;
  const result = session.results[session.index]; // vorhanden = schon beantwortet

  const ready = q.type === 'single' ? single !== null : q.type === 'sct' ? sct !== null : domains.length === 3;

  function submit() {
    if (!q || !session) return;
    const answer: Answer =
      q.type === 'single' ? { type: 'single', optionId: single! } : q.type === 'sct' ? { type: 'sct', value: sct! } : { type: 'cascade', domains };
    const panel = q.type === 'sct' ? session.panels[q.id]?.panel : undefined;
    const score = scoreAnswer(q, answer, panel);
    onChange({ ...session, results: [...session.results, { questionId: q.id, retry: item.retry, answer, ...score }] });
  }

  function next() {
    if (!session) return;
    let items = session.items;
    if (session.index + 1 >= items.length) {
      // Ende der Session: falsch beantwortete Fragen einmal wiederholen
      items = [...items, ...retriesFor(session.results, items)];
    }
    setSingle(null);
    setSct(null);
    setDomains([]);
    const index = session.index + 1;
    onChange({ ...session, items, index });
    if (index >= items.length) navigate('/a/ergebnis');
  }

  return (
    <div className="stack">
      <div className="flex" style={{ justifyContent: 'space-between' }}>
        <span>
          Frage {session.index + 1} von {session.items.length}
          {item.retry && <span className="pill" style={{ marginLeft: 8 }}>Wiederholung</span>}
        </span>
        <span className="small muted">
          Fall {q.caseId} {caseById(q.caseId)?.title} · Bereiche: {q.domains.map((d) => DOMAIN_LABELS[d]).join(', ')} <Unverified show={q.verify} />
        </span>
      </div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${(session.index / session.items.length) * 100}%` }} />
      </div>

      <section className="box stack">
        {q.type === 'single' && (
          <SingleQuestion q={q} order={item.optionOrder} chosen={result ? (result.answer.type === 'single' ? result.answer.optionId : null) : single} onChoose={setSingle} revealed={!!result} />
        )}
        {q.type === 'sct' && (
          <SctQuestion
            q={q}
            chosen={result ? (result.answer.type === 'sct' ? result.answer.value : null) : sct}
            onChoose={setSct}
            revealed={!!result}
            panel={session.panels[q.id]}
          />
        )}
        {q.type === 'cascade' && (
          <CascadeQuestion
            q={q}
            chosen={result ? (result.answer.type === 'cascade' ? result.answer.domains : []) : domains}
            onToggle={(d) => setDomains((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : cur.length < 3 ? [...cur, d] : cur))}
            revealed={!!result}
          />
        )}

        {!result ? (
          <div>
            <button onClick={submit} disabled={!ready}>
              Antwort absenden
            </button>
          </div>
        ) : (
          <div className="stack">
            <div>
              <strong>
                {result.points === result.max ? 'Richtig' : result.points > 0 ? `Teilweise richtig` : 'Leider falsch'}: {result.points.toLocaleString('de-DE', { maximumFractionDigits: 2 })} von {result.max} Punkt
                {result.max === 1 ? '' : 'en'}
              </strong>
            </div>
            <ExplanationExtra q={q} />
          </div>
        )}
      </section>

      {result && (
        <>
          <section className="stack">
            <h4 style={{ margin: 0 }}>Wissenskarte</h4>
            <KnowledgeMap question={q} />
            <div className="tag-list small">
              {q.nodeIds.map((id) => (
                <Link key={id} to={`/a/bibliothek?node=${id}`}>
                  {nodeById(id)?.label ?? id}
                </Link>
              ))}
            </div>
          </section>
          <div>
            <button onClick={next}>{session.index + 1 >= session.items.length ? 'Session beenden' : 'Nächste Frage'}</button>
          </div>
        </>
      )}
    </div>
  );
}

function ExplanationExtra({ q }: { q: Question }) {
  if (q.type === 'single') return null; // Erklärungen stehen bei den Optionen
  return <div className="box dashed">{q.explanation}</div>;
}

function SingleQuestion({
  q,
  order,
  chosen,
  onChoose,
  revealed,
}: {
  q: SingleBest;
  order?: string[];
  chosen: string | null;
  onChoose: (id: string) => void;
  revealed: boolean;
}) {
  const options = order ? order.map((id) => q.options.find((o) => o.id === id)!) : q.options;
  return (
    <>
      <p style={{ margin: 0, fontSize: '1.15rem' }}>{q.stem}</p>
      <div className="stack">
        {options.map((o, i) => {
          const isChosen = chosen === o.id;
          return (
            <div key={o.id} className="box" style={{ borderColor: revealed ? (o.correct ? 'var(--ok)' : isChosen ? 'var(--broken)' : undefined) : isChosen ? 'var(--ready)' : undefined }}>
              <label className="choice" style={{ display: 'flex' }}>
                <input type="radio" name="single" disabled={revealed} checked={isChosen} onChange={() => onChoose(o.id)} />
                <span>
                  <strong>{String.fromCharCode(65 + i)}.</strong> {o.text}
                </span>
              </label>
              {revealed && (
                <div className="small" style={{ marginTop: 4 }}>
                  <strong style={{ color: o.correct ? 'var(--ok)' : isChosen ? 'var(--broken)' : undefined }}>{o.correct ? '✓ richtig. ' : isChosen ? '✗ deine Wahl. ' : '✗ falsch. '}</strong>
                  {o.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function SctQuestion({
  q,
  chosen,
  onChoose,
  revealed,
  panel,
}: {
  q: Sct;
  chosen: SctAnswer | null;
  onChoose: (v: SctAnswer) => void;
  revealed: boolean;
  panel?: { panel: number[]; placeholder: boolean; experts: number };
}) {
  const max = Math.max(1, ...(panel?.panel ?? q.seedPanel));
  return (
    <>
      <p className="small muted" style={{ margin: 0 }}>
        Was ändert sich? Wie verändert die neue Information die Annahme?
      </p>
      <p style={{ margin: 0 }}>
        <strong>Annahme:</strong> {q.hypothesis}
      </p>
      <p style={{ margin: 0 }}>
        <strong>Neue Information:</strong> {q.newInfo}
      </p>
      <fieldset>
        <legend>Die Annahme wird …</legend>
        <div className="flex">
          {SCT_ANSWERS.map((v) => (
            <label key={v} className="choice">
              <input type="radio" name="sct" disabled={revealed} checked={chosen === v} onChange={() => onChoose(v)} />
              <span>
                {v > 0 ? `+${v}` : v} {SCT_LABELS[v]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {revealed && panel && (
        <div className="stack">
          <strong className="small">
            Antworten des Panels{panel.placeholder ? ' (Platzhalter-Panel mit erfundenen Anzahlen; echtes Panel ab 5 Experten)' : ` (${panel.experts} Experten)`}
          </strong>
          {SCT_ANSWERS.map((v) => (
            <div key={v} className="flex small" style={{ flexWrap: 'nowrap' }}>
              <span style={{ width: 150 }}>
                {v > 0 ? `+${v}` : v} {SCT_LABELS[v]}
                {chosen === v ? ' ← du' : ''}
              </span>
              <div className="bar-track" style={{ flex: 1 }}>
                <div className="bar-fill" style={{ width: `${(panel.panel[v + 2] / max) * 100}%`, background: chosen === v ? 'var(--ready)' : undefined }} />
              </div>
              <span style={{ width: 24 }}>{panel.panel[v + 2]}</span>
            </div>
          ))}
          <span className="small muted">Volle Punkte gibt die häufigste Antwort, die anderen anteilig.</span>
        </div>
      )}
    </>
  );
}

function CascadeQuestion({ q, chosen, onToggle, revealed }: { q: Cascade; chosen: Domain[]; onToggle: (d: Domain) => void; revealed: boolean }) {
  return (
    <>
      <p style={{ margin: 0, fontSize: '1.15rem' }}>{q.stem}</p>
      <fieldset>
        <legend>Wähle genau drei Bereiche ({chosen.length}/3)</legend>
        <div className="flex">
          {DOMAINS.map((d) => {
            const isChosen = chosen.includes(d);
            const correct = q.correctDomains.includes(d);
            return (
              <label key={d} className="choice" style={{ color: revealed ? (correct ? 'var(--ok)' : isChosen ? 'var(--broken)' : undefined) : undefined }}>
                <input type="checkbox" disabled={revealed || (!isChosen && chosen.length >= 3)} checked={isChosen} onChange={() => onToggle(d)} />
                <span>
                  {DOMAIN_LABELS[d]}
                  {revealed && (correct ? ' ✓' : isChosen ? ' ✗' : '')}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </>
  );
}
