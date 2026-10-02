# 🩺 ClinicOS — Clinic Management SaaS Dashboard

High-performance clinic management platform: **React + Vite + Tailwind** frontend, **Node.js/Express** API, **MongoDB (Mongoose)** persistence — engineered around explicit, explainable MongoDB indexing for fast search, scheduling, and billing.

## Root Structure

```
clinic-saas-dashboard/
├── package.json               # npm workspaces root (server + client)
├── server/                    # Express API
│   ├── src/
│   │   ├── server.js          # boot: connectDB → listen → graceful shutdown
│   │   ├── app.js             # app factory (cors, json, routes, error handling)
│   │   ├── config.js          # env config with safe defaults
│   │   ├── db.js              # mongoose connection (pool sizing)
│   │   ├── models/            # Patient, Appointment, Invoice, Doctor
│   │   ├── controllers/       # business logic (lean() everywhere analytical)
│   │   ├── routes/            # /api/patients | appointments | invoices | analytics
│   │   ├── middleware/        # request logger, central error handler
│   │   └── utils/slots.js     # pure slot/date helpers
│   ├── src/seed.js            # demo data generator
│   └── .env.example
└── client/                    # React SPA
    ├── src/
    │   ├── main.jsx           # mount + ClinicProvider
    │   ├── App.jsx            # sidebar layout + hash router
    │   ├── api.js             # fetch client
    │   ├── context/           # Context API store (stats, modals, toasts)
    │   ├── components/        # layout, ui, patients, appointments
    │   └── pages/             # Dashboard, Patients, Appointments, Billing
    └── vite.config.js         # /api proxy → :4000
```

## Quick Start

```bash
# 1. Install all workspaces
npm install

# 2. Configure
#    Local mongod (default):  MONGO_URI=mongodb://127.0.0.1:27017/clinic_dev
#    Cloud (no local service): follow the Atlas walkthrough in server/.env.example
#    — create a free M0 cluster, add a DB user + your IP, paste the SRV string
#      into server/.env, and `npm run seed` writes straight to the cloud.
cp server/.env.example server/.env

# 3. Seed demo data (works against local OR Atlas — MONGO_URI decides)
npm run seed

# 4. Run API (:4000) + client (:5173) together
npm run dev
```

### Bundle architecture

The app shell ships without the charting library: `Dashboard` lazy-loads
`AnalyticsCharts` (`React.lazy` + `Suspense`), and `vite.config.js` splits
`react`/`react-dom` (`vendor-react`) from `recharts` (`vendor-charts`).
Recharts (~450 kB) is downloaded only when the analytics view actually renders,
and both vendor chunks stay cached across app deploys.

Build memory headroom is handled via `cross-env NODE_OPTIONS=--max-old-space-size=2048`
in the client build script (works on Windows cmd, PowerShell, and POSIX shells).

## MongoDB Indexing Strategy (the CV-worthy part)

### Appointments — `{ doctorId: 1, date: 1, status: 1 }`
Serves the **hottest query in the system**: "which slots does doctor X have booked on day D, excluding cancelled?" Equality on `doctorId` + `date`, filter on `status` — one index traversal, no collection scan, no in-memory sort. Also backs the doctor day-schedule view. Follows ESR (Equality → Sort → Range) rule.

### Appointments — `{ patientId: 1, date: -1 }`
Patient appointment timeline, newest-first **without a blocking sort** — the index order *is* the sort order. Backs patient history views and per-patient counts.

### Patients — text index `{ name: 'text', phone: 'text', cnic: 'text' }`
The global fast-search endpoint (`GET /api/patients/search?q=`) uses `$text` so **one** index answers "match any of name / phone / CNIC", instead of three `case-insensitive $regex` scans that cannot use normal indexes efficiently. Results ranked by `$meta: 'textScore'`.

Supporting indexes: `Patient { cnic: 1 } unique` (natural business key), `Patient { createdAt: -1 }` (recent registrations), `Invoice { paymentStatus: 1, issuedAt: -1 }` (unpaid queue / ledger), `Invoice { patientId: 1, issuedAt: -1 }` (billing history).

### lean() optimization
All list/chart/aggregate endpoints use `.lean()`: plain JS objects skip Mongoose hydration (getters/setters, change tracking, `$__state`), typically **3–10× less CPU per row** on read paths. Full documents are only used where `save()` + validation matter (creating invoices, editing patients). Verify with:

```bash
# e.g. confirm IXSCAN (not COLLSCAN) on the availability query
mongosh clinic_dev --eval 'db.appointments.find({ doctorId: ObjectId("..."), date: ISODate("2026-10-02"), status: { $in: ["pending","confirmed"] } }).explain("executionStats")'
```

## API Reference (Step 1)

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | uptime + DB state |
| GET | `/api/patients/search?q=` | **text-index fast search** (name/phone/cnic) |
| GET | `/api/doctors` | active doctors for the booking modal |
| GET/POST | `/api/patients` | paginated directory / register |
| GET/PUT | `/api/patients/:id` | full record / demographics |
| POST | `/api/patients/:id/vitals` | append vitals (capped `$slice: -100`) |
| POST | `/api/patients/:id/history` | append medical-history entry |
| GET | `/api/appointments/availability?doctorId&date` | free-slot grid (compound index) |
| GET/POST | `/api/appointments` | day schedule / book (409 on conflict) |
| PATCH | `/api/appointments/:id/status` | atomic workflow transition |
| GET/POST | `/api/invoices` | ledger / create (server-side totals) |
| GET | `/api/invoices/:id` | printable receipt payload |
| PATCH | `/api/invoices/:id/payment` | mark paid / unpaid |
| GET | `/api/analytics/dashboard` | top stats header numbers |
| GET | `/api/analytics/visits/daily?days=` | Recharts daily visits series |
| GET | `/api/analytics/revenue/monthly?months=` | Recharts monthly revenue series |
| GET | `/api/analytics/status-distribution` | appointment-status pie chart |

## Business Rules Enforced Server-Side

- **Appointment workflow**: `pending → confirmed → completed` (+ `cancelled` from pending/confirmed). Enforced **atomically** via `findOneAndUpdate({ _id, status: { $in: legalSources } })` — no read-then-write races, terminal states are immutable.
- **Booking conflicts**: 409 if the doctor already has a pending/confirmed appointment in that slot (index-served check).
- **Money math**: clients never send totals — `recalcTotals()` computes `subtotal` / `taxAmount` (rounded) / `total` server-side from line items. Whole-rupee amounts.
- **Receipts**: `GET /api/invoices/:id` returns the itemized printable structure rendered by the client with `window.print()`.

## Next Steps (Step 3 candidates)

- Auth (JWT + roles: admin / doctor / receptionist)
- Unique partial index `{ doctorId, date, slot }` for strict double-booking prevention
- React Router deep links + optimistic UI updates
- PDF receipt generation server-side
- Docker Compose for MongoDB + API + client
