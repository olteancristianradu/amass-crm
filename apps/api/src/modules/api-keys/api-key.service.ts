import crypto from 'crypto';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

export class ApiKeyService {
  async list(tenantId: string) {
    const keys = await prisma.apiKey.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return keys;
  }

  async create(tenantId: string, userId: string, data: { name: string; permissions: string[]; expiresAt?: string }) {
    const rawKey = 'amass_' + crypto.randomBytes(32).toString('hex');
    const keyHash = hashKey(rawKey);
    const keyPrefix = rawKey.slice(0, 10) + '...';

    const apiKey = await prisma.apiKey.create({
      data: {
        tenantId,
        userId,
        name: data.name,
        keyHash,
        keyPrefix,
        permissions: data.permissions,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      keyPrefix,
      permissions: apiKey.permissions,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async revoke(tenantId: string, id: string) {
    const existing = await prisma.apiKey.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundError('API Key');
    await prisma.apiKey.delete({ where: { id } });
  }

  async authenticate(rawKey: string): Promise<{ tenantId: string; userId: string; permissions: string[] } | null> {
    const keyHash = hashKey(rawKey);

    const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });
    if (!apiKey) return null;

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update lastUsedAt asynchronously
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return {
      tenantId: apiKey.tenantId,
      userId: apiKey.userId,
      permissions: apiKey.permissions,
    };
  }
}
