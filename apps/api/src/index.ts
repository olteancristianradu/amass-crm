import http from 'http';
import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';
import { initSocket } from './socket';
import { initEventSubscribers } from './events/subscribers';
import { initSentry } from './config/sentry';
import logger from './config/logger';
import { validateStartup } from './config/startup';

async function main() {
  // Validate startup configuration
  const validation = validateStartup();
  if (!validation.ok) {
    console.error('\n[Startup] VALIDATION FAILED - Cannot start application:\n');
    validation.errors.forEach((error) => console.error(`  ❌ ${error}`));
    console.error('');
    process.exit(1);
  }

  // Log warnings if any
  if (validation.warnings.length > 0) {
    console.warn('\n[Startup] WARNINGS:\n');
    validation.warnings.forEach((warning) => console.warn(`  ⚠️  ${warning}`));
    console.warn('');
  }

  // Initialize Sentry (must be before other initializations)
  initSentry();

  // Test database connection
  await prisma.$connect();
  logger.info('Connected to PostgreSQL');

  const server = http.createServer(app);

  // Initialize WebSocket
  initSocket(server);
  logger.info('WebSocket server initialized');

  // Initialize event subscribers (socket.io forwarding + webhook delivery)
  initEventSubscribers();

  server.listen(env.API_PORT, () => {
    logger.info({ port: env.API_PORT, env: env.NODE_ENV }, 'Server running');
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await prisma.$disconnect();
    server.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
