const eur = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export const formatEuro = (n: number): string => eur.format(Math.round(n));

/** Kompakt für Karten und Tabellen: 1,5 Mio. €, 450 Tsd. € */
export function formatEuroShort(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 2 })} Mio. €`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000).toLocaleString('de-DE')} Tsd. €`;
  return `${sign}${Math.round(abs).toLocaleString('de-DE')} €`;
}

export const formatPercent = (p: number, digits = 0): string =>
  `${(p * 100).toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;

export const formatNumber = (n: number, digits = 2): string =>
  n.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: digits });
