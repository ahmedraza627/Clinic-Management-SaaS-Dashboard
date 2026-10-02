import { createApp } from './app.js';
import { connectDB, disconnectDB } from './db.js';
import { config } from './config.js';

async function main() {
  await connectDB();
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`[api] Clinic API listening on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = async (signal) => {
    console.log(`\n[api] ${signal} received — closing server, draining DB pool...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    // Hard exit safety net if sockets hang around.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[api] Fatal boot error:', err);
  process.exit(1);
});
