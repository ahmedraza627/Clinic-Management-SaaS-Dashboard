const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'patients', label: 'Patients', icon: '🧑‍🤝‍🧑' },
  { id: 'appointments', label: 'Appointments', icon: '📅' },
  { id: 'billing', label: 'Billing', icon: '💳' },
];

export default function Sidebar({ current }) {
  return (
    <aside className="w-60 shrink-0 bg-slate-900 text-slate-300 flex flex-col">
      <div className="h-16 flex items-center px-5 border-b border-slate-800">
        <span className="text-xl font-bold text-white">🩺 ClinicOS</span>
      </div>
      <nav className="flex-1 py-4">
        {NAV.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={`flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors ${
              current === item.id
                ? 'bg-brand-600 text-white border-r-4 border-brand-500'
                : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="p-5 border-t border-slate-800 text-xs text-slate-500">
        ClinicOS v1.0 — Step 1
      </div>
    </aside>
  );
}
