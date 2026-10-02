import { useClinic } from '../../context/ClinicContext.jsx';

function StatCard({ label, value, accent, sub }) {
  return (
    <div className="card flex-1 min-w-40">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ?? 'text-slate-800'}`}>
        {value ?? '—'}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function TopHeader() {
  const { stats, openModal, refreshStats } = useClinic();

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Clinic Overview</h1>
          <p className="text-xs text-slate-500">
            Live operational snapshot — {new Date().toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={refreshStats}>
            ↻ Refresh
            </button>
          <button className="btn-primary" onClick={() => openModal('appointment')}>
            + Book Appointment
          </button>
          <button className="btn-primary" onClick={() => openModal('patient')}>
            + New Patient
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Visits"
          value={stats?.todayVisits}
          accent="text-brand-600"
          sub="active appointments"
        />
        <StatCard
          label="Pending"
          value={stats?.pendingAppointments}
          accent="text-amber-600"
          sub="awaiting confirmation"
        />
        <StatCard
          label="Unpaid"
          value={stats?.unpaid?.count}
          accent="text-red-600"
          sub={`PKR ${stats?.unpaid?.amountDue?.toLocaleString() ?? 0} due`}
        />
        <StatCard
          label="Total Patients"
          value={stats?.totalPatients}
          sub="registered"
        />
      </div>
    </header>
  );
}
