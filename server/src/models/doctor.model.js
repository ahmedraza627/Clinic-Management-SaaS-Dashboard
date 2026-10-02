import mongoose from 'mongoose';

/**
 * DOCTOR MODEL
 * ------------
 * Minimal for Step 1: scheduling needs an assignee identity plus a shift
 * window to generate bookable slots.
 *
 * Index: { name: 1 } for the alphabetical assignment dropdown (tiny collection).
 */
const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    specialty: { type: String, required: true, trim: true },
    shiftStart: { type: String, default: '09:00' }, // "HH:mm"
    shiftEnd: { type: String, default: '17:00' },
    slotMinutes: { type: Number, default: 30, min: 10, max: 120 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

doctorSchema.index({ name: 1 });

export const Doctor = mongoose.model('Doctor', doctorSchema);
