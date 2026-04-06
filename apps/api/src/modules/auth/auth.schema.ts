/**
 * Schemele de validare Zod pentru modulul de autentificare.
 *
 * Rol in arhitectura sistemului:
 *   - Defineste structura si regulile de validare pentru datele primite
 *     in endpoint-urile de autentificare (/login, /refresh).
 *   - Schemele sunt folosite de middleware-ul `validate()` pentru a valida
 *     req.body inainte ca datele sa ajunga la controller.
 *
 * Flux de date:
 *   Request HTTP (body JSON)  ->  validate(loginSchema)  ->  auth.controller  ->  auth.service
 *
 * Cum se modifica:
 *   - Pentru a face PIN-ul obligatoriu la login, schimba `.optional()` in `.min(4).max(8)`.
 *   - Pentru a adauga un nou endpoint de auth (ex: register), creaza o schema noua aici
 *     si foloseste-o in auth.routes.ts cu validate(noua_schema).
 */

import { z } from 'zod';

/**
 * Schema de validare pentru cererea de login.
 *
 * Campuri:
 *   - userId (string, obligatoriu, minim 1 caracter): ID-ul utilizatorului care se autentifica.
 *     In acest CRM, utilizatorii se logheaza cu ID-ul lor, nu cu email/parola.
 *   - pin (string, optional, 4-8 caractere): Codul PIN al utilizatorului.
 *     Este optional deoarece nu toti utilizatorii au PIN setat (vezi auth.service.ts).
 */
export const loginSchema = z.object({
  userId: z.string().min(1).optional(),
  pin: z.string().min(4).max(8).optional(),
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
}).refine(data => data.userId || data.email, {
  message: 'Either userId or email is required',
});

/**
 * Schema de validare pentru cererea de reinnoire a token-ului (refresh).
 *
 * Campuri:
 *   - refreshToken (string, obligatoriu, minim 1 caracter): Token-ul de refresh
 *     primit la login sau la un refresh anterior. Este un string hex generat aleator.
 */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
  tenantName: z.string().min(1).max(100).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/, 'Needs uppercase').regex(/[a-z]/, 'Needs lowercase').regex(/[0-9]/, 'Needs number'),
});

export const setup2faSchema = z.object({});

export const verify2faSchema = z.object({ code: z.string().length(6) });
