import { formatEuroShort, formatNumber, formatPercent } from '../shared/format';
import { ampelTotal, ev, pSuccess, portfolio, stageCosts, toInput, voi, type Clause, type Site, type Stage } from './calc';

interface Props {
  sites: Site[];
  k: Stage;
  clause: Clause;
  accuracy: number;
  selected?: string;
  onSelect: (id: string) => void;
}

const AMPEL_PILL = { rot: 'broken', gelb: 'open', gruen: 'ok' } as const;

export function PortfolioTable({ sites, k, clause, accuracy, selected, onSelect }: Props) {
  const pf = portfolio(sites, k, clause, accuracy);
  return (
    <section className="stack">
      <h3 style={{ margin: 0 }}>
        Portfolio <span className="pill verify">fiktive Schätzwerte</span>
      </h3>
      <table className="simple">
        <thead>
          <tr>
            <th>Fläche</th>
            <th className="right">P(Erfolg)</th>
            <th className="right">Kosten C</th>
            <th className="right">EV</th>
            <th className="right">Infowert</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((s) => {
            const input = toInput(s);
            const e = ev(input, k, clause);
            const p = pSuccess(s);
            return (
              <tr key={s.id} className={`clickable ${selected === s.id ? 'selected' : ''}`} onClick={() => onSelect(s.id)}>
                <td>
                  <strong>{s.id}</strong>
                </td>
                <td className="right">
                  <span className={`pill ${AMPEL_PILL[ampelTotal(p)]}`}>{formatPercent(p, 1)}</span>
                </td>
                <td className="right">{formatEuroShort(stageCosts(input).total)}</td>
                <td className="right">{e > 0 ? formatEuroShort(e) : <span className="muted">0 €</span>}</td>
                <td className="right">{formatEuroShort(voi(input, k, clause, accuracy))}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th colSpan={3}>Summe</th>
            <th className="right">{formatEuroShort(pf.totalEv)}</th>
            <th className="right">{formatEuroShort(pf.totalVoi)}</th>
          </tr>
        </tfoot>
      </table>
      <p className="small" style={{ margin: 0 }}>
        Flächen mit EV &gt; 0: <strong>{pf.pursued}</strong> · erwartete erfolgreiche Projekte:{' '}
        <strong>{formatNumber(pf.expectedSuccesses, 2)}</strong> · gebundene Pacht: <strong>{formatEuroShort(pf.boundLease)}</strong>
      </p>
      <p className="small muted" style={{ margin: 0 }}>
        EV = Erwartungswert der Fläche, wenn die Netz-Klarheit {k === 0 ? 'vor der Pacht' : 'später'} kommt und nur weiterverfolgt wird, was im Plus
        liegt. Infowert = Wert der Netz-Vorhersage mit der eingestellten Trefferquote.
      </p>
    </section>
  );
}
