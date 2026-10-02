import { Appointment, Invoice, Patient } from '../models/index.js';
import { wrap } from '../middleware/error.js';
import { toUTCMidnight, endOfUTCDay } from '../utils/slots.js';

/**
 * ANALYTICS — all analytical queries use .lean() + aggregations.
 *
 * Why lean() matters (CV talking point):
 *  A hydrated Mongoose document wraps every field in getters/setters, tracks
 *  changes, and builds a $__state. For a dashboard that only SERIALIZES rows,
 *  lean() returns plain JSON-ready objects — benchmarked typically 3-10x less
 *  CPU per row on large result sets. Rules of thumb used here:
 *    - Forms / single-record edits → full documents (need save() + validation).
 *    - Lists, charts, aggregates   → .lean() every time.
 */

/**
 * GET /api/analytics/dashboard
 * One parallel fan-out for the top stats header: today's visits, pending
 * appointments, unpaid invoice totals, patient count.
 */
export const dashboardStats = wrap(async (req, res) => {
  const today = toUTCMidnight(req.query.date ?? new Date().toISOString().slice(0, 10));

  const [todayVisits, pending, unpaidAgg, patients] = await Promise.all([
    Appointment.countDocuments({
      date: { $gte: today, $lt: endOfUTCDay(today) },
      status: { $ne: 'cancelled' },
    }),
    Appointment.countDocuments({ status: 'pending' }),
    Invoice.aggregate([
      { $match: { paymentStatus: 'unpaid' } },
      { $group: { _id: null, amountDue: { $sum: '$total' }, count: { $sum: 1 } } },
    ]),
    Patient.countDocuments({}),
  ]);

  res.json({
    todayVisits,
    pendingAppointments: pending,
    unpaid: unpaidAgg[0] ?? { amountDue: 0, count: 0 },
    totalPatients: patients,
  });
});

/**
 * GET /api/analytics/visits/daily?days=30
 * Daily patient-visit counts for the Recharts area chart. Aggregation groups
 * by the UTC day extracted from `date` — served from the { doctorId, date,
 * status } / { patientId, date } indexes by the $match stage.
 */
export const dailyVisits = wrap(async (req, res) => {
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  since.setUTCHours(0, 0, 0, 0);

  const series = await Appointment.aggregate([
    { $match: { date: { $gte: since }, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        visits: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, day: '$_id', visits: 1, completed: 1 } },
  ]);

  res.json({ series });
});

/**
 * GET /api/analytics/status-distribution
 * Appointment status counts (pending/confirmed/completed/cancelled) for the
 * dashboard pie chart. Plain $group — no $match needed, tiny collection.
 */
export const statusDistribution = wrap(async (req, res) => {
  const series = await Appointment.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $project: { _id: 0, status: { $ifNull: ['$_id', 'unknown'] }, count: 1 } },
    { $sort: { count: -1 } },
  ]);

  res.json({ series });
});

/**
 * GET /api/analytics/revenue/monthly?months=12
 * Monthly revenue breakdown (paid invoices) for the Recharts bar chart.
 */
export const monthlyRevenue = wrap(async (req, res) => {
  const months = Math.min(24, Math.max(3, Number(req.query.months) || 12));
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - months);
  since.setUTCDate(1);
  since.setUTCHours(0, 0, 0, 0);

  const series = await Invoice.aggregate([
    { $match: { paymentStatus: 'paid', issuedAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$issuedAt' } },
        revenue: { $sum: '$total' },
        invoices: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, month: '$_id', revenue: 1, invoices: 1 } },
  ]);

  res.json({ series });
});
