import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { api } from '../../api.js';
import { useClinic } from '../../context/ClinicContext.jsx';

const INITIAL = {
  name: '',
  phone: '',
  cnic: '',
  gender: '',
  dob: '',
  bloodGroup: '',
  address: '',
};

// PKR formats: 42301-1234567-1 / 4230112345671
const CNIC_RE = /^\d{5}-?\d{7}-?\d$/;
const PHONE_RE = /^(?:\+92|0)?3\d{2}-?\d{7}$/; // Pakistani mobile

/** Field-level validators — run on every keystroke for instant feedback. */
function validateField(name, value) {
  switch (name) {
    case 'name':
      return value.trim().length >= 3 ? '' : 'Name must be at least 3 characters';
    case 'phone':
      return PHONE_RE.test(value.trim()) ? '' : 'Format: 0300-1234567';
    case 'cnic':
      return CNIC_RE.test(value.trim()) ? '' : 'Format: 42301-1234567-1';
    case 'gender':
      return value ? '' : 'Select gender';
    default:
      return '';
  }
}

export default function PatientModal({ open }) {
  const { closeModal, notify, refreshStats } = useClinic();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: validateField(name, value) }));
  }

  function validateAll() {
    const next = {};
    for (const key of Object.keys(INITIAL)) {
      const msg = validateField(key, form[key]);
      if (msg) next[key] = msg;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validateAll()) return;

    setSaving(true);
    try {
      await api.createPatient({
        ...form,
        dob: form.dob || undefined,
        bloodGroup: form.bloodGroup || undefined,
      });
      notify(`Patient "${form.name}" registered`);
      setForm(INITIAL);
      setErrors({});
      closeModal('patient');
      refreshStats();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="Register New Patient" onClose={() => closeModal('patient')}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <label className="label">Full Name *</label>
          <input
            className={`input ${errors.name ? 'border-red-400' : ''}`}
            value={form.name}
            onChange={(e) => setField('name', e.target.value)}
            placeholder="Ayesha Khan"
          />
          {errors.name && <p className="error-text">{errors.name}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Phone *</label>
            <input
              className={`input ${errors.phone ? 'border-red-400' : ''}`}
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="0300-1234567"
            />
            {errors.phone && <p className="error-text">{errors.phone}</p>}
          </div>
          <div>
            <label className="label">CNIC *</label>
            <input
              className={`input ${errors.cnic ? 'border-red-400' : ''}`}
              value={form.cnic}
              onChange={(e) => setField('cnic', e.target.value)}
              placeholder="42301-1234567-1"
            />
            {errors.cnic && <p className="error-text">{errors.cnic}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Gender *</label>
            <select
              className={`input ${errors.gender ? 'border-red-400' : ''}`}
              value={form.gender}
              onChange={(e) => setField('gender', e.target.value)}
            >
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
            {errors.gender && <p className="error-text">{errors.gender}</p>}
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input type="date" className="input" value={form.dob} onChange={(e) => setField('dob', e.target.value)} />
          </div>
          <div>
            <label className="label">Blood Group</label>
            <select className="input" value={form.bloodGroup} onChange={(e) => setField('bloodGroup', e.target.value)}>
              <option value="">—</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Address</label>
          <textarea className="input" rows={2} value={form.address} onChange={(e) => setField('address', e.target.value)} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={() => closeModal('patient')}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Register Patient'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
