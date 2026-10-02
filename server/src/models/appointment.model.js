import mongoose from 'mongoose';

/**
 * APPOINTMENT MODEL
 * -----------------
 * Status workflow: pending → confirmed → completed
 *                              ↘ cancelled (terminal, from pending/confirmed)
 *
 * The workflow is enforced ATOMICALLY by the `transitionStatus` static below:
 * `findOneAndUpdate({ _id, status: { $in: legalSources } }, { status: to })`
 * — a single round-trip that both validates and applies the transition, with
 * no read-then-write race between concurrent receptionists.
 *
 * Index strategy (exact compound indexes required by spec):
 *  - { doctorId: 1, date: 1, status: 1 }
 *      Serves: "free slots for doctor X on day D" (equality doctorId+date,
 *      status filter), the doctor day-schedule view, and the booking
 *      conflict check. ESR order: Equality → Sort → Range respected.
 *  - { patientId: 1, date: -1 }
 *      Serves: patient timeline newest-first with no in-memory sort;
 *      also supports per-patient appointment counts.
 */
export const APPOINTMENT_STATUS = ['pending', 'confirmed', 'completed', 'cancelled'];

// Legal workflow edges — anything else is rejected by transitionStatus().
const LEGAL_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const appointmentSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    // UTC midnight of the calendar day; `slot` carries the local time.
    date: { type: Date, required: true },
    slot: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }, // "HH:mm" 24h
    reason: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: APPOINTMENT_STATUS,
      default: 'pending',
      index: true, // standalone status filters (ops views: "all pending")
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

// Spec-required compound indexes.
appointmentSchema.index({ doctorId: 1, date: 1, status: 1 });
appointmentSchema.index({ patientId: 1, date: -1 });

/**
 * Atomically move an appointment along its workflow.
 * Returns the updated doc, or null if the appointment is not in a legal
 * source state (or doesn't exist) — callers map null → 409 Conflict.
 */
appointmentSchema.statics.transitionStatus = function transitionStatus(id, to) {
  const sources = Object.entries(LEGAL_TRANSITIONS)
    .filter(([, targets]) => targets.includes(to))
    .map(([from]) => from);

  if (sources.length === 0) {
    return Promise.resolve({ ok: false, reason: `Illegal target status: ${to}` });
  }

  return this.findOneAndUpdate(
    { _id: id, status: { $in: sources } },
    { $set: { status: to, ...(to === 'completed' ? { completedAt: new Date() } : {}) } },
    { new: true }
  ).then((doc) =>
    doc
      ? { ok: true, doc }
      : { ok: false, reason: 'Appointment not found or already in a terminal state' }
  );
};

appointmentSchema.statics.LEGAL_TRANSITIONS = LEGAL_TRANSITIONS;

export const Appointment = mongoose.model('Appointment', appointmentSchema);
