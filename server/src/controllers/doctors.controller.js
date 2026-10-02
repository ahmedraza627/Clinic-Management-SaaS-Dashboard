import { Doctor } from '../models/index.js';
import { wrap } from '../middleware/error.js';

/**
 * GET /api/doctors — active doctors for the booking modal + staff dropdowns.
 * Sorted by the { name: 1 } index; tiny collection, .lean() for cheap reads.
 */
export const listDoctors = wrap(async (req, res) => {
  const items = await Doctor.find({ isActive: true }).sort({ name: 1 }).lean();
  res.json({ items });
});
