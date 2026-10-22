import { DOMAIN_LABELS } from '../shared/types';
import { Pill } from '../shared/ui';
import type { LinkComparison } from './logic';
import { DEPT_LABELS, type LogEntry } from './types';

interface Props {
  entries: LogEntry[];
  /** Schritt 1: Einträge zum Ankreuzen */
  picks?: string[];
  onToggle?: (id: string) => void;
  /** Schritt 2: Abgleich mit dem Modell und Begründungen je Eintrag */
  comparison?: LinkComparison;
  whyById?: Map<string, string>;
  /** Schritt 3: Einträge, auf denen die gewählte Option ruht */
  restsOn?: string[];
  /** Nach dem Eintragen: der eigene neue Eintrag */
  freshId?: string;
}

const MARK = {
  found: { status: 'ok', label: 'gefunden' },
  missed: { status: 'open', label: 'übersehen' },
  extra: { status: 'entfallen', label: 'nicht im Modell' },
} as const;

function markOf(id: string, c?: LinkComparison): keyof typeof MARK | null {
  if (!c) return null;
  if (c.found.includes(id)) return 'found';
  if (c.missed.includes(id)) return 'missed';
  if (c.extra.includes(id)) return 'extra';
  return null;
}

/** Entscheidungslog: wer hat was wann entschieden, mit welcher Begründung, und worauf ruht es. */
export function LogView({ entries, picks, onToggle, comparison, whyById, restsOn, freshId }: Props) {
  return (
    <div className="stack">
      {entries.map((e) => {
        const mark = markOf(e.id, comparison);
        const why = whyById?.get(e.id);
        const highlighted = restsOn?.includes(e.id);
        const fresh = e.id === freshId;
        const borderColor =
          mark === 'found' ? 'var(--ok)' : mark === 'missed' || highlighted ? 'var(--open)' : fresh ? 'var(--ready)' : undefined;
        return (
          <div key={e.id} className={`box stack${mark === 'extra' ? ' dashed' : ''}`} style={{ borderColor, borderWidth: borderColor ? 3 : undefined }}>
            <div className="flex" style={{ justifyContent: 'space-between' }}>
              <div className="grow">
                <span className="mono">{e.id.toUpperCase()}</span> <span className="small muted">{e.date}</span>{' '}
                <strong>{e.title}</strong>
                <div className="small muted">
                  {e.mine ? 'Deine Entscheidung' : DEPT_LABELS[e.dept]} · {e.domains.map((d) => DOMAIN_LABELS[d]).join(', ')}
                </div>
              </div>
              {picks && onToggle && (
                <label className="choice small">
                  <input type="checkbox" checked={picks.includes(e.id)} onChange={() => onToggle(e.id)} />
                  <span>hängt zusammen</span>
                </label>
              )}
              {mark && <Pill status={MARK[mark].status}>{MARK[mark].label}</Pill>}
              {highlighted && !mark && <Pill status="open">Option ruht darauf</Pill>}
              {fresh && <Pill status="ready">neu</Pill>}
            </div>
            <ul className="small" style={{ margin: 0 }}>
              {e.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            {e.assumptions.length > 0 && (
              <div className="flex small" style={{ gap: 6 }}>
                {e.assumptions.map((a, i) => (
                  <span key={i}>
                    <Pill status={a.status}>{a.status}</Pill> {a.text}
                    {a.note && <span className="muted"> ({a.note})</span>}
                  </span>
                ))}
              </div>
            )}
            {why && (
              <p className="small" style={{ margin: 0, fontStyle: 'italic' }}>
                Zusammenhang: {why}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
