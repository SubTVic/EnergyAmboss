import { useMemo, useState } from 'react';
import { nodeById } from '../shared/content';
import { useFeedbackPayload, openFeedback } from '../shared/feedbackBus';
import { formatEuro } from '../shared/format';
import { readJson, removeKey, writeJson } from '../shared/storage';
import { DOMAIN_LABELS } from '../shared/types';
import { PageHeader, ResetDemoButton } from '../shared/ui';
import { decisionLog } from './data';
import { LinkGraph } from './LinkGraph';
import { affectedDepts, compareLinks, evOptions, logAfter, logBefore } from './logic';
import { LogView } from './LogView';
import { DEPT_LABELS, type Decision, type LogEntry, type MyDecision } from './types';

type Phase = 'link' | 'reveal' | 'decide' | 'done';

interface Draft {
  picks: string[];
  note: string;
  optionId: string | null;
  reason: string;
  p: number;
  pReason: string;
}

interface FState {
  index: number;
  phase: Phase;
  draft: Draft;
  mine: MyDecision[];
}

const KEY = 'f-state';
const emptyDraft = (): Draft => ({ picks: [], note: '', optionId: null, reason: '', p: 0.5, pReason: '' });
const initial = (): FState => ({ index: 0, phase: 'link', draft: emptyDraft(), mine: [] });

const STEPS: { phase: Phase; label: string }[] = [
  { phase: 'link', label: '1 Selbst verknüpfen' },
  { phase: 'reveal', label: '2 Zusammenhänge sehen' },
  { phase: 'decide', label: '3 Begründet entscheiden' },
];

export default function FRoutes() {
  const [state, setStateRaw] = useState<FState>(() => readJson<FState>(KEY, initial()));
  const setState = (patch: Partial<FState>) =>
    setStateRaw((prev) => {
      const next = { ...prev, ...patch };
      writeJson(KEY, next);
      return next;
    });
  const setDraft = (patch: Partial<Draft>) => setState({ draft: { ...state.draft, ...patch } });

  const { index, phase, draft, mine } = state;
  const decision = decisionLog.decisions[index];
  const entries = useMemo(
    () => (phase === 'done' ? logAfter(decisionLog, mine, index) : logBefore(decisionLog, mine, index)),
    [phase, mine, index],
  );
  const modelIds = decision.logLinks.map((l) => l.id);
  const comparison = phase === 'link' || phase === 'done' ? undefined : compareLinks(draft.picks, modelIds);
  const whyById = useMemo(() => new Map(decision.logLinks.map((l) => [l.id, l.why])), [decision]);

  useFeedbackPayload('f', { mine, current: decision.id, phase });

  const writeToLog = () => {
    if (!draft.optionId) return;
    const entry: MyDecision = {
      decisionId: decision.id,
      picks: draft.picks,
      note: draft.note,
      optionId: draft.optionId,
      reason: draft.reason,
      ...(decision.estimate ? { p: draft.p, pReason: draft.pReason } : {}),
    };
    setState({ phase: 'done', mine: [...mine.filter((m) => m.decisionId !== decision.id), entry] });
  };

  return (
    <div className="stack">
      <PageHeader
        title="F · Entscheiden mit dem Projektlog"
        lead={
          <>
            Ein Log mit allen Standortentscheidungen und ihren Begründungen. Vor jeder neuen Entscheidung verknüpfst du
            selbst, was damit zusammenhängt, und siehst erst danach, was die anderen Abteilungen dazu im Log haben. Kombiniert
            die Formen A–E: <span className="small muted">Log mit offenen Annahmen (B) · erst selbst verknüpfen, dann
            aufdecken (A) · Gegenspieler (D) · eigene Wahrscheinlichkeit (E) · Erwartungswert (C)</span>
          </>
        }
        actions={<ResetDemoButton onReset={() => { removeKey(KEY); setStateRaw(initial()); }} />}
      />

      <section className="box stack" style={{ borderWidth: 3 }}>
        <div className="flex" style={{ justifyContent: 'space-between' }}>
          <span className="small muted">
            {decisionLog.project} · Fläche {decisionLog.site} · Entscheidung {index + 1} von {decisionLog.decisions.length} ·{' '}
            {decision.date} · {DEPT_LABELS[decision.dept]}
          </span>
          <span className="flex small" style={{ gap: 8 }}>
            {STEPS.map((s) => (
              <span key={s.phase} style={{ fontWeight: s.phase === phase ? 700 : 400, color: s.phase === phase ? undefined : 'var(--muted)' }}>
                {s.label}
              </span>
            ))}
          </span>
        </div>
        <h3 style={{ margin: 0 }}>{decision.question}</h3>
        <p style={{ margin: 0 }}>{decision.situation}</p>
      </section>

      <div className="two-col">
        <section className="stack">
          <h3 style={{ margin: 0 }}>Projektlog</h3>
          <LogView
            entries={entries}
            picks={phase === 'link' ? draft.picks : undefined}
            onToggle={(id) => setDraft({ picks: draft.picks.includes(id) ? draft.picks.filter((x) => x !== id) : [...draft.picks, id] })}
            comparison={comparison}
            whyById={phase === 'reveal' || phase === 'decide' ? whyById : undefined}
            restsOn={phase === 'decide' ? decision.options.find((o) => o.id === draft.optionId)?.restsOn : undefined}
            freshId={phase === 'done' ? decision.id : undefined}
          />
        </section>

        <section className="stack">
          {phase === 'link' && <LinkStep draft={draft} setDraft={setDraft} onNext={() => setState({ phase: 'reveal' })} />}
          {phase === 'reveal' && comparison && (
            <RevealStep decision={decision} entries={entries} draft={draft} comparison={comparison} onNext={() => setState({ phase: 'decide' })} />
          )}
          {phase === 'decide' && (
            <DecideStep decision={decision} entries={entries} draft={draft} setDraft={setDraft} onSubmit={writeToLog} />
          )}
          {phase === 'done' && (
            <DoneStep
              decision={decision}
              entries={entries}
              mine={mine.find((m) => m.decisionId === decision.id)}
              hasNext={index + 1 < decisionLog.decisions.length}
              onNext={() => setState({ index: index + 1, phase: 'link', draft: emptyDraft() })}
            />
          )}
        </section>
      </div>

      {(phase === 'reveal' || phase === 'decide') && comparison && (
        <section className="stack">
          <h3 style={{ margin: 0 }}>Zusammenhangskarte</h3>
          <LinkGraph decision={decision} entries={entries} comparison={comparison} />
        </section>
      )}
    </div>
  );
}

function LinkStep({ draft, setDraft, onNext }: { draft: Draft; setDraft: (p: Partial<Draft>) => void; onNext: () => void }) {
  return (
    <div className="box stack">
      <h3 style={{ margin: 0 }}>Erst selbst verknüpfen</h3>
      <p style={{ margin: 0 }}>
        Welche bisherigen Entscheidungen im Log hängen mit dieser Entscheidung zusammen? Kreuze sie an, bevor du die
        Zusammenhänge siehst.
      </p>
      <p className="small muted" style={{ margin: 0 }}>
        {draft.picks.length === 0 ? 'Noch nichts angekreuzt.' : `${draft.picks.length} angekreuzt: ${draft.picks.map((p) => p.toUpperCase()).join(', ')}`}
      </p>
      <label>
        Was hängt noch dran, das nicht im Log steht? (optional)
        <textarea rows={2} value={draft.note} onChange={(e) => setDraft({ note: e.target.value })} placeholder="z. B. ein Kontakt, eine Frist, ein Akteur" />
      </label>
      <button onClick={onNext} disabled={draft.picks.length === 0}>
        Zusammenhänge aufdecken
      </button>
    </div>
  );
}

function RevealStep(p: { decision: Decision; entries: LogEntry[]; draft: Draft; comparison: ReturnType<typeof compareLinks>; onNext: () => void }) {
  const { decision, entries, draft, comparison } = p;
  const total = comparison.found.length + comparison.missed.length;
  const depts = affectedDepts(entries, [...decision.logLinks.map((l) => l.id), ...comparison.extra], decision.dept);
  return (
    <div className="box stack">
      <h3 style={{ margin: 0 }}>
        Du hast {comparison.found.length} von {total} Zusammenhängen im Log gefunden
      </h3>
      <p className="small" style={{ margin: 0 }}>
        Im Log steht jetzt bei jedem Eintrag, warum er dazugehört.{' '}
        {comparison.missed.length > 0 && <>Orange: übersehen ({comparison.missed.map((id) => id.toUpperCase()).join(', ')}). </>}
        {comparison.extra.length > 0 && (
          <>
            Gestrichelt: deine Verbindungen, die das Modell nicht kennt ({comparison.extra.map((id) => id.toUpperCase()).join(', ')}). Vielleicht
            siehst du etwas, was fehlt; begründe es gleich in deiner Entscheidung.
          </>
        )}
      </p>
      {draft.note.trim() && (
        <p className="small" style={{ margin: 0 }}>
          <strong>Deine eigene Verbindung:</strong> {draft.note.trim()}
        </p>
      )}

      <div className="stack">
        <strong>Wissen aus anderen Bereichen</strong>
        {decision.knowledgeLinks.map((l) => {
          const n = nodeById(l.id)!;
          return (
            <div key={l.id} className="small">
              <strong>{n.kind === 'akteur' ? `Gegenspieler: ${n.label}` : n.label}</strong>{' '}
              <span className="muted">({DOMAIN_LABELS[n.domain]})</span> {l.why}
            </div>
          );
        })}
      </div>

      {depts.length > 0 && (
        <div className="small">
          <strong>Wer muss davon wissen?</strong>{' '}
          {depts.map((d) => `${DEPT_LABELS[d.dept]} (${d.entryIds.map((id) => id.toUpperCase()).join(', ')})`).join(' · ')}
        </div>
      )}
      <button onClick={p.onNext}>Weiter: entscheiden</button>
    </div>
  );
}

function DecideStep(p: { decision: Decision; entries: LogEntry[]; draft: Draft; setDraft: (d: Partial<Draft>) => void; onSubmit: () => void }) {
  const { decision, entries, draft, setDraft } = p;
  const est = decision.estimate;
  const ev = est ? evOptions(est, draft.p) : null;
  const evOf = (optionId: string): number | null => {
    if (!est || !ev) return null;
    if (optionId === est.optionIds.now) return ev.now;
    if (optionId === est.optionIds.wait) return ev.wait;
    if (optionId === est.optionIds.giveUp) return ev.giveUp;
    return null;
  };
  const statusOf = (id: string) => {
    const e = entries.find((x) => x.id === id);
    return e?.assumptions.some((a) => a.status === 'widerlegt') ? 'widerlegt' : 'offen';
  };

  return (
    <div className="box stack">
      <h3 style={{ margin: 0 }}>Begründet entscheiden</h3>

      {est && ev && (
        <div className="stack">
          <label>
            {est.question} <strong>{Math.round(draft.p * 100)} %</strong>
            <input type="range" min={0} max={1} step={0.05} value={draft.p} onChange={(e) => setDraft({ p: Number(e.target.value) })} />
          </label>
          <label className="small">
            Warum so hoch oder so niedrig?
            <input value={draft.pReason} onChange={(e) => setDraft({ pReason: e.target.value })} />
          </label>
          <p className="small" style={{ margin: 0 }}>
            Eine verbindliche Zusage vor der Planung ist dir bei dieser Schätzung <strong>{formatEuro(ev.voi)}</strong> wert. Das
            Warten kostet {formatEuro(est.waitCost)} ({est.waitNote}). Bereits Bezahltes (Pacht seit 2022, Gutachten) zählt
            nicht mit, es ist in jeder Option weg.
          </p>
        </div>
      )}

      <fieldset className="stack">
        <legend>Deine Entscheidung</legend>
        {decision.options.map((o) => {
          const value = evOf(o.id);
          return (
            <label key={o.id} className="choice" style={{ alignItems: 'flex-start' }}>
              <input type="radio" name="option" checked={draft.optionId === o.id} onChange={() => setDraft({ optionId: o.id })} />
              <span>
                {o.label}
                {value !== null && <span className="small muted"> · Erwartungswert ab heute {formatEuro(value)}</span>}
                <br />
                <span className="small muted">
                  {o.restsOn.length === 0
                    ? 'ruht auf keiner offenen Annahme im Log'
                    : `ruht auf ${o.restsOn.map((id) => `${id.toUpperCase()} (${statusOf(id)})`).join(', ')}`}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <label>
        Deine Begründung (steht danach im Log, für alle Abteilungen sichtbar)
        <textarea rows={3} value={draft.reason} onChange={(e) => setDraft({ reason: e.target.value })} />
      </label>
      <button onClick={p.onSubmit} disabled={!draft.optionId || !draft.reason.trim()}>
        Ins Log schreiben
      </button>
    </div>
  );
}

function DoneStep(p: { decision: Decision; entries: LogEntry[]; mine?: MyDecision; hasNext: boolean; onNext: () => void }) {
  const option = p.decision.options.find((o) => o.id === p.mine?.optionId);
  const ids = [...p.decision.logLinks.map((l) => l.id), ...(p.mine?.picks ?? [])];
  const depts = affectedDepts(p.entries, [...new Set(ids)], p.decision.dept);
  return (
    <div className="box stack">
      <h3 style={{ margin: 0 }}>Im Log eingetragen</h3>
      <p className="small" style={{ margin: 0 }}>
        Dein Eintrag steht unten im Log, mit Begründung und den offenen Annahmen, auf denen er ruht. Die nächste Person, die
        hier entscheidet, sieht dein Warum.
      </p>
      {depts.length > 0 && (
        <p className="small" style={{ margin: 0 }}>
          <strong>Informiert:</strong> {depts.map((d) => DEPT_LABELS[d.dept]).join(', ')}
        </p>
      )}
      {option && (
        <div className="box dashed small">
          <strong>So könnte es weitergehen (fiktiv):</strong> {option.outlook}
        </div>
      )}
      {p.hasNext ? (
        <button onClick={p.onNext}>Nächste Entscheidung</button>
      ) : (
        <button onClick={openFeedback}>Fertig. Feedback geben</button>
      )}
    </div>
  );
}
