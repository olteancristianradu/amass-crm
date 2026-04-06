import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { rateLimitStrict } from './middleware/rateLimiter';
import { auditMiddleware } from './middleware/audit';
import { metricsMiddleware, register } from './middleware/metrics';

// Module routes
import authRoutes from './modules/auth/auth.routes';
import oauthRoutes from './modules/auth/oauth.routes';
import userRoutes from './modules/users/user.routes';
import clientRoutes from './modules/clients/client.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import companyRoutes from './modules/companies/company.routes';
import contactRoutes from './modules/contacts/contact.routes';
import pipelineRoutes from './modules/pipelines/pipeline.routes';
import dealRoutes from './modules/deals/deal.routes';
import productRoutes from './modules/products/product.routes';
import taskRoutes from './modules/tasks/task.routes';
import calendarRoutes from './modules/calendar/calendar.routes';
import calendarSyncRoutes from './modules/calendar/calendar-sync.routes';
import activityRoutes from './modules/activities/activity.routes';
import tagRoutes from './modules/tags/tag.routes';
import customFieldRoutes from './modules/custom-fields/custom-field.routes';
import emailRoutes from './modules/email/email.routes';
import smsRoutes from './modules/sms/sms.routes';
import workflowRoutes from './modules/workflows/workflow.routes';
import apiKeyRoutes from './modules/api-keys/api-key.routes';
import webhookRoutes from './modules/webhooks/webhook.routes';
import reportRoutes from './modules/reports/report.routes';
import exportRoutes from './modules/reports/export.routes';
import gdprRoutes from './modules/gdpr/gdpr.routes';
import billingRoutes from './modules/billing/billing.routes';
import aiRoutes from './modules/ai/ai.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import sequenceRoutes from './modules/sequences/sequence.routes';
import sandboxRoutes from './modules/admin/sandbox.routes';
import whitelabelRoutes from './modules/admin/whitelabel.routes';
import migrationRoutes from './modules/admin/migration.routes';
import backupRoutes from './modules/admin/backup.routes';
import segmentRoutes from './modules/segments/segment.routes';
import revenueRoutes from './modules/reports/revenue.routes';
import callRoutes from './modules/calls/call.routes';
import slackRoutes from './modules/integrations/slack.routes';
import zapierRoutes from './modules/integrations/zapier.routes';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes';
import emailTrackingRoutes from './modules/email/email-tracking.routes';

const app = express();

// Trust first proxy (Nginx/LB) so req.ip reflects X-Forwarded-For
app.set('trust proxy', 1);

// Security & parsing
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('short'));

// Metrics
app.use(metricsMiddleware);
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Health check — probes DB and Redis connectivity
app.get('/api/health', async (_req, res) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  // Database check
  try {
    const { prisma: db } = await import('./config/database');
    await db.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    healthy = false;
  }

  // Redis check (optional — only if REDIS_URL is set)
  if (env.REDIS_URL) {
    try {
      const Redis = require('ioredis');
      const redis = new Redis(env.REDIS_URL);
      await redis.ping();
      redis.disconnect();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
      healthy = false;
    }
  } else {
    checks.redis = 'not_configured';
  }

  const status = healthy ? 'ok' : 'degraded';
  res.status(healthy ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    checks,
  });
});

// Public routes (no auth required)
app.use('/api/v1/email', emailTrackingRoutes); // open pixel, click tracking
app.use('/api/v1/calls', callRoutes); // Twilio webhooks
app.use('/api/v1/integrations', slackRoutes); // Slack webhooks
app.use('/api/v1/integrations', zapierRoutes); // Zapier hooks
app.use('/api/v1/whatsapp', whatsappRoutes); // WhatsApp webhooks

// Auth (rate limited)
app.use('/api/v1/auth', rateLimitStrict, authRoutes);
app.use('/api/v1/auth/oauth', oauthRoutes);

// Audit logging (after auth, before module routes)
app.use(auditMiddleware);

// Core CRM
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/contacts', contactRoutes);
app.use('/api/v1/pipelines', pipelineRoutes);
app.use('/api/v1/deals', dealRoutes);
app.use('/api/v1/products', productRoutes);

// Activities & tasks
app.use('/api/v1/activities', activityRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/calendar', calendarRoutes);
app.use('/api/v1/calendar/sync', calendarSyncRoutes);

// Organization
app.use('/api/v1/tags', tagRoutes);
app.use('/api/v1/custom-fields', customFieldRoutes);

// Communication
app.use('/api/v1/email', emailRoutes);
app.use('/api/v1/sms', smsRoutes);

// Automation
app.use('/api/v1/workflows', workflowRoutes);
app.use('/api/v1/sequences', sequenceRoutes);

// Analytics
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/reports', exportRoutes);

// Platform
app.use('/api/v1/api-keys', apiKeyRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/gdpr', gdprRoutes);
app.use('/api/v1/billing', billingRoutes);

// AI
app.use('/api/v1/ai', aiRoutes);

// Notifications
app.use('/api/v1/notifications', notificationRoutes);

// Admin
app.use('/api/v1/admin/sandbox', sandboxRoutes);
app.use('/api/v1/admin/whitelabel', whitelabelRoutes);
app.use('/api/v1/admin/migration', migrationRoutes);
app.use('/api/v1/admin/backup', backupRoutes);

// Segments
app.use('/api/v1/segments', segmentRoutes);

// Revenue reports
app.use('/api/v1/reports', revenueRoutes);

// Error handling
app.use(errorHandler);

export default app;
