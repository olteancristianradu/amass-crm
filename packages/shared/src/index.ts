/**
 * ============================================================================
 * INDEX.TS — Barrel export pentru pachetul @amass-crm/shared
 * ============================================================================
 *
 * Acesta este punctul principal de intrare (entry point) al pachetului shared.
 * Foloseste pattern-ul "barrel export" pentru a re-exporta toate tipurile,
 * constantele, utilitarele si traducerile dintr-un singur loc.
 *
 * Consumatorii (frontend si backend) importa totul din acest pachet:
 *   import { STAGES, STAGE_COLORS, ro, calcScore } from '@amass-crm/shared';
 *
 * Structura exporturilor:
 *   1. Types     — Tipurile TypeScript (exportate doar ca type, fara runtime)
 *   2. Constants — Constantele de configurare (etape, optiuni, scripturi)
 *   3. Utils     — Functii utilitare (sanitizare, date, scoring, parsare email)
 *   4. i18n      — Traducerile romana si engleza pentru interfata
 *
 * IMPORTANT: La adaugarea de noi module in pachetul shared, acestea trebuie
 * re-exportate si aici pentru a fi accesibile consumatorilor.
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipuri TypeScript — exportate doar la nivel de tip (fara cod generat la runtime)
// Folosite pentru type-safety in formulare, API-uri, si componente.
// ─────────────────────────────────────────────────────────────────────────────

/** Tipuri legate de client: modelul Client, etapele Stage, datele fisei, filtre, input-uri */
export type { Client, Stage, FisaData, ClientFilters, CreateClientInput, ImportEmailInput } from './types/client';

/** Tipuri legate de utilizator: modelul User, roluri, input-uri CRUD, autentificare JWT */
export type { User, UserRole, CreateUserInput, UpdateUserInput, LoginInput, AuthTokens, JwtPayload } from './types/user';

/** Tipuri legate de tenant (cont/organizatie): modelul Tenant, planuri, setari */
export type { Tenant, Plan, TenantSettings, CreateTenantInput } from './types/tenant';

/** Tipuri legate de pipeline: pasi script, tipologii, activitati, apeluri, rezistente, target-uri, sabloane, KPI-uri */
export type { ScriptStep, Typology, ActivityLog, Call, Resistance, Target, MessageTemplate, DashboardKpis, LeaderboardEntry } from './types/pipeline';

/** Tipuri legate de valuta: coduri valutare, detalii valuta */
export type { CurrencyCode, Currency } from './types/currency';

// ─────────────────────────────────────────────────────────────────────────────
// Constante — valori fixe folosite atat in frontend cat si in backend
// ─────────────────────────────────────────────────────────────────────────────

/** Etapele pipeline-ului (T1→T2→T3→Contractat/Pierdut), culorile si scripturile de apel */
export { STAGES, STAGE_COLORS, TRASEU, T2_STEPS, T3_STEPS } from './constants/stages';

/** Optiuni formulare (sisteme, constructie, izolatie etc.), tipologii clienti, motive pierdere, sabloane mesaje */
export { SISTEME, CONECTAT, CONSTRUCTIE, IZOLATIE, NIVEL_BANI, LOSS_REASONS, TIPOLOGII, TEMPLATES } from './constants/options';

/** Valutele suportate de sistem si utilitarele de formatare/conversie */
export { CURRENCIES, formatCurrency, convertCurrency } from './types/currency';

// ─────────────────────────────────────────────────────────────────────────────
// Utilitare — functii helper reutilizabile in frontend si backend
// ─────────────────────────────────────────────────────────────────────────────

/** Functii de sanitizare: san (text general), sanTel (numar telefon), sanEmail (adresa email) */
export { san, sanTel, sanEmail } from './utils/sanitize';

/** Functii de formatare date: fmtDate (formatare), daysBetween (diferenta zile), daysSince (zile de la o data) */
export { fmtDate, daysBetween, daysSince } from './utils/date';

/** Functii de scoring: calcScore (calculeaza scorul clientului), getNextAction (recomanda urmatoarea actiune) */
export { calcScore, getNextAction } from './utils/scoring';

/** Parser de email-uri: parseEmail (extrage datele clientului din textul unui email primit) */
export { parseEmail } from './utils/email-parser';

/** Tipul rezultatului parsat dintr-un email (structura datelor extrase) */
export type { ParsedEmail } from './utils/email-parser';

// ─────────────────────────────────────────────────────────────────────────────
// Internationalizare (i18n) — traducerile interfetei in romana si engleza
// ─────────────────────────────────────────────────────────────────────────────

/** Traducerile in limba romana (limba principala a aplicatiei) */
export { ro } from './i18n/ro';

/** Traducerile in limba engleza (limba alternativa) */
export { en } from './i18n/en';

/** Traducerile in limba germana */
export { de } from './i18n/de';

/** Traducerile in limba franceza */
export { fr } from './i18n/fr';

/** Traducerile in limba spaniola */
export { es } from './i18n/es';

/** Traducerile in limba italiana */
export { it } from './i18n/it';

/** Traducerile in limba portugheza */
export { pt } from './i18n/pt';

/** Traducerile in limba olandeza */
export { nl } from './i18n/nl';

/** Traducerile in limba poloneza */
export { pl } from './i18n/pl';

/** Traducerile in limba maghiara */
export { hu } from './i18n/hu';
