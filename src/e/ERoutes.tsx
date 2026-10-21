import { useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { PageHeader, ResetDemoButton, StoreNotice } from '../shared/ui';
import { store } from '../shared/store';
import { EList } from './EList';
import { EMe } from './EMe';
import { EQuestion } from './EQuestion';
import { ETraining } from './ETraining';
import { loadMe, resetE, useLeagueData, type Me } from './useLeague';
import { EJoin } from './EJoin';

export default function ERoutes() {
  const [me, setMe] = useState<Me | null>(loadMe());
  const data = useLeagueData(me);

  return (
    <div className="stack">
      <PageHeader
        title="E · Prognose-Liga"
        lead="Wahrscheinlichkeiten statt Meinungen: Du gibst Prognosen zu auflösbaren Fragen ab und siehst Brier-Score und Kalibrierung."
        actions={
          me && (
            <>
              <span className="small muted">
                {me.name} · Liga „{me.league}“
              </span>
              <Link to="/e" className="btn-small" style={{ textDecoration: 'none' }}>
                Fragen
              </Link>
              <Link to="/e/ich" className="btn-small" style={{ textDecoration: 'none' }}>
                Meine Bilanz
              </Link>
              <Link to="/e/training" className="btn-small" style={{ textDecoration: 'none' }}>
                Training
              </Link>
              <ResetDemoButton
                onReset={() => {
                  resetE();
                  setMe(null);
                }}
              />
            </>
          )
        }
      />
      <StoreNotice mode={store.mode} />
      {!me ? (
        <EJoin onJoined={setMe} />
      ) : (
        <Routes>
          <Route index element={<EList me={me} data={data} />} />
          <Route path="frage/:id" element={<EQuestion me={me} data={data} />} />
          <Route path="ich" element={<EMe me={me} data={data} />} />
          <Route path="training" element={<ETraining />} />
        </Routes>
      )}
    </div>
  );
}
