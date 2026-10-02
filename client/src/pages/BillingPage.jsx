import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

export default function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState('');
  const [receipt, setReceipt] = useState(null);

  const load = useCallback(async () => {
    const { items } = await api.listInvoices(filter ? `?paymentStatus=${filter}` : '');
    setInvoices(items);
  }, [filter]);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  async function togglePaid(inv) {
    await api.markPaid(inv._id, inv.paymentStatus === 'paid' ? 'unpaid' : 'paid');
    await load();
  }

  async function openReceipt(id) {
    const data = await fetch(`/api/invoices/${id}`).then((r) => r.json());
    setReceipt(data.invoice);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {['', 'unpaid', 'paid'].map((f) => (
          <button
            key={f || 'all'}
            className={filter === f ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setFilter(f)}
          >
            {f || 'All'}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv._id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNo}</td>
                <td className="px-4 py-3">{inv.patientId?.name ?? '—'}</td>
                <td className="px-4 py-3 font-semibold">PKR {inv.total?.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      inv.paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {inv.paymentStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button className="btn-ghost !py-1 !px-2 text-xs" onClick={() => openReceipt(inv._id)}>
                    Receipt
                  </button>
                  <button className="btn-ghost !py-1 !px-2 text-xs" onClick={() => togglePaid(inv)}>
                    {inv.paymentStatus === 'paid' ? 'Revert' : 'Mark Paid'}
                  </button>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No invoices {filter && `with status "${filter}"`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {receipt && <ReceiptModal invoice={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

/** Printable receipt — window.print() with a dedicated print stylesheet. */
function ReceiptModal({ invoice, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 print:shadow-none print:static"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
          <h3 className="text-lg font-bold">🩺 ClinicOS</h3>
          <p className="text-xs text-slate-500">Official Payment Receipt</p>
        </div>

        <div className="text-sm space-y-1 mb-4">
          <div className="flex justify-between">
            <span className="text-slate-500">Invoice</span>
            <span className="font-mono text-xs">{invoice.invoiceNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Patient</span>
            <span>{invoice.patientId?.name ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Issued</span>
            <span>{new Date(invoice.issuedAt).toLocaleDateString()}</span>
          </div>
        </div>

        <table className="w-full text-xs mb-4">
          <thead className="text-left text-slate-500 border-b border-slate-200">
            <tr>
              <th className="py-1">Service</th>
              <th className="py-1 text-right">Qty</th>
              <th className="py-1 text-right">Unit</th>
              <th className="py-1 text-right">Line</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="py-1">{it.description}</td>
                <td className="py-1 text-right">{it.quantity}</td>
                <td className="py-1 text-right">{it.unitPrice.toLocaleString()}</td>
                <td className="py-1 text-right">{(it.lineTotal ?? it.quantity * it.unitPrice).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-sm space-y-1 border-t border-slate-200 pt-3">
          <div className="flex justify-between">
            <span className="text-slate-500">Subtotal</span>
            <span>PKR {invoice.subtotal?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tax ({Math.round(invoice.taxRate * 100)}%)</span>
            <span>PKR {invoice.taxAmount?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-base mt-2">
            <span>Total</span>
            <span>PKR {invoice.total?.toLocaleString()}</span>
          </div>
          <div
            className={`text-center rounded-lg py-1 mt-3 text-xs font-bold uppercase ${
              invoice.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {invoice.paymentStatus === 'paid' ? '✓ PAID' : 'UNPAID — DUE'}
          </div>
        </div>

        <div className="mt-6 flex gap-2 print:hidden">
          <button className="btn-primary flex-1" onClick={() => window.print()}>
            🖨 Print
          </button>
          <button className="btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
