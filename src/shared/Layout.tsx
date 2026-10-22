import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { FeedbackModal, PROTO_NAMES } from './FeedbackModal';
import { onOpenFeedback } from './feedbackBus';
import { getTester } from './tester';

type Proto = 'a' | 'b' | 'c' | 'd' | 'e' | 'f';

function protoFromPath(path: string): Proto | null {
  const m = /^\/([a-f])(\/|$)/.exec(path);
  return m ? (m[1] as Proto) : null;
}

export function Layout() {
  const { pathname } = useLocation();
  const proto = protoFromPath(pathname);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Proto>('a');

  // ?t=K1 beim ersten Aufruf übernehmen
  useEffect(() => {
    getTester();
  }, []);
  useEffect(() => onOpenFeedback(() => setOpen(true)), []);

  const activeProto = proto ?? target;

  return (
    <div className="app-container">
      <div className="banner">Prototyp: Inhalte fiktiv. Bitte die Idee bewerten, nicht die Details.</div>
      <nav className="topnav">
        <NavLink to="/" end>
          Start
        </NavLink>
        {(Object.keys(PROTO_NAMES) as Proto[]).map((p) => (
          <NavLink key={p} to={`/${p}`}>
            {PROTO_NAMES[p]}
          </NavLink>
        ))}
        <span className="spacer" />
        {!proto && (
          <select value={target} onChange={(e) => setTarget(e.target.value as Proto)} style={{ width: 'auto' }}>
            {(Object.keys(PROTO_NAMES) as Proto[]).map((p) => (
              <option key={p} value={p}>
                {PROTO_NAMES[p]}
              </option>
            ))}
          </select>
        )}
        <button className="btn-small" onClick={() => setOpen(true)}>
          Feedback
        </button>
      </nav>
      <main>
        <Outlet />
      </main>
      {open && <FeedbackModal proto={activeProto} onClose={() => setOpen(false)} />}
    </div>
  );
}
