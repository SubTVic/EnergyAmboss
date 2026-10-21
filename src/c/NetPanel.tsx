import { formatPercent } from '../shared/format';
import { STAGE_LABELS, type Clause, type Stage } from './calc';

interface Props {
  k: Stage;
  clause: Clause;
  accuracy: number;
  onChange: (patch: { k?: Stage; clause?: Clause; accuracy?: number }) => void;
}

/** Panel „Netz-Klarheit“: Zeitpunkt, Rücktrittsklausel, Trefferquote einer Vorhersage. */
export function NetPanel({ k, clause, accuracy, onChange }: Props) {
  return (
    <section className="box stack">
      <h3 style={{ margin: 0 }}>Netz-Klarheit</h3>
      <fieldset>
        <legend>Wann bekommst du Klarheit über den Netzanschluss?</legend>
        <div className="flex">
          {([0, 1, 2, 3] as Stage[]).map((s) => (
            <label key={s} className="choice">
              <input type="radio" name="stage" checked={k === s} onChange={() => onChange({ k: s })} />
              <span>{STAGE_LABELS[s]}</span>
            </label>
          ))}
        </div>
        <p className="small muted" style={{ margin: 0 }}>
          Je später die Klarheit kommt, desto mehr ist schon ausgegeben und desto geringer der Erwartungswert. Nach der
          Genehmigung entspricht das Fall F1.
        </p>
      </fieldset>

      <div className="stack">
        <label className="choice">
          <input type="checkbox" checked={clause.active} onChange={(e) => onChange({ clause: { ...clause, active: e.target.checked } })} />
          <span>Rücktrittsklausel bei negativer Netzzusage (Restpacht entfällt)</span>
        </label>
        {clause.active && (
          <div className="flex small">
            {clause.years.map((t, i) => (
              <label key={i} style={{ width: 150 }}>
                Rücktritt nach Stufe {i + 1} (Jahre)
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={t}
                  onChange={(e) => {
                    const years = [...clause.years] as Clause['years'];
                    years[i] = Number(e.target.value);
                    onChange({ clause: { ...clause, years } });
                  }}
                />
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex" style={{ justifyContent: 'space-between' }}>
          <span>Trefferquote einer Netz-Vorhersage vor dem Start</span>
          <strong>{formatPercent(accuracy)}</strong>
        </div>
        <input type="range" min={50} max={100} step={1} value={Math.round(accuracy * 100)} onChange={(e) => onChange({ accuracy: Number(e.target.value) / 100 })} />
        <p className="small muted" style={{ margin: 0 }}>
          50 % ist Raten und wertlos, 100 % ist eine sichere Auskunft.
        </p>
      </div>
    </section>
  );
}
