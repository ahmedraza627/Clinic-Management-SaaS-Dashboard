import { useState } from 'react';
import { api } from '../../api.js';

const FIELDS = [
  { name: 'temperatureC', label: 'Temp (°C)', step: '0.1', placeholder: '37.2' },
  { name: 'systolicBP', label: 'Systolic BP', step: '1', placeholder: '120' },
  { name: 'diastolicBP', label: 'Diastolic BP', step: '1', placeholder: '80' },
  { name: 'pulseBpm', label: 'Pulse (bpm)', step: '1', placeholder: '72' },
  { name: 'spo2', label: 'SpO₂ (%)', step: '1', placeholder: '98' },
  { name: 'weightKg', label: 'Weight (kg)', step: '0.1', placeholder: '65' },
  { name: 'heightCm', label: 'Height (cm)', step: '1', placeholder: '170' },
];

const EMPTY = Object.fromEntries(FIELDS.map((f) => [f.name, '']));

/**
 * Append-a-reading form for the patient drawer. All fields optional;
 * whatever is filled must be a sane positive number. POSTs to
 * /api/patients/:id/vitals ($push + $slice:-100 capped timeline server-side).
 */
export default function VitalsForm({ patientId, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField(name) {
    return (e) => setForm((f) => ({ ...f, [name]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');

    const payload = {};
    for (const [key, raw] of Object.entries(form)) {
      if (raw === '') continue;
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0) {
        setError(`${FIELDS.find((f) => f.name === key).label}: enter a valid number`);
        return;
      }
      payload[key] = n;
    }
    if (Object.keys(payload).length === 0) {
      setError('Enter at least one reading');
      return;
    }

    setSaving(true);
    try {
      await api.addVitals(patientId, payload);
      setForm(EMPTY);
      onSaved?.(); // parent re-fetches the patient → timeline updates instantly
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="label !mb-2">+ Record New Vitals</p>
      <div className="grid grid-cols-3 gap-2">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <input
              type="number"
              step={f.step}
              min="0"
              className="input !py-1.5 text-xs"
              placeholder={f.placeholder}
              aria-label={f.label}
              value={form[f.name]}
              onChange={setField(f.name)}
            />
            <p className="text-[10px] text-slate-400 mt-0.5">{f.label}</p>
          </div>
        ))}
      </div>
      {error && <p className="error-text">{error}</p>}
      <div className="flex justify-end mt-2">
        <button type="submit" className="btn-primary !py-1.5 !px-3 text-xs" disabled={saving}>
          {saving ? 'Saving…' : 'Save Reading'}
        </button>
      </div>
    </form>
  );
}
