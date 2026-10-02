import { useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { api } from '../../api.js';
import { useClinic } from '../../context/ClinicContext.jsx';

const INITIAL = { patientId: '', doctorId: '', date: '', slot: '', reason: '' };

export default function AppointmentModal({ open }) {
  const { closeModal, notify, refreshStats, loadAppointments } = useClinic();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  // Lookup data on open — patients directory + active doctors (GET /api/doctors).
  useEffect(() => {
    if (!open) return;
    api.listPatients(1, 100).then(({ items }) => setPatients(items)).catch(() => {});
    api.listDoctors().then(({ items }) => setDoctors(items)).catch(() => {});
  }, [open]);

  // Fetch availability when doctor + date are chosen (compound-index query).
  useEffect(() => {
    if (!form.doctorId || !form.date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    api
      .availability(form.doctorId, form.date)
      .then(({ slots: s }) => setSlots(s))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [form.doctorId, form.date]);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value, ...(name !== 'slot' ? { slot: '' } : {}) }));
    setErrors((e) => ({ ...e, [name]: '', slot: '' }));
  }

  function validateAll() {
    const next = {};
    if (!form.patientId) next.patientId = 'Select a patient';
    if (!form.doctorId) next.doctorId = 'Select a doctor';
    if (!form.date) next.date = 'Pick a date';
    if (!form.slot) next.slot = 'Pick a time slot';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validateAll()) return;

    setSaving(true);
    try {
      await api.bookAppointment(form);
      notify('Appointment booked');
      setForm(INITIAL);
      setErrors({});
      closeModal('appointment');
      refreshStats();
      loadAppointments();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="Book Appointment" onClose={() => closeModal('appointment')}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label className="label">Patient *</label>
          <select
            className={`input ${errors.patientId ? 'border-red-400' : ''}`}
            value={form.patientId}
            onChange={(e) => setField('patientId', e.target.value)}
          >
            <option value="">Select patient…</option>
            {patients.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} — {p.phone}
              </option>
            ))}
          </select>
          {errors.patientId && <p className="error-text">{errors.patientId}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Doctor *</label>
            <select
              className={`input ${errors.doctorId ? 'border-red-400' : ''}`}
              value={form.doctorId}
              onChange={(e) => setField('doctorId', e.target.value)}
            >
              <option value="">Select doctor…</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.specialty})
                </option>
              ))}
            </select>
            {errors.doctorId && <p className="error-text">{errors.doctorId}</p>}
          </div>
          <div>
            <label className="label">Date *</label>
            <input
              type="date"
              className={`input ${errors.date ? 'border-red-400' : ''}`}
              value={form.date}
              onChange={(e) => setField('date', e.target.value)}
            />
            {errors.date && <p className="error-text">{errors.date}</p>}
          </div>
        </div>

        <div>
          <label className="label">Available Slots *</label>
          {loadingSlots ? (
            <p className="text-xs text-slate-500 py-2">Checking availability…</p>
          ) : slots.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((s) => (
                <button
                  key={s.slot}
                  type="button"
                  disabled={!s.available}
                  onClick={() => setField('slot', s.slot)}
                  className={`rounded-lg px-2 py-1.5 text-xs font-medium border transition-colors ${
                    form.slot === s.slot
                      ? 'bg-brand-500 text-white border-brand-500'
                      : s.available
                        ? 'bg-white border-slate-300 hover:border-brand-400'
                        : 'bg-slate-100 border-slate-200 text-slate-300 line-through cursor-not-allowed'
                  }`}
                >
                  {s.slot}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-2">Select a doctor and date to see slots.</p>
          )}
          {errors.slot && <p className="error-text">{errors.slot}</p>}
        </div>

        <div>
          <label className="label">Reason for Visit</label>
          <textarea
            className="input"
            rows={2}
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Follow-up, fever, consultation…"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={() => closeModal('appointment')}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Booking…' : 'Book Appointment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
