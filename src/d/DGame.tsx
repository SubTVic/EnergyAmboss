import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { region } from '../shared/content';
import { formatEuro, formatPercent } from '../shared/format';
import { MusterregionMap } from '../shared/MusterregionMap';
import { Pill } from '../shared/ui';
import { gameData } from './data';
import {
  END_LABELS,
  MAX_ACTIONS,
  MAX_REASONS,
  MAX_ROUNDS,
  blockedReason,
  decisionId,
  effectiveTarget,
  playRound,
  successChance,
} from './engine';
import type { RoundReport, SavedGame } from './gameStore';
import { judgeReasoning, type Judgement } from './judge';
import type { ActionCard, ActionPick, GameState, SiteStatus } from './types';

interface PlanItem {
  key: number;
  actionId: string;
  site?: string;
  reasonIds: string[];
  text: string;
}

const SITE_FILL: Record<SiteStatus, string> = { frei: '#f2f2ef', gesichert: '#bbdefb', verloren: '#ffcdd2' };

const STATE_PILL: Record<string, string> = {
  keine: 'entfallen',
  angefragt: 'open',
  vage: 'open',
  zusage: 'ok',
  absage: 'broken',
  keins: 'entfallen',
  laeuft: 'open',
  fertig: 'ok',
  problem: 'broken',
  beantragt: 'open',
  erteilt: 'ok',
};

const cardOf = (id: string): ActionCard => gameData.actions.find((a) => a.id === id)!;

const pickOf = (item: PlanItem, llm: boolean): ActionPick => ({
  actionId: item.actionId,
  site: item.site,
  ...(llm ? {} : { reasonIds: item.reasonIds.slice(0, MAX_REASONS) }),
});

function Meter({ value, max = 10 }: { value: number; max?: number }) {
  return (
    <div className="bar-track" title={`${value} von ${max}`}>
      <div className="bar-fill" style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );
}

export function DGame({ game, onChange }: { game: SavedGame | null; onChange: (g: SavedGame | null) => void }) {
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [counter, setCounter] = useState(1);
  const [busy, setBusy] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  if (!game) return <Navigate to="/d" replace />;
  const state = game.state;
  const useLlm = game.llm && !fallback;
  const ended = state.ended;

  const secured = Object.values(state.sites).filter((s) => s.status === 'gesichert').length;

  function availability(card: ActionCard): string | null {
    if (card.needsSite) {
      const any = Object.values(state.sites).some((s) => s.status === card.needsSite);
      if (!any) return 'Keine passende Fläche mehr.';
      // Voraussetzungen ohne gewählte Fläche prüfen
      const why = blockedReason(state, card, Object.entries(state.sites).find(([, s]) => s.status === card.needsSite)![0]);
      return why;
    }
    return blockedReason(state, card);
  }

  function add(card: ActionCard) {
    if (plan.length >= MAX_ACTIONS) return;
    setPlan([...plan, { key: counter, actionId: card.id, reasonIds: [], text: '' }]);
    setCounter(counter + 1);
  }
  const update = (key: number, patch: Partial<PlanItem>) => setPlan(plan.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const remove = (key: number) => setPlan(plan.filter((p) => p.key !== key));

  function planProblem(item: PlanItem, index: number): string | null {
    const card = cardOf(item.actionId);
    const why = blockedReason(state, card, item.site);
    if (why) return why;
    const id = decisionId(card, item.site);
    if (plan.findIndex((p) => decisionId(cardOf(p.actionId), p.site) === id) !== index) return 'Doppelt gewählt.';
    return null;
  }
  const problems = plan.map(planProblem);
  const canPlay = !busy && !ended && problems.every((p) => p === null);

  async function finishRound() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      let judgements: (Judgement | null)[] = plan.map(() => null);
      if (useLlm) {
        try {
          judgements = await Promise.all(
            plan.map((item) => (item.text.trim() ? judgeReasoning(cardOf(item.actionId), state, item.text.trim()) : Promise.resolve(null))),
          );
        } catch {
          // zurück zum Listenmodus, ohne das Spiel zu blockieren
          setFallback(true);
          setNotice('Die KI-Spielleitung antwortet gerade nicht. Wähle deine Begründungen stattdessen aus der Liste und schließe die Runde erneut ab.');
          setBusy(false);
          return;
        }
      }
      const picks: ActionPick[] = plan.map((item, i) => ({
        ...pickOf(item, useLlm),
        ...(useLlm ? { llmValidReasons: judgements[i]?.validReasons ?? 0 } : {}),
      }));
      const before = state.log.length;
      const next: GameState = playRound(state, picks, gameData);
      const report: RoundReport = {
        round: state.round,
        entries: next.log.slice(before),
        picks: plan.map((item, i) => {
          const card = cardOf(item.actionId);
          return {
            label: card.label + (item.site ? ` ${item.site}` : ''),
            reasons: useLlm ? [] : item.reasonIds.map((id) => card.reasons.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r),
            feedback: judgements[i]?.feedback,
            missing: judgements[i]?.missing || undefined,
          };
        }),
      };
      onChange({ ...game!, state: next, report });
      setPlan([]);
      setFallback(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const sitesWith = (status: SiteStatus) => Object.entries(state.sites).filter(([, s]) => s.status === status).map(([id]) => id);

  return (
    <div className="stack">
      <div className="two-col">
        <section className="stack">
          <MusterregionMap
            fill={(id) => SITE_FILL[state.sites[id]?.status ?? 'frei']}
            caption={(id) => {
              const s = state.sites[id];
              return `${s.status}${s.designated ? ' ★' : ''}`;
            }}
            highlighted={(id) => state.sites[id]?.designated && state.sites[id].status !== 'verloren'}
            data={region}
          />
          <div className="legend">
            <span>
              <span className="swatch" style={{ background: SITE_FILL.frei }} /> frei
            </span>
            <span>
              <span className="swatch" style={{ background: SITE_FILL.gesichert }} /> gesichert (Pacht läuft)
            </span>
            <span>
              <span className="swatch" style={{ background: SITE_FILL.verloren }} /> verloren
            </span>
            <span>★ ausgewiesen (erst ab der Ausweisung sichtbar)</span>
          </div>
        </section>

        <section className="box stack">
          <div className="flex" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>
              Runde {Math.min(state.round, MAX_ROUNDS)} von {MAX_ROUNDS}
            </h3>
            <span className="small muted">{state.months} Monate vergangen</span>
          </div>
          <div className="flex" style={{ justifyContent: 'space-between' }}>
            <span>Budget</span>
            <strong style={{ color: state.budget < 300_000 ? 'var(--broken)' : undefined }}>{formatEuro(state.budget)}</strong>
          </div>
          <div>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <span>Kontakte</span>
              <span className="small">{state.contacts} / 10{state.contacts >= 7 ? ' (Bonus +1)' : ''}</span>
            </div>
            <Meter value={state.contacts} />
          </div>
          <div>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <span>Rückhalt in der Gemeinde</span>
              <span className="small">{state.support} / 10</span>
            </div>
            <Meter value={state.support} />
          </div>
          <div className="tag-list">
            <span>
              Netz <Pill status={STATE_PILL[state.grid]}>{state.grid}</Pill>
            </span>
            <span>
              Gutachten <Pill status={STATE_PILL[state.survey]}>{state.survey}</Pill>
            </span>
            <span>
              Genehmigung <Pill status={STATE_PILL[state.permit]}>{state.permit}</Pill>
            </span>
            <span>
              Zuschlag <Pill status={state.award ? 'ok' : 'entfallen'}>{state.award ? 'erteilt' : 'offen'}</Pill>
            </span>
          </div>
          <div className="small muted">
            {secured} gesicherte Fläche{secured === 1 ? '' : 'n'}. Unterwegs:{' '}
            {state.timers.length ? state.timers.map((t) => `${t.text} (Runde ${t.dueRound})`).join('; ') : 'nichts'}
          </div>
        </section>
      </div>

      {game.report && (
        <section className="box stack" style={{ background: '#fff6d6' }}>
          <div className="flex" style={{ justifyContent: 'space-between' }}>
            <h4 style={{ margin: 0 }}>Rundenbericht Runde {game.report.round}</h4>
            <button className="btn-small" onClick={() => onChange({ ...game, report: null })}>
              Ausblenden
            </button>
          </div>
          {game.report.picks.map((p, i) => (
            <div key={i} className="small">
              <strong>{p.label}:</strong>
              {p.reasons.length === 0 && !p.feedback && ' keine Begründung gewählt.'}
              {p.reasons.map((r, j) => (
                <div key={j}>
                  {r.valid ? '✓ gültig' : '✗ ungültig'}: „{r.text}“ <span className="muted">{r.why}</span>
                </div>
              ))}
              {p.feedback && <div>Spielleitung: {p.feedback}</div>}
              {p.missing && <div className="muted">Fehlendes Wissen: {p.missing}</div>}
            </div>
          ))}
          <ul style={{ margin: 0 }}>
            {game.report.entries.map((e, i) => (
              <li key={i}>
                {e.text}
                {e.budgetDelta ? <strong> · {formatEuro(e.budgetDelta)}</strong> : null}
                {e.monthsDelta ? <strong> · {e.monthsDelta > 0 ? '+' : ''}{e.monthsDelta} Monate</strong> : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {ended ? (
        <section className="box stack">
          <h3 style={{ margin: 0 }}>Spielende: {ended.reason === 'sieg' ? 'Geschafft!' : ended.reason === 'pleite' ? 'Pleite' : 'Zeit abgelaufen'}</h3>
          <p style={{ margin: 0 }}>
            {END_LABELS[ended.reason]} Budget am Ende: {formatEuro(state.budget)}, {state.months} Monate.
          </p>
          <div className="flex">
            <Link to="/d/nachbesprechung" style={{ textDecoration: 'none' }}>
              <button>Zur Nachbesprechung</button>
            </Link>
            <Link to="/d" style={{ textDecoration: 'none' }}>
              <button className="btn-secondary">Neues Spiel</button>
            </Link>
          </div>
        </section>
      ) : (
        <div className="two-col">
          <section className="stack">
            <h3 style={{ margin: 0 }}>Aktionen dieser Runde</h3>
            {gameData.actions.map((card) => {
              const blocked = availability(card);
              const base = effectiveTarget(state, card).target;
              return (
                <div key={card.id} className="box" style={{ opacity: blocked ? 0.6 : 1 }}>
                  <div className="flex" style={{ justifyContent: 'space-between' }}>
                    <strong>{card.label}</strong>
                    <span className="small">
                      {formatEuro(card.cost)} · Ziel ≥ {base} ({formatPercent(successChance(base))})
                    </span>
                  </div>
                  <div className="small muted">{card.summary}</div>
                  <div className="flex" style={{ marginTop: 4 }}>
                    <button className="btn-small" disabled={!!blocked || plan.length >= MAX_ACTIONS} onClick={() => add(card)}>
                      Wählen
                    </button>
                    {blocked && <span className="small muted">{blocked}</span>}
                  </div>
                </div>
              );
            })}
          </section>

          <section className="stack">
            <h3 style={{ margin: 0 }}>
              Dein Plan ({plan.length}/{MAX_ACTIONS})
            </h3>
            {plan.length === 0 && <p className="muted">Wähle bis zu {MAX_ACTIONS} Aktionen. Du kannst auch eine Runde aussetzen.</p>}
            {plan.map((item, i) => {
              const card = cardOf(item.actionId);
              const { target, parts } = effectiveTarget(state, card, pickOf(item, useLlm));
              return (
                <div key={item.key} className="box stack">
                  <div className="flex" style={{ justifyContent: 'space-between' }}>
                    <strong>{card.label}</strong>
                    <button className="btn-small btn-danger" onClick={() => remove(item.key)}>
                      Entfernen
                    </button>
                  </div>
                  {card.needsSite && (
                    <label>
                      Fläche
                      <select value={item.site ?? ''} onChange={(e) => update(item.key, { site: e.target.value || undefined })}>
                        <option value="">wählen …</option>
                        {sitesWith(card.needsSite).map((id) => (
                          <option key={id} value={id}>
                            {region.sites.find((s) => s.id === id)?.name ?? id}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="small">
                    Zielwert <strong>≥ {target}</strong> · Chance {formatPercent(successChance(target))} · Kosten {formatEuro(card.cost)}
                    <div className="muted">{parts.map((p) => `${p.label} ${p.delta > 0 ? '+' : ''}${p.delta}`).join(' · ')}</div>
                  </div>
                  {useLlm ? (
                    <label>
                      Deine Begründung (die Spielleitung bewertet sie gegen die Fakten)
                      <textarea rows={3} maxLength={600} value={item.text} onChange={(e) => update(item.key, { text: e.target.value })} />
                    </label>
                  ) : (
                    <fieldset>
                      <legend>Begründungen (höchstens {MAX_REASONS}): gültige senken den Zielwert, ungültige heben ihn</legend>
                      {card.reasons.map((r) => {
                        const checked = item.reasonIds.includes(r.id);
                        return (
                          <label key={r.id} className="choice" style={{ display: 'flex', margin: '4px 0' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!checked && item.reasonIds.length >= MAX_REASONS}
                              onChange={() =>
                                update(item.key, { reasonIds: checked ? item.reasonIds.filter((x) => x !== r.id) : [...item.reasonIds, r.id] })
                              }
                            />
                            <span>{r.text}</span>
                          </label>
                        );
                      })}
                    </fieldset>
                  )}
                  {problems[i] && <div className="small" style={{ color: 'var(--broken)' }}>{problems[i]}</div>}
                </div>
              );
            })}
            {notice && <p className="box small" style={{ margin: 0, borderColor: 'var(--open)' }}>{notice}</p>}
            {error && <p className="small" style={{ color: 'var(--broken)', margin: 0 }}>{error}</p>}
            <div>
              <button onClick={finishRound} disabled={!canPlay}>
                {busy ? 'Spielleitung bewertet …' : plan.length ? 'Runde abschließen' : 'Runde aussetzen'}
              </button>
            </div>
          </section>
        </div>
      )}

      <details className="box">
        <summary>Logbuch ({state.log.length} Einträge)</summary>
        <ul style={{ margin: '8px 0 0' }}>
          {[...state.log].reverse().map((e, i) => (
            <li key={i} className="small">
              <span className="mono">R{e.round}</span> {e.text}
              {e.budgetDelta ? ` · ${formatEuro(e.budgetDelta)}` : ''}
              {e.monthsDelta ? ` · ${e.monthsDelta > 0 ? '+' : ''}${e.monthsDelta} Monate` : ''}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
