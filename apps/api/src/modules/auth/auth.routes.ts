/**
 * Definitia rutelor HTTP pentru modulul de autentificare.
 *
 * Rol in arhitectura sistemului:
 *   - Inregistreaza endpoint-urile API pentru login, refresh si logout.
 *   - Aplica middleware-urile de validare si autentificare pe fiecare ruta.
 *   - Este montat in app.ts pe prefixul '/api/v1/auth'.
 *
 * Rute disponibile:
 *   POST /api/v1/auth/login    - Autentificare (public, fara token necesar)
 *   POST /api/v1/auth/refresh  - Reinnoirea token-urilor (public, trimite refresh token)
 *   POST /api/v1/auth/logout   - Delogare (necesita autentificare, sterge refresh token)
 *
 * Flux de date:
 *   Client HTTP  ->  Router Express  ->  validate() middleware  ->  Controller  ->  Service
 *
 * Cum se modifica:
 *   - Pentru a adauga un nou endpoint (ex: POST /forgot-pin), adauga o linie router.post()
 *     cu schema de validare si functia controller corespunzatoare.
 *   - Ordinea middleware-urilor conteaza: validate se executa inaintea controller-ului.
 */

import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { loginSchema, refreshSchema, registerSchema, changePasswordSchema, verify2faSchema } from './auth.schema';
import * as ctrl from './auth.controller';

const router = Router();

/**
 * POST /login - Autentificare utilizator
 * Middleware: validate(loginSchema) - valideaza userId si pin din body
 * Controller: ctrl.login - autentifica si returneaza token-urile
 * Nu necesita autentificare (este endpoint public).
 */
router.post('/login', validate(loginSchema), ctrl.login);

/**
 * POST /refresh - Reinnoirea token-urilor JWT
 * Middleware: validate(refreshSchema) - valideaza refreshToken din body
 * Controller: ctrl.refresh - verifica refresh token si genereaza token-uri noi
 * Nu necesita autentificare (clientul trimite refresh token-ul in body).
 */
router.post('/refresh', validate(refreshSchema), ctrl.refresh);

/**
 * POST /logout - Delogare utilizator
 * Middleware: authenticate - verifica token-ul JWT de acces (necesita utilizator autentificat)
 * Controller: ctrl.logout - sterge refresh token-ul din baza de date
 * Necesita autentificare pentru a preveni delogarea neautorizata a altor utilizatori.
 */
router.post('/logout', authenticate, ctrl.logout);

router.post('/register', validate(registerSchema), ctrl.register);
router.post('/change-password', authenticate, validate(changePasswordSchema), ctrl.changePassword);
router.post('/2fa/setup', authenticate, ctrl.setup2fa);
router.post('/2fa/verify', authenticate, validate(verify2faSchema), ctrl.verify2fa);
router.get('/sessions', authenticate, ctrl.listSessions);
router.delete('/sessions/:id', authenticate, ctrl.revokeSession);
router.delete('/sessions', authenticate, ctrl.revokeAllSessions);

export default router;
