import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { api } from '../../api.js';

/**
 * AnalyticsCharts — dynamically imported by the Dashboard (React.lazy), so
 * Recharts (~450 kB) is fetched ONLY when this view renders, never on the
 * critical path of the app shell. Combined with the `vendor-charts`
 * manualChunk, the initial bundle stays small and cacheable.
 */

const STATUS_COLORS = {
  pending: '#f59e0b', // amber
  confirmed: '#2f80ed', // brand blue
  completed: '#10b981', // emerald
  cancelled: '#94a3b8', // slate
};

function ChartCard({ title, children }) {
  return (
    <div className="card">
      <h2 className="text-md font-bold text-slate-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function AnalyticsCharts() {
  const [visits, setVisits] = useState([]);
  const [revenue, setRevenue] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.dailyVisits(30), api.monthlyRevenue(12), api.statusDistribution()])
      .then(([v, r, s]) => {
        setVisits(v.series);
        setRevenue(r.series);
        setStatuses(s.series);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) {
    return (
      <div className="card text-red-600 text-sm">
        Failed to load analytics: {error} — is the API + MongoDB running?
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChartCard title="Daily Patient Flow (30d)">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={visits}>
            <defs>
              <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2f80ed" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#2f80ed" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="day" fontSize={11} tickLine={false} />
            <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="visits"
              name="Patient visits"
              stroke="#2f80ed"
              fill="url(#visitsFill)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Monthly Revenue (PKR)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" fontSize={11} tickLine={false} />
              <YAxis
                fontSize={11}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(v) => `PKR ${Number(v).toLocaleString()}`} />
              <Bar dataKey="revenue" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Appointment Status Distribution">
          {statuses.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statuses}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  label={({ status, count }) => `${status} (${count})`}
                  labelLine={false}
                  fontSize={11}
                >
                  {statuses.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#64748b'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-slate-400 py-8 text-center">No appointment data yet.</p>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
