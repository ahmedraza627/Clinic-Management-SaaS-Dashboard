/** Thin fetch wrapper — same-origin /api via Vite proxy. */

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error ?? `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

export const api = {
  // patients
  searchPatients: (q) => request(`/api/patients/search?q=${encodeURIComponent(q)}`),
  listPatients: (page = 1, limit = 20) => request(`/api/patients?page=${page}&limit=${limit}`),
  getPatient: (id) => request(`/api/patients/${id}`),
  createPatient: (body) => request('/api/patients', { method: 'POST', body }),
  addVitals: (id, body) => request(`/api/patients/${id}/vitals`, { method: 'POST', body }),

  // doctors
  listDoctors: () => request('/api/doctors'),

  // appointments
  availability: (doctorId, date) =>
    request(`/api/appointments/availability?doctorId=${doctorId}&date=${date}`),
  listAppointments: (params = '') => request(`/api/appointments${params}`),
  bookAppointment: (body) => request('/api/appointments', { method: 'POST', body }),
  setAppointmentStatus: (id, status) =>
    request(`/api/appointments/${id}/status`, { method: 'PATCH', body: { status } }),

  // invoices
  listInvoices: (params = '') => request(`/api/invoices${params}`),
  markPaid: (id, paymentStatus) =>
    request(`/api/invoices/${id}/payment`, { method: 'PATCH', body: { paymentStatus } }),

  // analytics
  dashboard: () => request('/api/analytics/dashboard'),
  dailyVisits: (days = 30) => request(`/api/analytics/visits/daily?days=${days}`),
  monthlyRevenue: (months = 12) => request(`/api/analytics/revenue/monthly?months=${months}`),
  statusDistribution: () => request('/api/analytics/status-distribution'),
};
