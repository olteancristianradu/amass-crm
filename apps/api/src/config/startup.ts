/**
 * Startup validation and configuration check module.
 *
 * Validates all required environment variables and system configurations
 * before the application attempts to start. This prevents runtime crashes
 * due to missing configuration or invalid database connections.
 *
 * Called in Dockerfile CMD before running migrations and starting the server.
 */

import { env } from './env';

interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that DATABASE_URL is set and appears to be a valid PostgreSQL URI.
 * Returns false if DATABASE_URL is empty or malformed.
 */
function validateDatabaseUrl(): { ok: boolean; message?: string } {
  if (!env.DATABASE_URL || env.DATABASE_URL.trim() === '') {
    return {
      ok: false,
      message:
        'DATABASE_URL environment variable is not set. This is REQUIRED for the application to run. ' +
        'Please set DATABASE_URL to a PostgreSQL connection string (e.g., postgresql://user:password@host:5432/dbname).',
    };
  }

  // Basic validation: should start with postgresql:// or postgres://
  if (!env.DATABASE_URL.match(/^postgres(?:ql)?:\/\//i)) {
    return {
      ok: false,
      message:
        `DATABASE_URL appears to be invalid: "${env.DATABASE_URL}". ` +
        'Must be a valid PostgreSQL URI starting with "postgresql://" or "postgres://".',
    };
  }

  return { ok: true };
}

/**
 * Validates JWT secrets are not using development defaults in production.
 * In production (NODE_ENV=production), JWT_SECRET must not be the default value.
 */
function validateJwtSecrets(): { issues: string[] } {
  const issues: string[] = [];

  if (env.NODE_ENV === 'production') {
    if (env.JWT_SECRET === 'dev-secret-change-me') {
      issues.push(
        'SECURITY: JWT_SECRET is using the development default value in production. ' +
          'This is a critical security issue. Please set JWT_SECRET to a strong random secret.',
      );
    }

    if (env.JWT_REFRESH_SECRET === 'dev-refresh-secret-change-me') {
      issues.push(
        'SECURITY: JWT_REFRESH_SECRET is using the development default value in production. ' +
          'This is a critical security issue. Please set JWT_REFRESH_SECRET to a strong random secret.',
      );
    }
  }

  return { issues };
}

/**
 * Validates that API_PORT is a valid number and within reasonable range.
 */
function validatePort(): { ok: boolean; message?: string } {
  const port = env.API_PORT;
  if (port < 1 || port > 65535 || isNaN(port)) {
    return {
      ok: false,
      message: `API_PORT must be a valid port number (1-65535). Current value: ${port}`,
    };
  }
  return { ok: true };
}

/**
 * Validates optional integrations but only warns if missing (doesn't block startup).
 * These are features that gracefully degrade if not configured.
 */
function validateOptionalIntegrations(): { warnings: string[] } {
  const warnings: string[] = [];

  // Warn about missing optional integrations only in production
  if (env.NODE_ENV === 'production') {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      warnings.push('Google OAuth not configured - Gmail integration will not work.');
    }

    if (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET) {
      warnings.push('Microsoft OAuth not configured - Outlook integration will not work.');
    }

    if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
      warnings.push('Slack integration not configured.');
    }

    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      warnings.push('Twilio not configured - SMS functionality will not work.');
    }

    if (!env.STRIPE_SECRET_KEY) {
      warnings.push('Stripe not configured - billing features will not work.');
    }

    if (!env.OPENAI_API_KEY) {
      warnings.push('OpenAI not configured - AI features (transcription, summarization) will not work.');
    }

    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
      warnings.push('SMTP not configured - scheduled report delivery will not work.');
    }

    if (!process.env.SENTRY_DSN) {
      warnings.push('Sentry not configured - error tracking and monitoring will not work.');
    }
  }

  return { warnings };
}

/**
 * Runs all startup validations and collects results.
 * Returns an object with ok flag and arrays of errors and warnings.
 */
export function validateStartup(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log('[Startup] Validating configuration...');

  // Critical validations - failures block startup
  const dbValidation = validateDatabaseUrl();
  if (!dbValidation.ok) {
    errors.push(dbValidation.message || 'DATABASE_URL validation failed');
  } else {
    console.log('[Startup] ✓ DATABASE_URL is configured');
  }

  const portValidation = validatePort();
  if (!portValidation.ok) {
    errors.push(portValidation.message || 'API_PORT validation failed');
  } else {
    console.log(`[Startup] ✓ API port (${env.API_PORT}) is valid`);
  }

  // JWT secret warnings in production
  const jwtIssues = validateJwtSecrets();
  if (jwtIssues.issues.length > 0) {
    errors.push(...jwtIssues.issues);
  }

  // Optional integration warnings
  const optionalWarnings = validateOptionalIntegrations();
  if (optionalWarnings.warnings.length > 0) {
    warnings.push(...optionalWarnings.warnings);
  }

  console.log(`[Startup] Node environment: ${env.NODE_ENV}`);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Utility function to check if DATABASE_URL is properly configured.
 * Can be used to determine if migrations should run or if the app should start.
 */
export function isDatabaseConfigured(): boolean {
  return !!(env.DATABASE_URL && env.DATABASE_URL.trim() !== '');
}
