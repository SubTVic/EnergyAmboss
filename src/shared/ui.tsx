import type { ReactNode } from 'react';

/** Inhalte, die nicht aus dem Konzeptdokument stammen, tragen sichtbar das Label „ungeprüft“. */
export function Unverified({ show }: { show?: boolean }) {
  if (!show) return null;
  return (
    <span className="pill verify" title="Nicht aus dem Konzeptdokument; vor dem Test prüfen">
      ungeprüft
    </span>
  );
}

/** Pro Prototyp ein Knopf, der den lokalen Stand löscht. */
export function ResetDemoButton({ onReset, label = 'Demo zurücksetzen' }: { onReset: () => void; label?: string }) {
  return (
    <button
      className="btn-small btn-danger"
      onClick={() => {
        if (window.confirm('Lokalen Stand dieses Prototyps wirklich löschen?')) onReset();
      }}
    >
      {label}
    </button>
  );
}

export function PageHeader({ title, lead, actions }: { title: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="stack" style={{ marginBottom: 16 }}>
      <div className="flex" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {actions && <div className="flex">{actions}</div>}
      </div>
      {lead && <p style={{ margin: 0 }}>{lead}</p>}
    </header>
  );
}

export function Pill({ status, children }: { status: string; children?: ReactNode }) {
  return <span className={`pill ${status}`}>{children ?? status}</span>;
}

export function StoreNotice({ mode }: { mode: 'supabase' | 'local' }) {
  if (mode === 'supabase') return null;
  return (
    <p className="box dashed small" style={{ margin: 0 }}>
      Lokaler Probemodus: Keine Supabase-Verbindung eingerichtet, die Daten bleiben nur in diesem Browser. Zum Teilen mit
      anderen siehe README (Supabase-Schritte).
    </p>
  );
}
