import { useMemo, useState } from 'react';
import sitesJson from '../../content/c-sites.json';
import { region } from '../shared/content';
import { formatPercent } from '../shared/format';
import { MusterregionMap } from '../shared/MusterregionMap';
import { readJson, removeKey, writeJson } from '../shared/storage';
import { PageHeader, ResetDemoButton } from '../shared/ui';
import { NetPanel } from './NetPanel';
import { PortfolioTable } from './PortfolioTable';
import { SiteSheet } from './SiteSheet';
import {
  DEFAULT_CLAUSE,
  PROB_KEYS,
  PROB_LABELS,
  ampel,
  ampelTotal,
  pSuccess,
  type Ampel,
  type Clause,
  type ProbKey,
  type Site,
  type Stage,
} from './calc';

type Layer = ProbKey | 'gesamt';

interface CState {
  sites: Site[];
  k: Stage;
  clause: Clause;
  accuracy: number;
}

const KEY = 'c-state';
const initial = (): CState => ({
  sites: sitesJson as Site[],
  k: 3,
  clause: DEFAULT_CLAUSE,
  accuracy: 0.8,
});

const AMPEL_COLORS: Record<Ampel, string> = { rot: '#ef9a9a', gelb: '#ffd180', gruen: '#a5d6a7' };

export default function CRoutes() {
  const [state, setStateRaw] = useState<CState>(() => readJson<CState>(KEY, initial()));
  const [layer, setLayer] = useState<Layer>('gesamt');
  const [selected, setSelected] = useState<string>('W1');

  const setState = (patch: Partial<CState>) =>
    setStateRaw((prev) => {
      const next = { ...prev, ...patch };
      writeJson(KEY, next);
      return next;
    });

  const updateSite = (id: string, update: (s: Site) => Site) =>
    setState({ sites: state.sites.map((s) => (s.id === id ? update(s) : s)) });

  const siteById = useMemo(() => new Map(state.sites.map((s) => [s.id, s])), [state.sites]);
  const colorOf = (id: string): string | undefined => {
    const s = siteById.get(id);
    if (!s) return undefined;
    return AMPEL_COLORS[layer === 'gesamt' ? ampelTotal(pSuccess(s)) : ampel(s.p[layer])];
  };
  const captionOf = (id: string): string | undefined => {
    const s = siteById.get(id);
    if (!s) return undefined;
    return formatPercent(layer === 'gesamt' ? pSuccess(s) : s.p[layer], layer === 'gesamt' ? 1 : 0);
  };

  const current = siteById.get(selected) ?? state.sites[0];
  const layers: { key: Layer; label: string }[] = [
    ...PROB_KEYS.map((k) => ({ key: k as Layer, label: PROB_LABELS[k].replace(/ \(.*\)/, '') })),
    { key: 'gesamt', label: 'Gesamt' },
  ];

  return (
    <div className="stack">
      <PageHeader
        title="C · Flächenportfolio und Informationswert"
        lead="Jede Fläche bekommt eine Erfolgswahrscheinlichkeit aus sechs Einzelrisiken, das Portfolio einen Erwartungswert und jede offene Frage einen Preis."
        actions={
          <ResetDemoButton
            onReset={() => {
              removeKey(KEY);
              setStateRaw(initial());
              setSelected('W1');
            }}
          />
        }
      />
      <p className="small muted" style={{ margin: 0 }}>
        <span className="pill verify">fiktive Schätzwerte</span> Alle Wahrscheinlichkeiten, Kosten und Werte sind
        erfundene Beispielzahlen; nur die Kostenarten stammen aus dem Interview.
      </p>

      <div className="two-col">
        <section className="stack">
          <div className="flex">
            <strong>Ebene:</strong>
            {layers.map((l) => (
              <button key={l.key} className={`btn-small ${layer === l.key ? 'btn-secondary' : ''}`} onClick={() => setLayer(l.key)}>
                {l.label}
              </button>
            ))}
          </div>
          <MusterregionMap
            fill={colorOf}
            caption={captionOf}
            selected={current?.id}
            onSiteClick={setSelected}
            data={region}
          />
          <div className="legend">
            <span>
              <span className="swatch" style={{ background: AMPEL_COLORS.rot }} /> rot: {layer === 'gesamt' ? 'unter 10 %' : 'unter 40 %'}
            </span>
            <span>
              <span className="swatch" style={{ background: AMPEL_COLORS.gelb }} /> gelb: {layer === 'gesamt' ? 'unter 25 %' : 'unter 70 %'}
            </span>
            <span>
              <span className="swatch" style={{ background: AMPEL_COLORS.gruen }} /> grün: darüber
            </span>
          </div>
        </section>

        <section className="stack">
          <NetPanel k={state.k} clause={state.clause} accuracy={state.accuracy} onChange={setState} />
          <PortfolioTable
            sites={state.sites}
            k={state.k}
            clause={state.clause}
            accuracy={state.accuracy}
            selected={current?.id}
            onSelect={setSelected}
          />
        </section>
      </div>

      {current && (
        <SiteSheet
          key={current.id}
          site={current}
          k={state.k}
          clause={state.clause}
          accuracy={state.accuracy}
          onChange={(update) => updateSite(current.id, update)}
        />
      )}
    </div>
  );
}
