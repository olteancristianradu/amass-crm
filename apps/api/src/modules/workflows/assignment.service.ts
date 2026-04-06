import { prisma } from '../../config/database';

export class AssignmentService {
  /**
   * Round-robin assignment: get the next user for lead assignment.
   * Tracks last assigned index in tenant settings JSON and cycles through active users.
   */
  async roundRobin(tenantId: string, pipelineId?: string) {
    const whereClause: Record<string, unknown> = { tenantId, isActive: true };

    const activeUsers = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, email: true },
    });

    if (activeUsers.length === 0) {
      throw new Error('No active users available for assignment');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const settings = (tenant?.settings as Record<string, unknown>) || {};
    const settingsKey = pipelineId ? `roundRobinIndex_${pipelineId}` : 'roundRobinIndex';
    const lastIndex = (typeof settings[settingsKey] === 'number' ? settings[settingsKey] : -1) as number;
    const nextIndex = (lastIndex + 1) % activeUsers.length;

    // Update the index in tenant settings
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: { ...settings, [settingsKey]: nextIndex } as Record<string, number>,
      },
    });

    return activeUsers[nextIndex];
  }

  /**
   * Capacity-based assignment: assign to the user with the fewest open deals.
   */
  async byCapacity(tenantId: string) {
    const activeUsers = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        _count: {
          select: {
            assignedDeals: {
              where: { closedAt: null },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (activeUsers.length === 0) {
      throw new Error('No active users available for assignment');
    }

    // Find the user with the fewest open deals
    const sorted = activeUsers.sort(
      (a, b) => a._count.assignedDeals - b._count.assignedDeals,
    );

    const user = sorted[0];
    return { id: user.id, name: user.name, email: user.email, openDeals: user._count.assignedDeals };
  }

  /**
   * Territory-based assignment: find the user with the most deals in the given city.
   * Falls back to round-robin if no city is provided or no deals exist in that city.
   */
  async byTerritory(tenantId: string, city?: string) {
    if (!city) {
      return this.roundRobin(tenantId);
    }

    // Find users who have the most deals with companies in the given city
    const dealsByUser = await prisma.deal.groupBy({
      by: ['assignedToId'],
      where: {
        tenantId,
        assignedToId: { not: null },
        company: { city: { equals: city, mode: 'insensitive' } },
      },
      _count: true,
      orderBy: { _count: { assignedToId: 'desc' } },
    });

    if (dealsByUser.length > 0 && dealsByUser[0].assignedToId) {
      const user = await prisma.user.findFirst({
        where: { id: dealsByUser[0].assignedToId!, tenantId, isActive: true },
        select: { id: true, name: true, email: true },
      });
      if (user) return user;
    }

    // Fallback to round-robin if no territory match
    return this.roundRobin(tenantId);
  }
}
