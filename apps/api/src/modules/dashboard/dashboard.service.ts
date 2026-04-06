import { prisma } from '../../config/database';

export class DashboardService {
  async getKpis(tenantId: string) {
    const [total, byStage, avgDays, callsToday, urgentClients, forecastValue] = await Promise.all([
      prisma.client.count({ where: { tenantId } }),
      prisma.client.groupBy({
        by: ['stage'],
        where: { tenantId },
        _count: true,
      }),
      this.getAvgDaysToClose(tenantId),
      this.getCallsScheduledToday(tenantId),
      this.getUrgentClients(tenantId),
      this.getForecastValue(tenantId),
    ]);

    const stageMap: Record<string, number> = {};
    for (const s of byStage) {
      stageMap[s.stage] = s._count;
    }

    const contracted = stageMap['CONTRACTED'] || 0;
    const lost = stageMap['LOST'] || 0;
    const closed = contracted + lost;

    return {
      totalClients: total,
      byStage: stageMap,
      contracted,
      lost,
      conversionRate: closed > 0 ? Math.round((contracted / closed) * 100) : 0,
      avgDaysToClose: avgDays,
      forecastValue,
      callsToday: callsToday.length,
      urgentClients: urgentClients.length,
    };
  }

  async getLeaderboard(tenantId: string) {
    const users = await prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true, name: true, avatar: true,
        assignedClients: {
          select: { stage: true },
        },
      },
    });

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const targets = await prisma.target.findMany({
      where: { tenantId, month },
    });
    const targetMap = new Map(targets.map(t => [t.userId, t.value]));

    return users.map(u => ({
      userId: u.id,
      userName: u.name,
      avatar: u.avatar,
      contracted: u.assignedClients.filter(c => c.stage === 'CONTRACTED').length,
      active: u.assignedClients.filter(c => !['CONTRACTED', 'LOST'].includes(c.stage)).length,
      target: targetMap.get(u.id) || 5,
    }));
  }

  async getLossReasons(tenantId: string) {
    const lost = await prisma.client.findMany({
      where: { tenantId, stage: 'LOST', lossReason: { not: '' } },
      select: { lossReason: true },
    });

    const counts: Record<string, number> = {};
    for (const c of lost) {
      counts[c.lossReason] = (counts[c.lossReason] || 0) + 1;
    }
    return counts;
  }

  private async getForecastValue(tenantId: string): Promise<number> {
    const openDeals = await prisma.deal.findMany({
      where: { tenantId, closedAt: null },
      select: { value: true, stage: { select: { probability: true } } },
    });
    return Math.round(
      openDeals.reduce((sum, d) => sum + Number(d.value) * (d.stage.probability / 100), 0)
    );
  }

  private async getAvgDaysToClose(tenantId: string): Promise<number> {
    const contracted = await prisma.client.findMany({
      where: { tenantId, stage: 'CONTRACTED' },
      select: { createdAt: true, updatedAt: true },
    });
    if (contracted.length === 0) return 0;
    const totalDays = contracted.reduce((sum, c) => {
      return sum + Math.floor((c.updatedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
    return Math.round(totalDays / contracted.length);
  }

  private async getCallsScheduledToday(tenantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.client.findMany({
      where: {
        tenantId,
        nextContact: { gte: today, lt: tomorrow },
      },
      select: { id: true, name: true, phone: true, nextContact: true },
    });
  }

  private async getUrgentClients(tenantId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return prisma.client.findMany({
      where: {
        tenantId,
        stage: { in: ['T1', 'T2', 'T3'] },
        updatedAt: { lt: sevenDaysAgo },
      },
      select: { id: true, name: true, stage: true, updatedAt: true },
    });
  }
}
