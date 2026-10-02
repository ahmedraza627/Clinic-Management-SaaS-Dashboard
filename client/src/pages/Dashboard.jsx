import { lazy, Suspense } from 'react';

// Code-splitting: Recharts (~450 kB) + the analytics fetch logic are pulled in
// ONLY when the Dashboard view mounts — the Patients / Appointments / Billing
// routes never download the charting library.
const AnalyticsCharts = lazy(() => import('../components/analytics/AnalyticsCharts.jsx'));

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="card animate-pulse text-sm text-slate-400">Loading analytics…</div>
      }
    >
      <AnalyticsCharts />
    </Suspense>
  );
}
