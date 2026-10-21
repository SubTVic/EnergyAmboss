import { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { removeKey } from '../shared/storage';
import { store } from '../shared/store';
import { PageHeader, ResetDemoButton, StoreNotice } from '../shared/ui';
import { ALibrary } from './ALibrary';
import { APanel } from './APanel';
import { AResult } from './AResult';
import { ASessionView } from './ASessionView';
import { AStart } from './AStart';
import { clearSession, loadSession, saveSession, type ASession } from './session';

export default function ARoutes() {
  const [session, setSessionRaw] = useState<ASession | null>(loadSession);

  const setSession = (s: ASession | null) => {
    if (s) saveSession(s);
    else clearSession();
    setSessionRaw(s);
  };

  return (
    <div className="stack">
      <PageHeader
        title="A · Kreuzen mit vernetzter Bibliothek"
        lead="Praxisfälle kreuzen. Jede Erklärung führt in ein Wissensnetz über alle Fachbereiche, und das Verbindungs-Radar zeigt, welche Verbindungen noch schwach sind."
        actions={
          <>
            <Link to="/a" className="btn-small" style={{ textDecoration: 'none' }}>
              Start
            </Link>
            <Link to="/a/bibliothek" className="btn-small" style={{ textDecoration: 'none' }}>
              Bibliothek
            </Link>
            <ResetDemoButton
              onReset={() => {
                setSession(null);
                if (store.mode === 'local') removeKey('local-panel');
              }}
            />
          </>
        }
      />
      <Routes>
        <Route index element={<AStart session={session} onStart={setSession} />} />
        <Route path="session" element={<ASessionView session={session} onChange={setSession} />} />
        <Route path="ergebnis" element={<AResult session={session} />} />
        <Route path="bibliothek" element={<ALibrary />} />
        <Route
          path="panel"
          element={
            <>
              <StoreNotice mode={store.mode} />
              <APanel />
            </>
          }
        />
      </Routes>
    </div>
  );
}
