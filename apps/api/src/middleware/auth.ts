/**
 * Middleware de autentificare si autorizare.
 *
 * Rol in arhitectura sistemului:
 *   - Protejeaza rutele API care necesita un utilizator autentificat.
 *   - Verifica token-ul JWT din header-ul Authorization al cererii HTTP.
 *   - Dupa verificare, ataseaza payload-ul JWT (userId, tenantId, role) pe obiectul `req.user`.
 *   - Ofera si middleware de autorizare bazat pe roluri (ADMIN, SELLER).
 *
 * Flux de date:
 *   Request HTTP  ->  header Authorization: Bearer <token>
 *     ->  jwt.verify()  ->  payload decodat  ->  req.user  ->  next()
 *
 * Tratarea erorilor:
 *   - 401 Unauthorized: Lipseste header-ul Authorization sau token-ul este invalid/expirat.
 *   - 403 Forbidden: Utilizatorul nu are rolul necesar pentru a accesa resursa.
 *
 * Cum se modifica:
 *   - Pentru a adauga un nou rol, modifica tipul UserRole din @amass/shared si
 *     foloseste requireRole() cu noul rol in rutele dorite.
 *   - Pentru a schimba strategia de autentificare (ex: API key), modifica functia authenticate().
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { JwtPayload, UserRole } from '@amass/shared';

/**
 * Extinderea interfetei Express Request pentru a include campul `user`.
 * Aceasta permite accesul la datele utilizatorului autentificat (userId, tenantId, role)
 * in orice handler de ruta sau middleware ulterior, prin `req.user`.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware de autentificare - verifica token-ul JWT din cerere.
 *
 * Pasi:
 *   1. Extrage header-ul Authorization din cererea HTTP.
 *   2. Verifica daca header-ul incepe cu 'Bearer ' (schema Bearer Token).
 *   3. Extrage token-ul JWT (dupa primele 7 caractere 'Bearer ').
 *   4. Verifica semnatura si validitatea token-ului folosind JWT_SECRET.
 *   5. Daca este valid, ataseaza payload-ul decodat pe req.user si apeleaza next().
 *   6. Daca token-ul este invalid sau expirat, returneaza 401.
 *
 * @param req - Cererea HTTP Express
 * @param res - Raspunsul HTTP Express
 * @param next - Functia pentru a trece la urmatorul middleware
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  /* Pasul 1: Citim header-ul Authorization */
  const header = req.headers.authorization;

  /* Pasul 2: Verificam formatul 'Bearer <token>' */
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  /* Pasul 3: Extragem token-ul JWT (eliminam prefixul 'Bearer ') */
  const token = header.slice(7);

  try {
    /* Pasul 4-5: Verificam si decodam token-ul JWT */
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    /* Pasul 6: Token invalid sau expirat - returnam 401 Unauthorized */
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware de autorizare bazat pe roluri.
 *
 * Returneaza un middleware care verifica daca utilizatorul autentificat are
 * unul dintre rolurile specificate. Trebuie folosit DUPA middleware-ul `authenticate`.
 *
 * Pasi:
 *   1. Verifica daca req.user exista (utilizatorul este autentificat).
 *   2. Verifica daca rolul utilizatorului se regaseste in lista de roluri permise.
 *   3. Daca da, apeleaza next(). Daca nu, returneaza 403 Forbidden.
 *
 * Exemplu de utilizare:
 *   router.post('/', requireRole('ADMIN'), ctrl.create);
 *   router.delete('/:id', requireRole('ADMIN', 'SELLER'), ctrl.remove);
 *
 * @param roles - Lista de roluri permise (ex: 'ADMIN', 'SELLER')
 * @returns Middleware Express
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    /* Verificam daca utilizatorul este autentificat */
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    /* Verificam daca rolul utilizatorului este in lista de roluri permise */
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    /* Utilizatorul are rolul necesar - continuam la urmatorul middleware */
    next();
  };
}
