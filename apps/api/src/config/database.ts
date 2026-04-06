/**
 * Modulul de configurare a conexiunii la baza de date.
 *
 * Rol in arhitectura sistemului:
 *   - Creeaza si exporta o instanta unica (singleton) a clientului Prisma ORM.
 *   - Toate modulele de servicii (auth.service, user.service, client.service, dashboard.service)
 *     importa `prisma` de aici pentru a executa interogari in baza de date PostgreSQL.
 *   - In modul development, logheaza query-urile, erorile si avertismentele in consola
 *     pentru depanare (debugging). In productie, logheaza doar erorile.
 *
 * Flux de date:
 *   Prisma Client  ->  (citeste DATABASE_URL din process.env)  ->  PostgreSQL
 *
 * Cum se modifica:
 *   - Pentru a schimba nivelul de logare, modifica array-ul `log`.
 *   - Pentru a adauga middleware Prisma (ex: soft delete), adauga-l dupa crearea instantei.
 *   - Schema bazei de date se modifica din `prisma/schema.prisma`, nu din acest fisier.
 */

import { PrismaClient } from '@prisma/client';

/**
 * Instanta globala a clientului Prisma.
 * Prisma citeste automat variabila DATABASE_URL din process.env pentru conexiune.
 *
 * Configurare logare:
 *   - 'query': Afiseaza fiecare interogare SQL generata (util pentru optimizare)
 *   - 'error': Afiseaza erorile de baza de date
 *   - 'warn': Afiseaza avertismentele (ex: deprecari)
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
