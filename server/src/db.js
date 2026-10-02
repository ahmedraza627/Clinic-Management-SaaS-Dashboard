import mongoose from 'mongoose';
import { config } from './config.js';

let connected = false;

/**
 * Connect to MongoDB with pool sizing tuned for read-heavy dashboard traffic.
 * Fires once at boot; routes share the single connection.
 */
export async function connectDB() {
  if (connected) return mongoose.connection;

  mongoose.set('strictQuery', true);

  await mongoose.connect(config.mongoUri, {
    // Read-heavy dashboard: allow concurrent analytical + CRUD queries.
    maxPoolSize: intEnvOr('MONGO_MAX_POOL', 20),
    minPoolSize: 2,
    serverSelectionTimeoutMS: 8_000,
    socketTimeoutMS: 45_000,
    // Write concern: majority for billing correctness (invoices must persist).
    // Journal: true for crash-safe financial writes.
  });

  connected = true;
  console.log(`[db] Connected → ${config.mongoUri}`);

  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
  mongoose.connection.on('reconnected', () => console.log('[db] reconnected'));
  return mongoose.connection;
}

export async function disconnectDB() {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
  console.log('[db] Connection closed');
}

function intEnvOr(name, fallback) {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}
