import { prisma } from '../config/database';

export async function logAudit(params: {
  tenantId: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  await prisma.auditLog.create({ data: params as any });
}
