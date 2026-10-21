import type { ShownStatus } from './types';

/** Farbe nur mit Bedeutung: grün belegt, orange offen, rot gebrochen, blau bereit. */
export const STATUS_STYLE: Record<ShownStatus, { bg: string; border: string; dashed?: boolean; label: string }> = {
  belegt: { bg: '#c8e6c9', border: '#2e7d32', label: 'belegt' },
  sorry: { bg: '#ffe0b2', border: '#e08a00', label: 'offen (sorry)' },
  offen: { bg: '#ffe0b2', border: '#e08a00', label: 'offen' },
  in_arbeit: { bg: '#fff3e0', border: '#e08a00', dashed: true, label: 'in Arbeit' },
  widerlegt: { bg: '#ffcdd2', border: '#c62828', label: 'widerlegt' },
  gebrochen: { bg: '#ffcdd2', border: '#c62828', label: 'gebrochen' },
  bereit: { bg: '#bbdefb', border: '#1565c0', label: 'bereit' },
  blockiert: { bg: '#eeeeee', border: '#777777', dashed: true, label: 'blockiert' },
  entfallen: { bg: '#f5f5f5', border: '#777777', dashed: true, label: 'entfallen' },
};
