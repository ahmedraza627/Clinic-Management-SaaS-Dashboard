import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useClinic } from '../context/ClinicContext.jsx';
import VitalsForm from '../components/patients/VitalsForm.jsx';

export default function PatientsPage() {
  const { openModal } = useClinic();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const debounceRef = useRef(null);

  // Debounced 250ms text-index search — hits /api/patients/search (uses the
  // { name, phone, cnic } text index server-side).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { results: r } = await api.searchPatients(query);
        setResults(r);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  async function openPatient(id) {
    const { patient } = await api.getPatient(id);
    setSelected(patient);
  }

  // Re-fetch so appended vitals/history appear instantly in the drawer.
  async function refreshSelected() {
    if (!selected) return;
    const { patient } = await api.getPatient(selected._id);
    setSelected(patient);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          className="input max-w-md"
          placeholder="Search by name, phone, or CNIC…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {searching && <span className="text-xs text-slate-500">searching…</span>}
        <button className="btn-primary ml-auto" onClick={() => openModal('patient')}>
          + New Patient
        </button>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">CNIC</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {results.map((p) => (
              <tr key={p._id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                <td className="px-4 py-3">{p.phone}</td>
                <td className="px-4 py-3 font-mono text-xs">{p.cnic}</td>
                <td className="px-4 py-3 capitalize">{p.gender}</td>
                <td className="px-4 py-3 text-right">
                  <button className="btn-ghost !py-1 !px-2 text-xs" onClick={() => openPatient(p._id)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {query.length >= 2 ? 'No matches' : 'Type at least 2 characters to search'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <PatientDetail
          patient={selected}
          onClose={() => setSelected(null)}
          onRefresh={refreshSelected}
        />
      )}
    </div>
  );
}

function PatientDetail({ patient, onClose, onRefresh }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="card max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{patient.name}</h3>
          <div className="flex gap-1">
            <button className="btn-ghost !py-1 !px-2" title="Refresh" onClick={onRefresh}>↻</button>
            <button className="btn-ghost !py-1 !px-2" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm mb-6">
          <div><span className="label">Phone</span>{patient.phone}</div>
          <div><span className="label">CNIC</span>{patient.cnic}</div>
          <div><span className="label">Gender</span><span className="capitalize">{patient.gender}</span></div>
          <div><span className="label">Blood Group</span>{patient.bloodGroup || '—'}</div>
        </div>

        <h4 className="label">Vitals Timeline</h4>
        <div className="space-y-2 mb-6">
          {(patient.vitals ?? []).map((v, i) => (
            <div key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-xs flex flex-wrap gap-3">
              <span>{new Date(v.recordedAt).toLocaleString()}</span>
              <span>{v.temperatureC ?? '—'}°C</span>
              <span>{v.systolicBP ?? '—'}/{v.diastolicBP ?? '—'} BP</span>
              <span>{v.pulseBpm ?? '—'} bpm</span>
              <span>SpO₂ {v.spo2 ?? '—'}%</span>
            </div>
          ))}
          {(patient.vitals ?? []).length === 0 && (
            <p className="text-xs text-slate-400">No vitals recorded.</p>
          )}
        </div>

        <div className="mb-6">
          <VitalsForm patientId={patient._id} onSaved={onRefresh} />
        </div>

        <h4 className="label">Medical History</h4>
        <div className="space-y-2">
          {(patient.medicalHistory ?? []).map((h, i) => (
            <div key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <p className="font-semibold">{h.chiefComplaint ?? 'Visit'}</p>
              <p className="text-slate-600">{h.diagnosis ?? ''}</p>
              {h.prescription && <p className="text-slate-500 mt-1">Rx: {h.prescription}</p>}
            </div>
          ))}
          {(patient.medicalHistory ?? []).length === 0 && (
            <p className="text-xs text-slate-400">No history entries.</p>
          )}
        </div>
      </div>
    </div>
  );
}
