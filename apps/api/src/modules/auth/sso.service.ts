import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import type { JwtPayload, AuthTokens } from '@amass/shared';

// ─── Types ───

interface SsoConfigInput {
  provider: string;
  entityId: string;
  ssoUrl: string;
  certificate: string;
  metadata?: Record<string, unknown>;
}

interface SamlUserAttributes {
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

// ─── Service ───

export class SsoService {
  /**
   * Generate a SAML AuthnRequest and return the redirect URL to the IdP.
   */
  async initiateSamlLogin(tenantId: string): Promise<string> {
    const config = await prisma.ssoConfig.findFirst({
      where: { tenantId, isActive: true },
    });

    if (!config) {
      throw new Error('SSO not configured for this tenant');
    }

    const requestId = `_${crypto.randomUUID()}`;
    const issueInstant = new Date().toISOString();
    const assertionConsumerUrl = `${env.OAUTH_REDIRECT_BASE_URL}/api/v1/auth/sso/callback`;

    // Build the SAML AuthnRequest XML
    const authnRequest = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<samlp:AuthnRequest',
      '  xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"',
      '  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"',
      `  ID="${requestId}"`,
      '  Version="2.0"',
      `  IssueInstant="${issueInstant}"`,
      `  AssertionConsumerServiceURL="${assertionConsumerUrl}"`,
      '  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">',
      `  <saml:Issuer>${config.entityId || env.OAUTH_REDIRECT_BASE_URL}</saml:Issuer>`,
      '  <samlp:NameIDPolicy',
      '    Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"',
      '    AllowCreate="true"/>',
      '</samlp:AuthnRequest>',
    ].join('\n');

    // Deflate + base64 encode for HTTP-Redirect binding
    const { deflateRawSync } = await import('zlib');
    const deflated = deflateRawSync(Buffer.from(authnRequest, 'utf-8'));
    const encoded = deflated.toString('base64');

    // Build redirect URL with SAMLRequest and RelayState (tenantId)
    const params = new URLSearchParams({
      SAMLRequest: encoded,
      RelayState: tenantId,
    });

    return `${config.ssoUrl}?${params.toString()}`;
  }

  /**
   * Parse and validate a SAML Response, extract user attributes,
   * find or create the user, and return JWT tokens.
   */
  async handleSamlResponse(samlResponseB64: string, tenantId: string): Promise<AuthTokens> {
    // Decode the base64 SAML Response
    const samlXml = Buffer.from(samlResponseB64, 'base64').toString('utf-8');

    const config = await prisma.ssoConfig.findFirst({
      where: { tenantId, isActive: true },
    });

    if (!config) {
      throw new Error('SSO not configured for this tenant');
    }

    // Validate the SAML response signature
    this.validateSamlSignature(samlXml, config.certificate);

    // Validate status (check for Success status code)
    this.validateSamlStatus(samlXml);

    // Validate time conditions
    this.validateSamlConditions(samlXml);

    // Extract user attributes
    const attributes = this.extractUserAttributes(samlXml);

    if (!attributes.email) {
      throw new Error('SAML response missing email attribute');
    }

    // Find or create user
    const displayName = attributes.name ||
      (attributes.firstName && attributes.lastName
        ? `${attributes.firstName} ${attributes.lastName}`
        : attributes.email.split('@')[0]);

    const user = await this.findOrCreateUser(tenantId, attributes.email, displayName);

    return this.issueTokens(user);
  }

  /**
   * Validate the XML signature in the SAML response using the IdP certificate.
   */
  private validateSamlSignature(samlXml: string, certificate: string): void {
    // Extract the SignatureValue and DigestValue from the SAML response
    const signatureValueMatch = samlXml.match(
      /<(?:ds:)?SignatureValue[^>]*>([\s\S]*?)<\/(?:ds:)?SignatureValue>/,
    );
    const signedInfoMatch = samlXml.match(
      /<(?:ds:)?SignedInfo[^>]*>([\s\S]*?)<\/(?:ds:)?SignedInfo>/,
    );

    if (!signatureValueMatch || !signedInfoMatch) {
      throw new Error('SAML response missing signature');
    }

    const signatureValue = signatureValueMatch[1].replace(/\s/g, '');
    const signedInfo = signedInfoMatch[0];

    // Normalize the certificate (wrap in PEM if not already)
    const pemCert = certificate.includes('BEGIN CERTIFICATE')
      ? certificate
      : `-----BEGIN CERTIFICATE-----\n${certificate}\n-----END CERTIFICATE-----`;

    // Verify the signature using the IdP's public certificate
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(signedInfo);

    const isValid = verifier.verify(pemCert, signatureValue, 'base64');

    if (!isValid) {
      // Try SHA1 as fallback (some older IdPs use SHA1)
      const verifierSha1 = crypto.createVerify('RSA-SHA1');
      verifierSha1.update(signedInfo);
      const isValidSha1 = verifierSha1.verify(pemCert, signatureValue, 'base64');

      if (!isValidSha1) {
        throw new Error('SAML response signature verification failed');
      }
    }
  }

  /**
   * Validate the SAML Status is Success.
   */
  private validateSamlStatus(samlXml: string): void {
    const statusMatch = samlXml.match(
      /<(?:samlp:)?StatusCode[^>]*Value="([^"]+)"[^>]*\/?>/,
    );

    if (!statusMatch) {
      throw new Error('SAML response missing status code');
    }

    const statusCode = statusMatch[1];
    if (!statusCode.endsWith(':Success')) {
      throw new Error(`SAML authentication failed with status: ${statusCode}`);
    }
  }

  /**
   * Validate NotBefore and NotOnOrAfter conditions.
   */
  private validateSamlConditions(samlXml: string): void {
    const conditionsMatch = samlXml.match(
      /<(?:saml:)?Conditions[^>]*NotBefore="([^"]*)"[^>]*NotOnOrAfter="([^"]*)"[^>]*>/,
    );

    if (conditionsMatch) {
      const now = new Date();
      const notBefore = new Date(conditionsMatch[1]);
      const notOnOrAfter = new Date(conditionsMatch[2]);

      // Allow 5 minutes clock skew
      const skew = 5 * 60 * 1000;

      if (now.getTime() < notBefore.getTime() - skew) {
        throw new Error('SAML response not yet valid (NotBefore condition)');
      }

      if (now.getTime() >= notOnOrAfter.getTime() + skew) {
        throw new Error('SAML response has expired (NotOnOrAfter condition)');
      }
    }
  }

  /**
   * Extract user attributes from the SAML Assertion.
   */
  private extractUserAttributes(samlXml: string): SamlUserAttributes {
    const result: SamlUserAttributes = { email: '' };

    // Try to extract NameID (email)
    const nameIdMatch = samlXml.match(
      /<(?:saml:)?NameID[^>]*>([\s\S]*?)<\/(?:saml:)?NameID>/,
    );
    if (nameIdMatch) {
      result.email = nameIdMatch[1].trim();
    }

    // Extract attributes from AttributeStatement
    const attrPattern =
      /<(?:saml:)?Attribute\s+Name="([^"]*)"[^>]*>[\s\S]*?<(?:saml:)?AttributeValue[^>]*>([\s\S]*?)<\/(?:saml:)?AttributeValue>[\s\S]*?<\/(?:saml:)?Attribute>/g;

    let match: RegExpExecArray | null;
    while ((match = attrPattern.exec(samlXml)) !== null) {
      const name = match[1].toLowerCase();
      const value = match[2].trim();

      // Map common SAML attribute names to user fields
      if (
        name.includes('emailaddress') ||
        name.includes('email') ||
        name === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
      ) {
        result.email = value;
      } else if (
        name.includes('displayname') ||
        name === 'http://schemas.microsoft.com/identity/claims/displayname'
      ) {
        result.name = value;
      } else if (
        name.includes('givenname') ||
        name.includes('firstname') ||
        name === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'
      ) {
        result.firstName = value;
      } else if (
        name.includes('surname') ||
        name.includes('lastname') ||
        name === 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'
      ) {
        result.lastName = value;
      }
    }

    return result;
  }

  /**
   * Save or update SSO configuration for a tenant.
   */
  async configureSso(tenantId: string, config: SsoConfigInput) {
    // Check if there's already a config for this tenant+provider
    const existing = await prisma.ssoConfig.findFirst({
      where: { tenantId, provider: config.provider },
    });

    if (existing) {
      return prisma.ssoConfig.update({
        where: { id: existing.id },
        data: {
          entityId: config.entityId,
          ssoUrl: config.ssoUrl,
          certificate: config.certificate,
          metadata: (config.metadata || {}) as any,
          isActive: true,
        },
      });
    }

    return prisma.ssoConfig.create({
      data: {
        tenantId,
        provider: config.provider,
        entityId: config.entityId,
        ssoUrl: config.ssoUrl,
        certificate: config.certificate,
        metadata: (config.metadata || {}) as any,
        isActive: true,
      },
    });
  }

  /**
   * Get SSO configuration for a tenant.
   */
  async getSsoConfig(tenantId: string) {
    return prisma.ssoConfig.findFirst({
      where: { tenantId, isActive: true },
    });
  }

  /**
   * Look up an existing user by email within the tenant, or create a new user.
   */
  private async findOrCreateUser(tenantId: string, email: string, name: string) {
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

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    user = await prisma.user.create({
      data: {
        tenantId,
        name,
        email,
        role: 'SELLER',
        lastLoginAt: new Date(),
      },
    });

    return user;
  }

  /**
   * Issue a JWT access token and a DB-stored refresh token.
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
