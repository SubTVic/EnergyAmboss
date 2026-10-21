import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { caseById, region } from '../shared/content';
import { formatEuroShort, formatPercent } from '../shared/format';
import {
  PROB_KEYS,
  PROB_LABELS,
  STAGE_LABELS,
  ampelTotal,
  ev,
  pSuccess,
  stageCosts,
  toInput,
  tornado,
  voi,
  type Clause,
  type ProbKey,
  type Site,
  type Stage,
} from './calc';

interface Props {
  site: Site;
  k: Stage;
  clause: Clause;
  accuracy: number;
  onChange: (update: (s: Site) => Site) => void;
}

const AMPEL_PILL = { rot: 'broken', gelb: 'open', gruen: 'ok' } as const;

function NumberField({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  return (
    <label style={{ width: 170 }}>
      {label}
      <input type="number" min={0} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/** Flächen-Steckbrief: Regler je Risiko-Element, Kosten, Erwartungswert, Informationswert, Tornado. */
export function SiteSheet({ site, k, clause, accuracy, onChange }: Props) {
  const input = toInput(site);
  const costs = stageCosts(input);
  const p = pSuccess(site);
  const geo = region.sites.find((s) => s.id === site.id);
  const bars = tornado(site, k, clause);
  const base = ev(input, k, clause);
  const tornadoData = bars.map((b) => ({ name: b.label.replace(/ \(.*\)/, ''), min: b.min, range: b.span }));

  const setP = (key: ProbKey, value: number) => onChange((s) => ({ ...s, p: { ...s.p, [key]: value } }));
  const setReason = (key: ProbKey, text: string) => onChange((s) => ({ ...s, reasons: { ...s.reasons, [key]: text } }));
  const setNum = (field: 'leasePerYear' | 'leaseYears' | 'survey' | 'planning' | 'value', value: number) =>
    onChange((s) => ({ ...s, [field]: value }));

  return (
    <section className="box stack">
      <div className="flex" style={{ justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0 }}>
          Steckbrief {site.id}
          {geo ? ` · ${geo.name.split(' · ')[1] ?? ''}` : ''}
        </h3>
        <span className="pill verify">fiktive Schätzwerte</span>
      </div>
      {geo && geo.caseIds.length > 0 && (
        <p className="small muted" style={{ margin: 0 }}>
          Fallbezug: {geo.caseIds.map((id) => `${id} ${caseById(id)?.title ?? ''}`).join(', ')}
        </p>
      )}

      <div className="two-col">
        <div className="stack">
          <h4 style={{ margin: 0 }}>Wahrscheinlichkeiten</h4>
          {PROB_KEYS.map((key) => (
            <div key={key} className="stack" style={{ marginTop: 6 }}>
              <div className="flex" style={{ justifyContent: 'space-between' }}>
                <span>{PROB_LABELS[key]}</span>
                <strong>{formatPercent(site.p[key])}</strong>
              </div>
              <input type="range" min={0} max={100} step={1} value={Math.round(site.p[key] * 100)} onChange={(e) => setP(key, Number(e.target.value) / 100)} />
              <input
                placeholder="Begründung (kurz)"
                value={site.reasons[key] ?? ''}
                onChange={(e) => setReason(key, e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          ))}
          <p className="small muted" style={{ margin: 0 }}>
            Hinweis: Die Faktoren sind nicht unabhängig. Die Regionalplanung prüft Naturschutz schon bei der Ausweisung, das
            beeinflusst auch die Genehmigung. Das Produkt ist deshalb nur eine Näherung.
          </p>
        </div>

        <div className="stack">
          <h4 style={{ margin: 0 }}>Kosten und Wert</h4>
          <div className="flex">
            <NumberField label="Pacht pro Jahr (L)" value={site.leasePerYear} step={5000} onChange={(v) => setNum('leasePerYear', v)} />
            <NumberField label="Laufzeit in Jahren (T)" value={site.leaseYears} step={1} onChange={(v) => setNum('leaseYears', v)} />
            <NumberField label="Gutachten (G)" value={site.survey} step={10000} onChange={(v) => setNum('survey', v)} />
            <NumberField label="Planung bis Genehmigung (P)" value={site.planning} step={10000} onChange={(v) => setNum('planning', v)} />
            <NumberField label="Wert bei Erfolg (V)" value={site.value} step={100000} onChange={(v) => setNum('value', v)} />
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Stufenbaum: Pacht {formatEuroShort(costs.c1)} → Gutachten {formatEuroShort(costs.c2)} → Planung {formatEuroShort(costs.c3)} = Kosten bis zur
            Genehmigung {formatEuroShort(costs.total)}.
          </p>

          <div className="box dashed stack">
            <div>
              P(Erfolg): <span className={`pill ${AMPEL_PILL[ampelTotal(p)]}`}>{formatPercent(p, 1)}</span>
            </div>
            <div>
              Erwartungswert (Netz-Klarheit {STAGE_LABELS[k]}): <strong>{formatEuroShort(base)}</strong>
            </div>
            <div>
              Wert einer Netz-Vorhersage ({formatPercent(accuracy)} Trefferquote): <strong>{formatEuroShort(voi(input, k, clause, accuracy))}</strong>
            </div>
            <div>
              Wert einer sicheren Netzauskunft: <strong>{formatEuroShort(voi(input, k, clause, 1))}</strong>
            </div>
          </div>

          <table className="simple">
            <thead>
              <tr>
                <th>Netz-Klarheit</th>
                <th className="right">EV ohne Klausel</th>
                <th className="right">EV mit Klausel</th>
              </tr>
            </thead>
            <tbody>
              {([0, 1, 2, 3] as Stage[]).map((s) => (
                <tr key={s} className={s === k ? 'selected' : ''}>
                  <td>{STAGE_LABELS[s]}</td>
                  <td className="right">{formatEuroShort(ev(input, s, { ...clause, active: false }))}</td>
                  <td className="right">{formatEuroShort(ev(input, s, { ...clause, active: true }))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="stack">
        <h4 style={{ margin: 0 }}>Sensitivität: welche Wahrscheinlichkeit bewegt den EV am stärksten?</h4>
        <p className="small muted" style={{ margin: 0 }}>
          Jede Wahrscheinlichkeit wird um ±20 Prozentpunkte verändert (begrenzt auf 0…100 %); der Balken zeigt die Spanne des Erwartungswerts.
        </p>
        <div style={{ height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={tornadoData} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={(v: number) => formatEuroShort(v)} />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip formatter={(v) => formatEuroShort(Number(v))} />
              <Bar dataKey="min" stackId="a" fill="transparent" isAnimationActive={false} />
              <Bar dataKey="range" stackId="a" fill="#41403e" name="Spanne" isAnimationActive={false} />
              <ReferenceLine x={base} stroke="#c62828" strokeDasharray="4 4" label={{ value: 'jetzt', position: 'top', fill: '#c62828' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
