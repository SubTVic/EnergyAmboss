import { region } from './content';
import type { Region } from './types';

interface Props {
  /** Füllfarbe je Fläche (z. B. Ampel oder Status). */
  fill?: (siteId: string) => string | undefined;
  /** Zweite Zeile unter der Flächen-ID. */
  caption?: (siteId: string) => string | undefined;
  /** Hervorgehobene Flächen (dicker Rand). */
  highlighted?: (siteId: string) => boolean;
  selected?: string | null;
  onSiteClick?: (siteId: string) => void;
  data?: Region;
}

function centroid(points: [number, number][]): [number, number] {
  const n = points.length;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

const toPoints = (pts: [number, number][]) => pts.map((p) => p.join(',')).join(' ');

/** Gemeinsame SVG-Karte der fiktiven Musterregion für C und D. */
export function MusterregionMap({ fill, caption, highlighted, selected, onSiteClick, data = region }: Props) {
  const [w, h] = data.viewBox;
  return (
    <div className="map-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Karte der fiktiven Musterregion">
        <defs>
          <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#888" strokeWidth="2" />
          </pattern>
          <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.6" fill="#888" />
          </pattern>
        </defs>

        {data.areas.map((a) => {
          if (a.kind === 'netzgrenze')
            return (
              <g key={a.id}>
                <polygon points={toPoints(a.polygon)} fill="#ddd" stroke="#777" strokeDasharray="6 4" />
                <text x={680} y={362} fontSize="14" fill="#555">
                  ↑ Netzbetreiber Nord
                </text>
                <text x={680} y={408} fontSize="14" fill="#555">
                  ↓ Netzbetreiber Süd
                </text>
              </g>
            );
          return (
            <g key={a.id}>
              <polygon
                points={toPoints(a.polygon)}
                fill={a.kind === 'wald' ? 'url(#hatch)' : 'url(#dots)'}
                stroke="#666"
                strokeDasharray={a.kind === 'schutzgebiet' ? '5 3' : undefined}
              />
              <text x={centroid(a.polygon)[0]} y={Math.min(...a.polygon.map((p) => p[1])) - 6} fontSize="13" fill="#555" textAnchor="middle">
                {a.kind === 'wald' ? 'Monokultur-Wald' : 'Schutzgebiet'}
              </text>
            </g>
          );
        })}

        {data.lines.map((l) => {
          const style =
            l.kind === 'autobahn'
              ? { stroke: '#555', strokeWidth: 6 }
              : l.kind === 'strasse'
                ? { stroke: '#555', strokeWidth: 3 }
                : l.kind === 'alt_110kv'
                  ? { stroke: '#555', strokeWidth: 3, strokeDasharray: '2 6' }
                  : l.id.startsWith('trasse')
                    ? { stroke: '#41403e', strokeWidth: 2, strokeDasharray: '8 4' }
                    : { stroke: '#41403e', strokeWidth: 2.5 };
          return <polyline key={l.id} points={toPoints(l.points)} fill="none" {...style} />;
        })}
        <text x={30} y={668} fontSize="13" fill="#555">
          Autobahn
        </text>
        <text x={60} y={488} fontSize="13" fill="#555">
          alte 110-kV-Leitung (ohne Trafo)
        </text>

        {data.villages.map((v) => (
          <g key={v.id}>
            <circle cx={v.x} cy={v.y} r={v.bufferRadius} fill="none" stroke="#999" strokeDasharray="4 4" />
            <circle cx={v.x} cy={v.y} r={10} fill="#41403e" />
            <text x={v.x} y={v.y + 28} fontSize="14" textAnchor="middle" fill="#333">
              {v.name}
            </text>
          </g>
        ))}

        {data.substations.map((s) => (
          <g key={s.id}>
            <rect x={s.x - 9} y={s.y - 9} width={18} height={18} fill="white" stroke="#41403e" strokeWidth={3} />
            <text x={s.x + 14} y={s.y - 12} fontSize="14" fill="#333">
              {s.name}
            </text>
          </g>
        ))}

        {data.sites.map((s) => {
          const [cx, cy] = centroid(s.polygon);
          const isSel = selected === s.id;
          const hl = highlighted?.(s.id);
          return (
            <g
              key={s.id}
              onClick={onSiteClick ? () => onSiteClick(s.id) : undefined}
              style={{ cursor: onSiteClick ? 'pointer' : undefined }}
              data-site={s.id}
            >
              <polygon
                points={toPoints(s.polygon)}
                fill={fill?.(s.id) ?? '#eee'}
                fillOpacity={0.85}
                stroke="#41403e"
                strokeWidth={isSel ? 5 : hl ? 4 : 2}
                strokeDasharray={s.tech === 'pv' ? '6 3' : undefined}
              />
              <text x={cx} y={cy - 2} fontSize="18" fontWeight="bold" textAnchor="middle" fill="#222">
                {s.id}
              </text>
              {caption?.(s.id) && (
                <text x={cx} y={cy + 16} fontSize="12" textAnchor="middle" fill="#222">
                  {caption(s.id)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="legend">
        <span>
          <span className="swatch" style={{ background: 'white' }} /> Umspannwerk (Quadrat) / Dorf mit Abstandspuffer
        </span>
        <span>
          <span className="swatch" style={{ borderStyle: 'dashed' }} /> PV-Fläche (gestrichelt)
        </span>
        <span className="muted">Fiktive Region, nicht maßstäblich.</span>
      </div>
    </div>
  );
}
