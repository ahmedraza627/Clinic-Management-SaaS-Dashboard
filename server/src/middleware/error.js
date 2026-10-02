import { config } from '../config.js';

export function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

/**
 * Central error handler. Controllers are wrapped with `wrap` (below) so any
 * rejected promise in an async route lands here instead of crashing the
 * process or hanging the request.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Mongoose validation / cast errors → 4xx, everything else → 500.
  if (err.name === 'ValidationError') {
    const details = Object.fromEntries(
      Object.entries(err.errors ?? {}).map(([k, v]) => [k, v.message])
    );
    return res.status(422).json({ error: 'Validation failed', details });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Invalid id format: ${err.value}` });
  }
  if (err.code === 11000) {
    return res.status(409).json({ error: 'Duplicate key', details: err.keyValue });
  }

  console.error('[api] Unhandled error:', err);
  const expose = config.env !== 'production';
  res.status(err.status ?? 500).json({
    error: expose ? err.message : 'Internal server error',
    ...(expose && err.stack ? { stack: err.stack.split('\n').slice(0, 4) } : {}),
  });
}

/** Tiny helper so controllers can stay try/catch-free. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
