import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 }, // whole PKR
  },
  { _id: false }
);

serviceSchema.virtual('lineTotal').get(function lineTotal() {
  return this.quantity * this.unitPrice;
});

/**
 * INVOICE MODEL
 * -------------
 * Money rules:
 *  - Amounts stored as whole rupees (no float math on read paths).
 *  - subtotal / taxAmount / total / amountDue are COMPUTED server-side in the
 *    controller via recalcTotals(); clients never send totals — trust boundary.
 *  - { paymentStatus: 1, issuedAt: -1 } serves the unpaid queue + ledger views.
 *  - { patientId: 1, issuedAt: -1 } serves patient billing history.
 */
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true, unique: true }, // e.g. INV-2026-000123
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    items: {
      type: [serviceSchema],
      validate: [(v) => v.length > 0, 'Invoice needs at least one line item'],
    },
    taxRate: { type: Number, required: true, min: 0, max: 1 }, // fraction: 0.05 = 5%
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid', index: true },
    paidAt: { type: Date },
    notes: { type: String, trim: true, default: '' },
    issuedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Ledger + billing-history index patterns.
invoiceSchema.index({ paymentStatus: 1, issuedAt: -1 });
invoiceSchema.index({ patientId: 1, issuedAt: -1 });

invoiceSchema.virtual('amountDue').get(function amountDue() {
  return this.paymentStatus === 'paid' ? 0 : this.total;
});

/** Pure function — the ONLY place money math happens. */
export function recalcTotals(doc) {
  const subtotal = doc.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const taxAmount = Math.round(subtotal * doc.taxRate);
  doc.subtotal = subtotal;
  doc.taxAmount = taxAmount;
  doc.total = subtotal + taxAmount;
  return doc;
}

export const Invoice = mongoose.model('Invoice', invoiceSchema);
