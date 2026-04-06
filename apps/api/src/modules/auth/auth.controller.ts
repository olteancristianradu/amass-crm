/**
 * Controller-ul modulului de autentificare.
 *
 * Rol in arhitectura sistemului:
 *   - Face legatura intre rutele HTTP si serviciul de autentificare (AuthService).
 *   - Extrage datele din cererea HTTP (req.body), apeleaza serviciul corespunzator
 *     si returneaza raspunsul JSON catre client.
 *   - Trateaza erorile aruncate de serviciu si le transforma in raspunsuri HTTP
 *     cu status code-uri adecvate (401 pentru autentificare esuata, 500 pentru erori interne).
 *
 * Flux de date:
 *   Ruta HTTP  ->  validate() middleware  ->  Controller  ->  AuthService  ->  DB
 *     ->  raspuns JSON (tokens)  ->  Client
 *
 * Cum se modifica:
 *   - Pentru a adauga un nou endpoint de auth (ex: /register), creaza o noua functie
 *     controller aici si inregistreaz-o in auth.routes.ts.
 *   - Logica de business (verificare PIN, generare token) NU se pune aici,
 *     ci in auth.service.ts.
 */

import { Request, Response } from 'express';
import { AuthService } from './auth.service';

/** Instanta serviciului de autentificare, folosita de toate functiile controller */
const authService = new AuthService();

/**
 * Handler pentru POST /api/v1/auth/login
 * Autentifica un utilizator cu userId si optional PIN.
 *
 * Pasi:
 *   1. Extrage userId si pin din req.body (deja validate de loginSchema).
 *   2. Apeleaza authService.login() pentru autentificare.
 *   3. Daca reuseste, returneaza 200 cu { accessToken, refreshToken }.
 *   4. Daca esueaza (utilizator inexistent, PIN gresit etc.), returneaza 401.
 *
 * @param req - Cererea HTTP cu body: { userId: string, pin?: string }
 * @param res - Raspunsul HTTP
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { userId, pin, email, password } = req.body;
    let tokens;
    if (email && password) {
      tokens = await authService.loginWithPassword(email, password);
    } else if (userId) {
      tokens = await authService.login(userId, pin);
    } else {
      res.status(400).json({ error: 'Provide email+password or userId+pin' });
      return;
    }
    res.json(tokens);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(401).json({ error: message });
  }
}

/**
 * Handler pentru POST /api/v1/auth/refresh
 * Reinnoieste token-urile de acces folosind un refresh token valid.
 *
 * Pasi:
 *   1. Extrage refreshToken din req.body (deja validat de refreshSchema).
 *   2. Apeleaza authService.refresh() pentru a genera noi token-uri.
 *   3. Daca reuseste, returneaza 200 cu noile { accessToken, refreshToken }.
 *   4. Daca refresh token-ul este invalid/expirat, returneaza 401.
 *
 * @param req - Cererea HTTP cu body: { refreshToken: string }
 * @param res - Raspunsul HTTP
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refresh(refreshToken);
    res.json(tokens);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Refresh failed';
    res.status(401).json({ error: message });
  }
}

/**
 * Handler pentru POST /api/v1/auth/logout
 * Delogheaza utilizatorul prin invalidarea refresh token-ului.
 *
 * NOTA: Aceasta ruta necesita autentificare (middleware `authenticate` in routes).
 *
 * Pasi:
 *   1. Extrage refreshToken din req.body.
 *   2. Apeleaza authService.logout() pentru a sterge token-ul din baza de date.
 *   3. Returneaza 200 cu { success: true }.
 *   4. Daca apare o eroare, returneaza 500.
 *
 * @param req - Cererea HTTP cu body: { refreshToken: string }
 * @param res - Raspunsul HTTP
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Logout failed' });
  }
}

/**
 * Handler for POST /api/v1/auth/register
 * Registers a new user, optionally creating a new tenant.
 *
 * @param req - HTTP request with body: { email, password, name, tenantName? }
 * @param res - HTTP response with 201 and { accessToken, refreshToken } on success
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const tokens = await authService.register(req.body);
    res.status(201).json(tokens);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.userId, currentPassword, newPassword);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Password change failed';
    res.status(400).json({ error: message });
  }
}

export async function setup2fa(req: Request, res: Response): Promise<void> {
  try {
    const result = await authService.setup2fa(req.user!.userId);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '2FA setup failed';
    res.status(400).json({ error: message });
  }
}

export async function verify2fa(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.body;
    const result = await authService.verify2fa(req.user!.userId, code);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '2FA verification failed';
    res.status(400).json({ error: message });
  }
}

export async function listSessions(req: Request, res: Response): Promise<void> {
  try {
    const sessions = await authService.listSessions(req.user!.userId);
    res.json(sessions);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list sessions';
    res.status(500).json({ error: message });
  }
}

export async function revokeSession(req: Request, res: Response): Promise<void> {
  try {
    await authService.revokeSession(req.user!.userId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to revoke session';
    res.status(400).json({ error: message });
  }
}

export async function revokeAllSessions(req: Request, res: Response): Promise<void> {
  try {
    const exceptSessionId = req.query.except as string | undefined;
    await authService.revokeAllSessions(req.user!.userId, exceptSessionId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to revoke sessions';
    res.status(500).json({ error: message });
  }
}
