import 'dotenv/config';

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: intEnv('PORT', 4000),
  // MONGO_URI (Atlas / docker / local) preferred; MONGODB_URI kept as legacy alias.
  mongoUri:
    process.env.MONGO_URI ??
    process.env.MONGODB_URI ??
    'mongodb://127.0.0.1:27017/clinic_dev',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  defaultTaxRate: Number(process.env.DEFAULT_TAX_RATE ?? 0.05), // 5% GST, overridable per invoice
};
