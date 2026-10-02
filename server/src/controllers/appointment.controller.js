import { Appointment, Doctor, Patient } from '../models/index.js';
import { wrap } from '../middleware/error.js';
import { toUTCMidnight, generateSlots } from '../utils/slots.js';

/**
 * GET /api/appointments/availability?doctorId=&date=YYYY-MM-DD
 *
 * PERFORMANCE: the booked-slot lookup is an equality-equality-equality query
 * served directly by the { doctorId:1, date:1, status:1 } compound index —
 * the hottest query in the system, fully covered by one index traversal.
 */
export const getAvailability = wrap(async (req, res) => {
  const { doctorId, date } = req.query;
  if (!doctorId || !date) return res.status(400).json({ error: 'doctorId and date are required' });

  const day = toUTCMidnight(date);
  const [doctor, booked] = await Promise.all([
    Doctor.findById(doctorId).lean(),
    Appointment.find(
      { doctorId, date: day, status: { $in: ['pending', 'confirmed'] } },
      { slot: 1, _id: 0 }
    )
      .lean(), // 30 tiny objects, no hydration cost
  ]);

  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

  const bookedSet = new Set(booked.map((b) => b.slot));
  const allSlots = generateSlots(doctor.shiftStart, doctor.shiftEnd, doctor.slotMinutes);

  res.json({
    date,
    doctor: { id: doctor._id, name: doctor.name, specialty: doctor.specialty },
    slots: allSlots.map((slot) => ({ slot, available: !bookedSet.has(slot) })),
  });
});

/**
 * POST /api/appointments — book a slot.
 * Race-safe: the conflict check and insert are two steps, but the compound
 * index keeps the read fast; for strict guarantees a unique partial index on
 * { doctorId, date, slot } (status != cancelled) would be the Step-2 upgrade.
 */
export const bookAppointment = wrap(async (req, res) => {
  const { patientId, doctorId, date, slot, reason } = req.body;

  const [patient, doctor, day] = await Promise.all([
    Patient.findById(patientId).select('_id').lean(),
    Doctor.findById(doctorId).lean(),
    Promise.resolve(toUTCMidnight(date)),
  ]);

  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

  const legalSlots = generateSlots(doctor.shiftStart, doctor.shiftEnd, doctor.slotMinutes);
  if (!legalSlots.includes(slot)) {
    return res.status(400).json({ error: `Slot ${slot} is outside doctor's shift` });
  }

  // Index-served conflict check.
  const conflict = await Appointment.exists({
    doctorId,
    date: day,
    slot,
    status: { $in: ['pending', 'confirmed'] },
  });
  if (conflict) {
    return res.status(409).json({ error: 'Slot already booked', slot, date });
  }

  const appointment = await Appointment.create({
    patientId,
    doctorId,
    date: day,
    slot,
    reason,
  });

  res.status(201).json({ appointment });
});

/** GET /api/appointments?doctorId=&date= — day schedule (compound index). */
export const listAppointments = wrap(async (req, res) => {
  const { doctorId, date, patientId, status } = req.query;
  const filter = {};

  if (doctorId && date) {
    filter.doctorId = doctorId;
    filter.date = toUTCMidnight(date);
    filter.status = status ?? { $in: ['pending', 'confirmed', 'completed'] };
  } else if (patientId) {
    filter.patientId = patientId; // { patientId:1, date:-1 } index; newest first
  } else if (status) {
    filter.status = status;
  }

  const items = await Appointment.find(filter)
    .sort(filter.patientId ? { date: -1 } : { date: 1, slot: 1 })
    .populate('patientId', 'name phone')
    .populate('doctorId', 'name specialty')
    .limit(200)
    .lean();

  res.json({ items });
});

/**
 * PATCH /api/appointments/:id/status  { status: 'confirmed' | ... }
 * Atomic workflow guard (see transitionStatus in the model).
 */
export const changeStatus = wrap(async (req, res) => {
  const { status } = req.body;
  const result = await Appointment.transitionStatus(req.params.id, status);

  if (!result.ok) return res.status(409).json({ error: result.reason });
  res.json({ appointment: result.doc });
});
