import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { NotFoundError } from '../../utils/errors';

type ReportType = 'pipeline_forecast' | 'conversion_funnel' | 'revenue' | 'activity' | 'team_performance' | 'win_loss';

interface SaveReportData {
  name: string;
  type: string;
  config: Record<string, unknown>;
  schedule?: string;
}

interface WidgetData {
  id?: string;
  widgetType: string;
  config: Record<string, unknown>;
  position: { x: number; y: number; w: number; h: number };
}

export class ReportService {
  async listSavedReports(tenantId: string, userId: string) {
    const reports = await prisma.savedReport.findMany({
      where: { tenantId, userId },
      orderBy: { updatedAt: 'desc' },
    });

    return reports;
  }

  async saveReport(tenantId: string, userId: string, data: SaveReportData) {
    const report = await prisma.savedReport.create({
      data: {
        tenantId,
        userId,
        name: data.name,
        type: data.type,
        config: data.config as object,
        schedule: data.schedule || null,
      },
    });

    return report;
  }

  async updateReport(tenantId: string, id: string, data: Partial<SaveReportData>) {
    const existing = await prisma.savedReport.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundError('Report not found');
    }

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.config !== undefined) updateData.config = data.config as object;
    if (data.schedule !== undefined) updateData.schedule = data.schedule;

    const report = await prisma.savedReport.update({
      where: { id },
      data: updateData,
    });

    return report;
  }

  async deleteReport(tenantId: string, id: string) {
    const existing = await prisma.savedReport.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundError('Report not found');
    }

    await prisma.savedReport.delete({ where: { id } });
  }

  async runReport(tenantId: string, type: ReportType, config: Record<string, unknown> = {}) {
    switch (type) {
      case 'pipeline_forecast':
        return this.runPipelineForecast(tenantId, config);
      case 'conversion_funnel':
        return this.runConversionFunnel(tenantId, config);
      case 'revenue':
        return this.runRevenue(tenantId, config);
      case 'activity':
        return this.runActivity(tenantId, config);
      case 'team_performance':
        return this.runTeamPerformance(tenantId, config);
      case 'win_loss':
        return this.runWinLoss(tenantId, config);
      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  }

  private async runPipelineForecast(tenantId: string, config: Record<string, unknown>) {
    const deals = await prisma.deal.findMany({
      where: {
        tenantId,
        closedAt: null,
        expectedCloseDate: { not: null },
      },
      select: {
        value: true,
        probability: true,
        expectedCloseDate: true,
      },
    });

    const monthlyForecast: Record<string, { total: number; weighted: number; count: number }> = {};

    for (const deal of deals) {
      if (!deal.expectedCloseDate) continue;
      const monthKey = deal.expectedCloseDate.toISOString().substring(0, 7);
      if (!monthlyForecast[monthKey]) {
        monthlyForecast[monthKey] = { total: 0, weighted: 0, count: 0 };
      }
      const value = Number(deal.value);
      const probability = deal.probability ?? 50;
      monthlyForecast[monthKey].total += value;
      monthlyForecast[monthKey].weighted += (value * probability) / 100;
      monthlyForecast[monthKey].count += 1;
    }

    const months = Object.keys(monthlyForecast).sort();
    return {
      type: 'pipeline_forecast',
      data: months.map((month) => ({
        month,
        totalValue: monthlyForecast[month].total,
        weightedValue: monthlyForecast[month].weighted,
        dealCount: monthlyForecast[month].count,
      })),
    };
  }

  private async runConversionFunnel(tenantId: string, config: Record<string, unknown>) {
    const pipelineId = config.pipelineId as string;
    if (!pipelineId) {
      throw new Error('pipelineId is required for conversion_funnel report');
    }

    const stages = await prisma.pipelineStage.findMany({
      where: { pipelineId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { deals: true } },
      },
    });

    const stageData = stages.map((stage) => ({
      stageId: stage.id,
      stageName: stage.name,
      sortOrder: stage.sortOrder,
      dealCount: stage._count.deals,
    }));

    // Calculate stage-to-stage conversion rates
    const funnel = stageData.map((stage, index) => ({
      ...stage,
      conversionRate: index === 0
        ? 100
        : stageData[index - 1].dealCount > 0
          ? Math.round((stage.dealCount / stageData[index - 1].dealCount) * 10000) / 100
          : 0,
    }));

    return { type: 'conversion_funnel', data: funnel };
  }

  private async runRevenue(tenantId: string, config: Record<string, unknown>) {
    const deals = await prisma.deal.findMany({
      where: {
        tenantId,
        wonAt: { not: null },
      },
      select: {
        value: true,
        wonAt: true,
      },
      orderBy: { wonAt: 'asc' },
    });

    const monthlyRevenue: Record<string, { total: number; count: number }> = {};

    for (const deal of deals) {
      if (!deal.wonAt) continue;
      const monthKey = deal.wonAt.toISOString().substring(0, 7);
      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = { total: 0, count: 0 };
      }
      monthlyRevenue[monthKey].total += Number(deal.value);
      monthlyRevenue[monthKey].count += 1;
    }

    const months = Object.keys(monthlyRevenue).sort();
    return {
      type: 'revenue',
      data: months.map((month) => ({
        month,
        totalRevenue: monthlyRevenue[month].total,
        dealCount: monthlyRevenue[month].count,
        avgDealSize: monthlyRevenue[month].count > 0
          ? Math.round(monthlyRevenue[month].total / monthlyRevenue[month].count)
          : 0,
      })),
    };
  }

  private async runActivity(tenantId: string, config: Record<string, unknown>) {
    const where: Prisma.ActivityWhereInput = { tenantId };

    if (config.userId) {
      where.userId = config.userId as string;
    }
    if (config.dateFrom) {
      where.createdAt = { ...((where.createdAt as object) || {}), gte: new Date(config.dateFrom as string) };
    }
    if (config.dateTo) {
      where.createdAt = { ...((where.createdAt as object) || {}), lte: new Date(config.dateTo as string) };
    }

    const activities = await prisma.activity.findMany({
      where,
      select: { type: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by type
    const byType: Record<string, number> = {};
    // Group by day
    const byDay: Record<string, number> = {};

    for (const activity of activities) {
      byType[activity.type] = (byType[activity.type] || 0) + 1;
      const dayKey = activity.createdAt.toISOString().substring(0, 10);
      byDay[dayKey] = (byDay[dayKey] || 0) + 1;
    }

    return {
      type: 'activity',
      data: {
        byType,
        byDay,
        total: activities.length,
      },
    };
  }

  private async runTeamPerformance(tenantId: string, config: Record<string, unknown>) {
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true, name: true },
    });

    const performance = await Promise.all(
      users.map(async (user) => {
        const [dealsWon, dealsLost, totalValueWon, activityCount] = await Promise.all([
          prisma.deal.count({
            where: { tenantId, assignedToId: user.id, wonAt: { not: null } },
          }),
          prisma.deal.count({
            where: { tenantId, assignedToId: user.id, lostAt: { not: null } },
          }),
          prisma.deal.aggregate({
            where: { tenantId, assignedToId: user.id, wonAt: { not: null } },
            _sum: { value: true },
          }),
          prisma.activity.count({
            where: { tenantId, userId: user.id },
          }),
        ]);

        return {
          userId: user.id,
          userName: user.name,
          dealsWon,
          dealsLost,
          totalValueWon: Number(totalValueWon._sum.value || 0),
          activityCount,
        };
      }),
    );

    // Rank by total value won
    performance.sort((a, b) => b.totalValueWon - a.totalValueWon);

    return {
      type: 'team_performance',
      data: performance.map((p, index) => ({ ...p, rank: index + 1 })),
    };
  }

  private async runWinLoss(tenantId: string, config: Record<string, unknown>) {
    const [wonDeals, lostDeals] = await Promise.all([
      prisma.deal.findMany({
        where: { tenantId, wonAt: { not: null } },
        select: { value: true, createdAt: true, wonAt: true },
      }),
      prisma.deal.findMany({
        where: { tenantId, lostAt: { not: null } },
        select: { value: true, createdAt: true, lostAt: true, lossReason: true },
      }),
    ]);

    const wonCount = wonDeals.length;
    const lostCount = lostDeals.length;
    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 10000) / 100 : 0;

    const avgWonDealSize = wonCount > 0
      ? wonDeals.reduce((sum, d) => sum + Number(d.value), 0) / wonCount
      : 0;

    const avgLostDealSize = lostCount > 0
      ? lostDeals.reduce((sum, d) => sum + Number(d.value), 0) / lostCount
      : 0;

    // Avg days to close for won deals
    const avgDaysToClose = wonCount > 0
      ? Math.round(
          wonDeals.reduce((sum, d) => {
            const days = (d.wonAt!.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / wonCount,
        )
      : 0;

    // Top loss reasons
    const lossReasonCount: Record<string, number> = {};
    for (const deal of lostDeals) {
      const reason = deal.lossReason || 'Unknown';
      lossReasonCount[reason] = (lossReasonCount[reason] || 0) + 1;
    }
    const topLossReasons = Object.entries(lossReasonCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([reason, count]) => ({ reason, count }));

    return {
      type: 'win_loss',
      data: {
        winRate,
        wonCount,
        lostCount,
        avgWonDealSize: Math.round(avgWonDealSize),
        avgLostDealSize: Math.round(avgLostDealSize),
        avgDaysToClose,
        topLossReasons,
      },
    };
  }

  async getDashboardWidgets(tenantId: string, userId: string) {
    const widgets = await prisma.dashboardWidget.findMany({
      where: { tenantId, userId },
    });

    return widgets;
  }

  async saveDashboardWidget(tenantId: string, userId: string, data: WidgetData) {
    if (data.id) {
      const existing = await prisma.dashboardWidget.findFirst({
        where: { id: data.id, tenantId, userId },
      });
      if (existing) {
        return prisma.dashboardWidget.update({
          where: { id: data.id },
          data: {
            widgetType: data.widgetType,
            config: data.config as object,
            position: data.position as object,
          },
        });
      }
    }

    return prisma.dashboardWidget.create({
      data: {
        tenantId,
        userId,
        widgetType: data.widgetType,
        config: data.config as object,
        position: data.position as object,
      },
    });
  }

  async deleteDashboardWidget(tenantId: string, id: string) {
    const existing = await prisma.dashboardWidget.findFirst({ where: { id, tenantId } });
    if (!existing) {
      throw new NotFoundError('Widget not found');
    }

    await prisma.dashboardWidget.delete({ where: { id } });
  }

  async exportCsv(tenantId: string, type: ReportType, config: Record<string, unknown> = {}) {
    const report = await this.runReport(tenantId, type, config);
    const data = report.data;

    if (Array.isArray(data)) {
      if (data.length === 0) return '';
      const headers = Object.keys(data[0]);
      const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
      const rows = data.map((row: Record<string, unknown>) =>
        headers.map((h) => escape(String(row[h] ?? ''))).join(','),
      );
      return [headers.map(escape).join(','), ...rows].join('\n');
    }

    // For object-based reports, flatten into key-value CSV
    const entries = Object.entries(data);
    const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const rows = entries.map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${escape(key)},${escape(JSON.stringify(value))}`;
      }
      if (typeof value === 'object' && value !== null) {
        return `${escape(key)},${escape(JSON.stringify(value))}`;
      }
      return `${escape(key)},${escape(String(value))}`;
    });
    return ['"metric","value"', ...rows].join('\n');
  }
}
