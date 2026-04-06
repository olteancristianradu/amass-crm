import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

/** Shape of white-label branding configuration stored in tenant settings. */
export interface WhitelabelConfig {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  companyName?: string;
  supportEmail?: string;
  customCss?: string;
  loginMessage?: string;
}

/**
 * Retrieves the white-label branding configuration for a tenant.
 * Extracts the `whitelabel` key from the tenant's JSON settings field.
 *
 * @param tenantId - The tenant whose branding config to retrieve
 * @returns The white-label config object (empty object if not configured)
 * @throws NotFoundError if tenant does not exist
 */
export async function getConfig(tenantId: string): Promise<WhitelabelConfig> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  if (!tenant) {
    throw new NotFoundError('Tenant');
  }

  const settings = (tenant.settings ?? {}) as Record<string, unknown>;
  return (settings.whitelabel ?? {}) as WhitelabelConfig;
}

/**
 * Updates the white-label branding configuration for a tenant.
 * Merges the provided config into the existing tenant settings JSON
 * under the `whitelabel` key.
 *
 * @param tenantId - The tenant whose branding config to update
 * @param config - Partial white-label config to merge
 * @returns The updated white-label config
 * @throws NotFoundError if tenant does not exist
 */
export async function updateConfig(
  tenantId: string,
  config: Partial<WhitelabelConfig>,
): Promise<WhitelabelConfig> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  if (!tenant) {
    throw new NotFoundError('Tenant');
  }

  const settings = (tenant.settings ?? {}) as Record<string, unknown>;
  const existing = (settings.whitelabel ?? {}) as WhitelabelConfig;
  const merged = { ...existing, ...config };

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: { ...settings, whitelabel: merged },
    },
  });

  return merged;
}

/**
 * Retrieves public branding configuration by tenant slug.
 * This is used for public-facing pages (login, signup) where
 * no authentication is required.
 *
 * @param slug - The tenant slug
 * @returns The public branding config
 * @throws NotFoundError if no tenant with that slug exists
 */
export async function getPublicBranding(slug: string): Promise<WhitelabelConfig & { tenantName: string }> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { name: true, settings: true },
  });

  if (!tenant) {
    throw new NotFoundError('Tenant');
  }

  const settings = (tenant.settings ?? {}) as Record<string, unknown>;
  const whitelabel = (settings.whitelabel ?? {}) as WhitelabelConfig;

  return { ...whitelabel, tenantName: tenant.name };
}
