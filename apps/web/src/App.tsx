import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from './components/AppShell';

const AdminPage = lazy(() =>
  import('./pages/AdminPage').then((module) => ({ default: module.AdminPage })),
);
const CrewPage = lazy(() =>
  import('./pages/CrewPage').then((module) => ({ default: module.CrewPage })),
);
const ExplorePage = lazy(() =>
  import('./pages/ExplorePage').then((module) => ({ default: module.ExplorePage })),
);
const RewardsPage = lazy(() =>
  import('./pages/RewardsPage').then((module) => ({ default: module.RewardsPage })),
);
const StoriesPage = lazy(() =>
  import('./pages/StoriesPage').then((module) => ({ default: module.StoriesPage })),
);
const TrailsPage = lazy(() =>
  import('./pages/TrailsPage').then((module) => ({ default: module.TrailsPage })),
);

export function App() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="page-shell" aria-live="polite">
            <div className="h-48 animate-pulse rounded-[32px] bg-ink/5" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<ExplorePage />} />
          <Route path="/trails" element={<TrailsPage />} />
          <Route path="/crew" element={<CrewPage />} />
          <Route path="/stories" element={<StoriesPage />} />
          <Route path="/rewards" element={<RewardsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
