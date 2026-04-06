/**
 * Serviciul de autentificare (Auth Service).
 *
 * Rol in arhitectura sistemului:
 *   - Contine toata logica de business pentru autentificarea utilizatorilor.
 *   - Gestioneaza login-ul (cu verificare PIN), generarea token-urilor JWT,
 *     reinnoirea token-urilor (refresh) si delogarea (logout).
 *   - Este apelat de auth.controller.ts si nu interactioneaza direct cu HTTP.
 *
 * Flux de date:
 *   Controller  ->  AuthService.login()  ->  Prisma (DB query)
 *     ->  bcrypt.compare() (verificare PIN)  ->  jwt.sign() (generare token)
 *     ->  Prisma (salvare refresh token in DB)  ->  { accessToken, refreshToken }
 *
 * Securitate:
 *   - PIN-urile sunt stocate ca hash-uri bcrypt in baza de date (campul pinHash).
 *   - Token-urile JWT de acces expira dupa durata configurata in env.JWT_EXPIRES_IN.
 *   - Refresh token-urile sunt stocate in baza de date si sunt rotate la fiecare utilizare
 *     (refresh token rotation) pentru a preveni reutilizarea unui token furat.
 *
 * Cum se modifica:
 *   - Pentru a schimba durata refresh token-ului, modifica linia `expiresAt.setDate(+7)`.
 *   - Pentru a adauga 2FA, adauga un pas suplimentar in metoda login().
 *   - Pentru a invalida toate sesiunile unui utilizator, sterge toate refresh token-urile
 *     din baza de date pentru acel userId.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import type { JwtPayload, AuthTokens } from '@amass/shared';
import { validatePasswordPolicy } from '../../utils/password';

export class AuthService {
  /**
   * Autentifica un utilizator si returneaza token-urile de acces si refresh.
   *
   * Pasi:
   *   1. Cauta utilizatorul in baza de date dupa userId, incluzand datele tenant-ului.
   *   2. Verifica daca utilizatorul exista si este activ (isActive).
   *   3. Daca utilizatorul are un PIN setat (pinHash), verifica PIN-ul furnizat
   *      folosind bcrypt.compare().
   *   4. Construieste payload-ul JWT cu userId, tenantId si rolul utilizatorului.
   *   5. Semneaza token-ul JWT de acces cu JWT_SECRET si durata din JWT_EXPIRES_IN.
   *   6. Genereaza un refresh token aleator (64 bytes hex) si il salveaza in baza de date
   *      cu o data de expirare de 7 zile.
   *   7. Returneaza ambele token-uri.
   *
   * @param userId - ID-ul utilizatorului care se autentifica
   * @param pin - Codul PIN (optional, necesar doar daca utilizatorul are PIN setat)
   * @returns Obiect cu accessToken si refreshToken
   * @throws Error daca utilizatorul nu exista, este inactiv sau PIN-ul este gresit
   */
  async login(userId: string, pin?: string): Promise<AuthTokens> {
    /* Pasul 1: Cautam utilizatorul in baza de date, incluzand datele tenant-ului */
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    /* Pasul 2: Verificam existenta si starea activa a utilizatorului */
    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    /* Pasul 3: Daca utilizatorul are PIN setat, verificam PIN-ul furnizat */
    if (user.pinHash) {
      if (!pin) throw new Error('PIN required');
      const valid = await bcrypt.compare(pin, user.pinHash);
      if (!valid) throw new Error('Invalid PIN');
    }

    /* Pasul 4: Construim payload-ul JWT (datele care vor fi codificate in token) */
    const payload: JwtPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    /* Pasul 5: Semnam token-ul JWT de acces */
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as unknown as number,
    });

    /* Pasul 6: Generam un refresh token aleator si calculam data de expirare */
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    /* Salvam refresh token-ul in baza de date (tabelul RefreshToken) */
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    /* Pasul 7: Returnam cele doua token-uri */
    return { accessToken, refreshToken };
  }

  /**
   * Reinnoieste token-urile folosind un refresh token valid.
   * Implementeaza "refresh token rotation" - la fiecare utilizare, token-ul vechi
   * este sters si se genereaza unul nou, prevenind reutilizarea token-urilor furate.
   *
   * Pasi:
   *   1. Cauta refresh token-ul in baza de date, incluzand datele utilizatorului.
   *   2. Verifica daca exista si nu a expirat. Daca a expirat, il sterge din DB.
   *   3. Sterge token-ul vechi din baza de date (refresh token rotation).
   *   4. Genereaza un nou access token JWT si un nou refresh token.
   *   5. Salveaza noul refresh token in baza de date.
   *   6. Returneaza noile token-uri.
   *
   * @param refreshToken - Token-ul de refresh primit de la client
   * @returns Obiect cu noul accessToken si noul refreshToken
   * @throws Error daca refresh token-ul nu exista sau a expirat
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    /* Pasul 1: Cautam refresh token-ul in baza de date */
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    /* Pasul 2: Verificam existenta si validitatea (nu a expirat) */
    if (!stored || stored.expiresAt < new Date()) {
      /* Daca exista dar a expirat, il stergem din baza de date (curatare) */
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new Error('Invalid or expired refresh token');
    }

    /* Pasul 3: Stergem token-ul vechi (refresh token rotation) */
    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    /* Pasul 4: Construim payload-ul si generam noul access token */
    const payload: JwtPayload = {
      userId: stored.user.id,
      tenantId: stored.user.tenantId,
      role: stored.user.role,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as unknown as number,
    });

    /* Generam un nou refresh token aleator */
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    /* Pasul 5: Salvam noul refresh token in baza de date */
    await prisma.refreshToken.create({
      data: {
        userId: stored.user.id,
        token: newRefreshToken,
        expiresAt,
      },
    });

    /* Pasul 6: Returnam noile token-uri */
    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Delogheaza utilizatorul prin stergerea refresh token-ului din baza de date.
   *
   * Pasi:
   *   1. Sterge toate refresh token-urile care corespund token-ului furnizat.
   *   2. Foloseste deleteMany (nu delete) pentru a evita erori daca token-ul nu exista.
   *
   * Nota: Access token-ul JWT ramane valid pana la expirare (nu poate fi revocat
   * fara un mecanism de blacklist). Doar refresh token-ul este invalidat.
   *
   * @param refreshToken - Token-ul de refresh care trebuie invalidat
   */
  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  /**
   * Metoda statica pentru hash-uirea unui PIN folosind bcrypt.
   * Folosita la crearea sau actualizarea utilizatorilor (in user.service.ts).
   *
   * @param pin - Codul PIN in text clar
   * @returns Hash-ul bcrypt al PIN-ului (cu salt factor 10)
   */
  static async hashPin(pin: string): Promise<string> {
    return bcrypt.hash(pin, 10);
  }

  /**
   * Authenticate a user with email and password.
   * Implements account lockout after 5 failed attempts (30 min lock).
   */
  async loginWithPassword(email: string, password: string): Promise<AuthTokens> {
    const user = await prisma.user.findFirst({
      where: { email },
      include: { tenant: true },
    });

    if (!user || !user.isActive) {
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new Error('Account is locked. Try again later.');
    }

    if (!user.passwordHash) {
      throw new Error('Password login not configured for this user');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      // Increment failed attempts, lock at 5
      const attempts = user.failedLoginAttempts + 1;
      const updateData: Record<string, unknown> = { failedLoginAttempts: attempts };
      if (attempts >= 5) {
        const lockUntil = new Date();
        lockUntil.setMinutes(lockUntil.getMinutes() + 30);
        updateData.lockedUntil = lockUntil;
      }
      await prisma.user.update({ where: { id: user.id }, data: updateData });
      throw new Error('Invalid email or password');
    }

    // Reset counter on success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const payload: JwtPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as unknown as number,
    });

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Register a new user. Optionally creates a new tenant.
   */
  async register(data: { email: string; password: string; name: string; tenantName?: string }): Promise<AuthTokens> {
    const policyResult = validatePasswordPolicy(data.password);
    if (!policyResult.valid) {
      throw new Error(`Password policy violation: ${policyResult.errors.join(', ')}`);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    let tenantId: string;

    if (data.tenantName) {
      const slug = data.tenantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const tenant = await prisma.tenant.create({
        data: { name: data.tenantName, slug: `${slug}-${Date.now()}` },
      });
      tenantId = tenant.id;
    } else {
      // Assign to first available tenant or fail
      const defaultTenant = await prisma.tenant.findFirst();
      if (!defaultTenant) {
        throw new Error('No tenant available. Provide a tenantName to create one.');
      }
      tenantId = defaultTenant.id;
    }

    const user = await prisma.user.create({
      data: {
        tenantId,
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.tenantName ? 'ADMIN' : 'SELLER',
      },
    });

    const payload: JwtPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as unknown as number,
    });

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  /**
   * Change a user's password after verifying the current one.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const policyResult = validatePasswordPolicy(newPassword);
    if (!policyResult.valid) {
      throw new Error(`Password policy violation: ${policyResult.errors.join(', ')}`);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.passwordHash) {
      throw new Error('User not found or password not set');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new Error('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, passwordChangedAt: new Date() },
    });
  }

  /**
   * Set up TOTP 2FA for a user. Returns the secret and otpauth URI.
   */
  async setup2fa(userId: string): Promise<{ secret: string; uri: string }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const secretBytes = crypto.randomBytes(20);
    // Encode as base32
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let base32 = '';
    let bits = 0;
    let value = 0;
    for (const byte of secretBytes) {
      value = (value << 8) | byte;
      bits += 8;
      while (bits >= 5) {
        base32 += base32Chars[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) {
      base32 += base32Chars[(value << (5 - bits)) & 31];
    }

    await prisma.user.update({
      where: { id: userId },
      data: { totpSecret: base32 },
    });

    const uri = `otpauth://totp/AMASS:${user.email}?secret=${base32}&issuer=AMASS`;

    return { secret: base32, uri };
  }

  /**
   * Verify a TOTP code and enable 2FA if valid.
   * Uses HMAC-SHA1 with dynamic truncation, allows +/-1 time step.
   */
  async verify2fa(userId: string, code: string): Promise<{ verified: boolean }> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.totpSecret) {
      throw new Error('2FA not set up');
    }

    // Decode base32 secret
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const secretStr = user.totpSecret.toUpperCase();
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;
    for (const char of secretStr) {
      const idx = base32Chars.indexOf(char);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    const secretBuffer = Buffer.from(bytes);

    const counter = Math.floor(Date.now() / 1000 / 30);

    // Check current step and +/- 1 step
    for (const offset of [-1, 0, 1]) {
      const time = counter + offset;
      const timeBuffer = Buffer.alloc(8);
      let tmp = time;
      for (let i = 7; i >= 0; i--) {
        timeBuffer[i] = tmp & 0xff;
        tmp = Math.floor(tmp / 256);
      }

      const hmac = crypto.createHmac('sha1', secretBuffer).update(timeBuffer).digest();
      const offsetByte = hmac[hmac.length - 1] & 0x0f;
      const truncated =
        ((hmac[offsetByte] & 0x7f) << 24) |
        ((hmac[offsetByte + 1] & 0xff) << 16) |
        ((hmac[offsetByte + 2] & 0xff) << 8) |
        (hmac[offsetByte + 3] & 0xff);
      const otp = (truncated % 1_000_000).toString().padStart(6, '0');

      if (otp === code) {
        await prisma.user.update({
          where: { id: userId },
          data: { totpEnabled: true },
        });
        return { verified: true };
      }
    }

    return { verified: false };
  }

  /**
   * List active (non-expired, non-revoked) sessions for a user.
   */
  async listSessions(userId: string) {
    return prisma.session.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        isRevoked: false,
      },
      orderBy: { lastActiveAt: 'desc' },
    });
  }

  /**
   * Revoke a specific session.
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await prisma.session.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new Error('Session not found');

    await prisma.session.update({
      where: { id: sessionId },
      data: { isRevoked: true },
    });
  }

  /**
   * Revoke all sessions for a user, optionally except one.
   */
  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const where: Record<string, unknown> = { userId, isRevoked: false };
    if (exceptSessionId) {
      where.id = { not: exceptSessionId };
    }
    await prisma.session.updateMany({
      where,
      data: { isRevoked: true },
    });
  }
}
