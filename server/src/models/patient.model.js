import mongoose from 'mongoose';

/**
 * PATIENT MODEL
 * -------------
 * Index strategy:
 *  - TEXT INDEX { name: 'text', phone: 'text', cnic: 'text' } — powers the
 *    global fast-search endpoint: one index traversal answers "match any of
 *    name/phone/cnic", instead of 3 regex scans.
 *  - { cnic: 1 } UNIQUE — CNIC is the natural business key (national ID),
 *    prevents duplicate registrations, cheap exact-match lookups.
 *  - { phone: 1 } — exact / prefix lookups for call-center flows.
 *  - { createdAt: -1 } — "recently registered" widgets read newest-first.
 */
const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    // Uniqueness enforced via the explicit index below (single declaration).
    cnic: { type: String, required: true, trim: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    dob: { type: Date },
    address: { type: String, trim: true, default: '' },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', ''] },
    allergies: [String],
    // Free-form clinical record appended per visit (chief complaint, diagnosis, notes)
    medicalHistory: [
      {
        _id: false,
        recordedAt: { type: Date, default: Date.now },
        chiefComplaint: String,
        diagnosis: String,
        prescription: String,
        notes: String,
      },
    ],
    // Time-series friendly vitals log (append-only, embedded on purpose:
    // per-patient reads are always the full timeline → no joins needed).
    vitals: [
      {
        _id: false,
        recordedAt: { type: Date, default: Date.now },
        temperatureC: Number,
        systolicBP: Number,
        diastolicBP: Number,
        pulseBpm: Number,
        weightKg: Number,
        heightCm: Number,
        spo2: Number,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Required by spec: multi-field text search across name/phone/cnic.
patientSchema.index({ name: 'text', phone: 'text', cnic: 'text' });
// Business keys + listing performance.
// (Declares the unique CNIC index — path-level `unique` intentionally omitted
// to avoid Mongoose's duplicate-schema-index warning.)
patientSchema.index({ cnic: 1 }, { unique: true });
patientSchema.index({ phone: 1 });
patientSchema.index({ createdAt: -1 });

patientSchema.virtual('age').get(function computeAge() {
  if (!this.dob) return null;
  const diff = Date.now() - this.dob.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
});

export const Patient = mongoose.model('Patient', patientSchema);
