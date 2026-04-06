/**
 * Modulul de configurare a variabilelor de mediu (environment variables).
 *
 * Rol in arhitectura sistemului:
 *   - Este primul fisier incarcat de aplicatie, inainte de orice alt modul.
 *   - Incarca fisierul .env de pe disc folosind biblioteca `dotenv`.
 *   - Expune un obiect `env` cu toate variabilele necesare, cu valori implicite
 *     pentru mediul de dezvoltare (development).
 *   - Toate celelalte module (database, auth, socket etc.) importa `env` de aici.
 *
 * Flux de date:
 *   fisier .env pe disc  ->  dotenv.config()  ->  process.env  ->  obiect `env` exportat
 *
 * Cum se modifica:
 *   - Pentru a adauga o noua variabila de mediu, adauga o linie noua in obiectul `env`
 *     cu valoare implicita si apoi adauga variabila in fisierul .env.
 *   - Pentru productie, nu folosi valorile implicite pentru JWT_SECRET si JWT_REFRESH_SECRET.
 */

import dotenv from 'dotenv';
import path from 'path';

/**
 * Incarcam variabilele de mediu din fisierul .env aflat in radacina proiectului.
 * `path.resolve(__dirname, '../../../.env')` urca 3 directoare din `src/config/`
 * pana la radacina pachetului `apps/api/`.
 */
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

/**
 * Obiectul centralizat cu toate variabilele de configurare ale API-ului.
 *
 * Campuri:
 *   - NODE_ENV: Mediul curent (development / production / test)
 *   - API_PORT: Portul pe care asculta serverul HTTP
 *   - DATABASE_URL: URL-ul de conectare la baza de date PostgreSQL (folosit de Prisma)
 *   - JWT_SECRET: Cheia secreta pentru semnarea token-urilor JWT de acces
 *   - JWT_REFRESH_SECRET: Cheia secreta pentru token-urile de refresh (nefolosita inca,
 *     refresh token-ul este salvat in baza de date ca string opac)
 *   - JWT_EXPIRES_IN: Durata de valabilitate a token-ului de acces (ex: '15m')
 *   - JWT_REFRESH_EXPIRES_IN: Durata de valabilitate a refresh token-ului (ex: '7d')
 *   - CORS_ORIGIN: URL-ul frontend-ului permis prin CORS (ex: 'http://localhost:5173')
 *   - REDIS_URL: URL-ul Redis (pregatit pentru cache/sesiuni, nefolosit inca)
 *
 * `as const` face obiectul imutabil (readonly) la nivel de tip TypeScript.
 */
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_PORT: parseInt(process.env.API_PORT || '3000', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  REDIS_URL: process.env.REDIS_URL || '',

  // OAuth — Gmail
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/v1/email/connect/gmail/callback',

  // OAuth — Outlook
  MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID || '',
  MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET || '',
  MICROSOFT_REDIRECT_URI: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/api/v1/email/connect/outlook/callback',

  // SMTP (for scheduled report delivery)
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@amasscrm.com',

  // Base URL for tracking pixels / link rewrites
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',

  // OAuth redirect base URL for auth callbacks (defaults to BASE_URL)
  OAUTH_REDIRECT_BASE_URL: process.env.OAUTH_REDIRECT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000',

  // Twilio (SMS & Voice)
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',

  // WhatsApp Business API (Meta Cloud API)
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || '',
  WHATSAPP_WEBHOOK_SECRET: process.env.WHATSAPP_WEBHOOK_SECRET || '',

  // Slack
  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || '',
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || '',
  SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || '',

  // OpenAI (for AI transcription/summarization)
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',

  // Stripe (billing)
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  STRIPE_PRO_PRICE_ID: process.env.STRIPE_PRO_PRICE_ID || '',
  STRIPE_ENTERPRISE_PRICE_ID: process.env.STRIPE_ENTERPRISE_PRICE_ID || '',

  // App URL (frontend)
  APP_URL: process.env.APP_URL || 'http://localhost:5173',
} as const;
