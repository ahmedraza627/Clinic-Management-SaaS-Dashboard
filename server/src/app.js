import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config.js';
import { requestLogger } from './middleware/logger.js';
import { notFound, errorHandler } from './middleware/error.js';

import patientRoutes from './routes/patient.routes.js';
import doctorRoutes from './routes/doctors.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);

  // Health probe (DB state surfaced for uptime checks)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      env: config.env,
      db: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] ?? 'unknown',
      uptimeSec: Math.round(process.uptime()),
    });
  });

  app.use('/api/patients', patientRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/invoices', invoiceRoutes);
  app.use('/api/analytics', analyticsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
