/**
 * OAuth2 authentication service — handles Google and Microsoft login flows.
 * Uses Authorization Code flow to exchange codes for user tokens.
 *
 * Architecture:
 *   - Tenant is resolved by slug (passed as OAuth state parameter) so the
 *     callback can associate the user with the correct organisation.
 *   - Users are looked up by email within the tenant; a new SELLER account
 *     is created automatically when the email is not yet registered.
 *   - JWT issuance follows the same pattern as AuthService (access + refresh).
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import type { JwtPayload, AuthTokens } from '@amass/shared';

// ─── External API response types ───

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

interface MicrosoftTokenResponse {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface MicrosoftUserInfo {
  id: string;
  mail: string | null;
  userPrincipalName: string;
  displayName: string;
}

// ─── Service ───

export class OAuthService {
  /**
   * Generate Google OAuth2 consent URL with proper scopes (email, profile).
   * The tenant slug is encoded as the OAuth `state` parameter so it survives
   * the redirect round-trip and can be resolved in the callback handler.
   *
   * @param tenantSlug - URL-safe slug that uniquely identifies the tenant
   * @returns Fully-qualified Google consent URL
   */
  getGoogleAuthUrl(tenantSlug: string): string {
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      redirect_uri: `${env.OAUTH_REDIRECT_BASE_URL}/api/v1/auth/oauth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
      state: tenantSlug,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange Google auth code for tokens, find/create user, return JWT pair.
   *
   * Flow:
   *   1. Exchange the authorization code for Google access + id tokens.
   *   2. Fetch the authenticated user's profile from Google's userinfo endpoint.
   *   3. Resolve the tenant by slug.
   *   4. Find or create a local user record.
   *   5. Issue application JWT access & refresh tokens.
   *
   * @param code       - Authorization code returned by Google
   * @param tenantSlug - Tenant slug passed as OAuth state
   * @returns JWT access and refresh token pair
   * @throws Error when Google APIs fail, tenant is unknown, or email is missing
   */
  async handleGoogleCallback(code: string, tenantSlug: string): Promise<AuthTokens> {
    const tenantId = await this.resolveTenant(tenantSlug);

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${env.OAUTH_REDIRECT_BASE_URL}/api/v1/auth/oauth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      throw new Error(`Google token exchange failed: ${errBody}`);
    }

    const tokenData: GoogleTokenResponse = (await tokenRes.json()) as GoogleTokenResponse;

    // Fetch user info from Google
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      throw new Error('Failed to fetch Google user info');
    }

    const googleUser: GoogleUserInfo = (await userInfoRes.json()) as GoogleUserInfo;

    if (!googleUser.email) {
      throw new Error('Google account has no email address');
    }

    const user = await this.findOrCreateUser(tenantId, googleUser.email, googleUser.name, googleUser.picture);
    return this.issueTokens(user);
  }

  /**
   * Generate Microsoft OAuth2 consent URL.
   * Works the same way as {@link getGoogleAuthUrl} but targets the Microsoft
   * identity platform (common tenant, supporting personal + work accounts).
   *
   * @param tenantSlug - URL-safe slug that uniquely identifies the tenant
   * @returns Fully-qualified Microsoft consent URL
   */
  getMicrosoftAuthUrl(tenantSlug: string): string {
    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID,
      redirect_uri: `${env.OAUTH_REDIRECT_BASE_URL}/api/v1/auth/oauth/microsoft/callback`,
      response_type: 'code',
      scope: 'openid email profile User.Read',
      response_mode: 'query',
      state: tenantSlug,
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Exchange Microsoft auth code for tokens, find/create user, return JWT pair.
   *
   * Flow:
   *   1. Exchange the authorization code for Microsoft access + id tokens.
   *   2. Fetch the authenticated user's profile from Microsoft Graph.
   *   3. Resolve the tenant by slug.
   *   4. Find or create a local user record.
   *   5. Issue application JWT access & refresh tokens.
   *
   * @param code       - Authorization code returned by Microsoft
   * @param tenantSlug - Tenant slug passed as OAuth state
   * @returns JWT access and refresh token pair
   * @throws Error when Microsoft APIs fail, tenant is unknown, or email is missing
   */
  async handleMicrosoftCallback(code: string, tenantSlug: string): Promise<AuthTokens> {
    const tenantId = await this.resolveTenant(tenantSlug);

    const tokenRes = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.MICROSOFT_CLIENT_ID,
        client_secret: env.MICROSOFT_CLIENT_SECRET,
        redirect_uri: `${env.OAUTH_REDIRECT_BASE_URL}/api/v1/auth/oauth/microsoft/callback`,
        grant_type: 'authorization_code',
        scope: 'openid email profile User.Read',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      throw new Error(`Microsoft token exchange failed: ${errBody}`);
    }

    const tokenData: MicrosoftTokenResponse = (await tokenRes.json()) as MicrosoftTokenResponse;

    // Fetch user info from Microsoft Graph
    const userInfoRes = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      throw new Error('Failed to fetch Microsoft user info');
    }

    const msUser: MicrosoftUserInfo = (await userInfoRes.json()) as MicrosoftUserInfo;
    const email = msUser.mail || msUser.userPrincipalName;

    if (!email) {
      throw new Error('Microsoft account has no email address');
    }

    const user = await this.findOrCreateUser(tenantId, email, msUser.displayName);
    return this.issueTokens(user);
  }

  // ─── Private helpers ───

  /**
   * Resolve a tenant slug to its database ID.
   *
   * @param slug - Unique tenant slug
   * @returns Tenant ID
   * @throws Error when no tenant matches the given slug
   */
  private async resolveTenant(slug: string): Promise<string> {
    const tenant = await prisma.tenant.findUnique({ where: { slug } });
    if (!tenant) {
      throw new Error(`Tenant not found for slug: ${slug}`);
    }
    return tenant.id;
  }

  /**
   * Look up an existing user by email within the tenant, or create a new one.
   * On an existing user the lastLoginAt timestamp is refreshed.
   *
   * @param tenantId - Tenant database ID
   * @param email    - User email from the OAuth provider
   * @param name     - Display name from the OAuth provider
   * @param avatar   - Optional avatar/profile picture URL
   * @returns The user record (existing or newly created)
   */
  private async findOrCreateUser(
    tenantId: string,
    email: string,
    name: string,
    avatar?: string,
  ) {
    let user = await prisma.user.findFirst({
      where: { tenantId, email },
    });

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      return user;
    }

    user = await prisma.user.create({
      data: {
        tenantId,
        name: name || email.split('@')[0],
        email,
        avatar: avatar || undefined,
        role: 'SELLER',
        lastLoginAt: new Date(),
      },
    });

    return user;
  }

  /**
   * Issue a JWT access token and a database-stored refresh token.
   * Mirrors the token generation logic in AuthService for consistency.
   *
   * @param user - Minimal user object containing id, tenantId and role
   * @returns JWT access and refresh token pair
   */
  private async issueTokens(user: { id: string; tenantId: string; role: string }): Promise<AuthTokens> {
    const payload: JwtPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role as JwtPayload['role'],
    };

    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as unknown as number,
    });

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }
}
