import { Invoice, recalcTotals } from '../models/invoice.model.js';
import { wrap } from '../middleware/error.js';

/**
 * Human-readable invoice number: INV-2026-000042.
 * Derived from the collection count so it survives server restarts
 * (a strict monotonic sequence would need a counters collection — Step 2).
 */
async function nextInvoiceNo() {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments({});
  return `INV-${year}-${String(count + 1).padStart(6, '0')}`;
}

/**
 * POST /api/invoices — create with SERVER-computed money math.
 * Clients send items[] + optional taxRate; subtotal/taxAmount/total are
 * recalculated here. Clients never send totals (billing trust boundary).
 */
export const createInvoice = wrap(async (req, res) => {
  const { patientId, appointmentId, items, taxRate = 0.05, notes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items[] must be a non-empty array' });
  }

  const invoice = new Invoice({
    invoiceNo: await nextInvoiceNo(),
    patientId,
    appointmentId,
    items: items.map((it) => ({
      description: String(it.description ?? '').trim(),
      quantity: Number(it.quantity ?? 1),
      unitPrice: Number(it.unitPrice ?? 0),
    })),
    taxRate: Number(taxRate),
    notes,
  });

  recalcTotals(invoice); // single source of truth for money math
  await invoice.save();

  res.status(201).json({ invoice });
});

/** GET /api/invoices?paymentStatus=unpaid — ledger views (compound index). */
export const listInvoices = wrap(async (req, res) => {
  const { paymentStatus, patientId, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (patientId) filter.patientId = patientId;

  const [items, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ issuedAt: -1 }) // served by { paymentStatus:1, issuedAt:-1 } / { patientId:1, issuedAt:-1 }
      .skip((Math.max(1, Number(page)) - 1) * Number(limit))
      .limit(Math.min(100, Number(limit)))
      .populate('patientId', 'name cnic')
      .lean(),
    Invoice.countDocuments(filter),
  ]);

  res.json({ items, total, page: Number(page), limit: Number(limit) });
});

/** GET /api/invoices/:id — full invoice incl. printable-receipt payload. */
export const getInvoice = wrap(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('patientId', 'name cnic phone gender')
    .lean();

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  // lineTotals are virtuals — compute manually since we used .lean().
  const receipt = {
    invoice: {
      ...invoice,
      items: invoice.items.map((it) => ({ ...it, lineTotal: it.quantity * it.unitPrice })),
    },
  };

  res.json(receipt);
});

/** PATCH /api/invoices/:id/payment — mark paid / revert to unpaid. */
export const setPaymentStatus = wrap(async (req, res) => {
  const { paymentStatus } = req.body;
  if (!['paid', 'unpaid'].includes(paymentStatus)) {
    return res.status(400).json({ error: "paymentStatus must be 'paid' or 'unpaid'" });
  }

  const invoice = await Invoice.findByIdAndUpdate(
    req.params.id,
    { paymentStatus, paidAt: paymentStatus === 'paid' ? new Date() : null },
    { new: true }
  );

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ invoice });
});
