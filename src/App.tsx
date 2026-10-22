import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Home } from './Home';
import { Layout } from './shared/Layout';

const A = lazy(() => import('./a/ARoutes'));
const B = lazy(() => import('./b/BRoutes'));
const C = lazy(() => import('./c/CRoutes'));
const D = lazy(() => import('./d/DRoutes'));
const E = lazy(() => import('./e/ERoutes'));
const F = lazy(() => import('./f/FRoutes'));

export function App() {
  return (
    <Suspense fallback={<p className="muted">Lade …</p>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="a/*" element={<A />} />
          <Route path="b/*" element={<B />} />
          <Route path="c/*" element={<C />} />
          <Route path="d/*" element={<D />} />
          <Route path="e/*" element={<E />} />
          <Route path="f/*" element={<F />} />
          <Route path="*" element={<p>Seite nicht gefunden.</p>} />
        </Route>
      </Routes>
    </Suspense>
  );
}
