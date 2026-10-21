import { useState } from 'react';
import { store } from '../shared/store';
import { getTester, uuid } from '../shared/tester';
import { saveMe, type Me } from './useLeague';

export function EJoin({ onJoined }: { onJoined: (me: Me) => void }) {
  const [name, setName] = useState(getTester());
  const [league, setLeague] = useState('offen');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function join() {
    if (!name.trim()) {
      setError('Bitte gib einen Namen oder ein Kürzel ein.');
      return;
    }
    setBusy(true);
    const me: Me = { id: uuid(), name: name.trim(), league: league.trim() || 'offen' };
    try {
      await store.addParticipant({ ...me });
      saveMe(me);
      onJoined(me);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <section className="box stack" style={{ maxWidth: 520 }}>
      <h3 style={{ margin: 0 }}>Beitreten</h3>
      <p className="small muted" style={{ margin: 0 }}>
        Kein Login: Name oder Kürzel genügt. Mit dem Liga-Code „offen“ siehst du die öffentlichen, wettbewerbsneutralen
        Fragen; eine private Firmen-Liga bekommst du per Code.
      </p>
      <label>
        Name oder Kürzel
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="K1" />
      </label>
      <label>
        Liga-Code
        <input value={league} onChange={(e) => setLeague(e.target.value)} />
      </label>
      {error && <p style={{ color: 'var(--broken)', margin: 0 }}>{error}</p>}
      <button onClick={join} disabled={busy}>
        Beitreten
      </button>
    </section>
  );
}
