import { Patient } from '../models/index.js';
import { wrap } from '../middleware/error.js';

/**
 * GET /api/patients/search?q=<term>
 *
 * PERFORMANCE-CRITICAL (CV talking point):
 *  - Uses the { name:'text', phone:'text', cnic:'text' } TEXT INDEX → one
 *    index traversal instead of three case-insensitive regex scans.
 *  - .lean() → skips hydrating full Mongoose documents (~5-10x faster for
 *    read-only lists; we only need JSON for the search dropdown).
 *  - Projection keeps the payload small → less network + less JSON parse.
 */
export const searchPatients = wrap(async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) return res.json({ results: [], note: 'Type at least 2 characters' });

  const results = await Patient.find(
    { $text: { $search: q } },
    { score: { $meta: 'textScore' }, name: 1, phone: 1, cnic: 1, gender: 1 }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(10)
    .lean(); // plain JS objects — no change-tracking, no virtuals, no middleware

  res.json({ results });
});

/** GET /api/patients — paginated directory (lean for the same reason). */
export const listPatients = wrap(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Number(req.query.limit) || 20);

  const [items, total] = await Promise.all([
    Patient.find({})
      .sort({ createdAt: -1 }) // served by { createdAt: -1 } index
      .skip((page - 1) * limit)
      .limit(limit)
      .select('name phone cnic gender createdAt')
      .lean(),
    Patient.countDocuments({}),
  ]);

  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

/** GET /api/patients/:id — full record incl. embedded history + vitals. */
export const getPatient = wrap(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json({ patient });
});

/** POST /api/patients — registration (CNIC uniqueness enforced by index). */
export const createPatient = wrap(async (req, res) => {
  const patient = await Patient.create(req.body);
  res.status(201).json({ patient });
});

/** PUT /api/patients/:id — demographic edits. */
export const updatePatient = wrap(async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json({ patient });
});

/** POST /api/patients/:id/vitals — append one vitals reading (time-series). */
export const addVitals = wrap(async (req, res) => {
  const reading = { ...req.body, recordedAt: req.body.recordedAt ?? new Date() };

  const patient = await Patient.findByIdAndUpdate(
    req.params.id,
    { $push: { vitals: { $each: [reading], $slice: -100, $sort: { recordedAt: 1 } } } },
    { new: true, runValidators: true }
  );
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json({ vitals: patient.vitals });
});

/** POST /api/patients/:id/history — append one medical-history entry. */
export const addHistoryEntry = wrap(async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(
    req.params.id,
    { $push: { medicalHistory: req.body } },
    { new: true, runValidators: true }
  );
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  res.json({ medicalHistory: patient.medicalHistory });
});
