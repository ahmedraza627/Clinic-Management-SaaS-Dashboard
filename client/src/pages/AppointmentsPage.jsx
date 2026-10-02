import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useClinic } from '../context/ClinicContext.jsx';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-brand-100 text-brand-700',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-200 text-slate-600',
};

// Next legal moves per workflow: pending → confirmed → completed (+cancelled)
const NEXT_ACTIONS = {
  pending: [['confirmed', 'Confirm'], ['cancelled', 'Cancel']],
  confirmed: [['completed', 'Complete'], ['cancelled', 'Cancel']],
  completed: [],
  cancelled: [],
};

export default function AppointmentsPage() {
  const { appointments, loadAppointments, openModal } = useClinic();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const act = useCallback(
    async (id, status) => {
      setBusyId(id);
      try {
        await api.setAppointmentStatus(id, status);
        await loadAppointments();
      } catch (e) {
        alert(e.message);
      } finally {
        setBusyId(null);
      }
    },
    [loadAppointments]
  );

  const dayList = appointments.filter(
    (a) => a.date && a.date.slice(0, 10) === date && a.status !== 'cancelled'
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="date" className="input max-w-xs" value={date} onChange={(e) => setDate(e.target.value)} />
        <span className="text-xs text-slate-500">
          {dayList.length} appointment{dayList.length === 1 ? '' : 's'}
        </span>
        <button className="btn-primary ml-auto" onClick={() => openModal('appointment')}>
          + Book Appointment
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Slot</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Doctor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dayList.map((a) => (
              <tr key={a._id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono">{a.slot}</td>
                <td className="px-4 py-3 font-medium">{a.patientId?.name ?? '—'}</td>
                <td className="px-4 py-3">{a.doctorId?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[a.status]}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{a.reason || '—'}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  {NEXT_ACTIONS[a.status]?.map(([status, label]) => (
                    <button
                      key={status}
                      disabled={busyId === a._id}
                      className="btn-ghost !py-1 !px-2 text-xs"
                      onClick={() => act(a._id, status)}
                    >
                      {label}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
            {dayList.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No appointments for {date}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
