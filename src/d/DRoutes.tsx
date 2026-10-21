import { useCallback, useState } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { PageHeader, ResetDemoButton } from '../shared/ui';
import { DCards } from './DCards';
import { DDebrief } from './DDebrief';
import { DGame } from './DGame';
import { DStart } from './DStart';
import { clearGame, loadGame, saveGame, type SavedGame } from './gameStore';

export default function DRoutes() {
  const [game, setGameRaw] = useState<SavedGame | null>(loadGame);

  const setGame = useCallback((g: SavedGame | null) => {
    if (g) saveGame(g);
    else clearGame();
    setGameRaw(g);
  }, []);

  return (
    <div className="stack">
      <PageHeader
        title="D · Projekt-Planspiel"
        lead="Ein Windprojekt rundenbasiert von der Weißfläche bis zum Netz spielen, während Konkurrenz, Netzbetreiber, Behörden und Gesetzgeber eigene Züge machen."
        actions={
          <>
            <Link to="/d/karten" className="btn-small" style={{ textDecoration: 'none' }}>
              Karten drucken
            </Link>
            <ResetDemoButton onReset={() => setGame(null)} label="Spiel zurücksetzen" />
          </>
        }
      />
      <Routes>
        <Route index element={<DStart game={game} onStart={setGame} />} />
        <Route path="spiel" element={<DGame game={game} onChange={setGame} />} />
        <Route path="nachbesprechung" element={<DDebrief game={game} onChange={setGame} />} />
        <Route path="karten" element={<DCards />} />
      </Routes>
    </div>
  );
}
